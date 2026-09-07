import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Search } from 'lucide-react';

export const InvestigationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Deep Evidence Investigations"
        subtitle="Analyst investigation canvas and timeline correlation"
        phaseBadge="Scheduled for Phase 9"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Investigations' }]}
      />

      <Card title="Investigation Canvas Module">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0 mt-0.5">
            <Search className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 9 — Deep Investigation Canvas</h4>
            <p>
              This operational module will support entity timeline visualization, asset tracking, and analyst note taking.
              Functional implementation is scheduled for Phase 9 as defined in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
