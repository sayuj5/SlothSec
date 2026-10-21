import React from 'react';
import type { SeverityLevel } from '../../types';

interface SeverityBadgeProps {
  severity: SeverityLevel | string;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className = '' }) => {
  const sev = (severity || 'INFO').toUpperCase();

  let styles = 'bg-slate-800 text-slate-300 border-slate-700';

  if (sev === 'CRITICAL') {
    styles = 'bg-rose-950/70 text-rose-300 border-rose-800/80';
  } else if (sev === 'HIGH') {
    styles = 'bg-orange-950/70 text-orange-300 border-orange-800/80';
  } else if (sev === 'MEDIUM') {
    styles = 'bg-amber-950/70 text-amber-300 border-amber-800/80';
  } else if (sev === 'LOW') {
    styles = 'bg-blue-950/70 text-blue-300 border-blue-800/80';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wider border ${styles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 opacity-80" style={{
        backgroundColor:
          sev === 'CRITICAL' ? '#EF4444' :
          sev === 'HIGH' ? '#F97316' :
          sev === 'MEDIUM' ? '#EAB308' :
          sev === 'LOW' ? '#3B82F6' : '#94A3B8'
      }} />
      {sev}
    </span>
  );
};
