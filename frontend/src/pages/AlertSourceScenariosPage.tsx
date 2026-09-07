import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Cpu } from 'lucide-react';

export const AlertSourceScenariosPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Synthetic Scenario Generator"
        subtitle="Pre-configured multi-stage threat scenario selection"
        phaseBadge="Scheduled for Phase 6"
        breadcrumbs={[{ label: 'Alert Source' }, { label: 'Scenario Generator' }]}
      />

      <Card title="Scenario Generator Module">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0 mt-0.5">
            <Cpu className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 6 — Scenario Generator</h4>
            <p>
              This source-facing module will support authentication attack templates, endpoint malware sequences, and false-positive bursts.
              Functional implementation is scheduled for Phase 6 as defined in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
