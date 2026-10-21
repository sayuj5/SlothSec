import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  FolderGit2,
  Scan,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Cpu,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { apiClient } from '../services/api';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { StatusBadge } from '../components/ui/StatusBadge';

export const OverviewPage: React.FC = () => {
  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: apiClient.getDashboardSummary,
    refetchInterval: 10000,
  });

  const { data: systemStatus } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: apiClient.getSystemStatus,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 space-x-2">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
        <span>Loading security intelligence overview...</span>
      </div>
    );
  }

  const severityData = [
    { name: 'Critical', count: summary?.critical_findings || 0, color: '#EF4444' },
    { name: 'High', count: summary?.high_findings || 0, color: '#F97316' },
    { name: 'Medium', count: summary?.medium_findings || 0, color: '#EAB308' },
    { name: 'Low', count: summary?.low_findings || 0, color: '#3B82F6' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header with Mascot Logo */}
      <div className="bg-[#121A23] border border-[#1E293B] rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center space-x-4 z-10">
          <img
            src="/logo.png"
            alt="SlothSec Mascot"
            className="w-16 h-16 object-contain rounded-xl shrink-0 p-1 bg-[#0E141B] border border-emerald-500/30 drop-shadow-[0_0_15px_rgba(16,185,129,0.25)]"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">SlothSec</h1>
              <span className="text-xs text-slate-400 font-mono">&mdash; Your Autonomous AI Security Engineer</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Continuous, privacy-first security scanning powered by Semgrep (SAST), OSV-Scanner (SCA), Gitleaks (Secrets), and local Qwen3 4B on-device AI.
            </p>
            <div className="flex items-center space-x-3 mt-2.5">
              <a
                href="https://github.com/sayuj5/SlothSec.git"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0E141B] hover:bg-slate-800 border border-[#1E293B] text-slate-300 text-xs font-mono transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>github.com/sayuj5/SlothSec</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                100% Zero-Cost Local Operation
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#0E141B] hover:bg-[#17212C] border border-[#1E293B] text-slate-300 text-xs font-medium transition cursor-pointer shrink-0 z-10"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>

        {/* Subtle decorative glow in top-right */}
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Repositories */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Registered Repositories</div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">
              {summary?.total_repositories ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Local workspaces monitored</div>
          </div>
          <div className="w-10 h-10 rounded bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-300">
            <FolderGit2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Scans */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Total Scans Executed</div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">
              {summary?.total_scans ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">All scanner runs</div>
          </div>
          <div className="w-10 h-10 rounded bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400">
            <Scan className="w-5 h-5" />
          </div>
        </div>

        {/* Open Findings */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Active Vulnerabilities</div>
            <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">
              {summary?.open_findings ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary?.critical_findings ?? 0} Critical &bull; {summary?.high_findings ?? 0} High
            </div>
          </div>
          <div className="w-10 h-10 rounded bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Resolved Findings */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Verified Remediated</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {summary?.resolved_findings ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Confirmed fixed by rescan</div>
          </div>
          <div className="w-10 h-10 rounded bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Middle Row: Severity Distribution & Local AI / Scanner Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Chart */}
        <div className="lg:col-span-2 bg-[#121A23] border border-[#1E293B] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Vulnerability Severity Distribution</h2>
              <p className="text-xs text-slate-400">Aggregated breakdown across all active findings</p>
            </div>
            <Link
              to="/findings"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" stroke="#64748B" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={12} width={70} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0E141B', borderColor: '#334155', borderRadius: '4px', fontSize: '12px' }}
                  itemStyle={{ color: '#E2E8F0' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Local Stack & Scanner Health */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white mb-1">Local Engine Integrity</h2>
            <p className="text-xs text-slate-400 mb-4">Zero cloud dependencies &bull; 100% on-device</p>

            <div className="space-y-3">
              {/* Ollama Box */}
              <div className="p-3 rounded bg-[#0E141B] border border-[#1E293B]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>Ollama AI Engine</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {systemStatus?.ai_status?.available ? 'Connected' : 'Unavailable'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  Model: <span className="text-emerald-400">{systemStatus?.ai_status?.configured_model}</span>
                </div>
              </div>

              {/* Scanners */}
              <div className="space-y-2 text-xs">
                {Object.entries(systemStatus?.scanners || {}).map(([key, sc]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2.5 rounded bg-[#0E141B] border border-[#1E293B]"
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${sc.available ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                      <span className="text-slate-200 font-mono uppercase">{key}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
                      {sc.version || (sc.available ? 'Ready' : 'Not installed')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1E293B] text-[11px] text-slate-500 flex items-center justify-between">
            <span>Database: SQLite (Local)</span>
            <span>Traces: OpenTelemetry</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Findings & Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Findings */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Recent Security Findings</h2>
            <Link to="/findings" className="text-xs text-emerald-400 hover:text-emerald-300">
              View all
            </Link>
          </div>

          {summary?.recent_findings?.length === 0 ? (
            <div className="text-slate-500 text-xs italic py-8 text-center">
              No findings recorded yet. Run a scan to discover vulnerabilities.
            </div>
          ) : (
            <div className="divide-y divide-[#1E293B]">
              {summary?.recent_findings?.map((f) => (
                <div key={f.id} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <SeverityBadge severity={f.severity} />
                      <span className="text-xs text-slate-200 font-medium truncate">{f.title}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                      {f.file_path} &bull; <span className="uppercase text-slate-400">{f.scanner}</span>
                    </div>
                  </div>
                  <Link
                    to={`/findings`}
                    className="shrink-0 text-slate-400 hover:text-emerald-400 transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Scans */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Recent Scan Executions</h2>
            <Link to="/scans" className="text-xs text-emerald-400 hover:text-emerald-300">
              View all
            </Link>
          </div>

          {summary?.recent_scans?.length === 0 ? (
            <div className="text-slate-500 text-xs italic py-8 text-center">
              No scans executed yet.
            </div>
          ) : (
            <div className="divide-y divide-[#1E293B]">
              {summary?.recent_scans?.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={s.status} />
                      <span className="text-xs text-slate-200 font-medium truncate">
                        {s.repository_name}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1">
                      Scanners: <span className="uppercase text-slate-400">{s.scanners}</span> &bull;{' '}
                      {Math.round(s.duration_ms / 100) / 10}s
                    </div>
                  </div>
                  <Link
                    to={`/scans`}
                    className="shrink-0 text-slate-400 hover:text-emerald-400 transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
