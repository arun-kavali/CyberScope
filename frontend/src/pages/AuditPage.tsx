import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { History } from 'lucide-react';

export const AuditPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="System & Action Audit Trail"
        subtitle="Immutable log of analyst actions, system events, and security decisions"
        phaseBadge="Scheduled for Phase 23"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Audit Trail' }]}
      />

      <Card title="Audit Trail Module">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0 mt-0.5">
            <History className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 23 — Audit Trail System</h4>
            <p>
              This operational module will maintain an immutable record of analyst actions, authentication events, and response approvals.
              Functional implementation is scheduled for Phase 23 as defined in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
