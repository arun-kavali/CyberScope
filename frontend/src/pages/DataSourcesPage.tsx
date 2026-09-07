import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Database, CheckCircle2, RefreshCw, Zap } from 'lucide-react';

export const DataSourcesPage: React.FC = () => {
  const connectors = [
    { name: 'Active Directory Domain Controller', category: 'AUTHENTICATION', eps: '142 EPS', status: 'healthy' as const, latency: '42ms', format: 'Kerberos / NTLM Syslog' },
    { name: 'CrowdStrike Falcon EDR', category: 'ENDPOINT', eps: '480 EPS', status: 'healthy' as const, latency: '18ms', format: 'JSON Webhook API' },
    { name: 'Palo Alto Enterprise Firewall', category: 'NETWORK', eps: '1,250 EPS', status: 'healthy' as const, latency: '12ms', format: 'CEF / Syslog' },
    { name: 'PostgreSQL Core Audit Log', category: 'DATABASE', eps: '65 EPS', status: 'healthy' as const, latency: '5ms', format: 'pgaudit Stream' },
    { name: 'Microsoft Defender 365 Email', category: 'EMAIL', eps: '95 EPS', status: 'healthy' as const, latency: '120ms', format: 'Graph Security API' },
    { name: 'CyberScope Synthetic Generator', category: 'SIMULATOR', eps: 'Manual / Batch', status: 'healthy' as const, latency: '<1ms', format: 'Canonical JSON' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Data Source Center & Ingestion Connectors"
        subtitle="Active security telemetry streams, canonical schema parsers, and connection health"
        phaseBadge="Connectors Active"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Data Sources' }]}
        actions={
          <button className="flex items-center space-x-1.5 text-xs px-3 py-1.5 bg-brand-900 text-white font-semibold rounded hover:bg-brand-950 transition-colors shadow-2xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Poll Connector Health</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card title="Ingestion Throughput" subtitle="Aggregated Realtime Metrics">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">2,032 EPS</div>
              <div className="text-[11px] text-slate-500 font-medium">Aggregated Events Per Second</div>
            </div>
            <div className="p-2 bg-brand-50 text-brand-700 rounded-lg">
              <Zap className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card title="Active Connectors" subtitle="Configured Ingestion Pipelines">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">6 / 6</div>
              <div className="text-[11px] text-emerald-700 font-bold">100% Operational Health</div>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card title="Canonical Normalization" subtitle="CyberScope Ingestion Schema">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">v1.4 Schema</div>
              <div className="text-[11px] text-slate-500 font-medium">Auto Field Mapping Active</div>
            </div>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Database className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <Card title="Active Ingestion Telemetry Connectors" subtitle="Configured log streams, raw to canonical mapping, and latency" headerStyle="green">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Connector Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Format / Transport</th>
                <th className="py-2.5 px-3">Volume</th>
                <th className="py-2.5 px-3">Ingest Latency</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
              {connectors.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{c.name}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-brand-900">{c.category}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{c.format}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{c.eps}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">{c.latency}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={c.status} label="Healthy" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

