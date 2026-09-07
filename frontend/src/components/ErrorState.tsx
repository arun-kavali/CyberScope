import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Operational Error Occurred',
  message,
  onRetry,
}) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-900 shadow-sm space-y-4">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-red-100 text-red-600 rounded-lg flex-shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-red-900">{title}</h4>
          <p className="text-xs text-red-700 leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <div className="flex justify-end">
          <button
            onClick={onRetry}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-300 transition-colors shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Action</span>
          </button>
        </div>
      )}
    </div>
  );
};
