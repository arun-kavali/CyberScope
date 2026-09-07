import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon: Icon = Inbox,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
      <div className="mx-auto w-12 h-12 bg-slate-50 text-slate-400 rounded-full border border-slate-200 flex items-center justify-center">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{description}</p>
      </div>
      {action && <div className="pt-2 flex justify-center">{action}</div>}
    </div>
  );
};
