import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Wrench,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { DiffViewer } from '../components/ui/DiffViewer';
import type { Finding } from '../types';

export const AnalystPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const findingIdParam = searchParams.get('finding_id');
  const [selectedFindingId, setSelectedFindingId] = useState<string>(findingIdParam || '');
  const [customInstructions, setCustomInstructions] = useState<string>('');

  const { data: findings } = useQuery({
    queryKey: ['findings'],
    queryFn: () => apiClient.listFindings({ limit: 100 }),
  });

  // Default to first finding if none selected
  useEffect(() => {
    if (!selectedFindingId && findings && findings.length > 0) {
      setSelectedFindingId(findings[0].id);
    }
  }, [findings, selectedFindingId]);

  const selectedFinding = findings?.find((f) => f.id === selectedFindingId);

  const { data: analyses, isLoading: isLoadingAnalyses, refetch: refetchAnalyses } = useQuery({
    queryKey: ['analyses', selectedFindingId],
    queryFn: () => apiClient.getFindingAnalyses(selectedFindingId),
    enabled: !!selectedFindingId,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => apiClient.analyzeFinding(selectedFindingId, customInstructions),
    onSuccess: () => {
      refetchAnalyses();
      queryClient.invalidateQueries({ queryKey: ['analyses', selectedFindingId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || err.message || 'AI Analysis failed');
    },
  });

  const latestAnalysis = analyses && analyses.length > 0 ? analyses[0] : null;

  const handleProposeFix = async () => {
    if (!selectedFindingId) return;
    try {
      const patch = await apiClient.proposeRemediation(
        selectedFindingId,
        latestAnalysis?.suggested_patch_diff
      );
      navigate(`/remediation?patch_id=${patch.id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create remediation patch');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">AI Security Analyst</h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic vulnerability facts grounded by Semgrep, OSV, & Gitleaks analyzed locally with Qwen3:4B.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-[#121A23] px-3 py-1.5 rounded border border-[#1E293B]">
          <Cpu className="w-4 h-4" />
          <span>Local Qwen3:4b (Offline)</span>
        </div>
      </div>

      {/* Finding Selector Bar */}
      <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
          <label className="text-xs font-medium text-slate-400 shrink-0">Select Finding to Audit:</label>
          <select
            value={selectedFindingId}
            onChange={(e) => setSelectedFindingId(e.target.value)}
            className="w-full bg-[#0E141B] border border-[#1E293B] text-slate-200 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
          >
            {findings?.map((f) => (
              <option key={f.id} value={f.id}>
                [{f.severity}] [{f.scanner.toUpperCase()}] {f.title} ({f.file_path})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending || !selectedFindingId}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm disabled:opacity-50"
        >
          {analyzeMutation.isPending ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing with Qwen3...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate AI Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* Evidence & Findings Details */}
      {selectedFinding && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Deterministic Scanner Evidence (Facts) */}
          <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Confirmed Scanner Evidence
              </span>
              <SeverityBadge severity={selectedFinding.severity} />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Scanner Origin</span>
                <div className="text-slate-200 font-mono uppercase mt-0.5 font-bold">
                  {selectedFinding.scanner}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Rule Identifier</span>
                <div className="text-slate-200 font-mono mt-0.5 break-all">
                  {selectedFinding.rule_id}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Location</span>
                <div className="text-slate-300 font-mono mt-0.5 break-all">
                  {selectedFinding.file_path}:{selectedFinding.start_line}
                </div>
              </div>

              {selectedFinding.vulnerability_ids && (
                <div>
                  <span className="text-slate-500 font-medium">Identifiers</span>
                  <div className="text-emerald-400 font-mono mt-0.5">
                    {selectedFinding.vulnerability_ids}
                  </div>
                </div>
              )}

              {selectedFinding.snippet && (
                <div>
                  <span className="text-slate-500 font-medium">Code Snippet</span>
                  <pre className="mt-1 p-2.5 rounded bg-[#0A0E13] border border-[#1E293B] font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                    {selectedFinding.snippet}
                  </pre>
                </div>
              )}

              {/* Custom Guidance input */}
              <div className="pt-3 border-t border-[#1E293B]">
                <label className="block text-slate-400 font-medium mb-1">
                  Custom Analyst Prompt / Context (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Focus on Python 3.13 compatibility or explain compliance risk..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full bg-[#0E141B] border border-[#1E293B] rounded p-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Right Column: AI Structured Analysis Output */}
          <div className="lg:col-span-2 bg-[#121A23] border border-[#1E293B] rounded-lg p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-white">Qwen3 Security Assessment</span>
              </div>
              {latestAnalysis && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500">AI Priority:</span>
                  <SeverityBadge severity={latestAnalysis.priority_recommendation} />
                  <span className="text-slate-500 ml-2">Confidence:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {Math.round(latestAnalysis.confidence_score * 100)}%
                  </span>
                </div>
              )}
            </div>

            {analyzeMutation.isPending ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                <div className="text-sm font-semibold text-slate-200">
                  Local Qwen3 Model Reasoning in Progress...
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Running on Intel Core i5 CPU threads. Synthesizing deterministic scanner evidence, root cause, and suggested code patches.
                </p>
              </div>
            ) : !latestAnalysis ? (
              <div className="py-16 text-center space-y-3 text-slate-500 text-xs italic">
                <Bot className="w-12 h-12 text-slate-600 mx-auto" />
                <p>No AI analysis generated yet for this finding.</p>
                <button
                  onClick={() => analyzeMutation.mutate()}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition cursor-pointer not-italic"
                >
                  Analyze with Qwen3
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Executive Summary */}
                <div className="p-3.5 rounded bg-[#0E141B] border border-emerald-500/20">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                    Executive Summary
                  </span>
                  <p className="text-slate-200 text-xs leading-relaxed">
                    {latestAnalysis.executive_summary}
                  </p>
                </div>

                {/* Technical Explanation & Root Cause */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-[#0E141B] border border-[#1E293B]">
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                      Technical Explanation
                    </span>
                    <p className="text-slate-300 leading-relaxed text-xs">
                      {latestAnalysis.technical_explanation}
                    </p>
                  </div>

                  <div className="p-3 rounded bg-[#0E141B] border border-[#1E293B]">
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                      Root Cause
                    </span>
                    <p className="text-slate-300 leading-relaxed text-xs">
                      {latestAnalysis.root_cause}
                    </p>
                  </div>
                </div>

                {/* Exploitability & Potential Impact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-[#0E141B] border border-[#1E293B]">
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                      Exploitability Context
                    </span>
                    <p className="text-slate-300 leading-relaxed text-xs">
                      {latestAnalysis.exploitability_context}
                    </p>
                  </div>

                  <div className="p-3 rounded bg-[#0E141B] border border-[#1E293B]">
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                      Potential Impact
                    </span>
                    <p className="text-slate-300 leading-relaxed text-xs">
                      {latestAnalysis.potential_impact}
                    </p>
                  </div>
                </div>

                {/* Recommended Remediation */}
                <div className="p-3.5 rounded bg-[#0E141B] border border-[#1E293B]">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                    Recommended Remediation Steps
                  </span>
                  <p className="text-slate-200 leading-relaxed text-xs">
                    {latestAnalysis.recommended_remediation}
                  </p>
                </div>

                {/* Suggested Diff */}
                {latestAnalysis.suggested_patch_diff && (
                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider mb-2">
                      Suggested Code Patch (Unified Diff)
                    </span>
                    <DiffViewer
                      diff={latestAnalysis.suggested_patch_diff}
                      filePath={selectedFinding.file_path}
                    />
                  </div>
                )}

                {/* Limitations */}
                {latestAnalysis.limitations && (
                  <div className="p-2.5 rounded bg-[#0A0E13] border border-[#1E293B] text-slate-500 text-[11px] flex items-start space-x-2">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                    <span><b>Limitations:</b> {latestAnalysis.limitations}</span>
                  </div>
                )}

                {/* Remediation Transition Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleProposeFix}
                    className="flex items-center space-x-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Proceed to Review & Apply Remediation Patch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
