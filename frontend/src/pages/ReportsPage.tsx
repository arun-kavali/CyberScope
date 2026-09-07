import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { FileText } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive & Operational Reports"
        subtitle="Automated security posture reports and export generation"
        phaseBadge="Scheduled for Phase 21"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Reports' }]}
      />

      <Card title="Reporting Center Module">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0 mt-0.5">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 21 — Executive & Operational Reporting</h4>
            <p>
              This operational module will compile executive summaries, exportable PDF/JSON evidence reports, and operational metrics.
              Functional implementation is scheduled for Phase 21 as defined in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
