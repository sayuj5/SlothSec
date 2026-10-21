import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Scan,
  Play,
  RotateCw,
  XCircle,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { StatusBadge } from '../components/ui/StatusBadge';

export const ScanCenterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [selectedScanners, setSelectedScanners] = useState<string[]>(['semgrep', 'osv', 'gitleaks']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: repos } = useQuery({
    queryKey: ['repositories'],
    queryFn: apiClient.listRepositories,
  });

  const { data: scans, isLoading, refetch } = useQuery({
    queryKey: ['scans'],
    queryFn: () => apiClient.listScans(),
    refetchInterval: 4000,
  });

  // Automatically select first repo if none selected
  React.useEffect(() => {
    if (!selectedRepoId && repos && repos.length > 0) {
      setSelectedRepoId(repos[0].id);
    }
  }, [repos, selectedRepoId]);

  const startScanMutation = useMutation({
    mutationFn: (variables: { repoId: string; scanners: string[] }) =>
      apiClient.startScan(variables.repoId, variables.scanners),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to start scan');
    },
  });

  const rescanMutation = useMutation({
    mutationFn: apiClient.rescan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: apiClient.cancelScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
    },
  });

  const toggleScanner = (scanner: string) => {
    if (selectedScanners.includes(scanner)) {
      if (selectedScanners.length > 1) {
        setSelectedScanners(selectedScanners.filter((s) => s !== scanner));
      }
    } else {
      setSelectedScanners([...selectedScanners, scanner]);
    }
  };

  const handleLaunch = () => {
    if (!selectedRepoId) {
      setErrorMsg('Please select a target repository first.');
      return;
    }
    startScanMutation.mutate({ repoId: selectedRepoId, scanners: selectedScanners });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Scan Execution Center</h1>
        <p className="text-xs text-slate-400 mt-1">
          Launch deterministic SAST, SCA, and Secret scans on demand or review previous audit jobs.
        </p>
      </div>

      {/* Scan Config Panel */}
      <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
          <Scan className="w-4 h-4 text-emerald-400" />
          <span>Launch New Security Scan</span>
        </h2>

        {errorMsg && (
          <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Repository */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Target Repository
            </label>
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="w-full bg-[#0E141B] border border-[#1E293B] text-slate-200 text-xs rounded-md px-3 py-2 font-mono focus:outline-none focus:border-emerald-500"
            >
              {repos?.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.name} — {repo.path}
                </option>
              ))}
            </select>
          </div>

          {/* Scanner Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Active Security Scanners
            </label>
            <div className="flex items-center space-x-3 text-xs">
              {[
                { id: 'semgrep', label: 'Semgrep (SAST)' },
                { id: 'osv', label: 'OSV (SCA Vulns)' },
                { id: 'gitleaks', label: 'Gitleaks (Secrets)' },
              ].map((sc) => {
                const isChecked = selectedScanners.includes(sc.id);
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => toggleScanner(sc.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded border text-xs font-medium transition cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/80'
                        : 'bg-[#0E141B] text-slate-400 border-[#1E293B]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span>{sc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleLaunch}
            disabled={startScanMutation.isPending || !selectedRepoId}
            className="flex items-center space-x-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{startScanMutation.isPending ? 'Initiating Scan...' : 'Execute Security Scan'}</span>
          </button>
        </div>
      </div>

      {/* Scan History Table */}
      <div className="bg-[#121A23] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-[#0E141B] border-b border-[#1E293B] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Execution History</h2>
          <button
            onClick={() => refetch()}
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center space-x-1 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading scan jobs...</div>
        ) : scans?.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs italic">
            No scans recorded yet. Launch your first scan above.
          </div>
        ) : (
          <div className="divide-y divide-[#1E293B]">
            {scans?.map((scan) => (
              <div key={scan.id} className="p-4 hover:bg-[#17212C]/50 transition space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <StatusBadge status={scan.status} />
                    <span className="font-medium text-white text-xs">{scan.repository_name}</span>
                    <span className="text-[11px] font-mono text-slate-400">ID: {scan.id.slice(0, 8)}</span>
                    <span className="text-[11px] text-slate-400">
                      Started: {new Date(scan.started_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigate(`/findings?repository_id=${scan.repository_id}`)}
                      className="px-2.5 py-1 rounded bg-[#17212C] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 text-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <span>View Findings ({scan.findings_count})</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <button
                      onClick={() => rescanMutation.mutate(scan.id)}
                      title="Rerun scan with same config"
                      className="p-1 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    {(scan.status === 'running' || scan.status === 'pending') && (
                      <button
                        onClick={() => cancelMutation.mutate(scan.id)}
                        title="Cancel Scan"
                        className="p-1 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Scanner Breakdown Pill Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {scan.scanner_executions.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-2 rounded bg-[#0A0E13] border border-[#1E293B] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ex.status === 'completed' ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-mono uppercase font-semibold text-slate-300">
                          {ex.scanner_name}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {ex.findings_count} vulns &bull; {Math.round(ex.duration_ms)}ms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
