import React from 'react';
import { RefreshCw, Shield } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading CyberScope Data...',
  subtext = 'Please wait while operational evidence is retrieved.',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div className="p-3 bg-brand-50 text-brand-600 rounded-xl border border-brand-200 shadow-sm animate-pulse">
        <Shield className="h-6 w-6" />
      </div>
      <div className="flex items-center space-x-2 text-sm font-semibold text-brand-900">
        <RefreshCw className="h-4 w-4 animate-spin text-brand-600" />
        <span>{message}</span>
      </div>
      {subtext && <p className="text-xs text-slate-500 max-w-sm">{subtext}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="min-h-screen bg-surface-subtle flex items-center justify-center">{content}</div>;
  }

  return <div className="bg-white border border-slate-200 rounded-xl p-6">{content}</div>;
};
