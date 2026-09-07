import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ShieldAlert } from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidents & Cases Management"
        subtitle="Correlated incident group overview and triage workflow"
        phaseBadge="Scheduled for Phase 8"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Incidents' }]}
      />

      <Card title="Incident Correlation Module">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0 mt-0.5">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 8 — Incident Management Workflow</h4>
            <p>
              This operational module will manage correlated incident clusters, disposition assignment, and case tracking.
              Functional implementation is scheduled for Phase 8 as defined in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
