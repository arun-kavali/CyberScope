import React from 'react';

interface StatusBadgeProps {
  status: 'healthy' | 'warning' | 'critical' | 'info' | 'neutral';
  label: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const styles = {
    healthy: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    warning: 'bg-amber-50 text-amber-900 border-amber-300',
    critical: 'bg-red-50 text-red-900 border-red-300',
    info: 'bg-sky-50 text-sky-900 border-sky-300',
    neutral: 'bg-slate-50 text-slate-800 border-slate-300',
  };

  const dots = {
    healthy: 'bg-emerald-600',
    warning: 'bg-amber-600',
    critical: 'bg-red-600',
    info: 'bg-sky-600',
    neutral: 'bg-slate-500',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${dots[status]}`}></span>
      {label}
    </span>
  );
};

