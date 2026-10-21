import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Cpu,
  Shield,
  Layers,
  Database,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { apiClient } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { data: status, isLoading } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: apiClient.getSystemStatus,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">System & Engine Configuration</h1>
        <p className="text-xs text-slate-400 mt-1">
          Review local environment parameters, scanner binaries, Ollama connection, and zero-cost persistence.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Loading configuration parameters...</div>
      ) : (
        <div className="space-y-6 text-xs">
          {/* AI Settings Section */}
          <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1E293B] pb-3">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Local AI Inference (Ollama)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">Ollama Base URL</label>
                <input
                  type="text"
                  readOnly
                  value={status?.ai_status?.base_url || 'http://localhost:11434'}
                  className="w-full bg-[#0E141B] border border-[#1E293B] rounded px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Configured AI Model</label>
                <input
                  type="text"
                  readOnly
                  value={status?.ai_status?.configured_model || 'qwen3:4b'}
                  className="w-full bg-[#0E141B] border border-[#1E293B] rounded px-3 py-2 text-emerald-400 font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-[#0A0E13] rounded border border-[#1E293B] flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-300">Daemon Connectivity Status</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Installed local models: {status?.ai_status?.installed_models?.join(', ') || 'qwen3:4b, gemma3:1b'}
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                  status?.ai_status?.available
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {status?.ai_status?.available ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
          </div>

          {/* Security Scanners Section */}
          <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1E293B] pb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Deterministic Security Scanners</h2>
            </div>

            <div className="space-y-3">
              {Object.entries(status?.scanners || {}).map(([name, sc]) => (
                <div
                  key={name}
                  className="p-3.5 bg-[#0E141B] rounded border border-[#1E293B] flex items-center justify-between"
                >
                  <div>
                    <div className="font-mono uppercase font-bold text-slate-200 text-xs flex items-center space-x-2">
                      <span>{name}</span>
                      <span className="text-[10px] font-normal text-slate-500 lowercase">({sc.path})</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-1">
                      Version: {sc.version || 'Ready'}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      sc.available
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {sc.available ? 'Ready' : 'Not Found'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Storage & Privacy Section */}
          <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1E293B] pb-3">
              <Database className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Database & Persistence</h2>
            </div>

            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between p-2.5 bg-[#0E141B] rounded border border-[#1E293B]">
                <span className="text-slate-400">Database Engine</span>
                <span className="font-mono text-slate-200">SQLite 3 (Local File: slothsec.db)</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#0E141B] rounded border border-[#1E293B]">
                <span className="text-slate-400">Secret Redaction Policy</span>
                <span className="font-mono text-emerald-400">Enabled (Automatic Gitleaks Masking)</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#0E141B] rounded border border-[#1E293B]">
                <span className="text-slate-400">Optional Sentry Telemetry</span>
                <span className="font-mono text-slate-400">Disabled (Zero Cloud Egress)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
