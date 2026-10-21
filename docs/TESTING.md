# Testing & Quality Assurance Guide — SlothSec

SlothSec features a comprehensive multi-layered test suite encompassing unit tests, schema validation, scanner execution, secret redaction, path traversal safety, and full end-to-end integration workflows.

---

## 1. Running the Automated Test Suite

From the workspace root, run pytest using the virtual environment:
```powershell
.venv\Scripts\pytest.exe backend\tests
```

To run with verbose output:
```powershell
.venv\Scripts\pytest.exe backend\tests -v
```

---

## 2. Test Coverage Breakdown

### Backend Unit & Integration Tests (`backend/tests/test_backend.py`)
- **`test_api_health`:** Verifies service liveness, name, and environment version.
- **`test_system_status`:** Verifies scanner availability detection and Ollama status inspection.
- **`test_secret_redaction`:** Ensures AWS access keys, GitHub tokens, and private keys are replaced with `[REDACTED_SECRET]`.
- **`test_path_validation_and_containment`:** Confirms canonical path resolution and asserts that path traversal attempts (`../`) are safely rejected.
- **`test_diff_generator`:** Tests unified diff synthesis and hunk application.
- **`test_ai_schema_validation`:** Asserts strict Pydantic parsing of structured AI security outputs.

### Comprehensive Workflow Tests (`backend/tests/test_comprehensive.py`)
- **`test_deduplication_logic`:** Verifies that findings across consecutive scans of the same repository are updated and deduplicated rather than duplicated.
- **`test_remediation_security_workflow`:** Validates that attempting to apply an unapproved patch raises a security `ValueError`, verifies patch approval, atomic application, and backup file creation.
- **`test_json_and_pdf_report_generation`:** Tests ReportLab PDF compilation and structured JSON generation.
- **`test_extract_json_from_llm_markdown`:** Tests extracting structured JSON even when wrapped in markdown code blocks.

---

## 3. Real Scanner Integration Test (`backend/tests/test_live_scan.py`)
To test real deterministic tool execution against the controlled vulnerable fixture:
```powershell
.venv\Scripts\python.exe backend\tests\test_live_scan.py
```
This executes:
1. **Semgrep:** Detects `subprocess-shell-true` and `eval-detected`.
2. **OSV-Scanner:** Detects 34 CVEs/GHSAs across `urllib3`, `jinja2`, and `pyyaml`.
3. **Gitleaks:** Detects exposed RSA private key and masks secrets.
4. **Normalizer:** Persists findings in SQLite.

---

## 4. Frontend Type Checking & Production Build
To verify the frontend TypeScript codebase:
```powershell
cd frontend
npm run build
```
Builds production bundle using Vite and TypeScript compiler without errors.
