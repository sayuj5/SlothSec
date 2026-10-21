import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Cpu,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
} from 'lucide-react';
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
import type { Span } from '../types';

export const ObservabilityPage: React.FC = () => {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [filterText, setFilterText] = useState('');

  const { data: traces, isLoading: isLoadingTraces, refetch: refetchTraces } = useQuery({
    queryKey: ['traces'],
    queryFn: apiClient.getTraces,
    refetchInterval: 5000,
  });

  const { data: metricsData, isLoading: isLoadingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['observabilityMetrics'],
    queryFn: apiClient.getMetrics,
    refetchInterval: 5000,
  });

  const filteredSpans = traces?.filter(
    (s) =>
      s.name.toLowerCase().includes(filterText.toLowerCase()) ||
      s.trace_id.includes(filterText) ||
      s.status.toLowerCase().includes(filterText.toLowerCase())
  ) || [];

  const scannerAvgData = [
    { name: 'Semgrep', duration: metricsData?.averages?.scanner_duration_ms?.semgrep || 0, color: '#10B981' },
    { name: 'OSV-Scanner', duration: metricsData?.averages?.scanner_duration_ms?.osv || 0, color: '#3B82F6' },
    { name: 'Gitleaks', duration: metricsData?.averages?.scanner_duration_ms?.gitleaks || 0, color: '#F97316' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">System Observability & Traces</h1>
          <p className="text-xs text-slate-400 mt-1">
            Local OpenTelemetry performance tracing, scanner execution metrics, and AI inference latency tracking.
          </p>
        </div>
        <button
          onClick={() => {
            refetchTraces();
            refetchMetrics();
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#121A23] hover:bg-[#17212C] border border-[#1E293B] text-slate-300 text-xs font-medium transition cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scans Total */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-4">
          <div className="text-xs font-medium text-slate-400">Total Scans Tracked</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">
            {metricsData?.metrics?.scans_completed ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Failed: {metricsData?.metrics?.scans_failed ?? 0}
          </div>
        </div>

        {/* AI Inferences */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-4">
          <div className="text-xs font-medium text-slate-400">AI Inferences (Qwen3)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {metricsData?.metrics?.ai_inferences_total ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Avg Duration: {metricsData?.averages?.ai_inference_duration_ms ?? 0}ms
          </div>
        </div>

        {/* Patches Applied */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-4">
          <div className="text-xs font-medium text-slate-400">Remediation Patches</div>
          <div className="text-2xl font-bold text-sky-400 mt-1 font-mono">
            {metricsData?.metrics?.patches_applied ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Proposed: {metricsData?.metrics?.patches_proposed ?? 0} &bull; Approved: {metricsData?.metrics?.patches_approved ?? 0}
          </div>
        </div>

        {/* Verification Scans */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-4">
          <div className="text-xs font-medium text-slate-400">Verification Rescans</div>
          <div className="text-2xl font-bold text-purple-400 mt-1 font-mono">
            {metricsData?.metrics?.verification_scans_total ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Confirmed fixes on disk
          </div>
        </div>
      </div>

      {/* Performance Latency Bar Chart */}
      <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Average Scanner Latency (ms)</h2>
        <p className="text-xs text-slate-400 mb-4">Duration per scanner execution recorded locally</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scannerAvgData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0E141B', borderColor: '#334155', borderRadius: '4px', fontSize: '12px' }}
                itemStyle={{ color: '#E2E8F0' }}
              />
              <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                {scannerAvgData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* OpenTelemetry Spans Table */}
      <div className="bg-[#121A23] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="p-4 bg-[#0E141B] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Live OpenTelemetry Spans</span>
            <span className="text-xs text-slate-500 font-mono">({filteredSpans.length} spans)</span>
          </div>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter spans..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-[#121A23] border border-[#1E293B] rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        <div className="divide-y divide-[#1E293B] max-h-[500px] overflow-y-auto">
          {filteredSpans.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              No OpenTelemetry spans recorded yet.
            </div>
          ) : (
            filteredSpans.map((span) => {
              const isSelected = selectedSpan?.span_id === span.span_id;
              return (
                <div key={span.span_id} className="p-3.5 hover:bg-[#17212C]/60 transition text-xs">
                  <div
                    onClick={() => setSelectedSpan(isSelected ? null : span)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      {isSelected ? (
                        <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span className="font-mono text-emerald-300 font-bold">{span.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          span.status === 'ERROR'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {span.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 font-mono text-slate-400 text-[11px]">
                      <span>{span.duration_ms}ms</span>
                      <span>{span.start_time ? new Date(span.start_time).toLocaleTimeString() : ''}</span>
                    </div>
                  </div>

                  {/* Expanded attributes view */}
                  {isSelected && (
                    <div className="mt-3 p-3 bg-[#0A0E13] rounded border border-[#1E293B] space-y-2 font-mono text-[11px]">
                      <div className="grid grid-cols-2 gap-2 text-slate-400 border-b border-slate-800 pb-2">
                        <div>Trace ID: <span className="text-slate-200">{span.trace_id}</span></div>
                        <div>Span ID: <span className="text-slate-200">{span.span_id}</span></div>
                        {span.parent_span_id && (
                          <div>Parent Span: <span className="text-slate-200">{span.parent_span_id}</span></div>
                        )}
                      </div>

                      <div className="pt-1">
                        <span className="text-slate-500 block mb-1">Attributes:</span>
                        <div className="space-y-1">
                          {Object.entries(span.attributes).map(([k, v]) => (
                            <div key={k} className="flex">
                              <span className="text-slate-400 w-44 shrink-0">{k}:</span>
                              <span className="text-emerald-400 break-all">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
