import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const s = (status || '').toUpperCase();

  let styles = 'bg-slate-800 text-slate-300 border-slate-700';

  if (s === 'COMPLETED' || s === 'VERIFIED' || s === 'VERIFIED_FIXED' || s === 'RESOLVED') {
    styles = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80';
  } else if (s === 'RUNNING' || s === 'PENDING') {
    styles = 'bg-sky-950/70 text-sky-300 border-sky-800/80 animate-pulse';
  } else if (s === 'FAILED' || s === 'REJECTED' || s === 'STILL_VULNERABLE') {
    styles = 'bg-red-950/70 text-red-300 border-red-800/80';
  } else if (s === 'APPROVED') {
    styles = 'bg-emerald-950/50 text-emerald-400 border-emerald-700/60';
  } else if (s === 'PROPOSED') {
    styles = 'bg-purple-950/70 text-purple-300 border-purple-800/80';
  } else if (s === 'OPEN') {
    styles = 'bg-amber-950/60 text-amber-300 border-amber-800/60';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles} ${className}`}>
      {s.replace('_', ' ')}
    </span>
  );
};
