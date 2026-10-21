import os
import shutil
import tempfile
import uuid
import json
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
from backend.app.core.telemetry import tracer, span_store
from backend.app.core.logging import logger
from backend.app.models.patch import RemediationPatch
from backend.app.models.repository import Repository
from backend.app.models.audit import AuditLog
from backend.app.services.remediation.validator import PatchValidator

def utc_now():
    return datetime.now(timezone.utc)

class PatchApplier:
    @staticmethod
    def apply_patch(db: Session, patch_id: str) -> RemediationPatch:
        patch = db.query(RemediationPatch).filter(RemediationPatch.id == patch_id).first()
        if not patch:
            raise ValueError(f"Patch with ID {patch_id} not found.")

        if patch.status != "APPROVED":
            raise ValueError(f"Security constraint: Patch must be explicitly APPROVED before application. Current status: {patch.status}")

        repo = db.query(Repository).filter(Repository.id == patch.repository_id).first()
        if not repo:
            raise ValueError(f"Repository {patch.repository_id} not found.")

        with tracer.start_as_current_span("remediation.apply_patch") as span:
            span.set_attribute("patch.id", patch.id)
            span.set_attribute("repository.id", repo.id)
            span.set_attribute("file.path", patch.file_path)

            try:
                # 1. Validate safe containment
                abs_file_path = PatchValidator.validate_target_file(repo.path, patch.file_path)

                # 2. Create backup snapshot
                backup_dir = Path(repo.path) / ".slothsec_backups"
                backup_dir.mkdir(parents=True, exist_ok=True)
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                file_safe_name = Path(patch.file_path).name
                backup_file = backup_dir / f"{file_safe_name}_{timestamp_str}_{uuid.uuid4().hex[:6]}.bak"
                
                shutil.copy2(abs_file_path, backup_file)
                patch.backup_path = str(backup_file)

                # 3. Determine new content
                if patch.proposed_content:
                    new_content = patch.proposed_content
                else:
                    # If diff provided, apply to original content
                    with open(abs_file_path, "r", encoding="utf-8", errors="replace") as f:
                        current_content = f.read()
                    from backend.app.services.remediation.diff_generator import DiffGenerator
                    new_content = DiffGenerator.apply_unified_diff(current_content, patch.diff)

                # 4. Atomic write using temporary file in same folder
                dir_path = os.path.dirname(abs_file_path)
                with tempfile.NamedTemporaryFile("w", dir=dir_path, delete=False, encoding="utf-8") as tf:
                    tf.write(new_content)
                    temp_name = tf.name

                os.replace(temp_name, abs_file_path)

                # 5. Record state & audit log
                patch.status = "APPLIED"
                patch.applied_at = utc_now()
                patch.error_message = None

                audit = AuditLog(
                    action="PATCH_APPLY",
                    target_type="patch",
                    target_id=patch.id,
                    details=json.dumps({
                        "file_path": patch.file_path,
                        "backup_path": str(backup_file),
                        "repository_id": repo.id
                    })
                )
                db.add(audit)
                db.commit()
                db.refresh(patch)

                span_store.metrics["patches_applied"] += 1
                logger.info(f"Successfully applied remediation patch {patch.id} to {patch.file_path}")
                return patch

            except Exception as e:
                db.rollback()
                patch.status = "FAILED"
                patch.error_message = str(e)
                db.commit()
                logger.error(f"Failed to apply patch {patch.id}: {e}")
                raise
