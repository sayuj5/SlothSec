import json
from typing import List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.services.scanners.base import RawFinding
from backend.app.models.finding import Finding
from backend.app.core.logging import logger

def utc_now():
    return datetime.now(timezone.utc)

class FindingNormalizer:
    @staticmethod
    def normalize_and_persist(
        db: Session,
        repository_id: str,
        scan_id: str,
        raw_findings: List[RawFinding]
    ) -> List[Finding]:
        """
        Deduplicates raw findings against existing repository findings.
        Updates last_detected_at for existing findings or inserts new findings.
        """
        persisted_findings: List[Finding] = []
        now = utc_now()

        # Query all existing findings for this repository
        existing_findings = db.query(Finding).filter(Finding.repository_id == repository_id).all()
        
        # Build lookup index: (scanner, rule_id, file_path, start_line, package_name)
        existing_map = {}
        for ef in existing_findings:
            key = (ef.scanner, ef.rule_id, ef.file_path, ef.start_line, ef.package_name)
            existing_map[key] = ef

        for rf in raw_findings:
            lookup_key = (rf.scanner, rf.rule_id, rf.file_path, rf.start_line, rf.package_name)

            if lookup_key in existing_map:
                existing = existing_map[lookup_key]
                existing.last_detected_at = now
                existing.scan_id = scan_id
                existing.description = rf.description
                existing.snippet = rf.snippet
                existing.severity = rf.severity
                # If it was marked resolved previously, reopen it
                if existing.status == "RESOLVED":
                    existing.status = "OPEN"
                persisted_findings.append(existing)
            else:
                new_finding = Finding(
                    repository_id=repository_id,
                    scan_id=scan_id,
                    scanner=rf.scanner,
                    rule_id=rf.rule_id,
                    title=rf.title,
                    description=rf.description,
                    severity=rf.severity,
                    confidence=rf.confidence,
                    file_path=rf.file_path,
                    start_line=rf.start_line,
                    end_line=rf.end_line,
                    vulnerability_ids=rf.vulnerability_ids,
                    package_name=rf.package_name,
                    package_version=rf.package_version,
                    fixed_version=rf.fixed_version,
                    references=json.dumps(rf.references),
                    snippet=rf.snippet,
                    status="OPEN",
                    first_detected_at=now,
                    last_detected_at=now
                )
                db.add(new_finding)
                persisted_findings.append(new_finding)
                existing_map[lookup_key] = new_finding

        db.commit()
        for f in persisted_findings:
            db.refresh(f)

        logger.info(f"Persisted and normalized {len(persisted_findings)} findings for scan {scan_id}")
        return persisted_findings
