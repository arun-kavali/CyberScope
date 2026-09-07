import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { History } from 'lucide-react';

export const AlertSourceHistoryPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Submission History"
        subtitle="Log of synthetic alerts and batch submissions"
        phaseBadge="Scheduled for Phase 6"
        breadcrumbs={[{ label: 'Alert Source' }, { label: 'Submission History' }]}
      />

      <Card title="Submission History Log">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0 mt-0.5">
            <History className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 6 — Submission History Log</h4>
            <p>
              This source-facing module will display historical submission records, delivery status, and batch ingestion logs.
              Functional implementation is scheduled for Phase 6 as defined in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
