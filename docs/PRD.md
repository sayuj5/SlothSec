# Product Requirements Document (PRD) — SlothSec
## Your Autonomous AI Security Engineer

### 1. Vision & Identity
**SlothSec** is a privacy-first, local-first autonomous application security engineer designed for engineering teams that require serious, continuous vulnerability management without sending proprietary codebases or secrets to cloud LLMs.

### 2. Core Value Proposition
- **Deterministic Truth First:** Vulnerability discovery is performed exclusively by industry-grade deterministic security engines (Semgrep for SAST, OSV-Scanner for SCA, Gitleaks for secrets). AI does not fabricate findings.
- **Local AI Analysis:** Qwen3 (4B parameter) runs on local CPU via Ollama, translating raw scanner telemetry into actionable engineering insights, root-cause analyses, and unified code patches.
- **Safe Remediation Engine:** Remediation patches require mandatory two-step developer approval, are written atomically with backup preservation, and are verified by automatic rescan before being marked resolved.
- **Zero-Cost & Local Sovereignty:** Operates 100% on local SQLite, local Ollama, and local CLI tools. Zero cloud subscription fees or API keys required.

### 3. Key Personas & Use Cases
- **Senior Software Engineers & Team Leads:** Rapidly triage security backlogs with prioritized explanations rather than hundreds of noisy raw warnings.
- **AppSec Engineers:** Enforce repository scanning, secret redaction, and compliance tracking across multi-repository workspaces.
- **Privacy-Sensitive Organizations:** Defense, finance, and enterprise environments strictly forbidding code export to public third-party AI services.

### 4. Functional Capabilities Matrix
| Feature Area | Description | Implementation Status |
| :--- | :--- | :--- |
| **Workspace Management** | Register, validate, and monitor local filesystem repositories | Production Ready |
| **SAST Engine** | Code audit scanning powered by Semgrep | Production Ready |
| **SCA Engine** | Dependency vulnerability analysis via OSV-Scanner (OSV database) | Production Ready |
| **Secret Detection** | Real-time secret and credential detection via Gitleaks | Production Ready |
| **Secret Redaction** | Multi-tier regex and binary-level secret masking | Production Ready |
| **Local AI Reasoning** | Grounded explanation and patch synthesis via Qwen3 4B | Production Ready |
| **Reviewable Remediation** | Unified diff generation, approval gating, and atomic file patcher | Production Ready |
| **Deterministic Verification** | Automatic post-patch rescan to prove vulnerability eradication | Production Ready |
| **Audit Reporting** | One-click Executive PDF and detailed JSON reports | Production Ready |
| **Automation** | Local cron schedule triggers via APScheduler | Production Ready |
| **Observability** | OpenTelemetry spans, latency charts, and optional Sentry hooks | Production Ready |
