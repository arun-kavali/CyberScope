import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: string;
  headerAction?: React.ReactNode;
  headerStyle?: 'default' | 'green' | 'subtle';
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerAction,
  headerStyle = 'default',
  children,
  className = '',
  footer,
  noPadding = false
}) => {
  const getHeaderClass = () => {
    if (headerStyle === 'green') {
      return 'bg-brand-900 text-white px-3.5 py-2 flex items-center justify-between border-b border-brand-950';
    }
    if (headerStyle === 'subtle') {
      return 'bg-slate-50 text-slate-900 px-3.5 py-2.5 flex items-center justify-between border-b border-slate-200';
    }
    return 'px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-white';
  };

  const getTitleClass = () => {
    if (headerStyle === 'green') {
      return 'text-xs font-bold text-white tracking-wide uppercase flex items-center space-x-1.5';
    }
    return 'text-xs font-bold text-slate-900 tracking-wide flex items-center space-x-1.5';
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden ${className}`}>
      {(title || headerAction) && (
        <div className={getHeaderClass()}>
          <div>
            {title && (
              typeof title === 'string' ? (
                <h3 className={getTitleClass()}>{title}</h3>
              ) : (
                <div className={getTitleClass()}>{title}</div>
              )
            )}
            {subtitle && <p className={`text-[11px] mt-0.5 ${headerStyle === 'green' ? 'text-emerald-200' : 'text-slate-500'}`}>{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-3.5'}>{children}</div>
      {footer && <div className="px-3.5 py-2 bg-surface-subtle border-t border-slate-100 text-[11px] text-slate-500">{footer}</div>}
    </div>
  );
};
