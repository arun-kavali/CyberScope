import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';


export const ResponsePage: React.FC = () => {
  const actions = [
    { id: 'ACT-901', action: 'Isolate Host Network Interface', target: 'WORKSTATION-482.cyberscope.local', incidentId: 'INC-2026-0001', status: 'EXECUTED', type: 'Containment', timestamp: '2026-09-07 14:22:10 UTC' },
    { id: 'ACT-902', action: 'Disable Active Directory User Session', target: 'usr_jdoe', incidentId: 'INC-2026-0001', status: 'EXECUTED', type: 'Identity', timestamp: '2026-09-07 14:22:15 UTC' },
    { id: 'ACT-903', action: 'Block Outbound IP on Firewall', target: '198.51.100.14', incidentId: 'INC-2026-0003', status: 'PENDING_APPROVAL', type: 'Network', timestamp: '2026-09-07 15:05:00 UTC' },
    { id: 'ACT-904', action: 'Kill Suspicious Process Tree', target: 'PID 4892 (powershell.exe)', incidentId: 'INC-2026-0001', status: 'EXECUTED', type: 'Endpoint', timestamp: '2026-09-07 14:23:00 UTC' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Controlled Response Execution & Containment"
        subtitle="Analyst response actions, host containment, account isolation, and rollback controls"
        phaseBadge="Response Active"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Response' }]}
      />

      <Card title="Controlled Response Action Center" subtitle="Audited containment actions with manual override & rollback" headerStyle="green">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Action ID</th>
                <th className="py-2.5 px-3">Response Action</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Incident Ref</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
              {actions.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{a.id}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{a.action}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{a.target}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{a.incidentId}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{a.type}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{a.timestamp}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={a.status === 'EXECUTED' ? 'healthy' : 'warning'} label={a.status} />
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

