import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import { getAlertsHistoryApi } from '../services/alertsApi';
import { Radio, RefreshCw, Filter, User, Server } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { token } = useAuth();
  const { status: realtimeStatus } = useRealtime();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

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
        subtitle="Realtime security alert stream, canonical normalization, and live SOC event log"
        phaseBadge="Phase 8 Live Stream"
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
            {/* Category Filter */}
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

            {/* Severity Filter */}
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
      <Card title="Live Ingested Alerts Log" subtitle="Persisted normalized alerts in real-time stream">
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
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50/80 transition-colors">
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
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={alert.description}>
                      {alert.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
