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
import {
  Radio,
  RefreshCw,
  Filter,
  User,
  Server,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldAlert,
  Cpu,
  Play,
  Info,
  Activity,
  Search,
  Bot,
  Link as LinkIcon,
  ListOrdered,
  FileText,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { status: realtimeStatus, lastEvent } = useRealtime();

  // Search, Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // Active Selected Alert & Detail Modal Tab State
  const [activeAlert, setActiveAlert] = useState<AlertRecord | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'analysis' | 'evidence' | 'related' | 'incident' | 'timeline' | 'ai'>('overview');

  // Realtime update auto-refetch listener
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

  const getRiskRating = (score: number) => {
    if (score >= 90) return { label: 'CRITICAL', badge: 'bg-purple-100 text-purple-800 border-purple-300', bar: 'bg-purple-600' };
    if (score >= 75) return { label: 'VERY HIGH', badge: 'bg-rose-100 text-rose-800 border-rose-300', bar: 'bg-rose-600' };
    if (score >= 50) return { label: 'HIGH', badge: 'bg-orange-100 text-orange-800 border-orange-300', bar: 'bg-orange-500' };
    if (score >= 25) return { label: 'MODERATE', badge: 'bg-amber-100 text-amber-800 border-amber-300', bar: 'bg-amber-500' };
    return { label: 'LOW', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', bar: 'bg-emerald-500' };
  };

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

  // 1. Primary Alerts History Query with Search & Filters
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

  // 2. Query Analysis Record for Active Alert
  const {
    data: analysisData,
    isLoading: isLoadingAnalysis,
    isError: isAnalysisError,
    refetch: refetchAnalysis
  } = useQuery<AlertAnalysisRecord>({
    queryKey: ['alert-analysis', activeAlert?.id],
    queryFn: () => getAlertAnalysisApi(token || '', activeAlert!.id),
    enabled: !!token && !!activeAlert,
  });

  // 3. Query Related Alerts
  const { data: relatedAlerts, isLoading: isLoadingRelated } = useQuery<RelatedAlertRecord[]>({
    queryKey: ['alert-related', activeAlert?.id],
    queryFn: () => getRelatedAlertsApi(token || '', activeAlert!.id),
    enabled: !!token && !!activeAlert,
  });

  // 4. Query Incident Relationship
  const { data: incidentRelationship, isLoading: isLoadingIncident } = useQuery<AlertIncidentRelationship | null>({
    queryKey: ['alert-incident', activeAlert?.id],
    queryFn: () => getAlertIncidentRelationshipApi(token || '', activeAlert!.id),
    enabled: !!token && !!activeAlert,
  });

  // 5. Query Timeline
  const { data: timelineEvents, isLoading: isLoadingTimeline } = useQuery<AlertTimelineEvent[]>({
    queryKey: ['alert-timeline', activeAlert?.id],
    queryFn: () => getAlertTimelineApi(token || '', activeAlert!.id),
    enabled: !!token && !!activeAlert,
  });

  // 6. Query Local AI Intelligence
  const {
    data: aiRecord,
    isLoading: isLoadingAi,
    refetch: refetchAi
  } = useQuery<any>({
    queryKey: ['alert-ai', activeAlert?.id],
    queryFn: () => getAlertAiRecordApi(token || '', activeAlert!.id),
    enabled: !!token && !!activeAlert,
  });

  // Reanalysis Mutation
  const reanalyzeMutation = useMutation({
    mutationFn: (alertId: string) => reanalyzeAlertApi(token || '', alertId),
    onSuccess: (updatedAnalysis) => {
      queryClient.setQueryData(['alert-analysis', activeAlert?.id], updatedAnalysis);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-timeline', activeAlert?.id] });
    },
  });

  // Generate AI Intelligence Mutation
  const generateAiMutation = useMutation({
    mutationFn: ({ alertId, forceRefresh }: { alertId: string; forceRefresh?: boolean }) =>
      generateAlertAiIntelligenceApi(token || '', alertId, forceRefresh),
    onSuccess: () => {
      refetchAi();
      queryClient.invalidateQueries({ queryKey: ['alert-timeline', activeAlert?.id] });
    },
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedSeverity('ALL');
    setSelectedStatus('ALL');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert Monitoring & Deep-Dive Detail Center"
        subtitle="Canonical alert stream, multi-parameter search/filtering, evidence inspection, and Phase 9-14 intelligence analysis"
        phaseBadge="Phase 16 Alert Detail & Monitoring"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Alert Monitoring' }]}
        actions={
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <Radio className="h-4 w-4 text-brand-600" />
              <span className="text-slate-600 font-medium">Realtime Stream:</span>
              {realtimeStatus === 'CONNECTED' ? (
                <span className="flex items-center text-emerald-700 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> Active
                </span>
              ) : (
                <span className="flex items-center text-amber-600 font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-400 mr-1.5"></span> {realtimeStatus}
                </span>
              )}
            </div>

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg border border-slate-200 shadow-sm transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Filter & Search Bar */}
      <Card headerStyle="default">
        <div className="space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Alert Code, User, Asset, Source IP, Event Type, Description, Technique..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-brand-600 outline-none"
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

            {/* Clear Filters Button */}
            {(searchQuery || selectedCategory !== 'ALL' || selectedSeverity !== 'ALL' || selectedStatus !== 'ALL') && (
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg font-medium transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Multi-Select Dropdowns Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
            <div className="flex items-center space-x-2 text-slate-600 font-semibold text-[11px]">
              <Filter className="h-3.5 w-3.5 text-brand-700" />
              <span>Filters:</span>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-slate-500 font-medium text-[11px]">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-brand-600 outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="AUTHENTICATION">AUTHENTICATION</option>
                <option value="ENDPOINT">ENDPOINT</option>
                <option value="NETWORK">NETWORK</option>
                <option value="DATABASE">DATABASE</option>
                <option value="EMAIL">EMAIL</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-slate-500 font-medium text-[11px]">Severity:</label>
              <select
                value={selectedSeverity}
                onChange={(e) => { setSelectedSeverity(e.target.value); setPage(1); }}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-brand-600 outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-slate-500 font-medium text-[11px]">Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-brand-600 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">NEW</option>
                <option value="TRIAGED">TRIAGED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Alerts Table Card */}
      <Card title="Alert Monitoring Stream" subtitle="Click any alert to inspect canonical evidence, Phase 9-14 intelligence, related alerts & AI explanation" headerStyle="green">

        {isLoading ? (
          <LoadingState message="Querying live alert monitoring stream..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Alerts"
            message={(error as Error)?.message || 'An error occurred while retrieving alerts.'}
            onRetry={() => refetch()}
          />
        ) : !alerts || alerts.length === 0 ? (
          <EmptyState
            title="No Alerts Found"
            description="No alerts match the active search and filter criteria in PostgreSQL database."
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Alert ID</th>
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Target Entity</th>
                    <th className="py-2.5 px-3">Source IP</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                  {alerts.map((alert) => (
                    <tr
                      key={alert.id}
                      onClick={() => { setActiveAlert(alert); setActiveDetailTab('overview'); }}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        activeAlert?.id === alert.id ? 'bg-brand-50/50 font-medium' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{alert.alert_code}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(alert.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{alert.event_category}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{alert.event_type}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={getSeverityBadgeType(alert.severity)} label={alert.severity} />
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="bg-slate-100 text-slate-700 font-semibold text-[10px] px-2 py-0.5 rounded border border-slate-200">
                          {alert.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {alert.user_context ? (
                          <span className="flex items-center space-x-1" title="User Context">
                            <User className="h-3 w-3 text-slate-400" />
                            <span>{alert.user_context}</span>
                          </span>
                        ) : alert.asset_context ? (
                          <span className="flex items-center space-x-1" title="Asset Context">
                            <Server className="h-3 w-3 text-slate-400" />
                            <span>{alert.asset_context}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{alert.source_ip || '-'}</td>
                      <td className="py-2.5 px-3 text-brand-700 font-semibold flex items-center space-x-1">
                        <span>Details</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-100">
              <span className="text-slate-500 font-medium">Page {page}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={alerts.length < pageSize}
                  className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Alert Detail Modal / Drawer */}
      {activeAlert && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200">

            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center space-x-3">
                <div className="bg-brand-700 text-white p-2.5 rounded-lg shadow-sm">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-900 text-base">{activeAlert.alert_code}</h3>
                    <StatusBadge status={getSeverityBadgeType(activeAlert.severity)} label={activeAlert.severity} />
                  </div>
                  <p className="text-xs text-slate-500">{activeAlert.event_category} • {activeAlert.event_type}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => reanalyzeMutation.mutate(activeAlert.id)}
                  disabled={reanalyzeMutation.isPending}
                  className="flex items-center space-x-1 text-xs px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                  title="Re-run Phase 9 Context Enrichment & Detection Rules"
                >
                  <Play className={`h-3.5 w-3.5 ${reanalyzeMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>Re-analyze</span>
                </button>

                <button
                  onClick={() => setActiveAlert(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Detail Tabs Bar */}
            <div className="flex border-b border-slate-200 bg-slate-100/80 px-6 font-semibold text-xs text-slate-600 overflow-x-auto">
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
                onClick={() => setActiveDetailTab('analysis')}
                className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 font-bold transition-colors ${
                  activeDetailTab === 'analysis'
                    ? 'border-brand-700 text-brand-900 bg-white'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>Phase 9-11 Triage</span>
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
                <span>Evidence Data</span>
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
                <span>Related Alerts ({relatedAlerts?.length || 0})</span>
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
                <span>Incident Link</span>
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
            </div>

            {/* Modal Body Content */}
            <div className="p-6 space-y-6 flex-1 text-xs text-slate-800">

              {/* TAB 1: OVERVIEW & WHAT HAPPENED */}
              {activeDetailTab === 'overview' && (
                <div className="space-y-6">
                  {/* 1. What Happened Callout Box (Light Blue) */}
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 space-y-2">
                    <h4 className="font-bold text-blue-900 text-xs tracking-wide uppercase flex items-center space-x-1.5">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span>What Happened</span>
                    </h4>
                    <p className="text-blue-950 text-xs leading-relaxed font-medium">
                      {activeAlert.description || `${activeAlert.event_type} detected on target ${activeAlert.asset_context || 'infrastructure'}.`}
                    </p>
                  </div>

                  {/* 2. Why It's Risky Callout Box (Light Rose/Red) */}
                  <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 space-y-2">
                    <h4 className="font-bold text-rose-900 text-xs tracking-wide uppercase flex items-center space-x-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span>Why It's Risky</span>
                    </h4>
                    <p className="text-rose-950 text-xs leading-relaxed">
                      {analysisData?.summary || `${activeAlert.event_category} events associated with technique ${activeAlert.technique || 'unusual pattern'} pose risk of unauthorized access, lateral movement, or data exfiltration.`}
                    </p>
                  </div>

                  {/* 3. Recommended Action Callout Box (Light Emerald/Teal) */}
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-2">
                    <h4 className="font-bold text-emerald-900 text-xs tracking-wide uppercase flex items-center space-x-1.5">
                      <ShieldAlert className="h-4 w-4 text-emerald-600" />
                      <span>Recommended Action</span>
                    </h4>
                    <p className="text-emerald-950 text-xs leading-relaxed font-medium">
                      {activeAlert.source_ip ? `Inspect source IP ${activeAlert.source_ip}, block associated domain/IP at gateway, verify user ${activeAlert.user_context || 'account'} authentication logs, and isolate asset ${activeAlert.asset_context || 'endpoint'}.` : 'Investigate event indicator, verify authentication context, and isolate target asset if unauthorized activity is confirmed.'}
                    </p>
                  </div>

                  {/* 4. Analyst Guidance Card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs tracking-wide uppercase flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                      <ListOrdered className="h-4 w-4 text-brand-700" />
                      <span>Analyst Guidance</span>
                    </h4>
                    <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1.5 font-sans leading-relaxed">
                      <li>Inspect sender/source IP <span className="font-mono text-slate-900 font-semibold">{activeAlert.source_ip || 'N/A'}</span> for reputation indicators.</li>
                      <li>Identify affected user <span className="font-semibold text-slate-900">{activeAlert.user_context || 'system user'}</span> and check for secondary login anomalies.</li>
                      <li>Check if any endpoints executed payload associated with technique <span className="font-mono text-brand-900 font-semibold">{activeAlert.technique || 'MITRE'}</span>.</li>
                      <li>Block malicious indicator at perimeter firewall/gateway.</li>
                      <li>Submit verified indicators to local threat intelligence database.</li>
                    </ol>
                  </div>

                  {/* 5. Metrics & Criticality Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confidence Score</div>
                      <div className="text-lg font-extrabold text-blue-700 font-mono">
                        {analysisData?.findings?.risk_score?.confidence != null 
                          ? `${analysisData.findings.risk_score.confidence.toFixed(0)}%` 
                          : (activeAlert as any).confidence_score != null 
                            ? `${(activeAlert as any).confidence_score.toFixed(0)}%` 
                            : '85%'}
                      </div>
                      <div className="text-[10px] text-slate-500">Deterministic rule evidence</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">False Positive Likelihood</div>
                      <div className="text-lg font-extrabold text-amber-700 font-mono">
                        {analysisData?.findings?.risk_score?.false_positive_likelihood != null 
                          ? `${analysisData.findings.risk_score.false_positive_likelihood.toFixed(0)}%` 
                          : (activeAlert as any).fp_likelihood != null 
                            ? `${(activeAlert as any).fp_likelihood.toFixed(0)}%` 
                            : 'Low (15%)'}
                      </div>
                      <div className="text-[10px] text-slate-500">Baseline noise comparison</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Asset Criticality</div>
                      <div className="text-lg font-extrabold text-slate-900 font-sans uppercase">
                        {activeAlert.asset_context ? 'Medium' : 'Standard'}
                      </div>
                      <div className="text-[10px] text-slate-500">Standard monitoring applies</div>
                    </div>
                  </div>

                  {/* 6. Canonical Alert Information */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs tracking-wide uppercase border-b border-slate-100 pb-2">
                      Canonical Alert Information
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">Alert ID</div>
                        <div className="font-bold text-slate-900">{activeAlert.alert_code}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">Event Type</div>
                        <div className="font-bold text-slate-900 font-sans">{activeAlert.event_type}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">Event Category</div>
                        <div className="font-bold text-slate-900 font-sans">{activeAlert.event_category}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">Severity</div>
                        <div className="font-bold text-slate-900">{activeAlert.severity}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">Status</div>
                        <div className="font-bold text-slate-900">{activeAlert.status}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">Timestamp</div>
                        <div className="font-bold text-slate-800">{new Date(activeAlert.timestamp).toISOString()}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">User Context</div>
                        <div className="font-bold text-slate-900">{activeAlert.user_context || '-'}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">Asset Context</div>
                        <div className="font-bold text-slate-900">{activeAlert.asset_context || '-'}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">Source IP</div>
                        <div className="font-bold text-slate-900">{activeAlert.source_ip || '-'}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">Destination IP</div>
                        <div className="font-bold text-slate-900">{activeAlert.destination_ip || '-'}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">Ports / Protocol</div>
                        <div className="font-bold text-slate-900">
                          {activeAlert.source_port || '-'} &rarr; {activeAlert.destination_port || '-'} ({activeAlert.protocol || 'N/A'})
                        </div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="text-slate-400 text-[10px]">Action</div>
                        <div className="font-bold text-slate-900">{activeAlert.action || 'DETECTED'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Indicator & MITRE Technique */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Indicator of Compromise (IOC)</span>
                      <p className="font-mono text-xs font-semibold text-slate-900">{activeAlert.indicator || 'None specified'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MITRE ATT&CK Technique</span>
                      <p className="font-mono text-xs font-semibold text-brand-900">{activeAlert.technique || 'None specified'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TRIAGE ANALYSIS (PHASE 9-11) */}
              {activeDetailTab === 'analysis' && (
                <div className="space-y-6">
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
                      {/* Summary Card */}
                      <div className="bg-brand-50/60 border border-brand-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-brand-900 text-xs tracking-wide uppercase flex items-center space-x-1.5">
                            <ShieldAlert className="h-4 w-4 text-brand-700" />
                            <span>Triage Summary</span>
                          </span>
                          <span className="text-[10px] font-mono bg-white text-brand-800 border border-brand-200 px-2 py-0.5 rounded-full font-semibold">
                            Status: {analysisData.findings?.triage_status || 'COMPLETED'}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-xs">{analysisData.summary}</p>
                      </div>

                      {/* Phase 10 Intelligence Metrics Section */}
                      {analysisData.findings?.risk_score && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="font-bold text-slate-900 text-xs tracking-wide uppercase flex items-center space-x-1.5">
                              <Cpu className="h-4 w-4 text-brand-700" />
                              <span>Phase 10 Risk, Confidence & False-Positive Scores</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              Engine v{analysisData.findings.risk_score.version || '1.0'}
                            </span>
                          </div>

                          {/* 3 Metric Cards Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* 1. Risk Score Card */}
                            {(() => {
                              const rScore = analysisData.findings.risk_score.score ?? 0;
                              const rating = getRiskRating(rScore);
                              return (
                                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                      <span>Risk Score</span>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${rating.badge}`}>
                                        {rating.label}
                                      </span>
                                    </div>
                                    <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
                                      {rScore.toFixed(0)} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                      <div className={`h-full ${rating.bar}`} style={{ width: `${rScore}%` }}></div>
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-tight">Prioritization signal only.</div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 2. Confidence Score Card */}
                            {(() => {
                              const cScore = analysisData.findings.risk_score.confidence ?? 0;
                              return (
                                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                      <span>Confidence</span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                        {cScore >= 80 ? 'HIGH EVIDENCE' : cScore >= 50 ? 'MODERATE' : 'LIMITED'}
                                      </span>
                                    </div>
                                    <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
                                      {cScore.toFixed(0)}%
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                      <div className="h-full bg-blue-600" style={{ width: `${cScore}%` }}></div>
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-tight">Evidence strength & completeness.</div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 3. Estimated False-Positive Likelihood Card */}
                            {(() => {
                              const fpScore = analysisData.findings.risk_score.false_positive_likelihood ?? 0;
                              return (
                                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                      <span>Estimated FP Likelihood</span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                        {fpScore >= 50 ? 'ELEVATED FP' : 'LOW FP'}
                                      </span>
                                    </div>
                                    <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
                                      {fpScore.toFixed(0)}%
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                      <div className="h-full bg-slate-600" style={{ width: `${fpScore}%` }}></div>
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-tight">Estimated chance of benign activity.</div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Disclaimer */}
                          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 flex items-start space-x-2 text-[11px] text-amber-900">
                            <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Analytical Guarantee: </span>
                              {analysisData.findings.risk_score.disclaimer}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Phase 11 Anomaly Signal */}
                      {analysisData.findings?.anomaly_score && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="font-bold text-slate-900 text-xs tracking-wide uppercase flex items-center space-x-1.5">
                              <Activity className="h-4 w-4 text-brand-700" />
                              <span>Phase 11 Anomaly Signal</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              Status: {analysisData.findings.anomaly_score.status || 'COMPLETED'}
                            </span>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[11px] text-slate-500 font-medium">Statistical Anomaly Score</div>
                                <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                                  {analysisData.findings.anomaly_score.score?.toFixed(0) || '0'} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-slate-700 text-xs leading-relaxed">{analysisData.findings.anomaly_score.summary}</p>
                          </div>
                        </div>
                      )}

                      {/* Triggered Rules */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
                          Triggered Detection Rules ({analysisData.findings?.triggered_rules_count || 0})
                        </h4>
                        {analysisData.findings?.triggered_rules?.map((rule: TriggeredRule, idx: number) => (
                          <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-brand-900 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded text-[11px]">
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

              {/* TAB 3: EVIDENCE DATA */}
              {activeDetailTab === 'evidence' && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2 overflow-x-auto">
                    <div className="text-[10px] text-slate-400 uppercase font-sans font-bold border-b border-slate-800 pb-2">
                      Raw Payload Evidence (JSON)
                    </div>
                    <pre className="text-[11px] text-emerald-400 font-mono">
                      {JSON.stringify(activeAlert.raw_payload || activeAlert.alert_metadata || activeAlert, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 4: RELATED ALERTS */}
              {activeDetailTab === 'related' && (
                <div className="space-y-4">
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
                          className="bg-white border border-slate-200 hover:border-brand-400 p-3.5 rounded-lg shadow-sm flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-brand-900">{ra.alert_code}</span>
                              <span className="font-bold text-slate-900">{ra.event_type}</span>
                              <StatusBadge status={getSeverityBadgeType(ra.severity)} label={ra.severity} />
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

              {/* TAB 5: INCIDENT RELATIONSHIP */}
              {activeDetailTab === 'incident' && (
                <div className="space-y-4">
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
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-extrabold text-brand-900 text-sm">{incidentRelationship.incident_number}</span>
                          <h3 className="font-bold text-slate-900 text-sm mt-0.5">{incidentRelationship.title}</h3>
                        </div>
                        <StatusBadge status={getSeverityBadgeType(incidentRelationship.severity)} label={incidentRelationship.severity} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Risk Score</div>
                          <div className="font-bold text-slate-900">{incidentRelationship.risk_score.toFixed(0)} / 100</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Confidence</div>
                          <div className="font-bold text-blue-900">{incidentRelationship.confidence_score.toFixed(0)}%</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Status</div>
                          <div className="font-bold text-slate-900">{incidentRelationship.status}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate('/incidents')}
                        className="w-full mt-2 flex items-center justify-center space-x-1.5 text-xs py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                      >
                        <span>Open Incident Workspace</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: TIMELINE */}
              {activeDetailTab === 'timeline' && (
                <div className="space-y-4">
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
                          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm space-y-1">
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

              {/* TAB 7: AI INTELLIGENCE */}
              {activeDetailTab === 'ai' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-bold text-slate-900 text-xs tracking-wide uppercase flex items-center space-x-1.5">
                      <Bot className="h-4 w-4 text-purple-600" />
                      <span>Local Ollama AI Intelligence</span>
                    </h4>
                    <button
                      onClick={() => generateAiMutation.mutate({ alertId: activeAlert.id, forceRefresh: true })}
                      disabled={generateAiMutation.isPending}
                      className="flex items-center space-x-1 text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${generateAiMutation.isPending ? 'animate-spin' : ''}`} />
                      <span>{aiRecord ? 'Refresh AI Narrative' : 'Generate AI Explanation'}</span>
                    </button>
                  </div>

                  {isLoadingAi || generateAiMutation.isPending ? (
                    <LoadingState message="Local Ollama AI model generating evidence-grounded explanation..." />
                  ) : !aiRecord || !aiRecord.structured_output ? (
                    <EmptyState
                      title="No AI Intelligence Generated Yet"
                      description="Click 'Generate AI Explanation' above to run Phase 14 local Ollama intelligence analysis."
                      icon={Bot}
                    />
                  ) : (
                    <div className="space-y-4 bg-purple-50/50 border border-purple-200 rounded-xl p-4 text-xs text-slate-800">
                      <div className="bg-white border border-purple-200 rounded-lg p-3 space-y-1">
                        <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Executive Summary</div>
                        <p className="text-slate-900 font-semibold leading-relaxed">{aiRecord.structured_output.summary}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Factual Sequence</div>
                          <p className="text-slate-700">{aiRecord.structured_output.what_happened}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Why Suspicious</div>
                          <p className="text-slate-700">{aiRecord.structured_output.why_suspicious}</p>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Potential Impact</div>
                        <p className="text-slate-700">{aiRecord.structured_output.potential_impact}</p>
                      </div>

                      {/* Recommendations */}
                      {aiRecord.structured_output.recommended_investigation && (
                        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5">
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

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
