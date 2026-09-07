import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerAction,
  children,
  className = '',
  footer,
}) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
      {(title || headerAction) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && <div className="px-5 py-3 bg-surface-subtle border-t border-slate-100 text-xs text-slate-500">{footer}</div>}
    </div>
  );
};
