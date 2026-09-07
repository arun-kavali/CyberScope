import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Download } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const reports = [
    { id: 'RPT-2026-Q3', title: 'SOC Operational Efficacy & MTTD Benchmark Report', type: 'Executive Summary', scope: 'Global Infrastructure', format: 'PDF / JSON', status: 'READY', generated: '2026-09-07 08:00 UTC' },
    { id: 'RPT-INC-0001', title: 'Incident Evidence Export: Active Directory Brute Force', type: 'Forensic Evidence Package', scope: 'Incident INC-2026-0001', format: 'ZIP Bundle', status: 'READY', generated: '2026-09-07 14:30 UTC' },
    { id: 'RPT-GAP-09', title: 'MITRE ATT&CK Execution Gap Coverage Assessment', type: 'Technical Gap Report', scope: 'Phase 13 Gap Engine', format: 'PDF Report', status: 'READY', generated: '2026-09-06 18:00 UTC' },
    { id: 'RPT-AI-LLM', title: 'Ollama Local LLM Investigation Summary Audit', type: 'AI Audit Export', scope: 'Local Ollama Model', format: 'JSON Log', status: 'READY', generated: '2026-09-07 15:10 UTC' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Executive & Operational Reporting Center"
        subtitle="Automated security posture reports, evidence export packages, and compliance audits"
        phaseBadge="Reporting Active"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Reports' }]}
      />

      <Card title="Generated Security Posture & Evidence Reports" subtitle="Downloadable evidence packages & executive briefings" headerStyle="green">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Report Code</th>
                <th className="py-2.5 px-3">Report Title</th>
                <th className="py-2.5 px-3">Report Type</th>
                <th className="py-2.5 px-3">Scope Boundary</th>
                <th className="py-2.5 px-3">Format</th>
                <th className="py-2.5 px-3">Generated At</th>
                <th className="py-2.5 px-3">Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{r.id}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{r.title}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">{r.type}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{r.scope}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">{r.format}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{r.generated}</td>
                  <td className="py-2.5 px-3">
                    <button className="inline-flex items-center space-x-1 px-2 py-1 bg-brand-50 text-brand-800 border border-brand-200 rounded font-semibold hover:bg-brand-100 transition-colors text-[11px]">
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </button>
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

