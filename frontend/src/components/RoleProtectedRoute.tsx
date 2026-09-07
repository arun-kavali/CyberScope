import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RoleProtectedRouteProps {
  allowedRoles: ('SOC_ANALYST' | 'ALERT_SOURCE')[];
  children: React.ReactNode;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-surface-subtle flex flex-col justify-center items-center px-4 py-12">
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">403 — Access Denied</h1>
          <p className="text-xs text-slate-600">
            Your current account role (<strong className="text-slate-900">{user?.role || 'UNKNOWN'}</strong>) is not authorized to access this section of CyberScope.
          </p>

          <div className="pt-4 border-t border-slate-100 flex justify-center">
            {user?.role === 'ALERT_SOURCE' ? (
              <Link
                to="/alert-source"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Go to Alert Source Interface</span>
              </Link>
            ) : (
              <Link
                to="/"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Go to Analyst Dashboard</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
