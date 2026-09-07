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
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-300">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-brand-700 transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-slate-700 font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-brand-900 tracking-tight">{title}</h1>
            {phaseBadge && (
              <span className="bg-brand-50 text-brand-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-brand-200">
                {phaseBadge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 font-medium mt-1">{subtitle}</p>}
        </div>

        {actions && <div className="flex items-center space-x-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
