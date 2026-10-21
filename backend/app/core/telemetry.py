import time
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, SpanExporter, SpanExportResult
from opentelemetry.trace import Status, StatusCode
from backend.app.core.config import settings
from backend.app.core.logging import logger

# In-memory store of recent spans and metrics for zero-cost local observability
MAX_SAVED_SPANS = 200

class LocalSpanStore:
    def __init__(self):
        self.spans: List[Dict[str, Any]] = []
        self.metrics = {
            "scans_started": 0,
            "scans_completed": 0,
            "scans_failed": 0,
            "scanners_executed": {"semgrep": 0, "osv": 0, "gitleaks": 0},
            "scanners_failed": {"semgrep": 0, "osv": 0, "gitleaks": 0},
            "ai_inferences_total": 0,
            "ai_inferences_failed": 0,
            "patches_proposed": 0,
            "patches_approved": 0,
            "patches_rejected": 0,
            "patches_applied": 0,
            "verification_scans_total": 0,
            "scanner_durations_ms": {"semgrep": [], "osv": [], "gitleaks": []},
            "ai_durations_ms": [],
        }

    def add_span(self, span_data: Dict[str, Any]):
        self.spans.insert(0, span_data)
        if len(self.spans) > MAX_SAVED_SPANS:
            self.spans.pop()

    def record_scanner_run(self, scanner: str, duration_ms: float, success: bool):
        s_name = scanner.lower()
        if s_name in self.metrics["scanners_executed"]:
            self.metrics["scanners_executed"][s_name] += 1
            if not success:
                self.metrics["scanners_failed"][s_name] += 1
            dur_list = self.metrics["scanner_durations_ms"][s_name]
            dur_list.append(round(duration_ms, 2))
            if len(dur_list) > 50:
                dur_list.pop(0)

    def record_ai_inference(self, duration_ms: float, success: bool):
        self.metrics["ai_inferences_total"] += 1
        if not success:
            self.metrics["ai_inferences_failed"] += 1
        self.metrics["ai_durations_ms"].append(round(duration_ms, 2))
        if len(self.metrics["ai_durations_ms"]) > 50:
            self.metrics["ai_durations_ms"].pop(0)

    def get_summary(self) -> Dict[str, Any]:
        # Compute averages safely
        avg_scanner_duration = {}
        for scanner, durs in self.metrics["scanner_durations_ms"].items():
            avg_scanner_duration[scanner] = round(sum(durs) / len(durs), 2) if durs else 0.0
        
        avg_ai = round(sum(self.metrics["ai_durations_ms"]) / len(self.metrics["ai_durations_ms"]), 2) if self.metrics["ai_durations_ms"] else 0.0

        return {
            "metrics": self.metrics,
            "averages": {
                "scanner_duration_ms": avg_scanner_duration,
                "ai_inference_duration_ms": avg_ai
            },
            "recent_spans_count": len(self.spans)
        }

span_store = LocalSpanStore()

class InMemorySpanExporter(SpanExporter):
    def export(self, spans) -> SpanExportResult:
        for s in spans:
            duration_ms = (s.end_time - s.start_time) / 1_000_000 if s.end_time and s.start_time else 0.0
            
            # Format attributes safely
            attrs = {}
            for k, v in s.attributes.items():
                attrs[k] = str(v)

            span_record = {
                "trace_id": format(s.context.trace_id, "032x"),
                "span_id": format(s.context.span_id, "016x"),
                "parent_span_id": format(s.parent.span_id, "016x") if s.parent else None,
                "name": s.name,
                "start_time": datetime.fromtimestamp(s.start_time / 1e9, tz=timezone.utc).isoformat() if s.start_time else None,
                "end_time": datetime.fromtimestamp(s.end_time / 1e9, tz=timezone.utc).isoformat() if s.end_time else None,
                "duration_ms": round(duration_ms, 2),
                "status": s.status.status_code.name if s.status else "UNSET",
                "status_description": s.status.description if s.status else None,
                "attributes": attrs,
            }
            span_store.add_span(span_record)
        return SpanExportResult.SUCCESS

    def shutdown(self):
        pass

# Initialize OpenTelemetry Provider
provider = TracerProvider()
provider.add_span_processor(SimpleSpanProcessor(InMemorySpanExporter()))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(settings.OTEL_SERVICE_NAME, settings.APP_VERSION)

# Optional Sentry Integration
if settings.SENTRY_ENABLED and settings.SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            release=f"{settings.APP_NAME}@{settings.APP_VERSION}",
            send_default_pii=False, # Privacy first: never leak code or tokens
        )
        logger.info("Sentry initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize Sentry: {e}")
