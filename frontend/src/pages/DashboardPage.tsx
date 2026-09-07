import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { LayoutDashboard, Shield, Activity, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="SOC Analyst Operational Dashboard"
        subtitle="Primary evidence-driven security operations overview"
        phaseBadge="Phase 5 Shell Established"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Dashboard' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Operational Status" subtitle="Authenticated Session Boundary">
          <div className="flex items-center space-x-3 text-xs">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">{user?.full_name || user?.username}</div>
              <div className="text-slate-500 font-mono text-[11px]">Role: {user?.role}</div>
            </div>
          </div>
        </Card>

        <Card title="System Environment" subtitle="Local-First SOC Intelligence">
          <div className="flex items-center space-x-3 text-xs">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">Simulated SOC Environment</div>
              <div className="text-slate-500 text-[11px]">Local PostgreSQL + FastAPI Backend</div>
            </div>
          </div>
        </Card>

        <Card title="Server-Side Authorization" subtitle="RBAC Security Boundary">
          <div className="flex items-center space-x-3 text-xs">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">Backend RBAC Dependency</div>
              <div className="text-slate-500 text-[11px]">Strict Server Enforced Boundary</div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Implementation Sequence Notice">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0 mt-0.5">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 5 — Global UI Shell Active</h4>
            <p>
              The CyberScope application shell and global UI foundation have been successfully built.
              Individual operational processing modules (alert ingestion, correlation, risk engine, and response actions) will be integrated in subsequent phases according to <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
