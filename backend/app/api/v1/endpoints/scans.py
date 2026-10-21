from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.repository import Repository
from backend.app.models.scan import ScanJob, ScannerExecution
from backend.app.models.finding import Finding
from backend.app.schemas.scan import ScanCreate, ScanJobResponse, ScannerExecutionResponse
from backend.app.schemas.finding import FindingResponse
from backend.app.services.scanners.runner import execute_scan_sync

router = APIRouter()

def build_scan_response(s: ScanJob, db: Session) -> ScanJobResponse:
    repo = db.query(Repository).filter(Repository.id == s.repository_id).first()
    f_count = db.query(Finding).filter(Finding.scan_id == s.id).count()
    execs = [
        ScannerExecutionResponse(
            id=e.id,
            scanner_name=e.scanner_name,
            status=e.status,
            exit_code=e.exit_code,
            findings_count=e.findings_count,
            duration_ms=e.duration_ms,
            error_message=e.error_message,
            executed_at=e.executed_at
        ) for e in s.scanner_executions
    ]
    return ScanJobResponse(
        id=s.id,
        repository_id=s.repository_id,
        repository_name=repo.name if repo else "Unknown",
        status=s.status,
        triggered_by=s.triggered_by,
        scanners=s.scanners,
        started_at=s.started_at,
        completed_at=s.completed_at,
        duration_ms=s.duration_ms,
        error_message=s.error_message,
        scanner_executions=execs,
        findings_count=f_count
    )

@router.post("", response_model=ScanJobResponse, status_code=status.HTTP_202_ACCEPTED)
def start_scan(payload: ScanCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == payload.repository_id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    scanners_str = ",".join(payload.scanners) if payload.scanners else "semgrep,osv,gitleaks"

    scan = ScanJob(
        repository_id=repo.id,
        status="pending",
        triggered_by="manual",
        scanners=scanners_str
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # Launch scan asynchronously in background
    background_tasks.add_task(execute_scan_sync, scan.id)

    return build_scan_response(scan, db)

@router.get("", response_model=List[ScanJobResponse])
def list_scans(repository_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(ScanJob)
    if repository_id:
        query = query.filter(ScanJob.repository_id == repository_id)
    scans = query.order_by(ScanJob.started_at.desc()).all()
    return [build_scan_response(s, db) for s in scans]

@router.get("/{scan_id}", response_model=ScanJobResponse)
def get_scan(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")
    return build_scan_response(scan, db)

@router.get("/{scan_id}/results", response_model=List[FindingResponse])
def get_scan_results(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")

    findings = db.query(Finding).filter(Finding.scan_id == scan_id).order_by(Finding.severity.asc()).all()
    repo = db.query(Repository).filter(Repository.id == scan.repository_id).first()

    results = []
    for f in findings:
        item = FindingResponse.from_orm(f)
        item.repository_name = repo.name if repo else "Unknown"
        results.append(item)
    return results

@router.post("/{scan_id}/cancel", response_model=ScanJobResponse)
def cancel_scan(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")

    if scan.status in ("completed", "failed", "cancelled"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot cancel scan in '{scan.status}' status.")

    scan.status = "cancelled"
    db.commit()
    db.refresh(scan)
    return build_scan_response(scan, db)

@router.post("/{scan_id}/rescan", response_model=ScanJobResponse, status_code=status.HTTP_202_ACCEPTED)
def rescan(scan_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    orig_scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not orig_scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original scan not found.")

    new_scan = ScanJob(
        repository_id=orig_scan.repository_id,
        status="pending",
        triggered_by="rescan",
        scanners=orig_scan.scanners
    )
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    background_tasks.add_task(execute_scan_sync, new_scan.id)
    return build_scan_response(new_scan, db)
