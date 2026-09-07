import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { MetricCard } from '../components/MetricCard';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  getOperationalAnalyticsSummaryApi,
  runOperationalAnalyticsApi,
  getOperationalFindingsApi,
  OperationalAnalyticsSummary,
  OperationalFinding
} from '../services/analyticsApi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import {
  TrendingUp,
  ShieldAlert,
  Target,
  Clock,
  AlertTriangle,
  Play,
  Server,
  User
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [days, setDays] = useState<number>(30);

  // Fetch Operational Analytics Summary
  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<OperationalAnalyticsSummary>({
    queryKey: ['operational-analytics', days],
    queryFn: () => getOperationalAnalyticsSummaryApi(token || '', days),
    enabled: !!token,
    staleTime: 10000,
  });

  // Fetch Operational Findings
  const { data: findings } = useQuery<OperationalFinding[]>({
    queryKey: ['operational-findings'],
    queryFn: () => getOperationalFindingsApi(token || ''),
    enabled: !!token,
  });

  // Run Analytics Mutation
  const runMutation = useMutation({
    mutationFn: () => runOperationalAnalyticsApi(token || '', days),
    onSuccess: (data) => {
      queryClient.setQueryData(['operational-analytics', days], data);
      queryClient.invalidateQueries({ queryKey: ['operational-findings'] });
    },
  });

  if (isLoading) {
    return <LoadingState message="Executing operational analytics pipeline over database evidence..." />;
  }

  if (isError || !summary) {
    return (
      <ErrorState
        title="Failed to Load Operational Analytics"
        message={(error as Error)?.message || 'An error occurred while running analytics calculation.'}
        onRetry={() => refetch()}
      />
    );
  }

  const {
    alert_analytics: alerts,
    incident_analytics: incidents,
    investigation_analytics: investigations,
    escalation_analytics: escalations,
    disposition_analytics: dispositions,
    entity_analytics: entities,
    time_series: timeSeries,
    data_quality_status: dqStatus
  } = summary;

  // Chart data formatting
  const severityChartData = Object.entries(alerts.severity_distribution || {}).map(([name, count]) => ({
    name,
    count,
  }));

  const categoryChartData = Object.entries(alerts.category_distribution || {}).map(([name, count]) => ({
    name,
    count,
  }));

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Security Evidence Analytics Engine"
        subtitle="Realtime statistical evidence processing across alerts, incidents, investigations, escalations & dispositions"
        phaseBadge="Phase 17 Operational Analytics"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Analytics' }]}
        actions={
          <div className="flex items-center space-x-3 text-xs">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:ring-1 focus:ring-brand-600 outline-none shadow-sm"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>

            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Play className={`h-3.5 w-3.5 ${runMutation.isPending ? 'animate-spin' : ''}`} />
              <span>Run Analytics Pipeline</span>
            </button>
          </div>
        }
      />

      {/* Data Quality Warning Notice */}
      {dqStatus !== 'NORMAL' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <div>
              <span className="font-bold uppercase tracking-wider">Data Quality Indicator: </span>
              {dqStatus === 'NO_DATA'
                ? 'No alerts or incidents found in database. Analytics require ingested security evidence.'
                : 'Limited sample volume available (< 3 alerts). Statistical ratios will stabilize with additional alert ingestion.'}
            </div>
          </div>
          <span className="font-mono font-bold text-[10px] bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
            State: {dqStatus}
          </span>
        </div>
      )}

      {/* Top Operational Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Ingested Alerts"
          value={alerts.total_alerts.toString()}
          change={`${alerts.critical_high_ratio}% Critical/High Ratio`}
          changeType={alerts.critical_high_ratio > 30 ? 'negative' : 'positive'}
          icon={ShieldAlert}
          accentColor="green"
        />
        <MetricCard
          title="Total Incidents"
          value={incidents.total_incidents.toString()}
          change={`${incidents.closure_rate}% Closure Rate`}
          changeType="positive"
          icon={Target}
          accentColor="green"
        />
        <MetricCard
          title="Mean Investigation Time"
          value={`${investigations.mean_duration_minutes.toFixed(1)}m`}
          change={`Median: ${investigations.median_duration_minutes.toFixed(1)}m`}
          changeType="neutral"
          icon={Clock}
          accentColor="green"
        />
        <MetricCard
          title="Escalation Rate"
          value={`${escalations.escalation_rate}%`}
          change={`${escalations.total_escalations} Total Escalations`}
          changeType="neutral"
          icon={TrendingUp}
          accentColor="green"
        />
      </div>

      {/* Time-Series Activity Trend Chart */}
      <Card title="Time-Series Activity Stream" subtitle="Daily aggregation of alerts, incidents, investigations & escalations over time" headerStyle="green">
        {timeSeries && timeSeries.length > 0 ? (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', border: 'none', color: '#FFF', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="alerts" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} name="Alerts" />
                <Line type="monotone" dataKey="incidents" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} name="Incidents" />
                <Line type="monotone" dataKey="investigations" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Investigations" />
                <Line type="monotone" dataKey="escalations" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} name="Escalations" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic py-6 text-center">No time-series data available.</div>
        )}
      </Card>

      {/* Category & Severity Distribution Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity Distribution */}
        <Card title="Alert Severity Breakdown" subtitle="Distribution of persisted security alerts by risk severity classification" headerStyle="default">
          {severityChartData.length > 0 ? (
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', border: 'none', color: '#FFF', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} name="Alert Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-6 text-center">No severity distribution data.</div>
          )}
        </Card>

        {/* Category Distribution */}
        <Card title="Alert Category Distribution" subtitle="Event categories across Authentication, Endpoint, Network, Database & Email" headerStyle="default">
          {categoryChartData.length > 0 ? (
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', border: 'none', color: '#FFF', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Alert Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-6 text-center">No category distribution data.</div>
          )}
        </Card>
      </div>

      {/* Dispositions & Entity Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        {/* Disposition Analytics */}
        <Card title="Disposition Analysis" subtitle="Analyst decision breakdown & benign ratio" headerStyle="green">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded">
              <span className="font-medium text-slate-700">Total Dispositions</span>
              <span className="font-mono font-bold text-slate-900">{dispositions.total_dispositions}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded">
              <span className="font-medium text-slate-700">False-Positive / Benign Ratio</span>
              <span className="font-mono font-bold text-brand-700">{dispositions.fp_benign_ratio}%</span>
            </div>

            <div className="space-y-1.5 pt-2">
              {Object.entries(dispositions.disposition_distribution || {}).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-slate-600">{type}:</span>
                  <span className="font-bold text-slate-800">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Top Active Assets */}
        <Card title="Top Active Assets" subtitle="Entities generating highest alert volume" headerStyle="default">
          {entities.top_assets && entities.top_assets.length > 0 ? (
            <div className="space-y-2">
              {entities.top_assets.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono">
                  <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
                    <Server className="h-3.5 w-3.5 text-slate-400" />
                    <span>{item.asset}</span>
                  </span>
                  <span className="bg-brand-50 text-brand-900 border border-brand-200 px-2 py-0.5 rounded font-bold">
                    {item.alert_count} alerts
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-4 text-center">No active asset data recorded.</div>
          )}
        </Card>

        {/* Top Active Users */}
        <Card title="Top Active Users" subtitle="User accounts associated with alerts" headerStyle="default">
          {entities.top_users && entities.top_users.length > 0 ? (
            <div className="space-y-2">
              {entities.top_users.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono">
                  <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{item.user}</span>
                  </span>
                  <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded font-bold">
                    {item.alert_count} alerts
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-4 text-center">No active user data recorded.</div>
          )}
        </Card>
      </div>

      {/* Operational Findings Section */}
      {findings && findings.length > 0 && (
        <Card title="Operational Analytics Findings" subtitle="Automated findings generated from evidence analytics engine" headerStyle="green">
          <div className="space-y-3 text-xs">
            {findings.map((finding) => (
              <div key={finding.id} className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{finding.title}</span>
                    <span className="bg-brand-50 text-brand-900 border border-brand-200 text-[10px] font-mono px-2 py-0.5 rounded font-semibold">
                      {finding.category}
                    </span>
                  </div>
                  <StatusBadge status={getSeverityBadgeType(finding.severity)} label={finding.severity} />
                </div>
                <p className="text-slate-700">{finding.impact}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
