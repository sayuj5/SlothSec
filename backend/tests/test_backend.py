import pytest
import os
import tempfile
from backend.app.core.security import redact_secrets, validate_repository_path, validate_safe_subpath
from backend.app.services.scanners.runner import check_all_scanners
from backend.app.schemas.analysis import AIAnalysisStructuredOutput
from backend.app.services.remediation.diff_generator import DiffGenerator

def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "SlothSec"

def test_system_status(client):
    res = client.get("/api/v1/system/status")
    assert res.status_code == 200
    data = res.json()
    assert "scanners" in data
    assert "semgrep" in data["scanners"]
    assert "osv" in data["scanners"]
    assert "gitleaks" in data["scanners"]
    assert data["ai_status"]["configured_model"] == "qwen3:4b"

def test_secret_redaction():
    text_with_secrets = "api_key = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890' and aws = 'AKIA1234567890EXAMPLE'"
    sanitized = redact_secrets(text_with_secrets)
    assert "ghp_" not in sanitized
    assert "AKIA" not in sanitized
    assert "[REDACTED_SECRET]" in sanitized

def test_path_validation_and_containment():
    with tempfile.TemporaryDirectory() as temp_dir:
        validated = validate_repository_path(temp_dir)
        assert os.path.isabs(validated)

        # Safe subpath inside
        subfile = os.path.join(temp_dir, "test.py")
        with open(subfile, "w") as f:
            f.write("print('hello')")
        
        safe = validate_safe_subpath(temp_dir, "test.py")
        assert safe == subfile

        # Dangerous subpath escape
        with pytest.raises(ValueError, match="escapes repository root"):
            validate_safe_subpath(temp_dir, "../outside.py")

def test_diff_generator():
    original = "def auth():\n    return False\n"
    modified = "def auth():\n    return True\n"
    diff = DiffGenerator.generate_unified_diff("auth.py", original, modified)
    assert "--- a/auth.py" in diff
    assert "+++ b/auth.py" in diff
    assert "+    return True" in diff
    assert "-    return False" in diff

def test_ai_schema_validation():
    sample_data = {
        "executive_summary": "Insecure deserialization vulnerability",
        "technical_explanation": "Untrusted YAML loader allows arbitrary code execution",
        "root_cause": "yaml.load called without SafeLoader",
        "potential_impact": "Remote code execution",
        "exploitability_context": "Requires attacker control over YAML input",
        "recommended_remediation": "Switch to yaml.safe_load",
        "suggested_patch_diff": "--- a/app.py\n+++ b/app.py\n- yaml.load(data)\n+ yaml.safe_load(data)",
        "priority_recommendation": "HIGH",
        "confidence_score": 0.95,
        "limitations": "Assumes standard PyYAML library"
    }
    model = AIAnalysisStructuredOutput(**sample_data)
    assert model.confidence_score == 0.95
    assert model.priority_recommendation == "HIGH"
