import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  AlertRecord,
  AlertAnalysisRecord,
  TriggeredRule
} from '../services/alertsApi';
import { Radio, RefreshCw, Filter, User, Server, ChevronRight, X, ShieldAlert, Cpu, Clock, Play } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { status: realtimeStatus } = useRealtime();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [activeAlert, setActiveAlert] = useState<AlertRecord | null>(null);

  const { data: alerts, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['alerts', selectedCategory, selectedSeverity],
    queryFn: () =>
      getAlertsHistoryApi(token || '', {
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
        page_size: 50,
      }),
    enabled: !!token,
    staleTime: 5000,
  });

  // Query triage analysis details for selected active alert
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

  // Mutation to trigger manual reanalysis
  const reanalyzeMutation = useMutation({
    mutationFn: (alertId: string) => reanalyzeAlertApi(token || '', alertId),
    onSuccess: (data) => {
      queryClient.setQueryData(['alert-analysis', activeAlert?.id], data);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const getSeverityBadgeType = (sev: string): 'critical' | 'warning' | 'info' | 'neutral' => {
    switch (sev) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Alert Ingestion & Monitoring Center"
        subtitle="Realtime security alert stream, canonical normalization, and automatic Phase 9 triage"
        phaseBadge="Phase 9 Triage & Detection"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Alerts' }]}
        actions={
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <Radio className="h-4 w-4 text-brand-600" />
              <span className="text-slate-600 font-medium">Realtime Stream:</span>
              {realtimeStatus === 'CONNECTED' ? (
                <span className="flex items-center text-emerald-700 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> Active (WebSocket)
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

      {/* Filter Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-2 text-slate-700 font-medium">
            <Filter className="h-4 w-4 text-slate-400" />
            <span>Filter Stream:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-slate-500 font-medium">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-brand-500 outline-none"
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
              <label className="text-slate-500 font-medium">Severity:</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-brand-500 outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Live Alerts Table */}
      <Card title="Live Ingested Alerts Log" subtitle="Click any alert row to view automatic Phase 9 triage, detection rules & context enrichment">
        {isLoading ? (
          <LoadingState message="Loading live security alert stream..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Alerts"
            message={(error as Error)?.message || 'An error occurred while retrieving alerts.'}
            onRetry={() => refetch()}
          />
        ) : !alerts || alerts.length === 0 ? (
          <EmptyState
            title="No Alerts Ingested Yet"
            description="Use the Alert Source Synthetic Scenario Generator to submit synthetic security alerts into the pipeline."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Alert Code</th>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Target / Entity</th>
                  <th className="py-2.5 px-3">Source IP</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                {alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    onClick={() => setActiveAlert(alert)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                      activeAlert?.id === alert.id ? 'bg-brand-50/50 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-brand-900">{alert.alert_code}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(alert.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{alert.event_category}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{alert.event_type}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={getSeverityBadgeType(alert.severity)} label={alert.severity} />
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
                      <span>View Triage</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Phase 9 Triage Analysis Drawer / Modal */}
      {activeAlert && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <div className="bg-brand-600 text-white p-2 rounded-lg">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-900 text-base">{activeAlert.alert_code} — Phase 9 Triage</h3>
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

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1 text-xs text-slate-800">
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

                  {/* Triggered Detection Rules */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between border-b border-slate-200 pb-2">
                      <span>Triggered Detection Rules ({analysisData.findings?.triggered_rules_count || 0})</span>
                      <span className="text-xs font-mono text-slate-400 font-normal">Version 1.0</span>
                    </h4>

                    {!analysisData.findings?.triggered_rules || analysisData.findings.triggered_rules.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-500 text-xs">
                        No deterministic detection rules were triggered by this alert.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {analysisData.findings.triggered_rules.map((rule: TriggeredRule, idx: number) => (
                          <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-brand-900 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded text-[11px]">
                                  {rule.rule_id}
                                </span>
                                <span className="font-bold text-slate-900 text-xs">{rule.rule_name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">v{rule.rule_version}</span>
                              </div>
                              <StatusBadge status={getSeverityBadgeType(rule.severity)} label={rule.severity} />
                            </div>

                            <p className="text-slate-700 text-xs">{rule.reason}</p>

                            {rule.evidence && Object.keys(rule.evidence).length > 0 && (
                              <div className="bg-slate-50 rounded p-2 border border-slate-100 font-mono text-[11px] text-slate-600 space-y-1">
                                <div className="text-[10px] text-slate-400 uppercase font-semibold">Evidence Details:</div>
                                {Object.entries(rule.evidence).map(([k, v]) => (
                                  <div key={k} className="flex justify-between">
                                    <span className="text-slate-500">{k}:</span>
                                    <span className="text-slate-800 font-medium">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Context Enrichment Panel */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">Context Enrichment Details</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Asset Context */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 flex items-center space-x-1">
                            <Server className="h-3.5 w-3.5 text-slate-500" />
                            <span>Asset Context</span>
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            analysisData.analysis_metadata?.context_enrichment?.asset?.context_available
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {analysisData.analysis_metadata?.context_enrichment?.asset?.context_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                        {analysisData.analysis_metadata?.context_enrichment?.asset?.context_available ? (
                          <div className="space-y-0.5 text-[11px] text-slate-600 font-mono">
                            <div>Name: {analysisData.analysis_metadata.context_enrichment.asset.name}</div>
                            <div>Criticality: {analysisData.analysis_metadata.context_enrichment.asset.criticality}</div>
                            <div>Type: {analysisData.analysis_metadata.context_enrichment.asset.type}</div>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-[11px]">
                            {analysisData.analysis_metadata?.context_enrichment?.asset?.reason || 'No asset record found.'}
                          </p>
                        )}
                      </div>

                      {/* User Context */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 flex items-center space-x-1">
                            <User className="h-3.5 w-3.5 text-slate-500" />
                            <span>User Context</span>
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            analysisData.analysis_metadata?.context_enrichment?.user?.context_available
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {analysisData.analysis_metadata?.context_enrichment?.user?.context_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                        {analysisData.analysis_metadata?.context_enrichment?.user?.context_available ? (
                          <div className="space-y-0.5 text-[11px] text-slate-600 font-mono">
                            <div>Name: {analysisData.analysis_metadata.context_enrichment.user.name}</div>
                            <div>Email: {analysisData.analysis_metadata.context_enrichment.user.email}</div>
                            <div>Dept: {analysisData.analysis_metadata.context_enrichment.user.department || 'N/A'}</div>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-[11px]">
                            {analysisData.analysis_metadata?.context_enrichment?.user?.reason || 'No user record found.'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Historical Activity Window */}
                    {analysisData.analysis_metadata?.context_enrichment?.history && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                        <div className="font-semibold text-slate-800 flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>Bounded 24-Hour Activity Window</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-[11px]">
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <div className="text-slate-400 text-[10px]">User 24h</div>
                            <div className="font-bold text-slate-800">{analysisData.analysis_metadata.context_enrichment.history.user_alerts_24h}</div>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <div className="text-slate-400 text-[10px]">Asset 24h</div>
                            <div className="font-bold text-slate-800">{analysisData.analysis_metadata.context_enrichment.history.asset_alerts_24h}</div>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <div className="text-slate-400 text-[10px]">Source IP 24h</div>
                            <div className="font-bold text-slate-800">{analysisData.analysis_metadata.context_enrichment.history.source_ip_alerts_24h}</div>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <div className="text-slate-400 text-[10px]">Event Type 24h</div>
                            <div className="font-bold text-slate-800">{analysisData.analysis_metadata.context_enrichment.history.event_type_alerts_24h}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
