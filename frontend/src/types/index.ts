export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface Repository {
  id: string;
  name: string;
  path: string;
  description: string;
  created_at: string;
  updated_at: string;
  scans_count: number;
  open_findings_count: number;
}

export interface ScannerExecution {
  id: string;
  scanner_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  exit_code: number;
  findings_count: number;
  duration_ms: number;
  error_message?: string | null;
  executed_at: string;
}

export interface ScanJob {
  id: string;
  repository_id: string;
  repository_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggered_by: string;
  scanners: string;
  started_at: string;
  completed_at?: string | null;
  duration_ms: number;
  error_message?: string | null;
  scanner_executions: ScannerExecution[];
  findings_count: number;
}

export interface Finding {
  id: string;
  repository_id: string;
  repository_name?: string;
  scan_id: string;
  scanner: 'semgrep' | 'osv' | 'gitleaks' | string;
  rule_id: string;
  title: string;
  description?: string;
  severity: SeverityLevel;
  confidence: string;
  file_path: string;
  start_line: number;
  end_line: number;
  vulnerability_ids: string;
  package_name: string;
  package_version: string;
  fixed_version: string;
  references: string;
  snippet: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  first_detected_at: string;
  last_detected_at: string;
}

export interface AIAnalysis {
  id: string;
  finding_id: string;
  model_name: string;
  executive_summary: string;
  technical_explanation: string;
  root_cause: string;
  potential_impact: string;
  exploitability_context: string;
  recommended_remediation: string;
  suggested_patch_diff: string;
  priority_recommendation: SeverityLevel;
  confidence_score: number;
  limitations: string;
  created_at: string;
}

export interface RemediationPatch {
  id: string;
  finding_id: string;
  repository_id: string;
  file_path: string;
  diff: string;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'FAILED' | 'VERIFIED';
  backup_path?: string | null;
  approval_note?: string | null;
  applied_at?: string | null;
  verification_scan_id?: string | null;
  verification_status: 'PENDING' | 'VERIFIED_FIXED' | 'STILL_VULNERABLE';
  error_message?: string | null;
  created_at: string;
}

export interface ScanSchedule {
  id: string;
  repository_id: string;
  repository_name?: string;
  cron_expression: string;
  scanners: string;
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at: string;
}

export interface Span {
  trace_id: string;
  span_id: string;
  parent_span_id?: string | null;
  name: string;
  start_time?: string | null;
  end_time?: string | null;
  duration_ms: number;
  status: string;
  status_description?: string | null;
  attributes: Record<string, string>;
}

export interface ObservabilityMetrics {
  metrics: {
    scans_started: number;
    scans_completed: number;
    scans_failed: number;
    scanners_executed: Record<string, number>;
    scanners_failed: Record<string, number>;
    ai_inferences_total: number;
    ai_inferences_failed: number;
    patches_proposed: number;
    patches_approved: number;
    patches_rejected: number;
    patches_applied: number;
    verification_scans_total: number;
    scanner_durations_ms: Record<string, number[]>;
    ai_durations_ms: number[];
  };
  averages: {
    scanner_duration_ms: Record<string, number>;
    ai_inference_duration_ms: number;
  };
  recent_spans_count: number;
}

export interface DashboardSummary {
  total_repositories: number;
  total_scans: number;
  total_findings: number;
  open_findings: number;
  resolved_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  recent_scans: Array<{
    id: string;
    repository_name: string;
    status: string;
    duration_ms: number;
    scanners: string;
    started_at?: string | null;
  }>;
  recent_findings: Array<{
    id: string;
    title: string;
    severity: SeverityLevel;
    scanner: string;
    file_path: string;
    status: string;
    detected_at?: string | null;
  }>;
  scanner_health: Record<string, boolean>;
  ai_health: boolean;
}

export interface SystemStatus {
  app_name: string;
  version: string;
  environment: string;
  database_status: string;
  ai_status: {
    provider: string;
    base_url: string;
    configured_model: string;
    available: boolean;
    installed_models: string[];
    error?: string | null;
  };
  scanners: Record<string, {
    name: string;
    version: string;
    available: boolean;
    path: string;
    error?: string | null;
  }>;
}
