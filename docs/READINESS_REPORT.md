# SlothSec — Phase 0 Environment Readiness Report

**Date:** October 2026  
**Host OS:** Windows (PowerShell)  
**Workspace Root:** `C:\Users\Sayuj\Desktop\SlothSec`

---

## 1. Environment & Tool Inspection Matrix

| Component | Required | Detected Version | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Python** | 3.11+ | 3.13.1 (`.venv\Scripts\python.exe`) | ✅ Ready | Virtual environment pre-configured |
| **Node.js** | 18+ | 24.13.1 | ✅ Ready | Modern LTS/Current runtime |
| **npm** | 9+ | 11.8.0 | ✅ Ready | Package manager ready |
| **Git** | Any modern | 2.55.0.windows.5 | ✅ Ready | Required for diffs & repository validation |
| **Ollama** | Local daemon | 0.40.6 (`http://localhost:11434`) | ✅ Online & Reachable | Verified via `/api/tags` |
| **AI Model (Default)** | `qwen3:4b` | `qwen3:4b` (2.5 GB, Q4_K_M) | ✅ Loaded & Ready | Supports completion, tools, thinking |
| **AI Model (Secondary)**| `gemma3:1b` | `gemma3:1b` (806 MB) | ✅ Loaded & Ready | Secondary lightweight fallback |
| **Semgrep** | CLI scanner | 1.181.0 | ✅ Available | Code SAST analysis |
| **OSV-Scanner** | CLI scanner | 2.7.0 (osv-scalibr 0.5.3) | ✅ Available | Dependency vulnerability scanner |
| **Gitleaks** | CLI scanner | 8.30.1 | ✅ Available | Secret detection with `--redact` |

---

## 2. Hardware & Architecture Constraints

- **CPU:** Intel Core i5-12400F (6 cores, 12 threads)
- **RAM:** 16 GB DDR4
- **GPU:** NVIDIA GT 730 (2 GB VRAM) — Ollama inference is running on CPU (`ggml`/CPU execution).
- **Optimization Strategy:**
  - Limit AI prompt sizes; feed single findings or small batches rather than entire repositories.
  - Employ streaming or async non-blocking execution for scanner and LLM tasks.
  - Implement request timeouts (30-60s) to avoid hanging on CPU inference.
  - Deterministic scanners run independently with isolated error boundaries.

---

## 3. Security & Redaction Boundaries

- **Secret Redaction:** Gitleaks output will be redacted at scanner execution time (`--redact`) and sanitization filter passes before persistence in SQLite, telemetry, logs, or LLM prompts.
- **Path Traversal Guards:** All file paths received from scanner findings or remediation requests must be strictly resolved within the registered repository root directory. Symlink escapes and relative path (`..`) attacks are explicitly rejected.
- **Safe Remediation:** AI generates candidate unified diffs or replacement snippets; patches are strictly validated, diffed, presented for human approval, applied atomically with backup snapshotting, and followed by a verification rescan. No automatic code modification or shell command execution.
- **Zero-Cost Telemetry:** OpenTelemetry is configured for local trace and metric visualization. Sentry SDK is optional and disabled by default (`SENTRY_DSN=""`).

---

## 4. Implementation Plan

### Files & Modules to Create

```
SlothSec/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── logging.py
│   │   │   ├── security.py
│   │   │   ├── exceptions.py
│   │   │   └── telemetry.py
│   │   ├── database/
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── models/
│   │   │   ├── repository.py
│   │   │   ├── scan.py
│   │   │   ├── finding.py
│   │   │   ├── analysis.py
│   │   │   ├── patch.py
│   │   │   ├── schedule.py
│   │   │   └── audit.py
│   │   ├── schemas/
│   │   │   ├── repository.py
│   │   │   ├── scan.py
│   │   │   ├── finding.py
│   │   │   ├── analysis.py
│   │   │   ├── patch.py
│   │   │   ├── observability.py
│   │   │   └── system.py
│   │   ├── services/
│   │   │   ├── repositories.py
│   │   │   ├── scanners/
│   │   │   │   ├── base.py
│   │   │   │   ├── semgrep.py
│   │   │   │   ├── osv.py
│   │   │   │   ├── gitleaks.py
│   │   │   │   ├── normalizer.py
│   │   │   │   └── runner.py
│   │   │   ├── ai/
│   │   │   │   ├── ollama.py
│   │   │   │   ├── prompts.py
│   │   │   │   └── analyzer.py
│   │   │   ├── remediation/
│   │   │   │   ├── diff_generator.py
│   │   │   │   ├── validator.py
│   │   │   │   ├── applier.py
│   │   │   │   └── verifier.py
│   │   │   ├── reporting/
│   │   │   │   ├── pdf_generator.py
│   │   │   │   └── json_generator.py
│   │   │   ├── scheduling/
│   │   │   │   └── scheduler.py
│   │   │   └── observability/
│   │   │       ├── metrics.py
│   │   │       └── tracer.py
│   │   └── api/
│   │       └── v1/
│   │           ├── api.py
│   │           └── endpoints/
│   │               ├── system.py
│   │               ├── repositories.py
│   │               ├── scans.py
│   │               ├── findings.py
│   │               ├── ai.py
│   │               ├── patches.py
│   │               ├── reports.py
│   │               ├── schedules.py
│   │               └── observability.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_health.py
│   │   ├── test_scanners.py
│   │   ├── test_normalizer.py
│   │   ├── test_ai_analyzer.py
│   │   ├── test_remediation.py
│   │   └── test_observability.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── layout/ (Sidebar, TopNav, AppShell)
│   │   │   ├── ui/ (Button, Badge, Table, Modal, Card, DiffViewer, etc.)
│   │   │   ├── dashboard/
│   │   │   ├── scans/
│   │   │   ├── findings/
│   │   │   ├── analyst/
│   │   │   ├── remediation/
│   │   │   └── observability/
│   │   ├── pages/ (Overview, Repositories, ScanCenter, Findings, AIAnalyst, Remediation, Reports, Automation, Observability, Settings)
│   │   ├── services/ (API client, queries, mutations)
│   │   ├── types/
│   │   └── hooks/
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── test_fixtures/
│   └── vulnerable_repo/ (Controlled test suite repo with deliberate test cases for SAST, SCA, and mock secret)
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT.md
│   ├── TESTING.md
│   └── OBSERVABILITY.md
├── scripts/
│   ├── check-tools.ps1
│   ├── setup.ps1
│   └── dev.ps1
├── .env.example
├── .gitignore
└── README.md
```

### Technical Risks & Mitigations
1. **CPU LLM latency:** Keep Ollama prompt payloads compact (only relevant finding snippet + scanner metadata, not full multi-megabyte files). Enforce 60-second timeouts. Provide immediate optimistic UI updates with loading spinners and status indicators.
2. **Scanner Execution Failures:** Isolate Semgrep, OSV-Scanner, and Gitleaks subprocesses. Catch exit codes cleanly (e.g., Gitleaks exits with 1 on leaks found; Semgrep can exit with 1 on findings depending on flags). Parse stdout/stderr gracefully. If one scanner fails, other scanners continue unaffected.
3. **Patch Application Safety:** Validate that target files are within repository bounds, check file hashes before modifying, maintain backup rollback copies, and require explicit two-step user review (`Approve` -> `Apply`).
