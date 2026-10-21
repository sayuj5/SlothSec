# Observability & Telemetry Architecture — SlothSec

SlothSec implements an enterprise-grade observability architecture built directly on OpenTelemetry standards, engineered for zero-cost local visualization with optional Sentry hooks.

---

## 1. Local OpenTelemetry Spans
Every significant operation produces OpenTelemetry spans with parent-child relationships and contextual attributes:

| Span Name | Parent | Attributes Captured |
| :--- | :--- | :--- |
| `HTTP {method} {path}` | Root | `http.method`, `http.url`, `http.status_code`, `http.duration_ms` |
| `scan.job` | Root / Trigger | `scan.id`, `repository.id`, `repository.name`, `scanners`, `scan.total_findings` |
| `scanner.{tool}` | `scan.job` | `scanner.name`, `target.path`, `scanner.status`, `scanner.findings_count` |
| `ai.analysis` | Root / Finding | `finding.id`, `finding.rule_id`, `ai.model`, `ai.confidence`, `ai.priority` |
| `remediation.apply_patch` | Root / Patch | `patch.id`, `repository.id`, `file.path` |
| `remediation.verify_patch` | Root / Patch | `patch.id`, `finding.id`, `verification.status` |

---

## 2. Zero-Cost In-Memory Span Store
Rather than requiring developers to install Jaeger, Zipkin, or paid cloud telemetry collectors, SlothSec implements an in-memory `SpanStore` that:
1. Buffers the latest 200 execution spans.
2. Serves spans via `GET /api/v1/observability/traces`.
3. Powers the interactive OpenTelemetry Spans viewer in the SlothSec UI.

---

## 3. Metrics Aggregation
The engine continuously computes rolling metrics:
- Scanner execution durations per tool (Semgrep, OSV, Gitleaks).
- Average AI inference latency (Qwen3).
- Scan success vs. failure rates.
- Patch approval and application counts.
- Verification success rates.

Served via `GET /api/v1/observability/metrics` and visualized with Recharts in the **Observability** page.

---

## 4. Optional Sentry Integration
Sentry SDK is integrated behind an environment switch. By default, it is **disabled** (`SENTRY_ENABLED=false`).
If enabled by the user with a custom DSN:
```ini
SENTRY_ENABLED=true
SENTRY_DSN=https://your-dsn@sentry.io/project
```
- Only sanitized exception stack traces and performance metrics are transmitted.
- Source code, finding details, and secrets are strictly excluded (`send_default_pii=false`).
- Normal platform operation is completely independent of Sentry.
