import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Layers } from 'lucide-react';

export const ReviewPrioritiesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Priorities Queue"
        subtitle="Analyst review queue prioritized by explainable risk and confidence"
        phaseBadge="Scheduled for Phase 15"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Review Priorities' }]}
      />

      <Card title="Review Priority Queue Module">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0 mt-0.5">
            <Layers className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 15 — Review Priority Engine</h4>
            <p>
              This operational module will score and rank analyst review priorities based on explainable risk score and confidence levels.
              Functional implementation is scheduled for Phase 15 as defined in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
