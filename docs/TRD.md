# Technical Requirements Document (TRD) — SlothSec

## 1. System Architecture
SlothSec is structured as a decoupled, local-first web application:
- **Frontend Client:** React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5, Recharts, Lucide Icons.
- **Backend API & Orchestrator:** FastAPI, Python 3.13, Pydantic v2, SQLAlchemy 2.0, APScheduler, ReportLab.
- **Persistence:** SQLite (`slothsec.db`) with foreign key constraints and transactional integrity.
- **Inference Runtime:** Ollama local daemon serving `qwen3:4b` utilizing 6 physical CPU cores.
- **Scanner Tooling:** Semgrep 1.181.0, OSV-Scanner 2.7.0, Gitleaks 8.30.1.

## 2. Scanning & Subprocess Isolation
Each scanner runs in an isolated subprocess with explicit timeouts (default 300s) and UTF-8 encoding normalization to prevent Windows charmap exceptions:
```python
subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout_seconds)
```
- **Semgrep:** Invoked with `--config p/default --json`. Captures code AST findings, maps severity (`ERROR` -> `HIGH`, `WARNING` -> `MEDIUM`, `INFO` -> `LOW`), extracts snippets.
- **OSV-Scanner:** Invoked with `scan source --format json -r <path>`. Traverses dependency manifests/lockfiles, extracts CVEs, GHSAs, affected versions, and fixed versions.
- **Gitleaks:** Invoked with `detect --source <path> --no-git --report-format json --report-path <tempfile> --no-banner --redact`. Isolates pure JSON, strips sensitive credentials before database persistence.

## 3. Local AI Engine Specifications
- **Model:** `qwen3:4b`
- **Context Constraints:** `num_ctx: 4096`, `num_predict: 700`, `temperature: 0.1`.
- **System Prompt:** Instructs model to analyze verified scanner facts, forbids hallucinations, and enforces structured JSON output adhering to `AIAnalysisStructuredOutput`.

## 4. Remediation Engine Specifications
- **Diff Generation:** `difflib.unified_diff` creates standard Git-compatible unified diffs.
- **Safety Boundary:** `validate_safe_subpath` verifies canonical path resolution strictly within repository root.
- **Atomic Modification:** Patches write to temporary file in target directory before executing atomic `os.replace`.
- **Snapshot Rollback:** Creates timestamped `.bak` files in `<repo>/.slothsec_backups/`.
- **Verification:** Runs automated rescan using the finding's scanner; checks if finding reappears in the new scan ID before granting `VERIFIED_FIXED` status.
