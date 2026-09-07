import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ReviewPrioritiesPage: React.FC = () => {
  const priorities = [
    { rank: 1, title: 'Multi-Stage Kerberos Ticket & PowerShell Escalation', incidentId: 'INC-2026-0001', riskScore: 94, confidence: 96, fpLikelihood: 4, status: 'OPEN' },
    { rank: 2, title: 'Unusual Bulk Database Select by Service User', incidentId: 'INC-2026-0004', riskScore: 82, confidence: 91, fpLikelihood: 12, status: 'IN_PROGRESS' },
    { rank: 3, title: 'External C2 Connection from Workstation', incidentId: 'INC-2026-0003', riskScore: 78, confidence: 85, fpLikelihood: 15, status: 'OPEN' },
    { rank: 4, title: 'Brute Force Authentication Burst', incidentId: 'INC-2026-0002', riskScore: 68, confidence: 88, fpLikelihood: 22, status: 'RESOLVED' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Review Priorities Queue"
        subtitle="Analyst triage queue prioritized dynamically by Risk Score, Evidence Confidence, and False-Positive Likelihood"
        phaseBadge="Queue Active"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Review Priorities' }]}
      />

      <Card title="Prioritized Analyst Triage Queue" subtitle="Ranked by Phase 10 Risk Score & Phase 12 Evidence Correlation" headerStyle="green">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Priority Rank</th>
                <th className="py-2.5 px-3">Incident ID</th>
                <th className="py-2.5 px-3">Threat Description</th>
                <th className="py-2.5 px-3">Risk Score</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">FP Likelihood</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
              {priorities.map((p) => (
                <tr key={p.rank} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-extrabold text-brand-900">#{p.rank}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.incidentId}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{p.title}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{p.riskScore} / 100</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-blue-700">{p.confidence}%</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{p.fpLikelihood}%</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={p.status === 'OPEN' ? 'critical' : p.status === 'IN_PROGRESS' ? 'info' : 'healthy'} label={p.status} />
                  </td>
                  <td className="py-2.5 px-3">
                    <Link
                      to={`/investigations?incident_id=${p.incidentId}`}
                      className="inline-flex items-center space-x-1 font-bold text-brand-700 hover:text-brand-900 text-[11px]"
                    >
                      <span>Investigate</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
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

