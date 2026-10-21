from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.repository import Repository
from backend.app.models.scan import ScanJob
from backend.app.models.finding import Finding
from backend.app.schemas.repository import RepositoryCreate, RepositoryResponse
from backend.app.core.security import validate_repository_path

router = APIRouter()

@router.get("", response_model=List[RepositoryResponse])
def list_repositories(db: Session = Depends(get_db)):
    repos = db.query(Repository).order_by(Repository.created_at.desc()).all()
    results = []
    for r in repos:
        scans_count = db.query(ScanJob).filter(ScanJob.repository_id == r.id).count()
        open_findings = db.query(Finding).filter(Finding.repository_id == r.id, Finding.status == "OPEN").count()
        results.append(RepositoryResponse(
            id=r.id,
            name=r.name,
            path=r.path,
            description=r.description or "",
            created_at=r.created_at,
            updated_at=r.updated_at,
            scans_count=scans_count,
            open_findings_count=open_findings
        ))
    return results

@router.post("", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED)
def register_repository(payload: RepositoryCreate, db: Session = Depends(get_db)):
    try:
        validated_path = validate_repository_path(payload.path)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Check if path already registered
    existing = db.query(Repository).filter(Repository.path == validated_path).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Repository at path '{validated_path}' is already registered with ID {existing.id}."
        )

    repo = Repository(
        name=payload.name.strip(),
        path=validated_path,
        description=payload.description.strip()
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)

    return RepositoryResponse(
        id=repo.id,
        name=repo.name,
        path=repo.path,
        description=repo.description or "",
        created_at=repo.created_at,
        updated_at=repo.updated_at,
        scans_count=0,
        open_findings_count=0
    )

@router.get("/{repository_id}", response_model=RepositoryResponse)
def get_repository(repository_id: str, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    scans_count = db.query(ScanJob).filter(ScanJob.repository_id == repo.id).count()
    open_findings = db.query(Finding).filter(Finding.repository_id == repo.id, Finding.status == "OPEN").count()

    return RepositoryResponse(
        id=repo.id,
        name=repo.name,
        path=repo.path,
        description=repo.description or "",
        created_at=repo.created_at,
        updated_at=repo.updated_at,
        scans_count=scans_count,
        open_findings_count=open_findings
    )

@router.delete("/{repository_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_repository(repository_id: str, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    db.delete(repo)
    db.commit()
    return None
