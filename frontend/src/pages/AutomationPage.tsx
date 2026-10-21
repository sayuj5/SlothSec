import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../services/api';

export const AutomationPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [cronExpression, setCronExpression] = useState('0 2 * * *');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: apiClient.listSchedules,
  });

  const { data: repos } = useQuery({
    queryKey: ['repositories'],
    queryFn: apiClient.listRepositories,
  });

  // Default repo
  React.useEffect(() => {
    if (!selectedRepoId && repos && repos.length > 0) {
      setSelectedRepoId(repos[0].id);
    }
  }, [repos, selectedRepoId]);

  const createMutation = useMutation({
    mutationFn: apiClient.createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setIsModalOpen(false);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to create schedule');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoId) {
      setErrorMsg('Please select a repository');
      return;
    }
    createMutation.mutate({
      repository_id: selectedRepoId,
      cron_expression: cronExpression,
      scanners: 'semgrep,osv,gitleaks',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Automated Scheduled Scans</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure local recurring security audits using the built-in APScheduler background service.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Scheduled Scan</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Loading scheduled tasks...</div>
      ) : schedules?.length === 0 ? (
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-12 text-center space-y-3">
          <Clock className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No Scheduled Scans Configured</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Schedule recurring automated scans to continuously verify repository security posture.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-3 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-medium text-xs transition cursor-pointer"
          >
            Create Schedule
          </button>
        </div>
      ) : (
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E141B] border-b border-[#1E293B] text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Repository</th>
                <th className="py-3 px-4">Cron Expression</th>
                <th className="py-3 px-4">Scanners</th>
                <th className="py-3 px-4">Next Execution</th>
                <th className="py-3 px-4">Last Run</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-300">
              {schedules?.map((sch) => (
                <tr key={sch.id} className="hover:bg-[#17212C]/60 transition">
                  <td className="py-3.5 px-4 font-medium text-white flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>{sch.repository_name || 'Repository'}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">
                    {sch.cron_expression}
                  </td>
                  <td className="py-3.5 px-4 font-mono uppercase text-slate-400 text-[11px]">
                    {sch.scanners}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                    {sch.next_run_at ? new Date(sch.next_run_at).toLocaleString() : 'Pending'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                    {sch.last_run_at ? new Date(sch.last_run_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        if (confirm('Delete this automated schedule?')) {
                          deleteMutation.mutate(sch.id);
                        }
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#121A23] border border-[#1E293B] rounded-lg w-full max-w-md p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Configure Scheduled Scan</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Repository</label>
                <select
                  value={selectedRepoId}
                  onChange={(e) => setSelectedRepoId(e.target.value)}
                  className="w-full bg-[#0E141B] border border-[#1E293B] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                >
                  {repos?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Cron Schedule Expression</label>
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="e.g. 0 2 * * *"
                  className="w-full bg-[#0E141B] border border-[#1E293B] rounded px-3 py-2 text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-[10px] text-slate-500">Presets:</span>
                  {[
                    { label: 'Daily 2am', cron: '0 2 * * *' },
                    { label: 'Weekly', cron: '0 0 * * 0' },
                    { label: 'Hourly', cron: '0 * * * *' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCronExpression(preset.cron)}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-mono cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold cursor-pointer"
                >
                  {createMutation.isPending ? 'Scheduling...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
