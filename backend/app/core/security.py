import os
import re
from pathlib import Path
from typing import Optional

# Regex patterns for common secret formats to supplement scanner redaction
SECRET_PATTERNS = [
    re.compile(r'(?i)(api[_-]?key|secret|token|password|passwd|auth[_-]?token|access[_-]?token)\s*[:=]\s*["\']?([a-zA-Z0-9_\-\.\/+=]{8,})["\']?'),
    re.compile(r'gh[pousr]_[A-Za-z0-9_]{36,255}'),  # GitHub tokens
    re.compile(r'AKIA[0-9A-Z]{16}'),                 # AWS Access Key ID
    re.compile(r'(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}'), # Bearer tokens
    re.compile(r'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'),
]

def validate_repository_path(raw_path: str) -> str:
    """
    Validates that raw_path exists, is a directory, and normalizes it to an absolute path.
    Raises ValueError on invalid or unsafe paths.
    """
    if not raw_path or not raw_path.strip():
        raise ValueError("Repository path cannot be empty.")
    
    clean_path = os.path.expanduser(raw_path.strip())
    resolved = Path(clean_path).resolve()
    
    if not resolved.exists():
        raise ValueError(f"Path does not exist: {resolved}")
    if not resolved.is_dir():
        raise ValueError(f"Path is not a directory: {resolved}")
    
    return str(resolved)

def validate_safe_subpath(repo_root: str, relative_or_absolute_file: str) -> str:
    """
    Ensures that relative_or_absolute_file resides strictly within repo_root.
    Guards against path traversal (../) and malicious symlink escapes.
    Returns the resolved safe absolute path string.
    """
    root_resolved = Path(repo_root).resolve()
    
    # If it's already absolute or relative, resolve relative to root
    target = Path(relative_or_absolute_file)
    if not target.is_absolute():
        target = root_resolved / target
    
    resolved_target = target.resolve()
    
    # Check that root_resolved is an ancestor of resolved_target
    try:
        resolved_target.relative_to(root_resolved)
    except ValueError:
        raise ValueError(f"Security error: Target path '{resolved_target}' escapes repository root '{root_resolved}'")
    
    return str(resolved_target)

def redact_secrets(text: Optional[str]) -> str:
    """
    Sanitizes strings to prevent sensitive credentials, passwords, or keys
    from entering logs, database storage, or AI prompts.
    """
    if not text:
        return ""
    
    sanitized = text
    for pattern in SECRET_PATTERNS:
        # If pattern has groups, mask the matched secret value group
        if pattern.groups > 0:
            def replace_match(m):
                full = m.group(0)
                if len(m.groups()) >= 2:
                    val = m.group(2)
                    return full.replace(val, "[REDACTED_SECRET]")
                return "[REDACTED_SECRET]"
            sanitized = pattern.sub(replace_match, sanitized)
        else:
            sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)
            
    return sanitized
