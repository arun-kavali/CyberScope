import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  RefreshCw, 
  X, 
  Filter,
  Search,
  UserX,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Ban,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  fetchIncidents, 
  fetchIncidentById, 
  fetchIncidentIntelligence,
  startInvestigation,
  resolveIncident,
  IncidentSummaryRecord, 
  IncidentDetailRecord,
  IncidentIntelligenceSummary
} from '../services/incidentsApi';
import { generateIncidentAIIntelligence } from '../services/aiApi';
import { createResponseActionApi } from '../services/responseApi';

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `about ${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  } catch {
    return dateStr;
  }
}

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [incidents, setIncidents] = useState<IncidentSummaryRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  // Selected Incident Detail Drawer / Modal
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<IncidentDetailRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // AI Intelligence state for selected incident
  const [aiIntel, setAiIntel] = useState<IncidentIntelligenceSummary | null>(null);
  const [aiIntelLoading, setAiIntelLoading] = useState<boolean>(false);

  // Response action feedback
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Resolution loading state
  const [resolving, setResolving] = useState<boolean>(false);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchIncidents(1, 50, statusFilter, severityFilter, token || undefined);
      setIncidents(res.items);
      setTotal(res.total);
    } catch (err: any) {
      if (err.message?.includes('expired') || err.message?.includes('token')) {
        setError('Your session has expired. Please sign in again.');
      } else {
        setError(err.message || 'Unable to load incidents');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, severityFilter, token]);

  const handleSelectIncident = async (id: string) => {
    setSelectedIncidentId(id);
    setAiIntel(null);
    setActionFeedback(null);
    try {
      setDetailLoading(true);
      setDetailError(null);
      const res = await fetchIncidentById(id, token || undefined);
      setDetailData(res);
    } catch (err: any) {
      if (err.message?.includes('expired') || err.message?.includes('token')) {
        setDetailError('Your session has expired. Please sign in again.');
      } else {
        setDetailError(err.message || 'Failed to load incident details');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedIncidentId(null);
    setDetailData(null);
    setAiIntel(null);
    setActionFeedback(null);
  };

  const handleGenerateAIIntelligence = async (forceRefresh: boolean = true) => {
    if (!selectedIncidentId) return;
    try {
      setAiIntelLoading(true);
      try {
        await generateIncidentAIIntelligence(selectedIncidentId, forceRefresh, token || undefined);
      } catch (aiErr: any) {
        // Silently catch AI generation error
      }
      const res = await fetchIncidentIntelligence(selectedIncidentId, token || undefined);
      setAiIntel(res);
    } catch (err: any) {
      // Silently catch error
    } finally {
      setAiIntelLoading(false);
    }
  };

  const handleStartInvestigation = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await startInvestigation(id, token || undefined);
    } catch (err) {
      // Proceed even if investigation is already active
    }
    navigate(`/investigations?incident_id=${id}`);
  };

  const handleResolveIncident = async () => {
    if (!selectedIncidentId) return;
    try {
      setResolving(true);
      setActionFeedback(null);
      await resolveIncident(selectedIncidentId, token || undefined);
      setActionFeedback('Incident resolved successfully. Status and audit log updated.');
      
      // Invalidate queries so Dashboard and Analytics auto-update
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });

      // Refresh detail data & main list
      const updatedDetail = await fetchIncidentById(selectedIncidentId, token || undefined);
      setDetailData(updatedDetail);
      await loadIncidents();
    } catch (err: any) {
      setActionFeedback(`Resolution failed: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  const handleTriggerResponseAction = async (actionType: string, targetType: string, targetId: string) => {
    try {
      setActionLoading(true);
      setActionFeedback(null);
      const actionRec = await createResponseActionApi({
        action_type: actionType,
        target_entity_type: targetType,
        target_entity_id: targetId,
        reason: `Controlled sandbox action ${actionType} initiated from Incident Details UI`
      });
      setActionFeedback(`Response action ${actionRec.action_type} created (Status: ${actionRec.status}). Audit log entry generated.`);
    } catch (err: any) {
      setActionFeedback(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500 text-white';
      case 'HIGH':
        return 'bg-orange-500 text-white';
      case 'MEDIUM':
        return 'bg-amber-400 text-slate-900';
      case 'LOW':
        return 'bg-emerald-500 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidents"
        subtitle="View, investigate, and manage correlated security incidents."
        phaseBadge="SOC Operations"
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
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
              className="flex items-center space-x-1 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Main Incidents Table Card */}
      <Card title={`All Incidents (${incidents?.length || total})`} headerStyle="default">
        {error && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadIncidents}
              className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-[11px] font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading incidents...
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            No correlated incidents found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3">Updated</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => handleSelectIncident(inc.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 max-w-md">
                      <div className="font-bold text-slate-900 leading-snug">{inc.title}</div>
                      <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">{inc.summary}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getSeverityBadgeClass(inc.severity)}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        inc.status === 'OPEN'
                          ? 'bg-red-50 text-rose-700 border-red-200'
                          : inc.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                      {formatRelativeTime(inc.created_at)}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                      {formatRelativeTime(inc.updated_at || inc.created_at)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {inc.status !== 'RESOLVED' && (
                          <button
                            onClick={(e) => handleStartInvestigation(inc.id, e)}
                            className="inline-flex items-center space-x-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer"
                          >
                            <Search className="h-3.5 w-3.5" />
                            <span>Investigate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* INCIDENT DETAILS DASHBOARD MODAL — STRICT REFERENCE 1 IMPLEMENTATION */}
      {selectedIncidentId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col my-auto max-h-[92vh]">

            {/* A. HEADER */}
            <div className="bg-white p-5 sm:p-6 border-b border-slate-200 space-y-3 sticky top-0 z-20">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Incident Details</h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    View incident details, AI analysis, and take containment actions.
                  </p>
                </div>

                <button
                  onClick={closeDrawer}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                  title="Close Details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* B. STATUS / SEVERITY BADGES */}
              {detailData && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border shadow-sm ${
                    detailData.severity === 'CRITICAL' || detailData.severity === 'HIGH'
                      ? 'bg-orange-500 text-white border-orange-600'
                      : detailData.severity === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}>
                    {detailData.severity}
                  </span>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                    detailData.status === 'OPEN'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : detailData.status === 'IN_PROGRESS'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {detailData.status}
                  </span>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-sm">
                    Auto-correlated
                  </span>

                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300 shadow-sm">
                    {detailData.incident_number || detailData.id}
                  </span>
                </div>
              )}
            </div>

            {/* Scrollable Content Workspace */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-800 bg-slate-50">
              {detailLoading ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  Loading incident evidence & timeline...
                </div>
              ) : detailError ? (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {detailError}
                </div>
              ) : detailData ? (
                <div className="bg-white rounded-xl shadow border border-slate-200 p-6 sm:p-8 space-y-6">

                  {/* Action Feedback Banner */}
                  {actionFeedback && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between font-medium">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{actionFeedback}</span>
                      </div>
                      <button onClick={() => setActionFeedback(null)} className="text-emerald-600 hover:text-emerald-800">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* C. INCIDENT INFORMATION (2-Column Key/Value Grid) */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                      Incident Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-xs">
                      <div className="flex items-start justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium shrink-0 pr-4">Reason</span>
                        <span className="font-bold text-slate-900 text-right">{detailData.title}</span>
                      </div>
                      <div className="flex items-start justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium shrink-0 pr-4">Trigger Rule</span>
                        <span className="font-bold text-slate-900 text-right">
                          {detailData.correlation_explanation?.matched_signals?.[0]?.detail || detailData.title}
                        </span>
                      </div>
                      <div className="flex items-start justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium shrink-0 pr-4">Correlation Drivers</span>
                        <span className="font-medium text-slate-700 text-right">
                          {detailData.correlation_explanation?.summary || 'Multi-signal alert cluster correlation'}
                        </span>
                      </div>
                      <div className="flex items-start justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium shrink-0 pr-4">Incident ID</span>
                        <span className="font-mono font-bold text-slate-900">{detailData.incident_number || detailData.id}</span>
                      </div>
                      <div className="flex items-start justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium shrink-0 pr-4">Created</span>
                        <span className="font-mono text-slate-800">{new Date(detailData.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex items-start justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium shrink-0 pr-4">Last Updated</span>
                        <span className="font-mono text-slate-600">{formatRelativeTime(detailData.updated_at || detailData.created_at)}</span>
                      </div>
                      <div className="flex items-start justify-between border-b border-slate-200/60 pb-2 md:col-span-2">
                        <span className="text-slate-500 font-medium shrink-0 pr-4">Resolved At</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {detailData.status === 'RESOLVED' ? new Date(detailData.updated_at).toLocaleString() : 'Not resolved'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* D. AI INVESTIGATION CALLOUT */}
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                          <Info className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">AI Incident Intelligence</h4>
                          <p className="text-xs text-blue-900 mt-0.5 leading-relaxed font-medium">
                            Click 'Start Investigation' below to generate AI incident intelligence with attack patterns, business impact, and containment steps.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleGenerateAIIntelligence(true)}
                        disabled={aiIntelLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                      >
                        <Sparkles className={`h-4 w-4 ${aiIntelLoading ? 'animate-spin' : ''}`} />
                        <span>{aiIntelLoading ? 'Generating AI Intel...' : 'Generate AI Investigation'}</span>
                      </button>
                    </div>


                    {aiIntel && (
                      <div className="mt-3 p-4 bg-white border border-blue-200 rounded-xl space-y-3 text-xs text-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-900 text-xs">AI Evidence-Backed Narrative</span>
                          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">Local Ollama (llama3)</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block mb-1">What Happened:</span>
                          <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">{aiIntel.what_happened}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block mb-1">Why It's Risky:</span>
                          <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">{aiIntel.why_suspicious?.summary || 'Correlated security events across network indicators.'}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block mb-1">Potential Impact:</span>
                          <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">{aiIntel.potential_impact?.summary || 'Unauthorized access or privilege escalation risk.'}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block mb-1">Recommended Response:</span>
                          <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">{aiIntel.recommendations_placeholder || 'Block IP, disable compromised user credentials, and isolate host asset.'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* E & F. ACTION PANEL (Block IP, Disable User, Confirm Containment + Start Investigation / Resolve Incident) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Action Panel</span>
                      </h4>
                      <span className="text-[10px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                        Controlled actions
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => handleTriggerResponseAction('BLOCK_IP', 'IP_ADDRESS', detailData.correlated_alerts?.[0]?.source_ip || '192.168.1.100')}
                        disabled={actionLoading}
                        className="p-4 bg-white hover:bg-slate-100/80 border border-slate-200 rounded-xl text-left transition-colors space-y-1.5 group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center space-x-2 font-bold text-slate-900 text-xs group-hover:text-brand-700">
                          <Ban className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>Block IP</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Block the source IP address at the firewall
                        </p>
                      </button>

                      <button
                        onClick={() => handleTriggerResponseAction('DISABLE_USER', 'USER_ACCOUNT', detailData.correlated_alerts?.[0]?.user_context || 'compromised_user')}
                        disabled={actionLoading}
                        className="p-4 bg-white hover:bg-slate-100/80 border border-slate-200 rounded-xl text-left transition-colors space-y-1.5 group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center space-x-2 font-bold text-slate-900 text-xs group-hover:text-brand-700">
                          <UserX className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>Disable User</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Disable the compromised user account
                        </p>
                      </button>

                      <button
                        onClick={() => handleTriggerResponseAction('ISOLATE_HOST', 'HOST', detailData.correlated_alerts?.[0]?.asset_context || 'workstation-01')}
                        disabled={actionLoading}
                        className="p-4 bg-white hover:bg-slate-100/80 border border-slate-200 rounded-xl text-left transition-colors space-y-1.5 group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center space-x-2 font-bold text-slate-900 text-xs group-hover:text-brand-700">
                          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Confirm Containment</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Confirm whether containment has been completed
                        </p>
                      </button>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                      {detailData.status !== 'RESOLVED' && (
                        <button
                          onClick={(e) => handleStartInvestigation(detailData.id, e)}
                          className="w-full sm:flex-1 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <Search className="h-4 w-4" />
                          <span>Start Investigation</span>
                        </button>
                      )}

                      {detailData.status !== 'RESOLVED' ? (
                        <button
                          onClick={handleResolveIncident}
                          disabled={resolving}
                          className="w-full sm:flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <CheckCircle2 className={`h-4 w-4 ${resolving ? 'animate-spin' : ''}`} />
                          <span>{resolving ? 'Resolving Incident...' : 'Resolve Incident'}</span>
                        </button>
                      ) : (
                        <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-bold text-xs text-center flex items-center justify-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Incident Resolved</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* G. ACTIVITY TIMELINE */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                      Activity Timeline ({detailData.timeline?.length || 0})
                    </h4>
                    {detailData.timeline && detailData.timeline.length > 0 ? (
                      <div className="relative pl-4 border-l-2 border-slate-200 ml-2 space-y-4 py-1">
                        {detailData.timeline.map((evt) => (
                          <div key={evt.id} className="relative">
                            <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-white border border-brand-700" />
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between font-bold text-xs">
                                <span className="text-slate-900 font-mono">{evt.event_type}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{new Date(evt.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-slate-700 text-xs leading-relaxed">{evt.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-xs bg-slate-50 rounded-lg">
                        No activity timeline logged yet.
                      </div>
                    )}
                  </div>

                  {/* H. CORRELATED ALERTS TABLE */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                      Correlated Alerts ({detailData.correlated_alerts?.length || 0})
                    </h4>
                    {detailData.correlated_alerts && detailData.correlated_alerts.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3">Source</th>
                              <th className="py-2.5 px-3">IP / Entity</th>
                              <th className="py-2.5 px-3">Severity</th>
                              <th className="py-2.5 px-3">Time</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans">
                            {detailData.correlated_alerts.map((al) => (
                              <tr 
                                key={al.id} 
                                onClick={() => navigate(`/alerts?id=${al.id}`)}
                                className="hover:bg-slate-50 cursor-pointer transition-colors"
                              >
                                <td className="py-3 px-3 font-semibold text-slate-900">{al.event_type}</td>
                                <td className="py-3 px-3 text-slate-600 font-mono">{al.alert_code}</td>
                                <td className="py-3 px-3 font-mono text-slate-700">
                                  {al.source_ip || al.user_context || al.asset_context || 'N/A'}
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${getSeverityBadgeClass(al.severity)}`}>
                                    {al.severity}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                                  {formatRelativeTime(al.timestamp)}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <span className="inline-flex items-center text-brand-700 hover:text-brand-900 font-bold">
                                    <span>View Details</span>
                                    <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-xs bg-slate-50 rounded-lg">
                        No correlated alerts associated with this incident.
                      </div>
                    )}
                  </div>

                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
