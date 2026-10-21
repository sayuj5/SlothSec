from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.core.logging import logger
from backend.app.database.session import SessionLocal
from backend.app.models.schedule import ScanSchedule
from backend.app.models.scan import ScanJob
from backend.app.services.scanners.runner import execute_scan_sync

scheduler = BackgroundScheduler()

def run_scheduled_scan(schedule_id: str):
    logger.info(f"Triggering scheduled scan for schedule {schedule_id}")
    db: Session = SessionLocal()
    schedule = db.query(ScanSchedule).filter(ScanSchedule.id == schedule_id).first()
    if not schedule or not schedule.is_active:
        db.close()
        return

    now = datetime.now(timezone.utc)
    schedule.last_run_at = now

    scan = ScanJob(
        repository_id=schedule.repository_id,
        status="pending",
        triggered_by="schedule",
        scanners=schedule.scanners
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # Calculate next run
    job = scheduler.get_job(schedule_id)
    if job and job.next_run_time:
        schedule.next_run_at = job.next_run_time
    db.commit()
    db.close()

    # Execute scan
    execute_scan_sync(scan.id)

def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler initialized for automated background scans.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")

def schedule_repository_scan(schedule_id: str, cron_expression: str):
    parts = cron_expression.strip().split()
    if len(parts) != 5:
        raise ValueError(f"Invalid cron expression '{cron_expression}'. Expected 5 space-separated parts: minute hour day month day-of-week.")
    
    trigger = CronTrigger.from_crontab(cron_expression)
    scheduler.add_job(
        run_scheduled_scan,
        trigger=trigger,
        id=schedule_id,
        args=[schedule_id],
        replace_existing=True
    )
    job = scheduler.get_job(schedule_id)
    return job.next_run_time if job else None

def unschedule_scan(schedule_id: str):
    if scheduler.get_job(schedule_id):
        scheduler.remove_job(schedule_id)
