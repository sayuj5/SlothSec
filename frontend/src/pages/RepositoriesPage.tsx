import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderGit2,
  Plus,
  Play,
  Trash2,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

export const RepositoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: repos, isLoading } = useQuery({
    queryKey: ['repositories'],
    queryFn: apiClient.listRepositories,
  });

  const registerMutation = useMutation({
    mutationFn: apiClient.createRepository,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      setIsModalOpen(false);
      setName('');
      setPath('');
      setDescription('');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to register repository');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteRepository,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) {
      setErrorMsg('Please specify both a repository name and absolute folder path.');
      return;
    }
    registerMutation.mutate({ name, path, description });
  };

  const handleStartScan = async (repoId: string) => {
    try {
      await apiClient.startScan(repoId, ['semgrep', 'osv', 'gitleaks']);
      navigate('/scans');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to launch scan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Registered Repositories</h1>
          <p className="text-xs text-slate-400 mt-1">
            Local codebases and repositories registered for continuous autonomous security maintenance.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Register Repository</span>
        </button>
      </div>

      {/* Repositories List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span>Loading repositories...</span>
        </div>
      ) : repos?.length === 0 ? (
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-10 text-center">
          <FolderOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">No repositories registered</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add a local project folder to enable Semgrep, OSV-Scanner, and Gitleaks security scans with local AI analysis.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-medium text-xs transition cursor-pointer"
          >
            Register Local Repository
          </button>
        </div>
      ) : (
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E141B] border-b border-[#1E293B] text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Repository</th>
                <th className="py-3 px-4">Local Filesystem Path</th>
                <th className="py-3 px-4">Scans Run</th>
                <th className="py-3 px-4">Open Vulnerabilities</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-300">
              {repos?.map((repo) => (
                <tr key={repo.id} className="hover:bg-[#17212C]/60 transition">
                  <td className="py-3.5 px-4 font-medium text-white">
                    <div className="flex items-center space-x-2">
                      <FolderGit2 className="w-4 h-4 text-emerald-400" />
                      <span>{repo.name}</span>
                    </div>
                    {repo.description && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{repo.description}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {repo.path}
                  </td>
                  <td className="py-3.5 px-4 font-mono">{repo.scans_count}</td>
                  <td className="py-3.5 px-4">
                    {repo.open_findings_count > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                        {repo.open_findings_count} open
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                        0 open
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleStartScan(repo.id)}
                        title="Run Full Scan"
                        className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#17212C] hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 border border-[#1E293B] hover:border-emerald-800 transition cursor-pointer text-xs"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                        <span>Scan</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove repository "${repo.name}" from SlothSec?`)) {
                            deleteMutation.mutate(repo.id);
                          }
                        }}
                        title="Delete Repository"
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog for Registering Repository */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#121A23] border border-[#1E293B] rounded-lg w-full max-w-lg p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FolderGit2 className="w-4 h-4 text-emerald-400" />
                <span>Register Local Repository</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Repository Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Secure Web App"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0E141B] border border-[#1E293B] rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Local Filesystem Directory Path
                </label>
                <input
                  type="text"
                  placeholder="C:\Users\...\my-project or relative path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full bg-[#0E141B] border border-[#1E293B] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Path must point to an accessible local directory on this machine.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Notes about the codebase, architecture, or environment..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0E141B] border border-[#1E293B] rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold transition cursor-pointer"
                >
                  {registerMutation.isPending ? 'Validating...' : 'Register Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
