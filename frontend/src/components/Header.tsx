import React from 'react';
import { 
  Shield, 
  LogOut, 
  User, 
  Menu, 
  Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const { status: realtimeStatus } = useRealtime();

  return (
    <header className="bg-white text-slate-800 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs sticky top-0 z-40">
      {/* Brand & Left Info */}
      <div className="flex items-center space-x-3 shrink-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center space-x-2.5">
          <div className="bg-emerald-600 text-white p-1.5 rounded-lg flex items-center justify-center shadow-xs">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">CyberScope</h1>
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Simulated SOC Environment
            </span>
          </div>
        </div>
      </div>

      {/* Right User & System Indicators */}
      <div className="flex items-center space-x-3 text-xs shrink-0">
        {/* Realtime Stream Status */}
        {user?.role === 'SOC_ANALYST' && (
          <div className="hidden sm:flex items-center space-x-1.5 text-[11px] bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 text-slate-600">
            <Radio className="h-3 w-3 text-emerald-600" />
            <span className="font-medium">Realtime:</span>
            {realtimeStatus === 'CONNECTED' ? (
              <span className="flex items-center text-emerald-700 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span> Live
              </span>
            ) : (
              <span className="flex items-center text-amber-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mr-1"></span> Standby
              </span>
            )}
          </div>
        )}

        {/* Authenticated User */}
        {user && (
          <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
            <div className="flex items-center space-x-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
              <div className="p-1 bg-emerald-100 text-emerald-800 rounded-full">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-800 leading-none text-xs">{user.full_name || user.username}</div>
                <span className="text-[10px] text-slate-500 font-medium">{user.role === 'SOC_ANALYST' ? 'SOC Analyst' : user.role}</span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="flex items-center space-x-1 text-[11px] px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-medium rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
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
