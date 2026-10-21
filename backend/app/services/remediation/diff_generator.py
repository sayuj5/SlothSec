import difflib
from typing import List

class DiffGenerator:
    @staticmethod
    def generate_unified_diff(
        file_path: str,
        original_text: str,
        modified_text: str,
        context_lines: int = 3
    ) -> str:
        """
        Generates a standard Git-compatible unified diff.
        """
        orig_lines = original_text.splitlines(keepends=True)
        mod_lines = modified_text.splitlines(keepends=True)

        diff = difflib.unified_diff(
            orig_lines,
            mod_lines,
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
            n=context_lines
        )
        return "".join(diff)

    @staticmethod
    def apply_unified_diff(original_text: str, diff_text: str) -> str:
        """
        Applies a unified diff to original text.
        If the patch contains standard hunk headers, processes line additions and deletions.
        """
        orig_lines = original_text.splitlines()
        diff_lines = diff_text.splitlines()

        # Parse hunks
        new_lines = []
        orig_idx = 0

        # Scan for diff lines
        in_hunk = False
        for line in diff_lines:
            if line.startswith("@@"):
                in_hunk = True
                continue
            if not in_hunk:
                continue

            if line.startswith("+") and not line.startswith("+++"):
                new_lines.append(line[1:])
            elif line.startswith("-") and not line.startswith("---"):
                orig_idx += 1
            elif line.startswith(" "):
                new_lines.append(line[1:])
                orig_idx += 1

        # If simple replacement or no hunks detected, fallback
        if not new_lines and diff_lines:
            # If the diff wasn't parsed as hunks, return original with message
            return original_text

        # Append remaining original lines if any
        if orig_idx < len(orig_lines):
            new_lines.extend(orig_lines[orig_idx:])

        return "\n".join(new_lines)
