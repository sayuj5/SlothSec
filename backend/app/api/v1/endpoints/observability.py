from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.core.telemetry import span_store
from backend.app.schemas.observability import SpanResponse, ObservabilityMetricsResponse, DashboardSummaryResponse
from backend.app.models.repository import Repository
from backend.app.models.scan import ScanJob
from backend.app.models.finding import Finding
from backend.app.services.scanners.runner import check_all_scanners
from backend.app.services.ai.ollama import ollama_client

router = APIRouter()

@router.get("/traces", response_model=List[SpanResponse])
def get_traces():
    return [SpanResponse(**s) for s in span_store.spans]

@router.get("/metrics", response_model=ObservabilityMetricsResponse)
def get_metrics():
    summary = span_store.get_summary()
    return ObservabilityMetricsResponse(**summary)

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_repos = db.query(Repository).count()
    total_scans = db.query(ScanJob).count()
    total_findings = db.query(Finding).count()
    open_findings = db.query(Finding).filter(Finding.status == "OPEN").count()
    resolved_findings = db.query(Finding).filter(Finding.status == "RESOLVED").count()

    crit = db.query(Finding).filter(Finding.status == "OPEN", Finding.severity == "CRITICAL").count()
    high = db.query(Finding).filter(Finding.status == "OPEN", Finding.severity == "HIGH").count()
    med = db.query(Finding).filter(Finding.status == "OPEN", Finding.severity == "MEDIUM").count()
    low = db.query(Finding).filter(Finding.status == "OPEN", Finding.severity.in_(["LOW", "INFO"])).count()

    # Recent scans
    scans = db.query(ScanJob).order_by(ScanJob.started_at.desc()).limit(5).all()
    repos = {r.id: r.name for r in db.query(Repository).all()}
    recent_scans = []
    for s in scans:
        recent_scans.append({
            "id": s.id,
            "repository_name": repos.get(s.repository_id, "Unknown"),
            "status": s.status,
            "duration_ms": s.duration_ms,
            "scanners": s.scanners,
            "started_at": s.started_at.isoformat() if s.started_at else None
        })

    # Recent findings
    findings = db.query(Finding).order_by(Finding.last_detected_at.desc()).limit(5).all()
    recent_findings = []
    for f in findings:
        recent_findings.append({
            "id": f.id,
            "title": f.title,
            "severity": f.severity,
            "scanner": f.scanner,
            "file_path": f.file_path,
            "status": f.status,
            "detected_at": f.last_detected_at.isoformat() if f.last_detected_at else None
        })

    # Real scanner & AI health
    sc_health = {k: v["available"] for k, v in check_all_scanners().items()}
    ai_avail, _, _ = ollama_client.check_status()

    return DashboardSummaryResponse(
        total_repositories=total_repos,
        total_scans=total_scans,
        total_findings=total_findings,
        open_findings=open_findings,
        resolved_findings=resolved_findings,
        critical_findings=crit,
        high_findings=high,
        medium_findings=med,
        low_findings=low,
        recent_scans=recent_scans,
        recent_findings=recent_findings,
        scanner_health=sc_health,
        ai_health=ai_avail
    )
