import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';


export const FindingsPage: React.FC = () => {
  const findings = [
    { id: 'FND-802', title: 'Unusual Active Directory Brute Force Burst', severity: 'CRITICAL', entity: 'usr_jdoe', category: 'AUTHENTICATION', evidence: 'Rule R-001 (5 failures in 30s)', confidence: 95 },
    { id: 'FND-741', title: 'Suspicious Encoded PowerShell Command Execution', severity: 'HIGH', entity: 'WORKSTATION-482', category: 'ENDPOINT', evidence: 'Base64 encoded string detected', confidence: 88 },
    { id: 'FND-699', title: 'Unsanitized Database Query Bulk Read', severity: 'HIGH', entity: 'srv-db-01', category: 'DATABASE', evidence: 'Rule R-004 (Bulk SELECT > 10k rows)', confidence: 92 },
    { id: 'FND-512', title: 'Outbound C2 Beaconing to Unknown IP', severity: 'MEDIUM', entity: '10.0.1.45 → 198.51.100.14', category: 'NETWORK', evidence: 'High Z-score anomaly signal (+3.4)', confidence: 78 },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Evidence-Backed Findings & Insights"
        subtitle="Correlated security findings, rule trigger evidence, and automated triage findings"
        phaseBadge="Findings Active"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Findings' }]}
      />

      <Card title="Operational Security Findings Log" subtitle="Verified security gaps and risk findings" headerStyle="green">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Finding ID</th>
                <th className="py-2.5 px-3">Finding Title</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Affected Entity</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Evidence Citation</th>
                <th className="py-2.5 px-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
              {findings.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{f.id}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{f.title}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">{f.category}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{f.entity}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={f.severity === 'CRITICAL' ? 'critical' : f.severity === 'HIGH' ? 'warning' : 'info'} label={f.severity} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{f.evidence}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{f.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

