import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  Scan,
  ShieldAlert,
  Bot,
  Wrench,
  FileText,
  Clock,
  Activity,
  Settings,
  Cpu,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api';

const navItems = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Repositories', to: '/repositories', icon: FolderGit2 },
  { label: 'Scan Center', to: '/scans', icon: Scan },
  { label: 'Findings', to: '/findings', icon: ShieldAlert },
  { label: 'AI Analyst', to: '/analyst', icon: Bot },
  { label: 'Remediation', to: '/remediation', icon: Wrench },
  { label: 'Reports', to: '/reports', icon: FileText },
  { label: 'Automation', to: '/automation', icon: Clock },
  { label: 'Observability', to: '/observability', icon: Activity },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { data: systemStatus } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: apiClient.getSystemStatus,
    refetchInterval: 15000,
  });

  const { data: summary } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: apiClient.getDashboardSummary,
    refetchInterval: 10000,
  });

  return (
    <aside className="w-64 bg-[#0E141B] border-r border-[#1E293B] flex flex-col justify-between shrink-0 select-none">
      {/* Brand Header with Mascot Logo */}
      <div>
        <div className="h-16 flex items-center px-4 border-b border-[#1E293B] space-x-3">
          <img
            src="/logo.png"
            alt="SlothSec Mascot"
            className="w-10 h-10 object-contain rounded-lg shrink-0 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]"
          />
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">SlothSec</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Local
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium truncate">
              Autonomous AI Security
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#17212C] text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#121A23]'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.label === 'Findings' && summary && summary.open_findings > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                    {summary.open_findings}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Engine & Scanner Status Footer */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0A0E13]/60 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
          <span>Engine Status</span>
          <span className="flex items-center text-emerald-400 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
            Active
          </span>
        </div>

        {/* Ollama Model Indicator */}
        <div className="bg-[#121A23] border border-[#1E293B] rounded p-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center space-x-1.5 text-slate-400 font-mono text-[11px]">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>Ollama</span>
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                systemStatus?.ai_status?.available
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {systemStatus?.ai_status?.available ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-emerald-400 truncate">
            {systemStatus?.ai_status?.configured_model || 'qwen3:4b'} (CPU)
          </div>
        </div>

        {/* Scanner Dots */}
        <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
          {['semgrep', 'osv', 'gitleaks'].map((scannerName) => {
            const isAvail = systemStatus?.scanners?.[scannerName]?.available ?? true;
            return (
              <div
                key={scannerName}
                className="bg-[#121A23] border border-[#1E293B] rounded py-1 px-1 text-slate-300 flex items-center justify-center space-x-1"
                title={`${scannerName.toUpperCase()}: ${isAvail ? 'Installed & Ready' : 'Unavailable'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                <span className="uppercase text-[9px]">{scannerName}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
