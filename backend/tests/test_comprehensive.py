import os
import sys
import tempfile
import pytest
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import backend.app.models
from backend.app.database.session import SessionLocal, init_db
from backend.app.models.repository import Repository
from backend.app.models.scan import ScanJob, ScannerExecution
from backend.app.models.finding import Finding
from backend.app.models.patch import RemediationPatch
from backend.app.models.analysis import AIAnalysis
from backend.app.services.scanners.normalizer import FindingNormalizer, RawFinding
from backend.app.services.remediation.applier import PatchApplier
from backend.app.services.remediation.diff_generator import DiffGenerator
from backend.app.services.reporting.json_generator import JSONReportGenerator
from backend.app.services.reporting.pdf_generator import PDFReportGenerator
from backend.app.services.ai.analyzer import extract_json_from_llm
from backend.app.schemas.analysis import AIAnalysisStructuredOutput

@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    yield db
    db.close()

def test_deduplication_logic(db_session):
    with tempfile.TemporaryDirectory() as temp_repo:
        repo = Repository(name="Dedup Test Repo", path=temp_repo)
        db_session.add(repo)
        db_session.commit()

        scan1 = ScanJob(repository_id=repo.id, scanners="semgrep")
        db_session.add(scan1)
        db_session.commit()

        raw_findings_1 = [
            RawFinding(
                scanner="semgrep",
                rule_id="test-rule-1",
                title="Test Vulnerability",
                description="First detection description",
                severity="HIGH",
                confidence="HIGH",
                file_path="main.py",
                start_line=10,
                end_line=10,
                snippet="code snippet 1"
            )
        ]

        # First run: should create new finding
        persisted_1 = FindingNormalizer.normalize_and_persist(db_session, repo.id, scan1.id, raw_findings_1)
        assert len(persisted_1) == 1
        finding_id = persisted_1[0].id
        first_detected = persisted_1[0].first_detected_at

        # Second run with same finding in new scan
        scan2 = ScanJob(repository_id=repo.id, scanners="semgrep")
        db_session.add(scan2)
        db_session.commit()

        raw_findings_2 = [
            RawFinding(
                scanner="semgrep",
                rule_id="test-rule-1",
                title="Test Vulnerability",
                description="Second detection updated description",
                severity="HIGH",
                confidence="HIGH",
                file_path="main.py",
                start_line=10,
                end_line=10,
                snippet="code snippet 1"
            )
        ]

        persisted_2 = FindingNormalizer.normalize_and_persist(db_session, repo.id, scan2.id, raw_findings_2)
        assert len(persisted_2) == 1
        # ID should remain identical (deduplicated)
        assert persisted_2[0].id == finding_id
        # First detected preserved
        assert persisted_2[0].first_detected_at == first_detected
        # Last detected updated
        assert persisted_2[0].scan_id == scan2.id

def test_remediation_security_workflow(db_session):
    with tempfile.TemporaryDirectory() as temp_repo:
        repo = Repository(name="Patch Security Repo", path=temp_repo)
        db_session.add(repo)
        db_session.commit()

        target_file = Path(temp_repo) / "vulnerable.py"
        with open(target_file, "w", encoding="utf-8") as f:
            f.write("def run():\n    return 'vulnerable'\n")

        scan = ScanJob(repository_id=repo.id, scanners="semgrep")
        db_session.add(scan)
        db_session.commit()

        finding = Finding(
            repository_id=repo.id,
            scan_id=scan.id,
            scanner="semgrep",
            rule_id="rule-vulnerable",
            title="Vulnerable Run Method",
            severity="HIGH",
            file_path="vulnerable.py",
            start_line=2,
            end_line=2
        )
        db_session.add(finding)
        db_session.commit()

        # Generate proposed patch
        diff = DiffGenerator.generate_unified_diff(
            "vulnerable.py",
            "def run():\n    return 'vulnerable'\n",
            "def run():\n    return 'safe'\n"
        )
        patch = RemediationPatch(
            finding_id=finding.id,
            repository_id=repo.id,
            file_path="vulnerable.py",
            diff=diff,
            proposed_content="def run():\n    return 'safe'\n",
            status="PROPOSED"
        )
        db_session.add(patch)
        db_session.commit()

        # RULE: Attempting to apply an unapproved patch MUST raise a ValueError
        with pytest.raises(ValueError, match="Patch must be explicitly APPROVED"):
            PatchApplier.apply_patch(db_session, patch.id)

        # Approve the patch
        patch.status = "APPROVED"
        db_session.commit()

        # Apply the patch
        applied_patch = PatchApplier.apply_patch(db_session, patch.id)
        assert applied_patch.status == "APPLIED"
        assert applied_patch.backup_path is not None
        assert os.path.exists(applied_patch.backup_path)

        # Verify file content on disk was modified safely
        with open(target_file, "r", encoding="utf-8") as f:
            content = f.read()
        assert "return 'safe'" in content
        assert "return 'vulnerable'" not in content

def test_json_and_pdf_report_generation(db_session):
    with tempfile.TemporaryDirectory() as temp_repo:
        repo = Repository(name="Report Test Repo", path=temp_repo)
        db_session.add(repo)
        db_session.commit()

        scan = ScanJob(repository_id=repo.id, scanners="semgrep,osv,gitleaks", status="completed")
        db_session.add(scan)
        db_session.commit()

        exec1 = ScannerExecution(scan_id=scan.id, scanner_name="semgrep", status="completed", findings_count=1, duration_ms=150.0)
        db_session.add(exec1)
        db_session.commit()

        finding = Finding(
            repository_id=repo.id,
            scan_id=scan.id,
            scanner="semgrep",
            rule_id="sec.rule.01",
            title="Sample Finding For PDF",
            severity="CRITICAL",
            file_path="src/index.js",
            start_line=1
        )
        db_session.add(finding)
        db_session.commit()

        # Test JSON generator
        json_report = JSONReportGenerator.generate_report(db_session, scan.id)
        assert json_report["report_type"] == "security_scan"
        assert json_report["summary"]["critical"] == 1
        assert len(json_report["findings"]) == 1

        # Test PDF generator
        pdf_bytes = PDFReportGenerator.generate_pdf(db_session, scan.id)
        assert pdf_bytes is not None
        pdf_content = pdf_bytes.getvalue()
        assert len(pdf_content) > 500
        # Standard PDF magic bytes
        assert pdf_content.startswith(b"%PDF")

def test_extract_json_from_llm_markdown():
    markdown_wrapped = """Here is the security analysis:
```json
{
  "executive_summary": "Command injection vulnerability in runner",
  "technical_explanation": "Untrusted input passed to shell process",
  "root_cause": "shell=True flag with dynamic parameters",
  "potential_impact": "Host takeover",
  "exploitability_context": "Requires attacker parameter control",
  "recommended_remediation": "Use shell=False with argument list",
  "suggested_patch_diff": "--- a/app.py\\n+++ b/app.py",
  "priority_recommendation": "CRITICAL",
  "confidence_score": 0.9,
  "limitations": "None"
}
```
Hope this helps!"""

    parsed = extract_json_from_llm(markdown_wrapped)
    assert parsed is not None
    assert parsed["priority_recommendation"] == "CRITICAL"
    obj = AIAnalysisStructuredOutput(**parsed)
    assert obj.confidence_score == 0.9
