import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { 
  ShieldAlert, 
  Layers, 
  ChevronRight, 
  RefreshCw, 
  X, 
  Activity, 
  User,
  HardDrive,
  Filter
} from 'lucide-react';
import { 
  fetchIncidents, 
  fetchIncidentById, 
  IncidentSummaryRecord, 
  IncidentDetailRecord 
} from '../services/incidentsApi';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentSummaryRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  // Selected Incident Detail Drawer
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<IncidentDetailRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchIncidents(1, 50, statusFilter, severityFilter);
      setIncidents(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, severityFilter]);

  const handleSelectIncident = async (id: string) => {
    setSelectedIncidentId(id);
    try {
      setDetailLoading(true);
      setDetailError(null);
      const res = await fetchIncidentById(id);
      setDetailData(res);
    } catch (err: any) {
      setDetailError(err.message || 'Failed to load incident detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedIncidentId(null);
    setDetailData(null);
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidents & Cases Management"
        subtitle="Correlated incident group overview and evidence-backed triage workflow"
        phaseBadge="Phase 12 Complete"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Incidents' }]}
      />

      {/* Control Bar & Filters */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
              <Filter className="h-4 w-4 text-slate-500" />
              <span>Filter By:</span>
            </div>

            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>

            {/* Severity Selector */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 font-medium"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-medium text-slate-500">
              Showing {incidents.length} of {total} Incident(s)
            </span>
            <button
              onClick={loadIncidents}
              disabled={loading}
              className="flex items-center space-x-1 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Main Incidents Table */}
      <Card title="Correlated Incidents">
        {error && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-600" />
            Loading correlated incidents...
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            No correlated incidents found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Incident Number</th>
                  <th className="py-3 px-4">Title / Summary</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4 text-center">Correlated Alerts</th>
                  <th className="py-3 px-4">Created Time</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => handleSelectIncident(inc.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-brand-700">
                      {inc.incident_number}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{inc.title}</div>
                      <div className="text-slate-500 text-[11px] truncate">{inc.summary}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadgeClass(inc.severity)}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(inc.status)}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${inc.risk_score >= 70 ? 'bg-red-500' : inc.risk_score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${inc.risk_score}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700">{inc.risk_score}/100</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">{inc.confidence_score}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-800 border border-brand-200">
                        <Layers className="h-3 w-3 mr-1" />
                        {inc.correlated_alert_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {inc.created_at ? new Date(inc.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectIncident(inc.id);
                        }}
                        className="inline-flex items-center text-xs text-brand-700 hover:text-brand-900 font-semibold"
                      >
                        <span>View</span>
                        <ChevronRight className="h-4 w-4 ml-0.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Incident Detail Drawer */}
      {selectedIncidentId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-bold text-brand-700">
                    {detailData?.incident_number || 'Loading...'}
                  </span>
                  {detailData && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadgeClass(detailData.severity)}`}>
                      {detailData.severity}
                    </span>
                  )}
                  {detailData && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(detailData.status)}`}>
                      {detailData.status}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {detailData?.title || 'Incident Details'}
                </h3>
              </div>
              <button
                onClick={closeDrawer}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1">
              {detailLoading ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-600" />
                  Loading incident evidence & timeline...
                </div>
              ) : detailError ? (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {detailError}
                </div>
              ) : detailData ? (
                <>
                  {/* Summary & Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Derived Risk Score</div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{detailData.risk_score} <span className="text-xs font-normal text-slate-500">/ 100</span></div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full ${detailData.risk_score >= 70 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${detailData.risk_score}%` }} />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Derived Confidence</div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{detailData.confidence_score}%</div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-brand-600" style={{ width: `${detailData.confidence_score}%` }} />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Correlated Alerts</div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{detailData.correlated_alerts.length}</div>
                      <div className="text-[11px] text-slate-500 mt-1">Multi-signal evidence cluster</div>
                    </div>
                  </div>

                  {/* Summary Text */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Incident Summary</h4>
                    <p className="text-xs text-slate-700 leading-relaxed">{detailData.summary}</p>
                  </div>

                  {/* Correlation Explanation Card */}
                  <div className="p-4 bg-brand-50/50 border border-brand-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-brand-700" />
                        <h4 className="text-xs font-bold text-brand-900 uppercase tracking-wider">Deterministic Correlation Explanation</h4>
                      </div>
                      <span className="text-xs font-bold text-brand-800 bg-brand-100 px-2 py-0.5 rounded border border-brand-300">
                        Score: {detailData.correlation_explanation.correlation_score}/100
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {detailData.correlation_explanation.summary}
                    </p>

                    {detailData.correlation_explanation.matched_signals.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        <div className="text-[11px] font-bold text-slate-700">Matched Correlation Signals:</div>
                        <div className="space-y-1">
                          {detailData.correlation_explanation.matched_signals.map((sig, idx) => (
                            <div key={idx} className="flex items-start space-x-2 text-[11px] bg-white p-2 rounded border border-slate-200">
                              <span className="font-semibold text-brand-800 shrink-0">+{sig.weight} pts</span>
                              <span className="text-slate-600 font-mono text-[10px] uppercase bg-slate-100 px-1 rounded">{sig.signal_type}</span>
                              <span className="text-slate-700">{sig.detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 italic pt-1 border-t border-brand-200/60">
                      Correlation measures multi-signal event similarity and temporal proximity. It provides evidence grouping and does NOT prove compromise.
                    </div>
                  </div>

                  {/* Correlated Alerts List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Correlated Security Alerts</h4>
                    <div className="space-y-2">
                      {detailData.correlated_alerts.map((al) => (
                        <div key={al.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-brand-700">{al.alert_code}</span>
                              <span className="text-xs font-semibold text-slate-900">{al.event_type}</span>
                              <span className={`px-1.5 py-0.25 rounded text-[9px] font-bold border ${getSeverityBadgeClass(al.severity)}`}>
                                {al.severity}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">{new Date(al.timestamp).toLocaleString()}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
                            {al.user_context && (
                              <span className="flex items-center space-x-1"><User className="h-3 w-3 text-slate-400" /><span>{al.user_context}</span></span>
                            )}
                            {al.asset_context && (
                              <span className="flex items-center space-x-1"><HardDrive className="h-3 w-3 text-slate-400" /><span>{al.asset_context}</span></span>
                            )}
                            {al.source_ip && (
                              <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-700">Src: {al.source_ip}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chronological Incident Timeline */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Chronological Incident Timeline</h4>
                    <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                      {detailData.timeline.map((item) => (
                        <div key={item.id} className="relative group">
                          <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-600 ring-4 ring-white" />
                          <div className="text-[11px] font-bold text-slate-800">{item.event_type}</div>
                          <div className="text-xs text-slate-600 mt-0.5">{item.description}</div>
                          <div className="text-[10px] text-slate-400 mt-1">{new Date(item.timestamp).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
