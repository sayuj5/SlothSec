import os
import shutil
import subprocess
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from backend.app.core.logging import logger

@dataclass
class RawFinding:
    scanner: str
    rule_id: str
    title: str
    description: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    confidence: str  # HIGH, MEDIUM, LOW
    file_path: str
    start_line: int
    end_line: int
    vulnerability_ids: str = ""
    package_name: str = ""
    package_version: str = ""
    fixed_version: str = ""
    references: List[str] = field(default_factory=list)
    snippet: str = ""

@dataclass
class ScannerResult:
    scanner_name: str
    status: str  # completed, failed
    exit_code: int
    duration_ms: float
    raw_output: str
    error_message: Optional[str] = None
    findings: List[RawFinding] = field(default_factory=list)

class BaseScanner(ABC):
    def __init__(self, executable_path: str):
        self.executable_path = executable_path

    @abstractmethod
    def get_name(self) -> str:
        """Return the scanner identifier (e.g. 'semgrep', 'osv', 'gitleaks')."""
        pass

    def check_available(self) -> Tuple[bool, str, Optional[str]]:
        """
        Checks if the scanner executable is installed and runnable.
        Returns: (is_available, version_string, error_message)
        """
        path = shutil.which(self.executable_path)
        if not path:
            return False, "Not Installed", f"Binary '{self.executable_path}' not found in PATH."
        try:
            res = subprocess.run(
                [self.executable_path, "--version"],
                capture_output=True,
                text=True,
                timeout=10,
                check=False
            )
            version_str = res.stdout.strip() or res.stderr.strip()
            # If the output has multiple lines, take the first line
            first_line = version_str.split("\n")[0] if version_str else "Unknown"
            return True, first_line, None
        except Exception as e:
            return False, "Error", str(e)

    @abstractmethod
    def run(self, target_dir: str, timeout_seconds: int = 300) -> ScannerResult:
        """Run the scanner against the target directory and return normalized results."""
        pass
