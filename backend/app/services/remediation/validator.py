import os
import hashlib
from pathlib import Path
from backend.app.core.security import validate_safe_subpath

class PatchValidator:
    @staticmethod
    def validate_target_file(repo_root: str, relative_file_path: str) -> str:
        """
        Validates that the target file path exists, is inside the repo, and is writable.
        Returns the safe absolute path.
        """
        safe_path = validate_safe_subpath(repo_root, relative_file_path)
        path_obj = Path(safe_path)

        if not path_obj.exists():
            raise FileNotFoundError(f"Target file does not exist: {relative_file_path}")
        if not path_obj.is_file():
            raise ValueError(f"Target path is not a regular file: {relative_file_path}")
        if not os.access(safe_path, os.W_OK):
            raise PermissionError(f"File is not writable: {relative_file_path}")

        return safe_path

    @staticmethod
    def compute_file_hash(file_path: str) -> str:
        with open(file_path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
