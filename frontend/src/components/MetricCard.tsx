import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'neutral' | 'negative' | 'critical';
  subtitle?: string;
  icon?: LucideIcon | React.ReactNode;
  trend?: string;
  trendType?: 'positive' | 'neutral' | 'negative' | 'critical';
  accentColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  subtitle,
  icon,
  trend,
  trendType = 'neutral',
  accentColor
}) => {
  const effectiveTrend = change || trend;
  const effectiveTrendType = changeType || trendType;

  const trendStyles = {
    positive: 'text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold',
    neutral: 'text-slate-600 bg-slate-50 border-slate-200 font-medium',
    negative: 'text-amber-700 bg-amber-50 border-amber-200 font-semibold',
    critical: 'text-rose-700 bg-rose-50 border-rose-200 font-bold',
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'function') {
      const IconComponent = icon as LucideIcon;
      return <IconComponent className="h-4 w-4" />;
    }
    return icon;
  };

  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs hover:border-brand-300 transition-all ${accentColor ? 'border-t-2 border-t-brand-600' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate pr-1">{title}</span>
        {icon && (
          <div className="p-1.5 rounded-md bg-emerald-50 text-brand-700 border border-emerald-100 shrink-0">
            {renderIcon()}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{value}</div>
        {effectiveTrend && (
          <span className={`text-[10px] px-1.5 py-0.25 rounded border ${trendStyles[effectiveTrendType]}`}>
            {effectiveTrend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-0.5 text-[11px] text-slate-500 truncate">{subtitle}</p>}
    </div>
  );
};

