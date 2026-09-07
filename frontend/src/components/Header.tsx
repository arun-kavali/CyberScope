import React from 'react';
import { 
  Shield, 
  Activity, 
  RefreshCw, 
  LogOut, 
  User, 
  Menu, 
  Radio, 
  UploadCloud, 
  Search, 
  Layers, 
  ShieldAlert, 
  FileText, 
  Zap, 
  AlertTriangle, 
  Sparkles, 
  Eye 
} from 'lucide-react';
import { useHealth } from '../hooks/useHealth';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { isLoading, isError, refetch } = useHealth();
  const { user, logout } = useAuth();
  const { status: realtimeStatus } = useRealtime();

  const pipelineSteps = [
    { label: 'Ingest', icon: UploadCloud },
    { label: 'Analyze', icon: Search },
    { label: 'Correlate', icon: Layers },
    { label: 'Detect', icon: ShieldAlert },
    { label: 'Investigate', icon: FileText },
    { label: 'Respond', icon: Zap },
    { label: 'Uncover Gaps', icon: AlertTriangle },
    { label: 'Generate Insights', icon: Sparkles },
    { label: 'Ensure Visibility', icon: Eye },
  ];

  return (
    <header className="bg-brand-900 text-white border-b border-brand-950 px-3 sm:px-4 py-2 flex items-center justify-between shadow-md sticky top-0 z-40">
      {/* Brand & Left Info */}
      <div className="flex items-center space-x-3 shrink-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 text-emerald-200 hover:text-white hover:bg-brand-800 rounded-md transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="bg-emerald-600 text-white p-1.5 rounded-lg flex items-center justify-center shadow-xs">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-white tracking-tight leading-none">CyberScope</h1>
            <span className="hidden xl:inline-block bg-emerald-800/80 text-emerald-200 text-[9px] font-semibold px-2 py-0.5 rounded border border-emerald-700/60 font-mono">
              SOC Enterprise
            </span>
          </div>
          <p className="hidden md:block text-[10px] text-emerald-200/80 font-medium">From Security Evidence to Actionable Insight</p>
        </div>
      </div>

      {/* Center Pipeline Capabilities Flow (Reference Image Bar) */}
      <div className="hidden lg:flex items-center space-x-1.5 bg-brand-950/60 px-3 py-1 rounded-full border border-emerald-800/40 text-[11px] font-medium text-emerald-100">
        {pipelineSteps.map((step, idx) => {
          const StepIcon = step.icon;
          return (
            <React.Fragment key={step.label}>
              <div className="flex items-center space-x-1 hover:text-white transition-colors cursor-default" title={step.label}>
                <StepIcon className="h-3 w-3 text-emerald-400" />
                <span className="whitespace-nowrap text-[10px]">{step.label}</span>
              </div>
              {idx < pipelineSteps.length - 1 && (
                <span className="text-emerald-700 text-[9px]">➔</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Right User & System Indicators */}
      <div className="flex items-center space-x-2 sm:space-x-3 text-xs shrink-0">
        {/* Tagline */}
        <span className="hidden 2xl:inline-block text-[11px] text-emerald-300 font-semibold tracking-wide border-r border-brand-800 pr-3">
          Smarter Security. Safer Tomorrow.
        </span>

        {/* Realtime Stream Status */}
        {user?.role === 'SOC_ANALYST' && (
          <div className="hidden sm:flex items-center space-x-1.5 text-[11px] bg-brand-950/80 px-2.5 py-1 rounded-md border border-brand-800 text-emerald-200">
            <Radio className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-300 font-medium">Realtime:</span>
            {realtimeStatus === 'CONNECTED' ? (
              <span className="flex items-center text-emerald-300 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span> Live
              </span>
            ) : (
              <span className="flex items-center text-emerald-400/70 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mr-1"></span> Standby
              </span>
            )}
          </div>
        )}

        {/* Backend API Health Indicator */}
        <div className="hidden md:flex items-center space-x-1.5 text-[11px] bg-brand-950/80 px-2.5 py-1 rounded-md border border-brand-800 text-emerald-200">
          <Activity className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-300 font-medium">API:</span>
          {isLoading ? (
            <span className="flex items-center text-amber-300 font-medium">
              <RefreshCw className="h-2.5 w-2.5 animate-spin mr-1" /> ...
            </span>
          ) : isError ? (
            <span className="flex items-center text-rose-300 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1 animate-ping"></span> Off
            </span>
          ) : (
            <span className="flex items-center text-emerald-300 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1"></span> Healthy
            </span>
          )}
          <button 
            onClick={() => refetch()} 
            className="text-emerald-400 hover:text-white transition-colors ml-0.5"
            title="Refresh Status"
          >
            <RefreshCw className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Authenticated User */}
        {user && (
          <div className="flex items-center space-x-2 border-l border-brand-800 pl-2 sm:pl-3">
            <div className="flex items-center space-x-1.5 text-xs">
              <div className="p-1 bg-brand-800 rounded text-emerald-200 hidden sm:block">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-white leading-none text-xs truncate max-w-[100px] sm:max-w-none">{user.full_name || user.username}</div>
                <span className="inline-block text-[9px] text-emerald-200 bg-brand-950 border border-brand-800 font-mono px-1 rounded mt-0.5">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="flex items-center space-x-1 text-[11px] px-2 py-1 bg-brand-800 hover:bg-rose-900/80 text-emerald-100 hover:text-white font-medium rounded border border-brand-700 hover:border-rose-700 transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
