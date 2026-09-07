import React from 'react';
import { Radio, Send, Database, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';


export const AlertSourcePage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface-subtle flex flex-col">
      {/* Top Header for Alert Source interface */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 text-white p-2 rounded-lg flex items-center justify-center shadow-sm">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">CyberScope Alert Source Simulator</h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-200">
                ALERT_SOURCE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">External Security Alert Ingestion Source Interface</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-xs text-slate-600 font-medium flex items-center space-x-2">
            <span>User: <strong className="text-slate-900">{user?.full_name || user?.username}</strong></span>
          </div>
          <button
            onClick={() => logout()}
            className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Alert Source View */}
      <main className="flex-1 p-8 max-w-5xl mx-auto space-y-6 w-full">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
              Role: ALERT_SOURCE
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">Alert Source Generator Interface</h2>
            <p className="text-sm text-slate-600 mt-1">
              This interface is dedicated to security tools, SIEM exporters, and synthetic test scenarios sending security alerts into CyberScope.
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700">
            <Send className="h-8 w-8" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              <span>Source Status</span>
              <StatusBadge status="healthy" label="ACTIVE" />
            </div>
            <div className="text-xl font-bold text-slate-900">Online</div>
            <p className="text-xs text-slate-500">Connected to local CyberScope API</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              <span>Target Pipeline</span>
              <Database className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900">PostgreSQL</div>
            <p className="text-xs text-slate-500">Database Schema Phase 3 Active</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              <span>Role Restrictions</span>
              <Lock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-slate-900">Enforced</div>
            <p className="text-xs text-slate-500">Cannot access SOC Analyst UI</p>
          </div>
        </div>

        {/* Scope Note */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mr-2" />
            Phase 4 Authentication & RBAC Complete
          </h3>
          <p className="text-xs text-slate-600">
            Alert Source authentication is fully active. In Phase 6 (Alert Source) and Phase 7 (Alert Ingestion), synthetic scenario generation controls and batch alert submit buttons will be enabled on this page.
          </p>
        </div>
      </main>
    </div>
  );
};
