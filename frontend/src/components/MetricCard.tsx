import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'neutral' | 'negative';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'neutral',
}) => {
  const trendStyles = {
    positive: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    neutral: 'text-slate-600 bg-slate-50 border-slate-200',
    negative: 'text-red-700 bg-red-50 border-red-200',
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-brand-300 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        <div className="p-2 rounded-lg bg-surface-subtle text-brand-700 border border-brand-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        {trend && (
          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${trendStyles[trendType]}`}>
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
};
