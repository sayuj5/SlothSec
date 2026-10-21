import json
from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.scan import ScanJob
from backend.app.models.finding import Finding
from backend.app.models.repository import Repository

class JSONReportGenerator:
    @staticmethod
    def generate_report(db: Session, scan_id: str) -> Dict[str, Any]:
        scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
        if not scan:
            raise ValueError(f"Scan {scan_id} not found.")

        repo = db.query(Repository).filter(Repository.id == scan.repository_id).first()
        findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()

        findings_data = []
        for f in findings:
            findings_data.append({
                "id": f.id,
                "scanner": f.scanner,
                "rule_id": f.rule_id,
                "title": f.title,
                "severity": f.severity,
                "confidence": f.confidence,
                "file_path": f.file_path,
                "lines": f"{f.start_line}-{f.end_line}",
                "vulnerability_ids": f.vulnerability_ids,
                "package": f"{f.package_name} {f.package_version}".strip(),
                "fixed_version": f.fixed_version,
                "description": f.description,
                "status": f.status,
                "first_detected": f.first_detected_at.isoformat() if f.first_detected_at else None,
                "last_detected": f.last_detected_at.isoformat() if f.last_detected_at else None,
            })

        scanner_execs = []
        for se in scan.scanner_executions:
            scanner_execs.append({
                "scanner": se.scanner_name,
                "status": se.status,
                "exit_code": se.exit_code,
                "findings_count": se.findings_count,
                "duration_ms": se.duration_ms,
                "error": se.error_message
            })

        return {
            "slothsec_version": "1.0.0",
            "report_type": "security_scan",
            "scan_id": scan.id,
            "repository": {
                "id": repo.id if repo else None,
                "name": repo.name if repo else "Unknown",
                "path": repo.path if repo else "Unknown"
            },
            "scan_metadata": {
                "triggered_by": scan.triggered_by,
                "scanners": scan.scanners,
                "started_at": scan.started_at.isoformat() if scan.started_at else None,
                "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
                "duration_ms": scan.duration_ms,
                "status": scan.status
            },
            "scanner_executions": scanner_execs,
            "summary": {
                "total_findings": len(findings),
                "critical": sum(1 for f in findings if f.severity == "CRITICAL"),
                "high": sum(1 for f in findings if f.severity == "HIGH"),
                "medium": sum(1 for f in findings if f.severity == "MEDIUM"),
                "low": sum(1 for f in findings if f.severity == "LOW"),
            },
            "findings": findings_data
        }
