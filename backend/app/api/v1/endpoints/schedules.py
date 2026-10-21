from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.schedule import ScanSchedule
from backend.app.models.repository import Repository
from backend.app.services.scheduling.scheduler import schedule_repository_scan, unschedule_scan

router = APIRouter()

class ScheduleCreate(BaseModel):
    repository_id: str
    cron_expression: str = Field(..., json_schema_extra={"example": "0 2 * * *"})
    scanners: Optional[str] = "semgrep,osv,gitleaks"

class ScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    repository_name: Optional[str] = None
    cron_expression: str
    scanners: str
    is_active: bool
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime

@router.get("", response_model=List[ScheduleResponse])
def list_schedules(db: Session = Depends(get_db)):
    schedules = db.query(ScanSchedule).order_by(ScanSchedule.created_at.desc()).all()
    repos = {r.id: r.name for r in db.query(Repository).all()}
    results = []
    for s in schedules:
        item = ScheduleResponse.from_orm(s)
        item.repository_name = repos.get(s.repository_id, "Unknown")
        results.append(item)
    return results

@router.post("", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(payload: ScheduleCreate, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == payload.repository_id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")

    schedule = ScanSchedule(
        repository_id=payload.repository_id,
        cron_expression=payload.cron_expression.strip(),
        scanners=payload.scanners or "semgrep,osv,gitleaks",
        is_active=True
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    try:
        next_run = schedule_repository_scan(schedule.id, schedule.cron_expression)
        schedule.next_run_at = next_run
        db.commit()
        db.refresh(schedule)
    except Exception as e:
        db.delete(schedule)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to register cron trigger: {e}")

    item = ScheduleResponse.from_orm(schedule)
    item.repository_name = repo.name
    return item

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: str, db: Session = Depends(get_db)):
    schedule = db.query(ScanSchedule).filter(ScanSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")

    unschedule_scan(schedule.id)
    db.delete(schedule)
    db.commit()
    return None
