import React from 'react';
import { Shield, Activity, RefreshCw, LogOut, User } from 'lucide-react';
import { useHealth } from '../hooks/useHealth';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { data: health, isLoading, isError, refetch } = useHealth();
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="bg-brand-600 text-white p-2 rounded-lg flex items-center justify-center shadow-sm">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-brand-900 tracking-tight">CyberScope</h1>
            <span className="bg-brand-100 text-brand-800 text-xs font-semibold px-2 py-0.5 rounded border border-brand-200">
              SOC Enterprise
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">From Security Evidence to Actionable Insight</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Backend Health Status Indicator */}
        <div className="flex items-center space-x-2 text-xs bg-surface-subtle px-3 py-1.5 rounded-full border border-slate-200">
          <Activity className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-slate-600 font-medium">Backend API:</span>
          {isLoading ? (
            <span className="flex items-center text-amber-600 font-medium">
              <RefreshCw className="h-3 w-3 animate-spin mr-1" /> Connecting...
            </span>
          ) : isError ? (
            <span className="flex items-center text-red-600 font-semibold">
              <span className="h-2 w-2 rounded-full bg-red-600 mr-1.5 animate-pulse"></span> Offline
            </span>
          ) : (
            <span className="flex items-center text-brand-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-brand-600 mr-1.5"></span> {health?.status === 'healthy' ? 'Healthy' : 'Unknown'}
            </span>
          )}
          <button 
            onClick={() => refetch()} 
            className="text-slate-400 hover:text-slate-600 transition-colors ml-1"
            title="Refresh Status"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>

        {/* Authenticated User & Role Details */}
        {user && (
          <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
            <div className="flex items-center space-x-2 text-xs">
              <div className="p-1.5 bg-slate-100 rounded-full text-slate-600">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-900 leading-none">{user.full_name || user.username}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{user.role}</div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="flex items-center space-x-1 text-xs px-2.5 py-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 font-medium rounded border border-slate-200 hover:border-red-200 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
