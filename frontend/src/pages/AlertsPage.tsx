import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import {
  getAlertsHistoryApi,
  getAlertAnalysisApi,
  reanalyzeAlertApi,
  getRelatedAlertsApi,
  getAlertIncidentRelationshipApi,
  getAlertTimelineApi,
  getAlertAiRecordApi,
  generateAlertAiIntelligenceApi,
  AlertRecord,
  AlertAnalysisRecord,
  TriggeredRule,
  RelatedAlertRecord,
  AlertIncidentRelationship,
  AlertTimelineEvent
} from '../services/alertsApi';
import { getSafeAiErrorMessage } from '../services/aiApi';
import {
  RefreshCw,
  Filter,
  ChevronRight,
  X,
  ShieldAlert,
  Cpu,
  Play,
  Info,
  Search,
  Bot,
  Link as LinkIcon,
  ListOrdered,
  FileText,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  Ban,
  UserX,
  Laptop,
  Zap
} from 'lucide-react';
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

export const AlertsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lastEvent } = useRealtime();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  const [activeAlert, setActiveAlert] = useState<AlertRecord | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'analysis' | 'evidence' | 'related' | 'incident' | 'timeline' | 'ai' | 'actions'>('overview');
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (lastEvent) {
      const type = (lastEvent as any).event_type || (lastEvent as any).type;
      if (['ALERT_CREATED', 'ANALYSIS_COMPLETED', 'SCORES_COMPLETED', 'CORRELATION_COMPLETED'].includes(type)) {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
        if (activeAlert) {
          queryClient.invalidateQueries({ queryKey: ['alert-analysis', activeAlert.id] });
          queryClient.invalidateQueries({ queryKey: ['alert-timeline', activeAlert.id] });
          queryClient.invalidateQueries({ queryKey: ['alert-incident', activeAlert.id] });
        }
      }
    }
  }, [lastEvent, queryClient, activeAlert]);

  const getSeverityBadgeType = (sev: string): 'critical' | 'warning' | 'info' | 'neutral' => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'critical';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const { data: alerts, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['alerts', page, searchQuery, selectedCategory, selectedSeverity, selectedStatus],
    queryFn: () =>
      getAlertsHistoryApi(token || '', {
        page,
        page_size: pageSize,
        search: searchQuery || undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      }),
    enabled: !!token,
    staleTime: 5000,
  });

  const { data: analysisData, isLoading: isLoadingAnalysis, isError: isAnalysisError, refetch: refetchAnalysis } = useQuery<AlertAnalysisRecord>({
    queryKey: ['alert-analysis', activeAlert?.id],
    queryFn: () => getAlertAnalysisApi(token || '', activeAlert!.id),
    enabled: !!token && !!activeAlert,
  });

  const { data: relatedAlerts, isLoading: isLoadingRelated } = useQuery<RelatedAlertRecord[]>({
    queryKey: ['alert-related', activeAlert?.id],
    queryFn: () => getRelatedAlertsApi(token || '', activeAlert!.id),
    enabled: !!token && !!activeAlert,
  });

  const { data: incidentRelationship, isLoading: isLoadingIncident } = useQuery<AlertIncidentRelationship | null>({
    queryKey: ['alert-incident', activeAlert?.id],
    queryFn: () => getAlertIncidentRelationshipApi(token || '', activeAlert!.id),
    enabled: !!token && !!activeAlert,
  });

  const { data: timelineEvents, isLoading: isLoadingTimeline } = useQuery<AlertTimelineEvent[]>({
    queryKey: ['alert-timeline', activeAlert?.id],
    queryFn: () => getAlertTimelineApi(token || '', activeAlert!.id),
    enabled: !!token && !!activeAlert,
  });

  const { data: aiRecord, isLoading: isLoadingAi, refetch: refetchAi } = useQuery<any>({
    queryKey: ['alert-ai', activeAlert?.id],
    queryFn: () => getAlertAiRecordApi(token || '', activeAlert!.id),
    enabled: !!token && !!activeAlert,
  });

  const reanalyzeMutation = useMutation({
    mutationFn: (alertId: string) => reanalyzeAlertApi(token || '', alertId),
    onSuccess: (updatedAnalysis) => {
      queryClient.setQueryData(['alert-analysis', activeAlert?.id], updatedAnalysis);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-timeline', activeAlert?.id] });
    },
  });

  const generateAiMutation = useMutation({
    mutationFn: ({ alertId, forceRefresh }: { alertId: string; forceRefresh?: boolean }) =>
      generateAlertAiIntelligenceApi(token || '', alertId, forceRefresh),
    onSuccess: () => {
      refetchAi();
      queryClient.invalidateQueries({ queryKey: ['alert-timeline', activeAlert?.id] });
    },
  });

  const executeActionMutation = useMutation({
    mutationFn: (actionType: string) =>
      createResponseActionApi({
        action_type: actionType,
        target_entity_type: 'ALERT',
        target_entity_id: activeAlert!.id,
        reason: `Triggered by analyst from Alert Details view for ${activeAlert?.alert_code}`
      }),
    onSuccess: (data) => {
      setActionNotice(`Response Action '${data.action_type}' submitted successfully.`);
      setTimeout(() => setActionNotice(null), 4000);
    },
    onError: (err: any) => {
      setActionNotice(`Failed to submit action: ${err.message || 'Unknown error'}`);
      setTimeout(() => setActionNotice(null), 5000);
    }
  });

  const handleCopyPayload = () => {
    if (!activeAlert) return;
    const content = JSON.stringify(activeAlert.raw_payload || activeAlert.alert_metadata || activeAlert, null, 2);
    navigator.clipboard.writeText(content);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert Operations & Triage"
        subtitle="Real-time alert ingestion stream, Phase 9-11 automated context enrichment, risk scoring, and evidence inspection."
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      <Card className="p-4 bg-white border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Alert Code, Event Type, User, Asset, IP..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center space-x-1 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-medium">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span>Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="Authentication">Authentication</option>
                <option value="Network">Network</option>
                <option value="Endpoint">Endpoint</option>
                <option value="Phishing">Phishing</option>
                <option value="Malware">Malware</option>
              </select>
            </div>

            <div className="flex items-center space-x-1 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-medium">
              <span>Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => {
                  setSelectedSeverity(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="flex items-center space-x-1 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-medium">
              <span>Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="ANALYZED">Analyzed</option>
                <option value="CORRELATING">Correlating</option>
                <option value="CORRELATED">Correlated</option>
              </select>
            </div>

            {(searchQuery || selectedCategory !== 'ALL' || selectedSeverity !== 'ALL' || selectedStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedSeverity('ALL');
                  setSelectedStatus('ALL');
                  setPage(1);
                }}
                className="text-brand-600 hover:text-brand-800 font-semibold text-xs px-2 py-1 flex items-center space-x-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-200 bg-white">
        {isLoading ? (
          <LoadingState message="Retrieving normalized alert records from PostgreSQL..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Alerts"
            message={error instanceof Error ? error.message : 'Alert stream could not be loaded.'}
            onRetry={() => refetch()}
          />
        ) : !alerts || alerts.length === 0 ? (
          <EmptyState
            title="No Alerts Found"
            description={
              searchQuery || selectedCategory !== 'ALL' || selectedSeverity !== 'ALL'
                ? 'No alerts match your current search and filter criteria.'
                : 'No alerts have been ingested yet. Ingest alerts via the Alert Source Portal.'
            }
          />
        ) : (
          <div className="p-4 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Alert Code</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Event Type</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">User Context</th>
                    <th className="py-3 px-3">Asset Context</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {alerts.map((alert) => (
                    <tr
                      key={alert.id}
                      onClick={() => {
                        setActiveAlert(alert);
                        setActiveDetailTab('overview');
                      }}
                      className={`hover:bg-brand-50/50 cursor-pointer transition-colors ${
                        activeAlert?.id === alert.id ? 'bg-brand-50/80 font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-brand-900">
                        {alert.alert_code}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge
                          status={getSeverityBadgeType(alert.severity)}
                          label={alert.severity}
                        />
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {alert.event_type}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {alert.event_category}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {alert.user_context || 'Unknown / Unresolved'}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {alert.asset_context || 'Unknown / Unresolved'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {alert.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        {formatRelativeTime(alert.timestamp)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAlert(alert);
                            setActiveDetailTab('overview');
                          }}
                          className="inline-flex items-center space-x-1 text-brand-700 hover:text-brand-900 font-bold hover:underline"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {activeAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="bg-white p-5 sm:p-6 border-b border-slate-200 space-y-3 sticky top-0 z-20">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Alert Details</h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    View alert evidence, AI analysis, risk context, and recommended response.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => reanalyzeMutation.mutate(activeAlert.id)}
                    disabled={reanalyzeMutation.isPending}
                    className="hidden sm:flex items-center space-x-1.5 text-xs px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white font-semibold rounded-lg shadow-sm transition-colors"
                    title="Re-run Phase 9 Context Enrichment & Detection Rules"
                  >
                    <Play className={`h-3.5 w-3.5 ${reanalyzeMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>Re-analyze</span>
                  </button>
                  <button
                    onClick={() => setActiveAlert(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
                    title="Close Details"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border shadow-sm ${
                  activeAlert.severity === 'CRITICAL' || activeAlert.severity === 'HIGH'
                    ? 'bg-orange-500 text-white border-orange-600'
                    : activeAlert.severity === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  {activeAlert.severity}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-300 shadow-sm">
                  Risk Score {(analysisData?.findings?.risk_score?.score ?? (activeAlert as any).risk_score ?? 55).toFixed(0)}/100
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-sm">
                  {activeAlert.technique ? 'Rule-based' : 'Behavioral'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
                  Asset {activeAlert.asset_context ? 'Medium' : 'Standard'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-sm">
                  Status: {activeAlert.status}
                </span>
              </div>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-100 px-6 font-semibold text-xs text-slate-600 overflow-x-auto">
              <button
                onClick={() => setActiveDetailTab('overview')}
                className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 font-bold transition-colors ${
                  activeDetailTab === 'overview'
                    ? 'border-brand-700 text-brand-900 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Info className="h-3.5 w-3.5" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveDetailTab('ai')}
                className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 font-bold transition-colors ${
                  activeDetailTab === 'ai'
                    ? 'border-brand-700 text-brand-900 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Bot className="h-3.5 w-3.5 text-purple-600" />
                <span>AI Intelligence</span>
              </button>
              <button
                onClick={() => setActiveDetailTab('analysis')}
                className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 font-bold transition-colors ${
                  activeDetailTab === 'analysis'
                    ? 'border-brand-700 text-brand-900 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>Triage & Rules</span>
              </button>
              <button
                onClick={() => setActiveDetailTab('evidence')}
                className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 font-bold transition-colors ${
                  activeDetailTab === 'evidence'
                    ? 'border-brand-700 text-brand-900 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Evidence Payload</span>
              </button>
              <button
                onClick={() => setActiveDetailTab('related')}
                className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 font-bold transition-colors ${
                  activeDetailTab === 'related'
                    ? 'border-brand-700 text-brand-900 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>Related ({relatedAlerts?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveDetailTab('incident')}
                className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 font-bold transition-colors ${
                  activeDetailTab === 'incident'
                    ? 'border-brand-700 text-brand-900 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Incident</span>
              </button>
              <button
                onClick={() => setActiveDetailTab('timeline')}
                className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 font-bold transition-colors ${
                  activeDetailTab === 'timeline'
                    ? 'border-brand-700 text-brand-900 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <ListOrdered className="h-3.5 w-3.5" />
                <span>Timeline</span>
              </button>
              <button
                onClick={() => setActiveDetailTab('actions')}
                className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 font-bold transition-colors ${
                  activeDetailTab === 'actions'
                    ? 'border-brand-700 text-brand-900 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Response Actions</span>
              </button>
            </div>

            {actionNotice && (
              <div className="bg-brand-900 text-white text-xs px-6 py-2 flex items-center justify-between font-medium">
                <span>{actionNotice}</span>
                <button onClick={() => setActionNotice(null)} className="hover:text-slate-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-800 bg-slate-50">
              {activeDetailTab === 'overview' && (
                <div className="bg-white rounded-xl shadow border border-slate-200 p-6 sm:p-8 space-y-6">
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                      Alert Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Type</span>
                        <span className="font-bold text-slate-900 font-sans">{activeAlert.event_type}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Source</span>
                        <span className="font-semibold text-slate-900">{activeAlert.event_category || activeAlert.source_id || 'Email Gateway / Security Sensor'}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Status</span>
                        <span className="font-bold text-slate-900">{activeAlert.status}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Timestamp</span>
                        <span className="font-mono text-slate-800">{new Date(activeAlert.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Time Ago</span>
                        <span className="font-mono text-slate-600">{formatRelativeTime(activeAlert.timestamp)}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Impact</span>
                        <span className="font-semibold text-slate-900">Standard monitoring applies.</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">User Context</span>
                        <span className="font-mono font-bold text-slate-900">{activeAlert.user_context || 'Unknown / Unresolved'}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500 font-medium">Asset Context</span>
                        <span className="font-mono font-bold text-slate-900">{activeAlert.asset_context || 'Unknown / Unresolved'}</span>
                      </div>
                      {activeAlert.source_ip && (
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="text-slate-500 font-medium">Source IP</span>
                          <span className="font-mono font-bold text-slate-900">{activeAlert.source_ip}</span>
                        </div>
                      )}
                      {activeAlert.destination_ip && (
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="text-slate-500 font-medium">Destination IP</span>
                          <span className="font-mono font-bold text-slate-900">{activeAlert.destination_ip}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-5 space-y-2">
                    <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      <Info className="h-4 w-4 text-blue-600" />
                      <span>What Happened</span>
                    </h4>
                    <p className="text-blue-950 text-xs leading-relaxed font-medium">
                      {activeAlert.description || `${activeAlert.event_type} event detected targeting organization infrastructure/user context (${activeAlert.asset_context || activeAlert.user_context || 'internal network'}).`}
                    </p>
                  </div>

                  <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-5 space-y-2">
                    <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span>Why It's Risky</span>
                    </h4>
                    <p className="text-rose-950 text-xs leading-relaxed font-medium">
                      {analysisData?.summary || `${activeAlert.event_category} security events associated with technique ${activeAlert.technique || 'unusual access patterns'} can lead to credential theft, malware installation, or social engineering attacks with cascading impact.`}
                    </p>
                  </div>

                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-5 space-y-2">
                    <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <ShieldAlert className="h-4 w-4 text-emerald-600" />
                      <span>Recommended Action</span>
                    </h4>
                    <p className="text-emerald-950 text-xs leading-relaxed font-medium">
                      {activeAlert.source_ip 
                        ? `Block sender domain / IP ${activeAlert.source_ip} at firewall gateway. Inspect recipient click/open rates. Quarantine similar messages. Notify affected user ${activeAlert.user_context || 'accounts'}. Run awareness scan.`
                        : `Verify event context for asset ${activeAlert.asset_context || 'endpoint'}, apply perimeter containment policy, and conduct security awareness scan.`
                      }
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2">
                      <ListOrdered className="h-4 w-4 text-brand-700" />
                      <span>Analyst Guidance</span>
                    </h4>
                    <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 leading-relaxed">
                      <li>Inspect sender domain and email headers for spoofing indicators <span className="font-mono text-slate-900 font-bold">({activeAlert.source_ip || 'N/A'})</span>.</li>
                      <li>Identify all recipients who received the email / event <span className="font-semibold text-slate-900">({activeAlert.user_context || 'system user'})</span>.</li>
                      <li>Check if any users clicked embedded links or downloaded attachments associated with <span className="font-mono text-brand-900 font-bold">{activeAlert.technique || 'MITRE'}</span>.</li>
                      <li>Block sender domain at email gateway / firewall perimeter.</li>
                      <li>Submit suspicious URLs to threat intelligence feeds.</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                        <span>Confidence</span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">HIGH</span>
                      </div>
                      <div className="text-2xl font-extrabold text-blue-900 font-mono">
                        {analysisData?.findings?.risk_score?.confidence != null 
                          ? `${analysisData.findings.risk_score.confidence.toFixed(0)}%` 
                          : '85%'}
                      </div>
                      <p className="text-[10px] text-slate-500">Deterministic rule evidence</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                        <span>False Positive</span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Medium</span>
                      </div>
                      <div className="text-2xl font-extrabold text-amber-900 font-mono">
                        {analysisData?.findings?.risk_score?.false_positive_likelihood != null 
                          ? `${analysisData.findings.risk_score.false_positive_likelihood.toFixed(0)}%` 
                          : '15%'}
                      </div>
                      <p className="text-[10px] text-slate-500">Standard test pattern match</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                        <span>Asset Criticality</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold">Medium</span>
                      </div>
                      <div className="text-2xl font-extrabold text-slate-900 font-sans uppercase">
                        {activeAlert.asset_context ? 'Medium' : 'Standard'}
                      </div>
                      <p className="text-[10px] text-slate-500">Standard monitoring applies</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-slate-100 p-5 rounded-xl space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400 text-[10px] uppercase font-sans font-bold">
                        Raw Log Data (JSON Payload)
                      </span>
                      <button
                        onClick={handleCopyPayload}
                        className="flex items-center space-x-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedPayload ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedPayload ? 'Copied' : 'Copy Evidence'}</span>
                      </button>
                    </div>
                    <pre className="text-[11px] text-emerald-400 overflow-x-auto max-h-48 leading-relaxed">
                      {JSON.stringify(activeAlert.raw_payload || activeAlert.alert_metadata || activeAlert, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {activeDetailTab === 'ai' && (
                <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm tracking-wide flex items-center space-x-2">
                        <Bot className="h-5 w-5 text-purple-600" />
                        <span>Local Ollama AI Intelligence</span>
                      </h4>
                      <p className="text-xs text-slate-500">Model: llama3 • Local Grounded Narrative</p>
                    </div>
                    <button
                      onClick={() => generateAiMutation.mutate({ alertId: activeAlert.id, forceRefresh: true })}
                      disabled={generateAiMutation.isPending}
                      className="flex items-center space-x-1.5 text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${generateAiMutation.isPending ? 'animate-spin' : ''}`} />
                      <span>{aiRecord ? 'Refresh AI Narrative' : 'Generate AI Explanation'}</span>
                    </button>
                  </div>

                  {isLoadingAi || generateAiMutation.isPending ? (
                    <LoadingState message="Local Ollama AI model generating evidence-grounded explanation..." />
                  ) : (aiRecord && aiRecord.status === 'FAILED') || generateAiMutation.isError ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-2.5">
                        <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="font-bold text-amber-950 flex items-center space-x-2">
                            <span>Local Ollama AI Explanation Note</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 border border-amber-300 uppercase">
                              FAILED
                            </span>
                          </div>
                          <p className="text-amber-900 font-medium">
                            {getSafeAiErrorMessage(aiRecord?.error_info?.error || (generateAiMutation.error as any)?.message)}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            Core alert telemetry, risk score, anomaly flags, and rule evaluations remain 100% operational.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => generateAiMutation.mutate({ alertId: activeAlert.id, forceRefresh: true })}
                        className="px-3.5 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-amber-700" />
                        <span>Retry AI Explanation</span>
                      </button>
                    </div>
                  ) : !aiRecord || !aiRecord.structured_output ? (
                    <EmptyState
                      title="No AI Intelligence Generated Yet"
                      description="Click 'Generate AI Explanation' above to run Phase 14 local Ollama intelligence analysis."
                      icon={Bot}
                    />
                  ) : (
                    <div className="space-y-4 bg-purple-50/50 border border-purple-200 rounded-xl p-5 text-xs text-slate-800">
                      <div className="bg-white border border-purple-200 rounded-lg p-4 space-y-1">
                        <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Executive Summary</div>
                        <p className="text-slate-900 font-semibold leading-relaxed">{aiRecord.structured_output.summary}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Factual Sequence</div>
                          <p className="text-slate-700 leading-relaxed">{aiRecord.structured_output.what_happened}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Why Suspicious</div>
                          <p className="text-slate-700 leading-relaxed">{aiRecord.structured_output.why_suspicious}</p>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Potential Impact</div>
                        <p className="text-slate-700 leading-relaxed">{aiRecord.structured_output.potential_impact}</p>
                      </div>

                      {aiRecord.structured_output.recommended_investigation && (
                        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Advisory Investigation Steps</div>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700">
                            {aiRecord.structured_output.recommended_investigation.map((step: string, sIdx: number) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'analysis' && (
                <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-6">
                  {isLoadingAnalysis ? (
                    <LoadingState message="Retrieving automatic triage analysis & detection evidence..." />
                  ) : isAnalysisError || !analysisData ? (
                    <ErrorState
                      title="Failed to Load Analysis"
                      message="Analysis record could not be loaded."
                      onRetry={() => refetchAnalysis()}
                    />
                  ) : (
                    <>
                      <div className="bg-brand-50/60 border border-brand-200 rounded-xl p-5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-brand-900 text-xs tracking-wider uppercase flex items-center space-x-1.5">
                            <ShieldAlert className="h-4 w-4 text-brand-700" />
                            <span>Triage Summary</span>
                          </span>
                          <span className="text-[10px] font-mono bg-white text-brand-800 border border-brand-200 px-2 py-0.5 rounded-full font-semibold">
                            Status: {analysisData.findings?.triage_status || 'COMPLETED'}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-xs">{analysisData.summary}</p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-900 text-xs tracking-wider uppercase border-b border-slate-200 pb-2">
                          Triggered Detection Rules ({analysisData.findings?.triggered_rules_count || 0})
                        </h4>
                        {analysisData.findings?.triggered_rules?.map((rule: TriggeredRule, idx: number) => (
                          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-brand-900 bg-white border border-brand-200 px-2.5 py-1 rounded text-xs">
                                {rule.rule_id} — {rule.rule_name}
                              </span>
                              <StatusBadge status={getSeverityBadgeType(rule.severity)} label={rule.severity} />
                            </div>
                            <p className="text-slate-700 text-xs">{rule.reason}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeDetailTab === 'evidence' && (
                <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h4 className="font-bold text-slate-900 text-sm tracking-wide">Structured Evidence & Raw Payload</h4>
                    <button
                      onClick={handleCopyPayload}
                      className="flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 transition-colors font-medium"
                    >
                      {copiedPayload ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedPayload ? 'Copied' : 'Copy Evidence JSON'}</span>
                    </button>
                  </div>

                  <div className="bg-slate-900 text-slate-100 p-5 rounded-xl font-mono text-xs overflow-x-auto">
                    <pre className="text-[11px] text-emerald-400 leading-relaxed">
                      {JSON.stringify(activeAlert.raw_payload || activeAlert.alert_metadata || activeAlert, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {activeDetailTab === 'related' && (
                <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs tracking-wide uppercase border-b border-slate-200 pb-2">
                    Correlated & Related Context Alerts
                  </h4>
                  {isLoadingRelated ? (
                    <LoadingState message="Checking correlation results..." />
                  ) : !relatedAlerts || relatedAlerts.length === 0 ? (
                    <EmptyState title="No Related Alerts Found" description="No related or correlated alerts found in database for this entity context." />
                  ) : (
                    <div className="space-y-3">
                      {relatedAlerts.map((ra) => (
                        <div
                          key={ra.id}
                          onClick={() => { setActiveAlert(ra as any); setActiveDetailTab('overview'); }}
                          className="bg-slate-50 border border-slate-200 hover:border-brand-400 p-4 rounded-xl shadow-sm flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-brand-900">{ra.alert_code}</span>
                              <span className="font-bold text-slate-900">{ra.event_type}</span>
                            </div>
                            <div className="text-xs text-brand-700 font-medium">{ra.correlation_reason}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{new Date(ra.timestamp).toUTCString()}</div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'incident' && (
                <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs tracking-wide uppercase border-b border-slate-200 pb-2">
                    Correlated Incident Association
                  </h4>
                  {isLoadingIncident ? (
                    <LoadingState message="Checking incident association..." />
                  ) : !incidentRelationship ? (
                    <EmptyState
                      title="No Incident Association"
                      description="This alert has not been correlated into an active incident workspace."
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-extrabold text-brand-900 text-sm">{incidentRelationship.incident_number}</span>
                          <h3 className="font-bold text-slate-900 text-sm mt-0.5">{incidentRelationship.title}</h3>
                        </div>
                        <StatusBadge status={getSeverityBadgeType(incidentRelationship.severity)} label={incidentRelationship.severity} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 font-mono text-[11px]">
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Risk Score</div>
                          <div className="font-bold text-slate-900">{incidentRelationship.risk_score.toFixed(0)} / 100</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Confidence</div>
                          <div className="font-bold text-blue-900">{incidentRelationship.confidence_score.toFixed(0)}%</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Status</div>
                          <div className="font-bold text-slate-900">{incidentRelationship.status}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/incidents')}
                        className="w-full flex items-center justify-center space-x-1.5 text-xs py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-semibold rounded-lg shadow-sm transition-colors"
                      >
                        <span>Open Incident Workspace</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'timeline' && (
                <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs tracking-wide uppercase border-b border-slate-200 pb-2">
                    Chronological Alert Activity Timeline
                  </h4>
                  {isLoadingTimeline ? (
                    <LoadingState message="Loading alert timeline..." />
                  ) : !timelineEvents || timelineEvents.length === 0 ? (
                    <EmptyState title="No Timeline Events" description="No chronological activity logged for this alert." />
                  ) : (
                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-2">
                      {timelineEvents.map((evt, idx) => (
                        <div key={idx} className="mb-4 ml-4">
                          <div className="absolute w-3 h-3 bg-brand-600 rounded-full -left-[7px] border-2 border-white"></div>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-sm space-y-1">
                            <div className="flex items-center justify-between font-bold text-xs">
                              <span className="text-slate-900 font-mono">{evt.event_type}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{new Date(evt.timestamp).toUTCString()}</span>
                            </div>
                            <p className="text-slate-700 text-xs">{evt.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'actions' && (
                <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-5">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm tracking-wide">Controlled Response Playbooks</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Execute sandbox containment policies with full audit tracking.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50 hover:bg-slate-100/80 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                          <Ban className="h-5 w-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900 text-xs">Block Source IP</h5>
                          <p className="text-[11px] text-slate-500">Target: {activeAlert.source_ip || 'Source IP'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => executeActionMutation.mutate('BLOCK_IP')}
                        disabled={executeActionMutation.isPending}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition-colors"
                      >
                        Execute Block IP
                      </button>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50 hover:bg-slate-100/80 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                          <UserX className="h-5 w-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900 text-xs">Disable User Account</h5>
                          <p className="text-[11px] text-slate-500">Target: {activeAlert.user_context || 'Account'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => executeActionMutation.mutate('DISABLE_USER')}
                        disabled={executeActionMutation.isPending}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors"
                      >
                        Execute Disable User
                      </button>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50 hover:bg-slate-100/80 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900 text-xs">Terminate User Session</h5>
                          <p className="text-[11px] text-slate-500">Force immediate token revocation</p>
                        </div>
                      </div>
                      <button
                        onClick={() => executeActionMutation.mutate('TERMINATE_SESSION')}
                        disabled={executeActionMutation.isPending}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors"
                      >
                        Execute Terminate Session
                      </button>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50 hover:bg-slate-100/80 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                          <Laptop className="h-5 w-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900 text-xs">Isolate Host Asset</h5>
                          <p className="text-[11px] text-slate-500">Target: {activeAlert.asset_context || 'Endpoint Host'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => executeActionMutation.mutate('ISOLATE_HOST')}
                        disabled={executeActionMutation.isPending}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition-colors"
                      >
                        Execute Isolate Host
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
