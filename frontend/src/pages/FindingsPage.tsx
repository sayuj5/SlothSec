import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Filter,
  Bot,
  Wrench,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileCode,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { Finding } from '../types';

export const FindingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const repoFilter = searchParams.get('repository_id') || '';
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedScanner, setSelectedScanner] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('OPEN');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const { data: findings, isLoading, refetch } = useQuery({
    queryKey: ['findings', repoFilter, selectedSeverity, selectedScanner, selectedStatus, searchTerm],
    queryFn: () =>
      apiClient.listFindings({
        repository_id: repoFilter || undefined,
        severity: selectedSeverity || undefined,
        scanner: selectedScanner || undefined,
        status: selectedStatus || undefined,
        search: searchTerm || undefined,
        limit: 150,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: (variables: { id: string; status: 'OPEN' | 'RESOLVED' | 'IGNORED' }) =>
      apiClient.updateFindingStatus(variables.id, variables.status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      if (selectedFinding?.id === updated.id) {
        setSelectedFinding(updated);
      }
    },
  });

  const handleAnalyze = (findingId: string) => {
    navigate(`/analyst?finding_id=${findingId}`);
  };

  const handleRemediate = async (findingId: string) => {
    try {
      const patch = await apiClient.proposeRemediation(findingId);
      navigate(`/remediation?patch_id=${patch.id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate remediation patch');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Vulnerability Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Normalized security findings detected by deterministic scanners with AI-assisted remediation options.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#121A23] hover:bg-[#17212C] border border-[#1E293B] text-slate-300 text-xs font-medium transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-3.5 flex flex-wrap items-center gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by title, rule, path, CVE, package..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0E141B] border border-[#1E293B] rounded pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Severity Filter */}
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          aria-label="Filter by severity"
          className="bg-[#0E141B] border border-[#1E293B] text-slate-300 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Scanner Filter */}
        <select
          value={selectedScanner}
          onChange={(e) => setSelectedScanner(e.target.value)}
          aria-label="Filter by scanner"
          className="bg-[#0E141B] border border-[#1E293B] text-slate-300 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Scanners</option>
          <option value="semgrep">Semgrep (SAST)</option>
          <option value="osv">OSV-Scanner (SCA)</option>
          <option value="gitleaks">Gitleaks (Secrets)</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          aria-label="Filter by status"
          className="bg-[#0E141B] border border-[#1E293B] text-slate-300 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open Only</option>
          <option value="RESOLVED">Resolved Only</option>
          <option value="IGNORED">Ignored Only</option>
        </select>
      </div>

      {/* Main Grid: Findings Table + Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table column */}
        <div className={`bg-[#121A23] border border-[#1E293B] rounded-lg overflow-hidden ${selectedFinding ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0E141B] border-b border-[#1E293B] text-slate-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-3 w-28">Severity</th>
                  <th className="py-3 px-3">Finding Title / Rule</th>
                  <th className="py-3 px-3">Scanner</th>
                  <th className="py-3 px-3">File / Package</th>
                  <th className="py-3 px-3 w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Loading vulnerability records...
                    </td>
                  </tr>
                ) : findings?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 italic">
                      No security findings match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  findings?.map((f) => {
                    const isSelected = selectedFinding?.id === f.id;
                    return (
                      <tr
                        key={f.id}
                        onClick={() => setSelectedFinding(f)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-[#17212C] border-l-2 border-emerald-400'
                            : 'hover:bg-[#17212C]/60'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <SeverityBadge severity={f.severity} />
                        </td>
                        <td className="py-3 px-3 font-medium text-white max-w-xs">
                          <div className="truncate">{f.title}</div>
                          <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                            {f.rule_id}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] uppercase text-slate-400">
                          {f.scanner}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400 max-w-[200px] truncate">
                          {f.package_name ? (
                            <span>{f.package_name}=={f.package_version}</span>
                          ) : (
                            <span>{f.file_path}:{f.start_line}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={f.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Drawer (when a finding is selected) */}
        {selectedFinding && (
          <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-[#1E293B] pb-3">
              <div>
                <SeverityBadge severity={selectedFinding.severity} />
                <h3 className="text-sm font-bold text-white mt-2 leading-snug">
                  {selectedFinding.title}
                </h3>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  Rule ID: {selectedFinding.rule_id}
                </div>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleAnalyze(selectedFinding.id)}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Deep-Dive</span>
              </button>
              <button
                onClick={() => handleRemediate(selectedFinding.id)}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded bg-[#17212C] hover:bg-slate-800 text-slate-200 border border-[#1E293B] font-medium transition cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fix / Remediate</span>
              </button>
            </div>

            {/* Finding Details */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-semibold uppercase">Location</span>
                <div className="font-mono text-slate-300 mt-0.5 break-all">
                  {selectedFinding.file_path} (lines {selectedFinding.start_line}-{selectedFinding.end_line})
                </div>
              </div>

              {selectedFinding.vulnerability_ids && (
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase">Vulnerability Identifiers</span>
                  <div className="font-mono text-emerald-400 mt-0.5">
                    {selectedFinding.vulnerability_ids}
                  </div>
                </div>
              )}

              {selectedFinding.package_name && (
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase">Affected Package</span>
                  <div className="font-mono text-slate-300 mt-0.5">
                    {selectedFinding.package_name} {selectedFinding.package_version}{' '}
                    {selectedFinding.fixed_version && (
                      <span className="text-emerald-400">(Upgrade to {selectedFinding.fixed_version})</span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <span className="text-slate-500 block text-[11px] font-semibold uppercase">Description</span>
                <p className="text-slate-300 mt-1 leading-relaxed bg-[#0E141B] p-2.5 rounded border border-[#1E293B]">
                  {selectedFinding.description || 'No scanner description supplied.'}
                </p>
              </div>

              {selectedFinding.snippet && (
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase">Code Snippet / Evidence</span>
                  <pre className="font-mono text-[11px] bg-[#0A0E13] p-2.5 rounded border border-[#1E293B] overflow-x-auto text-slate-300 mt-1 whitespace-pre-wrap">
                    {selectedFinding.snippet}
                  </pre>
                </div>
              )}

              {/* Status Toggles */}
              <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between">
                <span className="text-slate-500 text-[11px] font-semibold uppercase">Status:</span>
                <div className="flex items-center space-x-1.5">
                  {(['OPEN', 'RESOLVED', 'IGNORED'] as const).map((st) => (
                    <button
                      key={st}
                      disabled={selectedFinding.status === st}
                      onClick={() => statusMutation.mutate({ id: selectedFinding.id, status: st })}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition cursor-pointer ${
                        selectedFinding.status === st
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
