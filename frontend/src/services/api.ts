import axios from 'axios';
import type {
  SystemStatus,
  DashboardSummary,
  Repository,
  ScanJob,
  Finding,
  AIAnalysis,
  RemediationPatch,
  ScanSchedule,
  Span,
  ObservabilityMetrics,
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // System & Health
  getSystemStatus: async (): Promise<SystemStatus> => {
    const res = await api.get<SystemStatus>('/system/status');
    return res.data;
  },
  getAIStatus: async () => {
    const res = await api.get('/ai/status');
    return res.data;
  },

  // Dashboard
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await api.get<DashboardSummary>('/observability/dashboard/summary');
    return res.data;
  },

  // Repositories
  listRepositories: async (): Promise<Repository[]> => {
    const res = await api.get<Repository[]>('/repositories');
    return res.data;
  },
  getRepository: async (id: string): Promise<Repository> => {
    const res = await api.get<Repository>(`/repositories/${id}`);
    return res.data;
  },
  createRepository: async (data: { name: string; path: string; description?: string }): Promise<Repository> => {
    const res = await api.post<Repository>('/repositories', data);
    return res.data;
  },
  deleteRepository: async (id: string): Promise<void> => {
    await api.delete(`/repositories/${id}`);
  },

  // Scans
  listScans: async (repositoryId?: string): Promise<ScanJob[]> => {
    const params = repositoryId ? { repository_id: repositoryId } : {};
    const res = await api.get<ScanJob[]>('/scans', { params });
    return res.data;
  },
  getScan: async (id: string): Promise<ScanJob> => {
    const res = await api.get<ScanJob>(`/scans/${id}`);
    return res.data;
  },
  startScan: async (repositoryId: string, scanners?: string[]): Promise<ScanJob> => {
    const res = await api.post<ScanJob>('/scans', { repository_id: repositoryId, scanners });
    return res.data;
  },
  getScanResults: async (id: string): Promise<Finding[]> => {
    const res = await api.get<Finding[]>(`/scans/${id}/results`);
    return res.data;
  },
  cancelScan: async (id: string): Promise<ScanJob> => {
    const res = await api.post<ScanJob>(`/scans/${id}/cancel`);
    return res.data;
  },
  rescan: async (id: string): Promise<ScanJob> => {
    const res = await api.post<ScanJob>(`/scans/${id}/rescan`);
    return res.data;
  },

  // Findings
  listFindings: async (params?: {
    repository_id?: string;
    severity?: string;
    scanner?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Finding[]> => {
    const res = await api.get<Finding[]>('/findings', { params });
    return res.data;
  },
  getFinding: async (id: string): Promise<Finding> => {
    const res = await api.get<Finding>(`/findings/${id}`);
    return res.data;
  },
  updateFindingStatus: async (id: string, status: 'OPEN' | 'RESOLVED' | 'IGNORED'): Promise<Finding> => {
    const res = await api.patch<Finding>(`/findings/${id}/status`, { status });
    return res.data;
  },
  analyzeFinding: async (id: string, customInstructions?: string): Promise<AIAnalysis> => {
    const res = await api.post<AIAnalysis>(`/findings/${id}/analyze`, {
      custom_instructions: customInstructions,
    });
    return res.data;
  },
  getFindingAnalyses: async (id: string): Promise<AIAnalysis[]> => {
    const res = await api.get<AIAnalysis[]>(`/findings/${id}/analyses`);
    return res.data;
  },
  proposeRemediation: async (id: string, customDiff?: string): Promise<RemediationPatch> => {
    const res = await api.post<RemediationPatch>(`/findings/${id}/remediate`, {
      custom_diff: customDiff,
    });
    return res.data;
  },

  // Patches & Remediation
  listPatches: async (params?: { repository_id?: string; finding_id?: string; status?: string }): Promise<RemediationPatch[]> => {
    const res = await api.get<RemediationPatch[]>('/patches', { params });
    return res.data;
  },
  getPatch: async (id: string): Promise<RemediationPatch> => {
    const res = await api.get<RemediationPatch>(`/patches/${id}`);
    return res.data;
  },
  approvePatch: async (id: string, note?: string): Promise<RemediationPatch> => {
    const res = await api.post<RemediationPatch>(`/patches/${id}/approve`, { note });
    return res.data;
  },
  rejectPatch: async (id: string, note?: string): Promise<RemediationPatch> => {
    const res = await api.post<RemediationPatch>(`/patches/${id}/reject`, { note });
    return res.data;
  },
  applyPatch: async (id: string): Promise<RemediationPatch> => {
    const res = await api.post<RemediationPatch>(`/patches/${id}/apply`);
    return res.data;
  },
  verifyPatch: async (id: string): Promise<RemediationPatch> => {
    const res = await api.post<RemediationPatch>(`/patches/${id}/verify`);
    return res.data;
  },

  // Schedules
  listSchedules: async (): Promise<ScanSchedule[]> => {
    const res = await api.get<ScanSchedule[]>('/schedules');
    return res.data;
  },
  createSchedule: async (data: { repository_id: string; cron_expression: string; scanners?: string }): Promise<ScanSchedule> => {
    const res = await api.post<ScanSchedule>('/schedules', data);
    return res.data;
  },
  deleteSchedule: async (id: string): Promise<void> => {
    await api.delete(`/schedules/${id}`);
  },

  // Observability
  getTraces: async (): Promise<Span[]> => {
    const res = await api.get<Span[]>('/observability/traces');
    return res.data;
  },
  getMetrics: async (): Promise<ObservabilityMetrics> => {
    const res = await api.get<ObservabilityMetrics>('/observability/metrics');
    return res.data;
  },

  // Reports
  getJSONReportUrl: (scanId: string) => `/api/v1/reports/${scanId}/json`,
  getPDFReportUrl: (scanId: string) => `/api/v1/reports/${scanId}/pdf`,
};
