from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database.session import get_db
from backend.app.models.finding import Finding
from backend.app.models.repository import Repository
from backend.app.models.analysis import AIAnalysis
from backend.app.models.patch import RemediationPatch
from backend.app.schemas.finding import FindingResponse, FindingUpdateStatus
from backend.app.schemas.analysis import AIAnalysisRequest, AIAnalysisResponse
from backend.app.schemas.patch import RemediationPatchResponse, PatchCreate
from backend.app.services.ai.analyzer import AIAnalyzerService
from backend.app.services.remediation.diff_generator import DiffGenerator

router = APIRouter()

@router.get("", response_model=List[FindingResponse])
def list_findings(
    repository_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    scanner: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Finding)

    if repository_id:
        query = query.filter(Finding.repository_id == repository_id)
    if severity:
        query = query.filter(Finding.severity == severity.upper())
    if scanner:
        query = query.filter(Finding.scanner == scanner.lower())
    if status:
        query = query.filter(Finding.status == status.upper())
    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                Finding.title.ilike(s_term),
                Finding.rule_id.ilike(s_term),
                Finding.file_path.ilike(s_term),
                Finding.description.ilike(s_term),
                Finding.package_name.ilike(s_term)
            )
        )

    findings = query.order_by(Finding.last_detected_at.desc()).offset(offset).limit(limit).all()

    # Pre-fetch repository names
    repos = {r.id: r.name for r in db.query(Repository).all()}

    results = []
    for f in findings:
        item = FindingResponse.from_orm(f)
        item.repository_name = repos.get(f.repository_id, "Unknown")
        results.append(item)
    return results

@router.get("/{finding_id}", response_model=FindingResponse)
def get_finding(finding_id: str, db: Session = Depends(get_db)):
    f = db.query(Finding).filter(Finding.id == finding_id).first()
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")
    repo = db.query(Repository).filter(Repository.id == f.repository_id).first()
    item = FindingResponse.from_orm(f)
    item.repository_name = repo.name if repo else "Unknown"
    return item

@router.patch("/{finding_id}/status", response_model=FindingResponse)
def update_finding_status(finding_id: str, payload: FindingUpdateStatus, db: Session = Depends(get_db)):
    f = db.query(Finding).filter(Finding.id == finding_id).first()
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")
    f.status = payload.status
    db.commit()
    db.refresh(f)
    repo = db.query(Repository).filter(Repository.id == f.repository_id).first()
    item = FindingResponse.from_orm(f)
    item.repository_name = repo.name if repo else "Unknown"
    return item

@router.post("/{finding_id}/analyze", response_model=AIAnalysisResponse)
def analyze_finding(finding_id: str, payload: AIAnalysisRequest = None, db: Session = Depends(get_db)):
    custom_inst = payload.custom_instructions if payload else ""
    try:
        analysis = AIAnalyzerService.analyze_finding(db, finding_id, custom_instructions=custom_inst)
        return AIAnalysisResponse.from_orm(analysis)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI analysis failed: {e}")

@router.get("/{finding_id}/analyses", response_model=List[AIAnalysisResponse])
def get_finding_analyses(finding_id: str, db: Session = Depends(get_db)):
    analyses = db.query(AIAnalysis).filter(AIAnalysis.finding_id == finding_id).order_by(AIAnalysis.created_at.desc()).all()
    return [AIAnalysisResponse.from_orm(a) for a in analyses]

@router.post("/{finding_id}/remediate", response_model=RemediationPatchResponse, status_code=status.HTTP_201_CREATED)
def propose_remediation(finding_id: str, payload: PatchCreate = None, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")

    repo = db.query(Repository).filter(Repository.id == finding.repository_id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    # Read original file content if target file exists
    import os
    from pathlib import Path
    try:
        abs_path = Path(repo.path) / finding.file_path
        if abs_path.is_file():
            with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
                original_content = f.read()
        else:
            original_content = finding.snippet or ""
    except Exception:
        original_content = finding.snippet or ""

    # Check if custom diff or proposed content provided
    proposed_content = payload.proposed_content if payload and payload.proposed_content else None
    diff_text = payload.custom_diff if payload and payload.custom_diff else None

    # If neither provided, check if an existing AIAnalysis contains suggested_patch_diff
    if not diff_text and not proposed_content:
        latest_analysis = db.query(AIAnalysis).filter(AIAnalysis.finding_id == finding_id).order_by(AIAnalysis.created_at.desc()).first()
        if latest_analysis and latest_analysis.suggested_patch_diff:
            diff_text = latest_analysis.suggested_patch_diff
        else:
            # Generate a baseline patch draft
            diff_text = DiffGenerator.generate_unified_diff(
                file_path=finding.file_path,
                original_text=original_content,
                modified_text=f"# SlothSec Remediation: Update needed for {finding.rule_id}\n" + original_content
            )

    patch = RemediationPatch(
        finding_id=finding.id,
        repository_id=repo.id,
        file_path=finding.file_path,
        original_content=original_content,
        proposed_content=proposed_content or "",
        diff=diff_text or "No diff generated",
        status="PROPOSED",
        verification_status="PENDING"
    )
    db.add(patch)
    db.commit()
    db.refresh(patch)

    return RemediationPatchResponse.from_orm(patch)
