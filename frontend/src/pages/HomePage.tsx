import React from 'react';
import { 
  ShieldCheck, 
  Server, 
  Layers, 
  Database, 
  BrainCircuit, 
  CheckCircle2, 
  ArrowRight,
  Terminal,
  Activity
} from 'lucide-react';
import { useHealth } from '../hooks/useHealth';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';

export const HomePage: React.FC = () => {
  const { data: health, isLoading, isError, dataUpdatedAt } = useHealth();

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-100 text-brand-900 border border-brand-200">
              Phase 1 — Project Foundation
            </span>
            <span className="text-xs text-slate-500 font-mono">v0.1.0</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-900 mt-2">CyberScope Platform Overview</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            From Security Evidence to Actionable Insight. Clean, maintainable foundation establishing frontend, backend API, health monitoring, and modular architecture for upcoming phases.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-surface-subtle p-3 rounded-lg border border-slate-200">
          <Server className="h-8 w-8 text-brand-600" />
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FastAPI Backend Status</div>
            <div className="mt-0.5">
              {isLoading ? (
                <StatusBadge status="warning" label="Connecting..." />
              ) : isError ? (
                <StatusBadge status="critical" label="API Unavailable" />
              ) : (
                <StatusBadge status="healthy" label={`Healthy (${health?.service})`} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-[#12] grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Frontend Framework"
          value="React 18"
          subtitle="TypeScript + Vite + Tailwind"
          icon={Layers}
          trend="Active"
          trendType="positive"
        />
        <MetricCard
          title="Backend Service"
          value="FastAPI"
          subtitle="Python + Pydantic + CORS"
          icon={Server}
          trend="Port 8000"
          trendType="positive"
        />
        <MetricCard
          title="Planned Database"
          value="PostgreSQL"
          subtitle="Native Local (Phase 2 Target)"
          icon={Database}
          trend="Phase 2"
          trendType="neutral"
        />
        <MetricCard
          title="Local AI Inference"
          value="Ollama"
          subtitle="Local Llama3 Model (Phase 16 Target)"
          icon={BrainCircuit}
          trend="Phase 16"
          trendType="neutral"
        />
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Health Verification & System Architecture */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health Endpoint Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-semibold text-brand-900">Backend Health Endpoint Verification</h2>
              </div>
              <span className="font-mono text-xs text-slate-400">
                GET /health
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-sm text-slate-600">
                The frontend dynamically queries the backend health endpoint using TanStack Query.
              </p>

              <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner">
                <div className="text-slate-400 mb-2">// Response from http://localhost:8000/health</div>
                {isLoading ? (
                  <div className="text-amber-400">Loading response from FastAPI server...</div>
                ) : isError ? (
                  <div className="text-red-400">Error: Could not fetch /health from backend server. Make sure backend is running on port 8000.</div>
                ) : (
                  <pre>{JSON.stringify(health, null, 2)}</pre>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>Auto-refetch interval: 10s</span>
                <span>Last updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Core Visual System Standards */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-900 border-b border-slate-100 pb-3">
              Design System Alignment (design.md)
            </h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-subtle p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-brand-900 flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-brand-600 mr-1.5" />
                  Enterprise Light Green Theme
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Clean white primary backgrounds, subtle green secondary surfaces, and high-contrast typography designed specifically for SOC analysts.
                </p>
              </div>
              <div className="bg-surface-subtle p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-brand-900 flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-brand-600 mr-1.5" />
                  No Unnecessary Decor
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Free of dark hacker aesthetics, cyberpunk neon decorations, or distracting animations. Focused on enterprise security evidence workflows.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Phase Checklist & Roadmap */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-900 border-b border-slate-100 pb-3 flex items-center">
              <ShieldCheck className="h-5 w-5 text-brand-600 mr-2" />
              Phase 1 Deliverables
            </h2>
            <ul className="mt-4 space-y-3">
              {[
                "React + TypeScript + Vite frontend",
                "FastAPI + Pydantic backend",
                "Clean modular folder structure",
                "Light green/white visual system",
                "Backend GET /health endpoint",
                "CORS configured for development",
                "TanStack Query integration",
                "Environment configuration (.env.example)",
                "Git configuration (.gitignore)",
                "Preserved spec/prd/design docs"
              ].map((item, idx) => (
                <li key={idx} className="flex items-start text-xs text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-brand-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="bg-brand-50 rounded-lg p-3 border border-brand-200">
                <div className="text-xs font-semibold text-brand-900 flex items-center">
                  <ArrowRight className="h-3.5 w-3.5 text-brand-600 mr-1" /> Next Recommended Step
                </div>
                <div className="text-xs text-brand-800 mt-1 font-medium">
                  Proceed to Phase 2: Database Schema & Migration Foundation
                </div>
              </div>
            </div>
          </div>

          {/* Quick Local Commands */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-brand-900 flex items-center">
              <Terminal className="h-4 w-4 text-brand-600 mr-2" /> Local Start Commands
            </h2>
            <div className="mt-3 space-y-3 text-xs font-mono">
              <div className="bg-slate-900 text-slate-200 p-2.5 rounded">
                <div className="text-slate-400 text-[10px]">// Backend</div>
                <div>uvicorn app.main:app --reload</div>
              </div>
              <div className="bg-slate-900 text-slate-200 p-2.5 rounded">
                <div className="text-slate-400 text-[10px]">// Frontend</div>
                <div>npm run dev</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
