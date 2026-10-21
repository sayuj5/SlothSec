import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Check,
  X,
  Play,
  RotateCw,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DiffViewer } from '../components/ui/DiffViewer';
import type { RemediationPatch } from '../types';

export const RemediationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const patchIdParam = searchParams.get('patch_id');
  const [selectedPatchId, setSelectedPatchId] = useState<string>(patchIdParam || '');
  const [reviewNote, setReviewNote] = useState<string>('');

  const { data: patches, isLoading, refetch } = useQuery({
    queryKey: ['patches'],
    queryFn: () => apiClient.listPatches(),
    refetchInterval: 5000,
  });

  // Default selection
  useEffect(() => {
    if (!selectedPatchId && patches && patches.length > 0) {
      setSelectedPatchId(patches[0].id);
    }
  }, [patches, selectedPatchId]);

  const selectedPatch = patches?.find((p) => p.id === selectedPatchId);

  const approveMutation = useMutation({
    mutationFn: (variables: { id: string; note?: string }) =>
      apiClient.approvePatch(variables.id, variables.note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patches'] });
      setReviewNote('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (variables: { id: string; note?: string }) =>
      apiClient.rejectPatch(variables.id, variables.note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patches'] });
      setReviewNote('');
    },
  });

  const applyMutation = useMutation({
    mutationFn: (patchId: string) => apiClient.applyPatch(patchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patches'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to apply patch');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (patchId: string) => apiClient.verifyPatch(patchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patches'] });
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Verification scan failed');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Safe Remediation Engine</h1>
          <p className="text-xs text-slate-400 mt-1">
            Human-in-the-loop review, atomic file modifications, and deterministic verification rescans.
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

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Loading remediation patches...</div>
      ) : patches?.length === 0 ? (
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-12 text-center space-y-3">
          <Wrench className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No Remediation Patches Proposed</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Navigate to the Findings or AI Analyst page to propose safe remediation diffs for identified vulnerabilities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patches Sidebar List */}
          <div className="bg-[#121A23] border border-[#1E293B] rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-[#0E141B] border-b border-[#1E293B] text-xs font-semibold text-slate-300">
              Proposed Patches ({patches?.length})
            </div>
            <div className="divide-y divide-[#1E293B] max-h-[600px] overflow-y-auto">
              {patches?.map((patch) => {
                const isSelected = selectedPatchId === patch.id;
                return (
                  <div
                    key={patch.id}
                    onClick={() => setSelectedPatchId(patch.id)}
                    className={`p-3.5 cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#17212C] border-l-2 border-emerald-400'
                        : 'hover:bg-[#17212C]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <StatusBadge status={patch.status} />
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(patch.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-200 truncate mt-1">
                      {patch.file_path}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>Verification:</span>
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          patch.verification_status === 'VERIFIED_FIXED'
                            ? 'text-emerald-400'
                            : patch.verification_status === 'STILL_VULNERABLE'
                            ? 'text-rose-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {patch.verification_status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Patch Review & Control Panel */}
          {selectedPatch && (
            <div className="lg:col-span-2 bg-[#121A23] border border-[#1E293B] rounded-lg p-5 space-y-5">
              {/* Top Banner */}
              <div className="flex items-start justify-between border-b border-[#1E293B] pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={selectedPatch.status} />
                    <span className="text-xs text-slate-500 font-mono">ID: {selectedPatch.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white font-mono mt-1.5">
                    Target File: {selectedPatch.file_path}
                  </h3>
                </div>

                {/* Verification Badge */}
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-mono">Verification Status</span>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      selectedPatch.verification_status === 'VERIFIED_FIXED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : selectedPatch.verification_status === 'STILL_VULNERABLE'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {selectedPatch.verification_status}
                  </span>
                </div>
              </div>

              {/* Review / Approval / Action Bar */}
              <div className="p-4 rounded-md bg-[#0E141B] border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Remediation Workflow Controls</span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    Requires human approval before application
                  </span>
                </div>

                {/* Step 1: Human Approval / Rejection (if PROPOSED) */}
                {selectedPatch.status === 'PROPOSED' && (
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={() => approveMutation.mutate({ id: selectedPatch.id, note: reviewNote })}
                      disabled={approveMutation.isPending}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Patch for Application</span>
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate({ id: selectedPatch.id, note: reviewNote })}
                      disabled={rejectMutation.isPending}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 text-xs font-medium transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject Patch</span>
                    </button>
                  </div>
                )}

                {/* Step 2: Apply Patch (if APPROVED) */}
                {selectedPatch.status === 'APPROVED' && (
                  <div className="pt-2 flex items-center justify-between">
                    <div className="text-xs text-emerald-400 font-medium flex items-center space-x-1.5">
                      <Check className="w-4 h-4" />
                      <span>Patch Approved. Ready for safe filesystem write with automatic backup.</span>
                    </div>
                    <button
                      onClick={() => applyMutation.mutate(selectedPatch.id)}
                      disabled={applyMutation.isPending}
                      className="flex items-center space-x-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>{applyMutation.isPending ? 'Applying...' : 'Apply Patch to File'}</span>
                    </button>
                  </div>
                )}

                {/* Step 3: Verification Rescan (if APPLIED or VERIFIED) */}
                {(selectedPatch.status === 'APPLIED' || selectedPatch.status === 'VERIFIED') && (
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-300 font-medium">
                        Applied at: {selectedPatch.applied_at ? new Date(selectedPatch.applied_at).toLocaleString() : 'N/A'}
                      </div>
                      {selectedPatch.backup_path && (
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center space-x-1">
                          <Archive className="w-3.5 h-3.5 text-slate-400" />
                          <span>Backup: {selectedPatch.backup_path}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => verifyMutation.mutate(selectedPatch.id)}
                      disabled={verifyMutation.isPending}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded bg-[#17212C] hover:bg-emerald-950 hover:text-emerald-300 text-slate-200 border border-[#1E293B] hover:border-emerald-800 text-xs font-semibold transition cursor-pointer"
                    >
                      <RotateCw className={`w-3.5 h-3.5 text-emerald-400 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
                      <span>{verifyMutation.isPending ? 'Rescanning Repository...' : 'Run Verification Rescan'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Unified Diff Display */}
              <div>
                <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider mb-2 font-mono">
                  Review Unified Diff
                </span>
                <DiffViewer diff={selectedPatch.diff} filePath={selectedPatch.file_path} />
              </div>

              {/* Error messages if failed */}
              {selectedPatch.error_message && (
                <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                  <b>Execution Error:</b> {selectedPatch.error_message}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
