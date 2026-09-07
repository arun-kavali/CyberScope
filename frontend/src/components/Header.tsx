import React from 'react';
import { Shield, Activity, RefreshCw, LogOut, User, Menu, Radio } from 'lucide-react';
import { useHealth } from '../hooks/useHealth';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { data: health, isLoading, isError, refetch } = useHealth();
  const { user, logout } = useAuth();
  const { status: realtimeStatus } = useRealtime();

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-600 hover:text-brand-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="bg-brand-600 text-white p-2 rounded-lg flex items-center justify-center shadow-sm">
          <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-xl font-bold text-brand-900 tracking-tight">CyberScope</h1>
            <span className="hidden sm:inline-block bg-emerald-50 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-200">
              Simulated SOC Environment
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-slate-500 font-medium">From Security Evidence to Actionable Insight</p>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Realtime Stream Indicator for SOC Analysts */}
        {user?.role === 'SOC_ANALYST' && (
          <div className="hidden sm:flex items-center space-x-2 text-xs bg-surface-subtle px-3 py-1.5 rounded-full border border-slate-200">
            <Radio className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Realtime:</span>
            {realtimeStatus === 'CONNECTED' ? (
              <span className="flex items-center text-emerald-700 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></span> Live
              </span>
            ) : realtimeStatus === 'CONNECTING' ? (
              <span className="flex items-center text-amber-600 font-medium">
                <RefreshCw className="h-3 w-3 animate-spin mr-1" /> Connecting
              </span>
            ) : (
              <span className="flex items-center text-slate-500 font-medium">
                <span className="h-2 w-2 rounded-full bg-slate-400 mr-1.5"></span> Standby
              </span>
            )}
          </div>
        )}

        {/* Backend Health Status Indicator */}
        <div className="hidden lg:flex items-center space-x-2 text-xs bg-surface-subtle px-3 py-1.5 rounded-full border border-slate-200">
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
            title="Refresh API Status"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>

        {/* Authenticated User & Role Details */}
        {user && (
          <div className="flex items-center space-x-3 border-l border-slate-200 pl-3 sm:pl-4">
            <div className="flex items-center space-x-2 text-xs">
              <div className="p-1.5 bg-slate-100 rounded-full text-slate-600 hidden sm:block">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-900 leading-none text-xs">{user.full_name || user.username}</div>
                <span className="inline-block text-[10px] text-brand-800 bg-brand-50 border border-brand-200 font-mono px-1.5 py-0.2 rounded mt-0.5">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="flex items-center space-x-1 text-xs px-2.5 py-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 font-medium rounded-lg border border-slate-200 hover:border-red-200 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
