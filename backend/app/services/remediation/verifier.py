import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.core.telemetry import tracer, span_store
from backend.app.core.logging import logger
from backend.app.models.patch import RemediationPatch
from backend.app.models.finding import Finding
from backend.app.models.scan import ScanJob
from backend.app.models.audit import AuditLog
from backend.app.services.scanners.runner import execute_scan_sync

def utc_now():
    return datetime.now(timezone.utc)

class PatchVerifier:
    @staticmethod
    def verify_patch(db: Session, patch_id: str) -> RemediationPatch:
        patch = db.query(RemediationPatch).filter(RemediationPatch.id == patch_id).first()
        if not patch:
            raise ValueError(f"Patch with ID {patch_id} not found.")

        if patch.status != "APPLIED":
            raise ValueError(f"Cannot verify unapplied patch. Current status: {patch.status}")

        finding = db.query(Finding).filter(Finding.id == patch.finding_id).first()
        if not finding:
            raise ValueError(f"Associated finding {patch.finding_id} not found.")

        span_store.metrics["verification_scans_total"] += 1
        with tracer.start_as_current_span("remediation.verify_patch") as span:
            span.set_attribute("patch.id", patch.id)
            span.set_attribute("finding.id", finding.id)

            # Trigger a real scan on the repository using the finding's scanner
            scan_job = ScanJob(
                repository_id=patch.repository_id,
                status="pending",
                triggered_by="verification",
                scanners=finding.scanner
            )
            db.add(scan_job)
            db.commit()
            db.refresh(scan_job)

            patch.verification_scan_id = scan_job.id
            db.commit()

            # Execute scan synchronously for verification
            execute_scan_sync(scan_job.id)

            # Refresh finding to check if it reappeared in this new scan
            db.refresh(finding)

            if finding.scan_id == scan_job.id:
                # The finding was re-detected in the verification scan!
                patch.verification_status = "STILL_VULNERABLE"
                finding.status = "OPEN"
                logger.warning(f"Verification scan {scan_job.id}: Finding {finding.id} is still vulnerable after patch.")
            else:
                # Finding was eliminated from scanner output!
                patch.verification_status = "VERIFIED_FIXED"
                patch.status = "VERIFIED"
                finding.status = "RESOLVED"
                logger.info(f"Verification scan {scan_job.id}: Finding {finding.id} verified resolved!")

            audit = AuditLog(
                action="PATCH_VERIFY",
                target_type="patch",
                target_id=patch.id,
                details=json.dumps({
                    "verification_scan_id": scan_job.id,
                    "verification_status": patch.verification_status,
                    "finding_status": finding.status
                })
            )
            db.add(audit)
            db.commit()
            db.refresh(patch)

            span.set_attribute("verification.status", patch.verification_status)
            return patch
