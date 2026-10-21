import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import backend.app.models
from backend.app.database.session import SessionLocal, init_db
from backend.app.models.repository import Repository
from backend.app.models.scan import ScanJob
from backend.app.models.finding import Finding
from backend.app.services.scanners.runner import execute_scan_sync

def test_full_scan():
    init_db()
    db = SessionLocal()
    
    target_repo_path = str(Path("test_fixtures/controlled_vulnerable_repo").resolve())
    print("Target Repo Path:", target_repo_path)
    
    repo = db.query(Repository).filter(Repository.path == target_repo_path).first()
    if not repo:
        repo = Repository(name="Controlled Test Repo", path=target_repo_path, description="Test fixture for scanners")
        db.add(repo)
        db.commit()
        db.refresh(repo)
    
    print(f"Repository: {repo.name} (ID: {repo.id})")
    
    scan = ScanJob(
        repository_id=repo.id,
        scanners="semgrep,osv,gitleaks",
        status="pending"
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    
    print(f"Executing scan {scan.id}...")
    execute_scan_sync(scan.id)
    
    db.refresh(scan)
    print(f"\nScan Finished with status: {scan.status} (Duration: {round(scan.duration_ms, 1)}ms)")
    print("\nScanner Executions:")
    for ex in scan.scanner_executions:
        print(f" - {ex.scanner_name.upper()}: status={ex.status}, findings={ex.findings_count}, duration={round(ex.duration_ms, 1)}ms, err={ex.error_message}")
        
    findings = db.query(Finding).filter(Finding.scan_id == scan.id).all()
    print(f"\nTotal Findings Detected: {len(findings)}")
    for f in findings:
        print(f" -> [{f.severity}] [{f.scanner.upper()}] {f.title} ({f.file_path}:{f.start_line}) [Snippet: {f.snippet[:60]}...]")
    
    db.close()

if __name__ == "__main__":
    test_full_scan()
