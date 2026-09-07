import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { FileCheck } from 'lucide-react';

export const FindingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence-Backed Findings"
        subtitle="Prioritized security gap findings and analytical insights"
        phaseBadge="Scheduled for Phase 14"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Findings' }]}
      />

      <Card title="Findings & Insights Module">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0 mt-0.5">
            <FileCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 14 — Findings & Evidence Engine</h4>
            <p>
              This operational module will compile evidence-backed security findings and actionable recommendations for SOC leadership.
              Functional implementation is scheduled for Phase 14 as defined in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
