import json
import os
import subprocess
import time
from typing import List, Dict, Any
from pathlib import Path
from backend.app.services.scanners.base import BaseScanner, ScannerResult, RawFinding
from backend.app.core.security import redact_secrets
from backend.app.core.logging import logger

class OSVScanner(BaseScanner):
    def get_name(self) -> str:
        return "osv"

    def run(self, target_dir: str, timeout_seconds: int = 300) -> ScannerResult:
        start_time = time.time()
        cmd = [
            self.executable_path,
            "scan",
            "source",
            "--format", "json",
            "-r",
            target_dir
        ]

        logger.info(f"Executing OSV-Scanner on {target_dir}")
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

            # OSV-Scanner exits with 0 (clean) or 1 (vulnerabilities found)
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
                err_msg = process.stderr.strip() or f"OSV-Scanner failed with exit code {process.returncode}"
                logger.error(f"OSV-Scanner execution error: {err_msg}")
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
                error_message=f"OSV-Scanner timed out after {timeout_seconds} seconds"
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

    def _parse_json(self, raw_json: str, target_dir: str) -> List[RawFinding]:
        findings: List[RawFinding] = []
        if not raw_json or not raw_json.strip():
            return findings

        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode OSV-Scanner JSON: {e}")
            return findings

        results = data.get("results", [])
        for res in results:
            source_info = res.get("source", {})
            raw_source_path = source_info.get("path", "")
            try:
                rel_path = str(Path(raw_source_path).resolve().relative_to(Path(target_dir).resolve()))
            except Exception:
                rel_path = raw_source_path or "dependencies"

            packages = res.get("packages", [])
            for pkg_wrapper in packages:
                pkg = pkg_wrapper.get("package", {})
                pkg_name = pkg.get("name", "unknown-package")
                pkg_version = pkg.get("version", "unknown")
                ecosystem = pkg.get("ecosystem", "unknown")

                vulns = pkg_wrapper.get("vulnerabilities", [])
                for v in vulns:
                    vuln_id = v.get("id", "OSV-UNKNOWN")
                    summary = v.get("summary") or v.get("details") or f"Vulnerability in {pkg_name} ({ecosystem})"
                    description = redact_secrets(v.get("details", summary))

                    # Parse fixed versions
                    fixed_version = ""
                    for affected in v.get("affected", []):
                        for r in affected.get("ranges", []):
                            for event in r.get("events", []):
                                if "fixed" in event:
                                    fixed_version = event["fixed"]
                                    break
                            if fixed_version:
                                break
                        if fixed_version:
                            break

                    # Parse references
                    refs = [r.get("url") for r in v.get("references", []) if r.get("url")]

                    # Estimate severity from database_specific or severity list
                    severity = "MEDIUM"
                    raw_sev = str(v.get("database_specific", {}).get("severity", "")).upper()
                    if "CRITICAL" in raw_sev:
                        severity = "CRITICAL"
                    elif "HIGH" in raw_sev:
                        severity = "HIGH"
                    elif "LOW" in raw_sev:
                        severity = "LOW"
                    else:
                        # Inspect CVSS score if available
                        for sev_item in v.get("severity", []):
                            score = sev_item.get("score", "")
                            if "CVSS:3" in score or "CVSS:4" in score:
                                severity = "HIGH"

                    findings.append(RawFinding(
                        scanner=self.get_name(),
                        rule_id=vuln_id,
                        title=f"{pkg_name}: {summary[:90]}",
                        description=description,
                        severity=severity,
                        confidence="HIGH",
                        file_path=rel_path,
                        start_line=1,
                        end_line=1,
                        vulnerability_ids=vuln_id,
                        package_name=pkg_name,
                        package_version=pkg_version,
                        fixed_version=fixed_version,
                        references=refs,
                        snippet=f"{pkg_name}=={pkg_version} ({ecosystem})"
                    ))

        return findings
