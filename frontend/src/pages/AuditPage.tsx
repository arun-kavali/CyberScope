import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { User } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const auditLogs = [
    { id: 'AUD-8801', actor: 'soc_analyst_01', action: 'START_INVESTIGATION', resource: 'Incident INC-2026-0001', ip: '127.0.0.1', timestamp: '2026-09-07 16:02:10 UTC', status: 'SUCCESS' },
    { id: 'AUD-8802', actor: 'soc_analyst_01', action: 'GENERATE_AI_NARRATIVE', resource: 'Local Ollama (llama3)', ip: '127.0.0.1', timestamp: '2026-09-07 16:02:45 UTC', status: 'SUCCESS' },
    { id: 'AUD-8803', actor: 'system_core', action: 'TRIAGE_EVALUATION', resource: 'Alert ALT-AUTHENTICATION-001', ip: 'internal', timestamp: '2026-09-07 16:00:00 UTC', status: 'SUCCESS' },
    { id: 'AUD-8804', actor: 'soc_analyst_01', action: 'ADD_INVESTIGATION_NOTE', resource: 'Incident INC-2026-0001', ip: '127.0.0.1', timestamp: '2026-09-07 16:05:00 UTC', status: 'SUCCESS' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Immutable System & Action Audit Trail"
        subtitle="Audited log of analyst security actions, AI model executions, and RBAC decisions"
        phaseBadge="Audit Active"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Audit Trail' }]}
      />

      <Card title="Operational Action Audit Log" subtitle="Cryptographically verified immutable audit events" headerStyle="green">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Audit Event ID</th>
                <th className="py-2.5 px-3">Actor / Identity</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Target Resource</th>
                <th className="py-2.5 px-3">Client IP</th>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{log.id}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center space-x-1">
                    <User className="h-3 w-3 text-slate-400" />
                    <span>{log.actor}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-brand-700 text-[11px]">{log.action}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{log.resource}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{log.ip}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{log.timestamp}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status="healthy" label={log.status} />
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

