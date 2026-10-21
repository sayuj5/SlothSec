import time
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from opentelemetry.trace import Status, StatusCode
from backend.app.core.config import settings
from backend.app.core.telemetry import tracer, span_store
from backend.app.core.logging import logger
from backend.app.database.session import SessionLocal
from backend.app.models.scan import ScanJob, ScannerExecution
from backend.app.models.repository import Repository
from backend.app.services.scanners.semgrep import SemgrepScanner
from backend.app.services.scanners.osv import OSVScanner
from backend.app.services.scanners.gitleaks import GitleaksScanner
from backend.app.services.scanners.normalizer import FindingNormalizer, RawFinding

def utc_now():
    return datetime.now(timezone.utc)

def get_scanner_instance(name: str):
    name_clean = name.strip().lower()
    if name_clean == "semgrep":
        return SemgrepScanner(settings.SEMGREP_BIN)
    elif name_clean == "osv" or name_clean == "osv-scanner":
        return OSVScanner(settings.OSV_SCANNER_BIN)
    elif name_clean == "gitleaks":
        return GitleaksScanner(settings.GITLEAKS_BIN)
    return None

def check_all_scanners() -> Dict[str, Dict[str, Any]]:
    results = {}
    for name, scanner in [
        ("semgrep", SemgrepScanner(settings.SEMGREP_BIN)),
        ("osv", OSVScanner(settings.OSV_SCANNER_BIN)),
        ("gitleaks", GitleaksScanner(settings.GITLEAKS_BIN))
    ]:
        avail, ver, err = scanner.check_available()
        results[name] = {
            "name": name,
            "version": ver,
            "available": avail,
            "path": scanner.executable_path,
            "error": err
        }
    return results

def execute_scan_sync(scan_id: str):
    """
    Synchronous worker method run inside a background thread/task.
    Opens its own DB session and processes each selected scanner.
    """
    db: Session = SessionLocal()
    scan_job = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not scan_job:
        db.close()
        return

    repo = db.query(Repository).filter(Repository.id == scan_job.repository_id).first()
    if not repo:
        scan_job.status = "failed"
        scan_job.error_message = "Repository not found"
        db.commit()
        db.close()
        return

    span_store.metrics["scans_started"] += 1
    scan_job.status = "running"
    db.commit()

    target_dir = repo.path
    requested_scanners = [s.strip().lower() for s in scan_job.scanners.split(",") if s.strip()]
    all_raw_findings: List[RawFinding] = []
    overall_start = time.time()

    with tracer.start_as_current_span("scan.job") as parent_span:
        parent_span.set_attribute("scan.id", scan_id)
        parent_span.set_attribute("repository.id", repo.id)
        parent_span.set_attribute("repository.name", repo.name)
        parent_span.set_attribute("scanners", scan_job.scanners)

        for scanner_name in requested_scanners:
            scanner = get_scanner_instance(scanner_name)
            if not scanner:
                logger.warning(f"Unknown scanner requested: {scanner_name}")
                continue

            exec_record = ScannerExecution(
                scan_id=scan_id,
                scanner_name=scanner.get_name(),
                status="running"
            )
            db.add(exec_record)
            db.commit()
            db.refresh(exec_record)

            with tracer.start_as_current_span(f"scanner.{scanner.get_name()}") as s_span:
                s_span.set_attribute("scanner.name", scanner.get_name())
                s_span.set_attribute("target.path", target_dir)

                res = scanner.run(target_dir, timeout_seconds=settings.SCAN_TIMEOUT_SECONDS)

                exec_record.status = res.status
                exec_record.exit_code = res.exit_code
                exec_record.duration_ms = res.duration_ms
                exec_record.findings_count = len(res.findings)
                exec_record.error_message = res.error_message
                db.commit()

                span_store.record_scanner_run(
                    scanner=scanner.get_name(),
                    duration_ms=res.duration_ms,
                    success=(res.status == "completed")
                )

                s_span.set_attribute("scanner.status", res.status)
                s_span.set_attribute("scanner.findings_count", len(res.findings))
                if res.status != "completed":
                    s_span.set_status(Status(StatusCode.ERROR, res.error_message or "Execution failed"))

                if res.findings:
                    all_raw_findings.extend(res.findings)

        # Normalize and persist findings in SQLite
        persisted = FindingNormalizer.normalize_and_persist(db, repo.id, scan_id, all_raw_findings)
        
        total_duration_ms = (time.time() - overall_start) * 1000
        scan_job.status = "completed"
        scan_job.completed_at = utc_now()
        scan_job.duration_ms = total_duration_ms
        db.commit()

        span_store.metrics["scans_completed"] += 1
        parent_span.set_attribute("scan.total_findings", len(persisted))
        parent_span.set_attribute("scan.duration_ms", total_duration_ms)

    db.close()
