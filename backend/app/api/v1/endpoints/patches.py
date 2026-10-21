from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.patch import RemediationPatch
from backend.app.schemas.patch import RemediationPatchResponse, PatchReviewAction
from backend.app.services.remediation.applier import PatchApplier
from backend.app.services.remediation.verifier import PatchVerifier

router = APIRouter()

@router.get("", response_model=List[RemediationPatchResponse])
def list_patches(
    repository_id: Optional[str] = Query(None),
    finding_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    query = db.query(RemediationPatch)
    if repository_id:
        query = query.filter(RemediationPatch.repository_id == repository_id)
    if finding_id:
        query = query.filter(RemediationPatch.finding_id == finding_id)
    if status_filter:
        query = query.filter(RemediationPatch.status == status_filter.upper())

    patches = query.order_by(RemediationPatch.created_at.desc()).all()
    return [RemediationPatchResponse.from_orm(p) for p in patches]

@router.get("/{patch_id}", response_model=RemediationPatchResponse)
def get_patch(patch_id: str, db: Session = Depends(get_db)):
    patch = db.query(RemediationPatch).filter(RemediationPatch.id == patch_id).first()
    if not patch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patch not found.")
    return RemediationPatchResponse.from_orm(patch)

@router.post("/{patch_id}/approve", response_model=RemediationPatchResponse)
def approve_patch(patch_id: str, payload: PatchReviewAction = None, db: Session = Depends(get_db)):
    patch = db.query(RemediationPatch).filter(RemediationPatch.id == patch_id).first()
    if not patch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patch not found.")

    patch.status = "APPROVED"
    if payload and payload.note:
        patch.approval_note = payload.note
    db.commit()
    db.refresh(patch)
    return RemediationPatchResponse.from_orm(patch)

@router.post("/{patch_id}/reject", response_model=RemediationPatchResponse)
def reject_patch(patch_id: str, payload: PatchReviewAction = None, db: Session = Depends(get_db)):
    patch = db.query(RemediationPatch).filter(RemediationPatch.id == patch_id).first()
    if not patch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patch not found.")

    patch.status = "REJECTED"
    if payload and payload.note:
        patch.approval_note = payload.note
    db.commit()
    db.refresh(patch)
    return RemediationPatchResponse.from_orm(patch)

@router.post("/{patch_id}/apply", response_model=RemediationPatchResponse)
def apply_patch(patch_id: str, db: Session = Depends(get_db)):
    try:
        updated_patch = PatchApplier.apply_patch(db, patch_id)
        return RemediationPatchResponse.from_orm(updated_patch)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Patch application failed: {e}")

@router.post("/{patch_id}/verify", response_model=RemediationPatchResponse)
def verify_patch(patch_id: str, db: Session = Depends(get_db)):
    try:
        verified_patch = PatchVerifier.verify_patch(db, patch_id)
        return RemediationPatchResponse.from_orm(verified_patch)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Verification rescan failed: {e}")
