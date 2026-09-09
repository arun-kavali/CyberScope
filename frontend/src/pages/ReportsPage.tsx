import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Download, Plus, RefreshCw } from 'lucide-react';
import { reportsApi, ReportItem } from '../services/reportsApi';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState('EXECUTIVE_SUMMARY');
  const [selectedFormat, setSelectedFormat] = useState('PDF');
  const [customTitle, setCustomTitle] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportsApi.getReports(page, 20);
      setReports(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await reportsApi.generateReport({
        report_type: selectedType,
        format: selectedFormat,
        title: customTitle.trim() || undefined,
      });
      setCustomTitle('');
      await fetchReports();
    } catch (err) {
      console.error('Report generation failed:', err);
      alert('Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (r: ReportItem) => {
    try {
      const ext = r.format.toLowerCase();
      const filename = `${r.report_number}.${ext}`;
      await reportsApi.downloadReport(r.id, filename);
    } catch (err) {
      console.error('Report download failed:', err);
      alert('Failed to download report file.');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        subtitle="Automated security posture reports, incident exports, and compliance packages."
        phaseBadge="SOC Operations"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Reports' }]}
      />

      <Card title="Generate On-Demand Security Report" subtitle="Create PDF, CSV, or JSON evidence packages" headerStyle="green">
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Report Category</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="EXECUTIVE_SUMMARY">Executive Summary</option>
              <option value="OPERATIONAL_ANALYTICS">Operational Evidence Analytics</option>
              <option value="INCIDENT_SUMMARY">Incident Forensic Export</option>
              <option value="DATA_QUALITY">Data Quality Governance</option>
              <option value="FULL_SYSTEM">Full CyberScope Posture Package</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Output Format</label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="PDF">PDF Document</option>
              <option value="CSV">CSV Data Export</option>
              <option value="JSON">Structured JSON</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Q3 SOC Efficacy Briefing"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={generating}
              className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-brand-800 text-white font-semibold text-xs rounded hover:bg-brand-900 transition-colors disabled:opacity-50"
            >
              {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{generating ? 'Generating...' : 'Generate Report'}</span>
            </button>
          </div>
        </form>
      </Card>

      <Card title="Generated Security Posture & Evidence Reports" subtitle={`Downloadable evidence packages & executive briefings (${total} total)`} headerStyle="green">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading generated reports...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Report Code</th>
                  <th className="py-2.5 px-3">Report Title</th>
                  <th className="py-2.5 px-3">Report Type</th>
                  <th className="py-2.5 px-3">Format</th>
                  <th className="py-2.5 px-3">Generated At</th>
                  <th className="py-2.5 px-3">Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                      No reports generated yet. Click "Generate Report" above to compile an evidence package.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{r.report_number}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{r.title}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{r.report_type}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">{r.format || r.content_summary?.format || 'PDF'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {new Date(r.created_at).toISOString().replace('T', ' ').substring(0, 19)} UTC
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleDownload(r)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-brand-50 text-brand-800 border border-brand-200 rounded font-semibold hover:bg-brand-100 transition-colors text-[11px]"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download {r.format || 'File'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
