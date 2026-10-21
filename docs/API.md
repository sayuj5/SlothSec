# SlothSec REST API Specification

The SlothSec backend serves versioned REST APIs at `/api/v1` and health checks at `/api/health`. Interactive OpenAPI documentation is accessible at `http://127.0.0.1:8000/docs`.

---

## 1. System & Health Endpoints

### `GET /api/health`
Basic service liveness check.
```json
{
  "status": "ok",
  "service": "SlothSec",
  "version": "1.0.0",
  "environment": "development"
}
```

### `GET /api/v1/system/status`
Comprehensive environment status including installed scanner binaries and Ollama connectivity.

### `GET /api/v1/ai/status`
Status of local Ollama instance and configured models.

---

## 2. Repositories

### `GET /api/v1/repositories`
List all registered local repositories.

### `POST /api/v1/repositories`
Register a local workspace repository.
**Request Body:**
```json
{
  "name": "My Core API",
  "path": "C:\\Users\\...\\my-project",
  "description": "Backend service"
}
```

### `GET /api/v1/repositories/{id}`
Retrieve a single repository details.

### `DELETE /api/v1/repositories/{id}`
Unregister a repository and clean up related records.

---

## 3. Scans

### `POST /api/v1/scans`
Initiate an asynchronous scan.
**Request Body:**
```json
{
  "repository_id": "uuid-here",
  "scanners": ["semgrep", "osv", "gitleaks"]
}
```

### `GET /api/v1/scans`
List all historical scan executions (filter by `repository_id`).

### `GET /api/v1/scans/{id}`
Get scan execution status and individual tool breakdown.

### `GET /api/v1/scans/{id}/results`
Retrieve all findings detected in a specific scan run.

### `POST /api/v1/scans/{id}/cancel`
Cancel an active or queued scan.

### `POST /api/v1/scans/{id}/rescan`
Re-execute a scan using the identical configuration.

---

## 4. Findings & AI Analysis

### `GET /api/v1/findings`
List findings with query parameters: `repository_id`, `severity`, `scanner`, `status`, `search`, `limit`, `offset`.

### `GET /api/v1/findings/{id}`
Get finding details including code snippets and references.

### `PATCH /api/v1/findings/{id}/status`
Update status (`OPEN`, `RESOLVED`, `IGNORED`).

### `POST /api/v1/findings/{id}/analyze`
Trigger local Qwen3 4B analysis on the finding.
**Response:**
```json
{
  "executive_summary": "...",
  "technical_explanation": "...",
  "root_cause": "...",
  "potential_impact": "...",
  "exploitability_context": "...",
  "recommended_remediation": "...",
  "suggested_patch_diff": "--- a/file\n+++ b/file...",
  "priority_recommendation": "HIGH",
  "confidence_score": 0.85,
  "limitations": "..."
}
```

### `POST /api/v1/findings/{id}/remediate`
Generate a candidate remediation patch record.

---

## 5. Remediation Engine

### `GET /api/v1/patches`
List remediation patches.

### `POST /api/v1/patches/{id}/approve`
Explicitly approve a proposed patch (mandatory before application).

### `POST /api/v1/patches/{id}/reject`
Reject a proposed patch.

### `POST /api/v1/patches/{id}/apply`
Atomically apply approved patch to disk with backup snapshot.

### `POST /api/v1/patches/{id}/verify`
Execute a verification rescan to confirm finding eradication.

---

## 6. Reports & Observability

### `GET /api/v1/reports/{scan_id}/pdf`
Download executive PDF audit report.

### `GET /api/v1/reports/{scan_id}/json`
Download raw structured JSON report.

### `GET /api/v1/observability/traces`
Retrieve recent OpenTelemetry spans and execution attributes.

### `GET /api/v1/observability/metrics`
Retrieve local performance metrics and scanner latency averages.
