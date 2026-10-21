import React, { useState } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  filePath?: string;
  className?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, filePath, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const lines = (diff || '').split('\n');

  const additions = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
  const deletions = lines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-md border border-slate-800 bg-[#0A0E13] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0E141B] border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-2 text-slate-300 font-mono">
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span>{filePath || 'unified.diff'}</span>
          <span className="text-emerald-400 font-semibold ml-2">+{additions}</span>
          <span className="text-rose-400 font-semibold">-{deletions}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Diff'}</span>
        </button>
      </div>

      {/* Code diff lines */}
      <div className="p-3 font-mono text-xs overflow-x-auto leading-relaxed max-h-[450px]">
        {lines.length === 0 || !diff.trim() ? (
          <div className="text-slate-500 italic p-2">No diff available.</div>
        ) : (
          lines.map((line, idx) => {
            let lineClass = 'text-slate-400';
            let bgClass = 'hover:bg-slate-900/60';

            if (line.startsWith('+') && !line.startsWith('+++')) {
              lineClass = 'text-emerald-300 font-medium';
              bgClass = 'bg-emerald-950/30 hover:bg-emerald-950/50';
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              lineClass = 'text-rose-300 font-medium';
              bgClass = 'bg-rose-950/30 hover:bg-rose-950/50';
            } else if (line.startsWith('@@')) {
              lineClass = 'text-sky-400 font-bold';
              bgClass = 'bg-sky-950/30';
            } else if (line.startsWith('---') || line.startsWith('+++')) {
              lineClass = 'text-slate-500 font-semibold';
            }

            return (
              <div key={idx} className={`flex items-start px-2 py-0.5 rounded-sm ${bgClass}`}>
                <span className="w-8 select-none text-slate-600 text-right pr-3 font-mono shrink-0">
                  {idx + 1}
                </span>
                <span className={`whitespace-pre-wrap break-all ${lineClass}`}>
                  {line || ' '}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
