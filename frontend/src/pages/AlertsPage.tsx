import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Bell } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Alert Ingestion Center"
        subtitle="Security alert streaming, search, and filtering interface"
        phaseBadge="Scheduled for Phase 6"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Alerts' }]}
      />

      <Card title="Alert Management Module">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0 mt-0.5">
            <Bell className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 6 — Alert Ingestion Pipeline</h4>
            <p>
              This operational module will support live alert streaming, structured search, severity filtering, and multi-source normalization.
              Functional implementation is scheduled for Phase 6 as defined in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
