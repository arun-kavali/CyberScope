import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RefreshCw, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-subtle flex flex-col items-center justify-center space-y-4">
        <div className="bg-brand-600 text-white p-3 rounded-xl shadow-sm animate-pulse">
          <Shield className="h-8 w-8" />
        </div>
        <div className="flex items-center space-x-2 text-sm text-brand-900 font-medium">
          <RefreshCw className="h-4 w-4 animate-spin text-brand-600" />
          <span>Verifying CyberScope Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
