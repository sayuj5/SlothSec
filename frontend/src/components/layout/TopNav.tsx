import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderGit2, Shield, Play, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface TopNavProps {
  selectedRepoId: string | null;
  onSelectRepo: (id: string | null) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ selectedRepoId, onSelectRepo }) => {
  const navigate = useNavigate();

  const { data: repos } = useQuery({
    queryKey: ['repositories'],
    queryFn: apiClient.listRepositories,
    refetchInterval: 10000,
  });

  const { data: scans } = useQuery({
    queryKey: ['scans'],
    queryFn: () => apiClient.listScans(),
    refetchInterval: 5000,
  });

  const activeScan = scans?.find((s) => s.status === 'running' || s.status === 'pending');

  return (
    <header className="h-16 bg-[#0E141B] border-b border-[#1E293B] px-6 flex items-center justify-between z-10 shrink-0">
      {/* Workspace / Repository Selector */}
      <div className="flex items-center space-x-3">
        <FolderGit2 className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold uppercase text-slate-400">Workspace:</span>
        <select
          value={selectedRepoId || ''}
          onChange={(e) => onSelectRepo(e.target.value || null)}
          aria-label="Filter by repository"
          className="bg-[#121A23] border border-[#1E293B] text-slate-200 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
        >
          <option value="">All Registered Repositories</option>
          {repos?.map((repo) => (
            <option key={repo.id} value={repo.id}>
              {repo.name} ({repo.path})
            </option>
          ))}
        </select>
      </div>

      {/* Right controls: Privacy assurance, Live scan banner, Quick scan trigger */}
      <div className="flex items-center space-x-4">
        {/* Active Scan Indicator */}
        {activeScan && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-sky-950/60 border border-sky-800 rounded text-xs text-sky-300 animate-pulse font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Scanning: {activeScan.repository_name || activeScan.id.slice(0, 8)}...</span>
          </div>
        )}

        {/* Local Privacy Tag */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#121A23] border border-[#1E293B] text-xs text-emerald-400 font-mono">
          <Shield className="w-3.5 h-3.5" />
          <span>Local-First &middot; Zero Cloud Telemetry</span>
        </div>

        {/* Start Scan Button */}
        <button
          onClick={() => navigate('/scans')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition cursor-pointer shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start Scan</span>
        </button>
      </div>
    </header>
  );
};
