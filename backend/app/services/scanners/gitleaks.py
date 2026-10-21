import json
import os
import tempfile
import subprocess
import time
from typing import List, Dict, Any
from pathlib import Path
from backend.app.services.scanners.base import BaseScanner, ScannerResult, RawFinding
from backend.app.core.security import redact_secrets
from backend.app.core.logging import logger

class GitleaksScanner(BaseScanner):
    def get_name(self) -> str:
        return "gitleaks"

    def run(self, target_dir: str, timeout_seconds: int = 300) -> ScannerResult:
        start_time = time.time()
        
        # Use a secure temporary file to receive pure JSON output from Gitleaks
        temp_report = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        temp_report_path = temp_report.name
        temp_report.close()

        cmd = [
            self.executable_path,
            "detect",
            "--source", target_dir,
            "--no-git",
            "--report-format", "json",
            "--report-path", temp_report_path,
            "--no-banner",
            "--redact"
        ]

        logger.info(f"Executing Gitleaks on {target_dir}")
        try:
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout_seconds,
                check=False
            )
            duration_ms = (time.time() - start_time) * 1000

            # Gitleaks returns 0 (no leaks found) or 1 (leaks detected)
            if process.returncode in (0, 1):
                # Read from report file
                raw_json = ""
                if os.path.exists(temp_report_path):
                    with open(temp_report_path, "r", encoding="utf-8", errors="replace") as rf:
                        raw_json = rf.read()
                    os.unlink(temp_report_path)

                findings = self._parse_json(raw_json, target_dir)
                return ScannerResult(
                    scanner_name=self.get_name(),
                    status="completed",
                    exit_code=process.returncode,
                    duration_ms=duration_ms,
                    raw_output="[SANITIZED_GITLEAKS_REPORT]",
                    findings=findings
                )
            else:
                if os.path.exists(temp_report_path):
                    os.unlink(temp_report_path)
                err_msg = process.stderr.strip() or f"Gitleaks failed with exit code {process.returncode}"
                logger.error(f"Gitleaks execution error: {err_msg}")
                return ScannerResult(
                    scanner_name=self.get_name(),
                    status="failed",
                    exit_code=process.returncode,
                    duration_ms=duration_ms,
                    raw_output="",
                    error_message=err_msg
                )
        except subprocess.TimeoutExpired:
            if os.path.exists(temp_report_path):
                os.unlink(temp_report_path)
            duration_ms = (time.time() - start_time) * 1000
            return ScannerResult(
                scanner_name=self.get_name(),
                status="failed",
                exit_code=-1,
                duration_ms=duration_ms,
                raw_output="",
                error_message=f"Gitleaks timed out after {timeout_seconds} seconds"
            )
        except Exception as e:
            if os.path.exists(temp_report_path):
                os.unlink(temp_report_path)
            duration_ms = (time.time() - start_time) * 1000
            return ScannerResult(
                scanner_name=self.get_name(),
                status="failed",
                exit_code=-1,
                duration_ms=duration_ms,
                raw_output="",
                error_message=str(e)
            )

    def _parse_json(self, raw_json: str, target_dir: str) -> List[RawFinding]:
        findings: List[RawFinding] = []
        if not raw_json or not raw_json.strip():
            return findings

        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode Gitleaks JSON: {e}")
            return findings

        if not isinstance(data, list):
            return findings

        for item in data:
            rule_id = item.get("RuleID", "hardcoded-secret")
            desc = item.get("Description", "Hardcoded credential or secret detected")
            raw_path = item.get("File", "")
            try:
                rel_path = str(Path(raw_path).resolve().relative_to(Path(target_dir).resolve()))
            except Exception:
                rel_path = raw_path

            start_line = item.get("StartLine", 1)
            end_line = item.get("EndLine", start_line)

            # Strictly sanitize secret and snippet representation
            secret_preview = redact_secrets(item.get("Secret", "[REDACTED]"))
            snippet = f"Secret detected [{rule_id}]: {secret_preview}"

            findings.append(RawFinding(
                scanner=self.get_name(),
                rule_id=rule_id,
                title=f"Exposed Secret: {desc}",
                description=f"Potential hardcoded secret or credential ({rule_id}) found in repository source.",
                severity="CRITICAL",
                confidence="HIGH",
                file_path=rel_path,
                start_line=start_line,
                end_line=end_line,
                vulnerability_ids="CWE-798",
                references=["https://cwe.mitre.org/data/definitions/798.html"],
                snippet=snippet
            ))

        return findings
