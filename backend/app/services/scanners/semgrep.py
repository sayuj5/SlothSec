import json
import os
import re
import subprocess
import time
from typing import List, Dict, Any
from pathlib import Path
from backend.app.services.scanners.base import BaseScanner, ScannerResult, RawFinding
from backend.app.core.security import redact_secrets
from backend.app.core.logging import logger

class SemgrepScanner(BaseScanner):
    def get_name(self) -> str:
        return "semgrep"

    def run(self, target_dir: str, timeout_seconds: int = 300) -> ScannerResult:
        start_time = time.time()
        # Use p/default configuration which reliably runs offline and online
        cmd = [
            self.executable_path,
            "scan",
            "--config", "p/default",
            "--json",
            target_dir
        ]

        logger.info(f"Executing Semgrep scan on {target_dir}")
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

            # Semgrep exits with 0 (no findings) or 1 (findings detected)
            if process.returncode in (0, 1):
                findings = self._parse_json(process.stdout, target_dir)
                return ScannerResult(
                    scanner_name=self.get_name(),
                    status="completed",
                    exit_code=process.returncode,
                    duration_ms=duration_ms,
                    raw_output=process.stdout,
                    findings=findings
                )
            else:
                err_msg = process.stderr.strip() or f"Semgrep failed with exit code {process.returncode}"
                logger.error(f"Semgrep execution error: {err_msg}")
                return ScannerResult(
                    scanner_name=self.get_name(),
                    status="failed",
                    exit_code=process.returncode,
                    duration_ms=duration_ms,
                    raw_output=process.stdout,
                    error_message=err_msg
                )
        except subprocess.TimeoutExpired:
            duration_ms = (time.time() - start_time) * 1000
            return ScannerResult(
                scanner_name=self.get_name(),
                status="failed",
                exit_code=-1,
                duration_ms=duration_ms,
                raw_output="",
                error_message=f"Semgrep timed out after {timeout_seconds} seconds"
            )
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            return ScannerResult(
                scanner_name=self.get_name(),
                status="failed",
                exit_code=-1,
                duration_ms=duration_ms,
                raw_output="",
                error_message=str(e)
            )

    def _parse_json(self, raw_stdout: str, target_dir: str) -> List[RawFinding]:
        findings: List[RawFinding] = []
        if not raw_stdout or not raw_stdout.strip():
            return findings

        # Semgrep outputs progress/summary before the JSON payload; isolate the JSON object
        first_brace = raw_stdout.find('{')
        last_brace = raw_stdout.rfind('}')
        if first_brace == -1 or last_brace == -1 or last_brace <= first_brace:
            logger.error("No JSON block detected in Semgrep stdout.")
            return findings

        json_str = raw_stdout[first_brace:last_brace + 1]

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode Semgrep JSON: {e}")
            return findings

        results = data.get("results", [])
        for item in results:
            check_id = item.get("check_id", "unknown-rule")
            raw_path = item.get("path", "")
            
            try:
                rel_path = str(Path(raw_path).resolve().relative_to(Path(target_dir).resolve()))
            except Exception:
                rel_path = raw_path

            start = item.get("start", {})
            end = item.get("end", {})
            start_line = start.get("line", 1)
            end_line = end.get("line", start_line)

            extra = item.get("extra", {})
            message = redact_secrets(extra.get("message", "Security issue detected by Semgrep"))
            raw_severity = str(extra.get("severity", "WARNING")).upper()

            # Normalize severity
            severity = "MEDIUM"
            if raw_severity in ("ERROR", "CRITICAL"):
                severity = "HIGH"
            elif raw_severity in ("WARNING", "MEDIUM"):
                severity = "MEDIUM"
            elif raw_severity in ("INFO", "LOW"):
                severity = "LOW"

            metadata = extra.get("metadata", {})
            cve_list = metadata.get("cve", [])
            vuln_ids = ", ".join(cve_list) if isinstance(cve_list, list) else str(cve_list)
            
            references = metadata.get("references", [])
            if not isinstance(references, list):
                references = [str(references)]

            raw_lines = extra.get("lines", "")
            snippet = redact_secrets(raw_lines) if raw_lines and raw_lines != "requires login" else f"Rule: {check_id}"

            findings.append(RawFinding(
                scanner=self.get_name(),
                rule_id=check_id,
                title=f"Semgrep: {check_id.split('.')[-1].replace('-', ' ').title()}",
                description=message,
                severity=severity,
                confidence="HIGH",
                file_path=rel_path,
                start_line=start_line,
                end_line=end_line,
                vulnerability_ids=vuln_ids,
                references=references,
                snippet=snippet
            ))

        return findings
