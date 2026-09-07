import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  phaseBadge?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  phaseBadge,
  actions,
  breadcrumbs,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-300">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-brand-700 transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-slate-700">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
            {phaseBadge && (
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                {phaseBadge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 font-normal mt-0.5">{subtitle}</p>}
        </div>

        {actions && <div className="flex items-center space-x-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
