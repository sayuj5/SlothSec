import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Download,
  FileCode,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { StatusBadge } from '../components/ui/StatusBadge';

export const ReportsPage: React.FC = () => {
  const [selectedScanId, setSelectedScanId] = useState<string>('');

  const { data: scans, isLoading } = useQuery({
    queryKey: ['scans'],
    queryFn: () => apiClient.listScans(),
  });

  const completedScans = scans?.filter((s) => s.status === 'completed') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Security Audit Reports</h1>
        <p className="text-xs text-slate-400 mt-1">
          Generate and download executive PDF reports or raw JSON audit payloads of verified scan findings.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Loading report archive...</div>
      ) : completedScans.length === 0 ? (
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No Completed Scans Available</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Run a security scan in the Scan Center to produce downloadable audit reports.
          </p>
        </div>
      ) : (
        <div className="bg-[#121A23] border border-[#1E293B] rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E141B] border-b border-[#1E293B] text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Repository</th>
                <th className="py-3 px-4">Scan Date</th>
                <th className="py-3 px-4">Scanners Run</th>
                <th className="py-3 px-4">Findings Total</th>
                <th className="py-3 px-4 text-right">Download Formats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-slate-300">
              {completedScans.map((scan) => (
                <tr key={scan.id} className="hover:bg-[#17212C]/60 transition">
                  <td className="py-3.5 px-4 font-medium text-white">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>{scan.repository_name || 'Repository'}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      Scan ID: {scan.id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {new Date(scan.started_at).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] uppercase text-slate-300">
                    {scan.scanners}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                    {scan.findings_count} findings
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {/* PDF Report Download */}
                      <a
                        href={apiClient.getPDFReportUrl(scan.id)}
                        download={`slothsec_report_${scan.id.slice(0, 8)}.pdf`}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 text-xs font-medium transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Executive PDF</span>
                      </a>

                      {/* JSON Report Download */}
                      <a
                        href={apiClient.getJSONReportUrl(scan.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#17212C] hover:bg-[#1E293B] text-slate-300 border border-[#1E293B] text-xs font-medium transition cursor-pointer"
                      >
                        <FileCode className="w-3.5 h-3.5 text-slate-400" />
                        <span>Raw JSON</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
