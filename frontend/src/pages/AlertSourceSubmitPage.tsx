import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Send } from 'lucide-react';

export const AlertSourceSubmitPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Submit Alert"
        subtitle="Source interface for submitting synthetic security events"
        phaseBadge="Scheduled for Phase 6"
        breadcrumbs={[{ label: 'Alert Source' }, { label: 'Submit Alert' }]}
      />

      <Card title="Alert Submission Interface">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0 mt-0.5">
            <Send className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 6 — Alert Source Generator Engine</h4>
            <p>
              This source-facing module will allow synthetic alert submission, custom payload generation, and batch event injection.
              Functional implementation is scheduled for Phase 6 as defined in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
