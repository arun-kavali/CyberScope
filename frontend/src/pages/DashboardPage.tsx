import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Activity, 
  Radio, 
  AlertTriangle, 
  Search, 
  CheckCircle2, 
  RefreshCw, 
  TrendingUp,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid 
} from 'recharts';

import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import { fetchDashboardSummary } from '../services/dashboardApi';
import { DashboardSummaryResponse } from '../types';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#d97706',
  LOW: '#2563eb',
  INFO: '#0284c7',
};

const RISK_COLORS = ['#dc2626', '#ea580c', '#d97706', '#16a34a'];

export const DashboardPage: React.FC = () => {
  const { token } = useAuth();
  const { isConnected, status: realtimeStatus, lastEvent } = useRealtime();

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardSummary(token);
      setSummary(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load dashboard summary.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Refetch when realtime events occur
  useEffect(() => {
    if (lastEvent) {
      loadDashboardData();
    }
  }, [lastEvent, loadDashboardData]);

  if (isLoading && !summary) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="SOC Analyst Operational Dashboard"
          subtitle="Loading real-time security operations metrics and persisted database analytics..."
          phaseBadge="Phase 15 — Dashboard Active"
          breadcrumbs={[{ label: 'CyberScope' }, { label: 'Dashboard' }]}
        />
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <RefreshCw className="h-8 w-8 text-brand-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">Loading Operational Dashboard Metrics...</p>
        </div>
      </div>
    );
  }

  const metrics = summary?.metrics;
  const indicators = summary?.operational_indicators;

  return (
    <div className="space-y-4">
      <PageHeader
        title="SOC Analyst Operational Dashboard"
        subtitle="Primary evidence-driven security operations overview & local realtime monitoring"
        phaseBadge="Phase 15 — SOC Analyst Dashboard"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Dashboard' }]}
        actions={
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded shadow-sm text-xs font-mono">
              <Radio className={`h-3.5 w-3.5 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
              <span className="text-slate-600 font-medium">Realtime:</span>
              <span className={`font-semibold ${isConnected ? 'text-emerald-700' : 'text-slate-500'}`}>
                {realtimeStatus}
              </span>
            </div>

            <button
              onClick={() => loadDashboardData()}
              className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded border border-slate-200 shadow-sm flex items-center space-x-1 transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between shadow-sm">
          <span>{error}</span>
          <button onClick={() => loadDashboardData()} className="font-semibold underline hover:text-red-900 ml-4">
            Retry
          </button>
        </div>
      )}

      {/* 1. 7 KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
        <MetricCard
          title="Live Alerts"
          value={metrics?.live_alerts_count ?? 0}
          change="Total Persisted"
          changeType="neutral"
          icon={AlertTriangle}
          accentColor="green"
        />
        <MetricCard
          title="Critical / High"
          value={metrics?.critical_high_alerts_count ?? 0}
          change="High Risk Severity"
          changeType={metrics?.critical_high_alerts_count ? 'negative' : 'positive'}
          icon={Shield}
          accentColor="green"
        />
        <MetricCard
          title="Active Incidents"
          value={metrics?.active_incidents_count ?? 0}
          change="Open Queue"
          changeType={metrics?.active_incidents_count ? 'negative' : 'positive'}
          icon={Activity}
          accentColor="green"
        />
        <MetricCard
          title="Investigations"
          value={metrics?.active_investigations_count ?? 0}
          change="Active Workspaces"
          changeType="neutral"
          icon={Search}
          accentColor="green"
        />
        <MetricCard
          title="Execution Gaps"
          value={metrics?.execution_gaps_count ?? 0}
          change="Operational Gaps"
          changeType="neutral"
          icon={Layers}
          accentColor="green"
        />
        <MetricCard
          title="Negative Space"
          value={metrics?.negative_space_count ?? 0}
          change="Log Silence Signals"
          changeType="neutral"
          icon={Radio}
          accentColor="green"
        />
        <MetricCard
          title="Review Priorities"
          value={metrics?.review_priorities_count ?? 0}
          change="Priority Review"
          changeType="neutral"
          icon={TrendingUp}
          accentColor="green"
        />
      </div>

      {/* 2. Main 2-Column Split: Critical Alerts & Active Incident Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Critical / High Risk Alerts Queue */}
        <Card 
          title="Critical & High Risk Alerts Queue" 
          subtitle="Top prioritized alerts requiring immediate triage" 
          headerStyle="green"
          headerAction={
            <Link to="/alerts" className="text-xs text-emerald-200 hover:text-white font-semibold flex items-center space-x-1">
              <span>View All Alerts</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {summary?.critical_alerts && summary.critical_alerts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="p-2">Alert ID</th>
                    <th className="p-2">Event Type</th>
                    <th className="p-2">Severity</th>
                    <th className="p-2">Risk</th>
                    <th className="p-2">Source</th>
                    <th className="p-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {summary.critical_alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 font-bold text-brand-900">
                        <Link to={`/alerts`} className="hover:underline">
                          {alert.alert_code}
                        </Link>
                      </td>
                      <td className="p-2 text-slate-800 font-sans">{alert.event_type}</td>
                      <td className="p-2">
                        <StatusBadge
                          status={alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'critical' : 'warning'}
                          label={alert.severity}
                        />
                      </td>
                      <td className="p-2 text-slate-900 font-bold">
                        {alert.risk_score != null ? alert.risk_score.toFixed(0) : 'N/A'}
                      </td>
                      <td className="p-2 text-slate-600 font-sans">{alert.source_name}</td>
                      <td className="p-2 text-slate-500 text-[11px]">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">No Critical or High Risk Alerts</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All incoming alerts are currently below high severity thresholds.</p>
            </div>
          )}
        </Card>

        {/* Active Incident Queue */}
        <Card 
          title="Active Incident Queue" 
          subtitle="Correlated security incidents requiring analyst attention" 
          headerStyle="default"
          headerAction={
            <Link to="/incidents" className="text-xs text-brand-700 hover:text-brand-900 font-semibold flex items-center space-x-1">
              <span>View All Incidents</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {summary?.active_incidents && summary.active_incidents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="p-2">Incident #</th>
                    <th className="p-2">Title</th>
                    <th className="p-2">Severity</th>
                    <th className="p-2">Risk</th>
                    <th className="p-2">Confidence</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {summary.active_incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 font-bold text-brand-900">
                        <Link to={`/incidents`} className="hover:underline">
                          {inc.incident_number}
                        </Link>
                      </td>
                      <td className="p-2 text-slate-800 font-sans font-medium truncate max-w-[140px]">{inc.title}</td>
                      <td className="p-2">
                        <StatusBadge
                          status={inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? 'critical' : 'warning'}
                          label={inc.severity}
                        />
                      </td>
                      <td className="p-2 text-slate-900 font-bold">{inc.risk_score.toFixed(0)}</td>
                      <td className="p-2 text-slate-700">{inc.confidence_score.toFixed(0)}%</td>
                      <td className="p-2">
                        <StatusBadge status={inc.status === 'OPEN' ? 'warning' : 'healthy'} label={inc.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">No Active Unresolved Incidents</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Incident correlation queue is currently clear.</p>
            </div>
          )}
        </Card>
      </div>

      {/* 3. Distributions & Real DB Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Severity Distribution */}
        <Card title="Alert Severity Distribution" headerStyle="default">
          <div className="h-48 w-full">
            {summary?.severity_distribution && summary.severity_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.severity_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '11px' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {summary.severity_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name] || '#16a34a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No Severity Data Available
              </div>
            )}
          </div>
        </Card>

        {/* Risk Distribution */}
        <Card title="Risk Score Distribution" headerStyle="default">
          <div className="h-48 w-full">
            {summary?.risk_distribution && summary.risk_distribution.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.risk_distribution.filter((d) => d.count > 0)}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={55}
                    innerRadius={30}
                    paddingAngle={3}
                  >
                    {summary.risk_distribution.map((_, index) => (
                      <Cell key={`cell-risk-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No Risk Score Distribution Data
              </div>
            )}
          </div>
        </Card>

        {/* Alert Source Distribution */}
        <Card title="Alert Source Distribution" headerStyle="default">
          <div className="h-48 w-full">
            {summary?.source_distribution && summary.source_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.source_distribution} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', fontSize: '11px' }} />
                  <Bar dataKey="count" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No Source Distribution Data
              </div>
            )}
          </div>
        </Card>

        {/* Operational Indicators */}
        <Card title="Operational Performance Metrics" headerStyle="green">
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded">
              <span className="text-xs text-slate-600">Average Risk Score</span>
              <span className="text-sm font-bold text-slate-900">{indicators?.avg_risk_score ?? 0.0} / 100</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded">
              <span className="text-xs text-slate-600">Average Confidence</span>
              <span className="text-sm font-bold text-slate-900">{indicators?.avg_confidence_score ?? 0.0}%</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded">
              <span className="text-xs text-slate-600">Resolved Incidents</span>
              <span className="text-sm font-bold text-emerald-700">
                {indicators?.resolved_incidents_count ?? 0} / {indicators?.total_incidents_count ?? 0}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Findings & Operational Priorities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Execution Gap Findings" subtitle="Identified operational process gaps" headerStyle="default">
          {summary?.execution_gaps && summary.execution_gaps.length > 0 ? (
            <div className="space-y-2">
              {summary.execution_gaps.map((fg) => (
                <div key={fg.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                  <div className="font-bold text-slate-900">{fg.title}</div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Category: {fg.category}</span>
                    <StatusBadge status="warning" label={fg.severity} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
              No Execution Gap Findings Logged
            </div>
          )}
        </Card>

        <Card title="Negative Space Signals" subtitle="Log silence & missing expected activity" headerStyle="default">
          {summary?.negative_space && summary.negative_space.length > 0 ? (
            <div className="space-y-2">
              {summary.negative_space.map((fg) => (
                <div key={fg.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                  <div className="font-bold text-slate-900">{fg.title}</div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Category: {fg.category}</span>
                    <StatusBadge status="warning" label={fg.severity} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
              No Negative Space Findings Logged
            </div>
          )}
        </Card>

        <Card title="Operational Findings" subtitle="Evidence-backed security recommendations" headerStyle="default">
          {summary?.operational_findings && summary.operational_findings.length > 0 ? (
            <div className="space-y-2">
              {summary.operational_findings.map((fg) => (
                <div key={fg.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                  <div className="font-bold text-slate-900">{fg.title}</div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Category: {fg.category}</span>
                    <StatusBadge status="healthy" label={fg.severity} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
              No Operational Findings Logged
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
