import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Database } from 'lucide-react';

export const DataSourcesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Source Center"
        subtitle="Security integration connectors and schema mappings"
        phaseBadge="Scheduled for Phase 12"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Data Sources' }]}
      />

      <Card title="Data Source Integration Module">
        <div className="flex items-start space-x-3 text-xs text-slate-600">
          <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0 mt-0.5">
            <Database className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-brand-900 text-sm">Phase 12 — Data Source Center</h4>
            <p>
              This operational module will manage external data connectors, ingest pipelines, and schema mapping rules.
              Functional implementation is scheduled for Phase 12 as defined in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">implementationplan.md</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
