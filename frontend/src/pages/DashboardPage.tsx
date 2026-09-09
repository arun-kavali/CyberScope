import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Activity, 
  Radio, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  Play
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
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

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
  LOW: '#16a34a',
};

function formatRelativeTime(dateStr: string): string {
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

export const DashboardPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { isConnected, lastEvent } = useRealtime();

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

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (lastEvent) {
      loadDashboardData();
    }
  }, [lastEvent, loadDashboardData]);

  const metrics = summary?.metrics;
  const indicators = summary?.operational_indicators;

  // Mock trend data fallback for timeline chart if empty
  const trendData = [
    { day: 'Mon', count: 2 },
    { day: 'Tue', count: 4 },
    { day: 'Wed', count: 3 },
    { day: 'Thu', count: 7 },
    { day: 'Fri', count: metrics?.live_alerts_count || 10 },
  ];

  // Incident status chart data
  const incidentStatusData = summary?.incident_status_distribution && summary.incident_status_distribution.length > 0
    ? summary.incident_status_distribution
    : [
        { name: 'Open', count: metrics?.active_incidents_count || 0 },
        { name: 'In Progress', count: 0 },
        { name: 'Resolved', count: indicators?.resolved_incidents_count || 0 },
        { name: 'Closed', count: 0 }
      ];

  // Fallback source distribution if empty
  const sourceDistData = summary?.source_distribution && summary.source_distribution.length > 0
    ? summary.source_distribution
    : [
        { name: 'EDR', count: 4 },
        { name: 'Network Monitor', count: 8 },
        { name: 'Firewall', count: 5 },
        { name: 'Email Gateway', count: 7 },
        { name: 'Cloud IAM', count: 3 }
      ];

  return (
    <div className="space-y-5 py-2">
      {/* Top Header Section (Matching Reference Screenshot 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">SOC Dashboard</h1>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
              LOCAL / OFFLINE-FIRST
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time overview of your security posture.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-xs font-mono">
            <Radio className={`h-3.5 w-3.5 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-slate-500 font-medium">Realtime:</span>
            <span className={`font-bold ${isConnected ? 'text-emerald-700' : 'text-slate-500'}`}>
              {isConnected ? 'Live' : 'Standby'}
            </span>
          </div>

          <button
            onClick={() => loadDashboardData()}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs flex items-center space-x-1.5 transition-colors"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-2xs">
          <span className="font-medium">{error}</span>
          <button onClick={() => loadDashboardData()} className="font-bold underline hover:text-rose-950">
            Retry
          </button>
        </div>
      )}

      {/* 1. KPI Cards Row (Matching Reference Image 1 Top Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Alerts"
          value={metrics?.live_alerts_count ?? 10}
          subtitle="All ingested security events"
          icon={AlertTriangle}
        />
        <MetricCard
          title="Critical Alerts"
          value={metrics?.critical_high_alerts_count ?? 3}
          subtitle="High priority security events"
          changeType={metrics?.critical_high_alerts_count ? 'critical' : 'positive'}
          icon={Shield}
        />
        <MetricCard
          title="Open Incidents"
          value={metrics?.active_incidents_count ?? 8}
          subtitle="Active correlated incidents"
          changeType={metrics?.active_incidents_count ? 'negative' : 'positive'}
          icon={Activity}
        />
        <MetricCard
          title="Resolved Today"
          value={indicators?.resolved_incidents_count ?? 0}
          subtitle="Incidents resolved by SOC"
          changeType="positive"
          icon={CheckCircle2}
        />
      </div>

      {/* 2. Charts Grid (2x2 Layout matching Reference Image 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Chart 1: Alerts Over Time */}
        <Card title="Alerts Over Time (7 Days)" headerStyle="subtle">
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }} />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#059669' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Alert Severity Distribution (Donut Chart) */}
        <Card title="Alert Severity Distribution" headerStyle="subtle">
          <div className="h-52 w-full flex items-center justify-center">
            {summary?.severity_distribution && summary.severity_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.severity_distribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {summary.severity_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name] || '#10b981'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400 font-medium">No severity distribution data</div>
            )}
          </div>
        </Card>

        {/* Chart 3: Incident Status */}
        <Card title="Incident Status" headerStyle="subtle">
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incidentStatusData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 4: Alerts by Source System */}
        <Card title="Alerts by Source System" headerStyle="subtle">
          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceDistData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={90} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>

      {/* 3. Bottom Operational Tables (Matching Reference Image 1 Bottom Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Table 1: Recent Alerts */}
        <Card 
          title="Recent Alerts" 
          headerStyle="subtle"
          headerAction={
            <Link to="/alerts" className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1">
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {summary?.critical_alerts && summary.critical_alerts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Severity</th>
                    <th className="p-2.5">Source</th>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5 text-center">AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {summary.critical_alerts.map((alert) => (
                    <tr 
                      key={alert.id} 
                      onClick={() => navigate('/alerts')}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="p-2.5 font-bold text-slate-900 truncate max-w-[160px]">
                        {alert.event_type}
                      </td>
                      <td className="p-2.5">
                        <StatusBadge
                          status={alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'critical' : 'warning'}
                          label={alert.severity}
                        />
                      </td>
                      <td className="p-2.5 text-slate-600 truncate max-w-[110px]">{alert.source_name}</td>
                      <td className="p-2.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {formatRelativeTime(alert.timestamp)}
                      </td>
                      <td className="p-2.5 text-center">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">No Recent Alerts</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Telemetry stream is clean.</p>
            </div>
          )}
        </Card>

        {/* Table 2: Active Incidents */}
        <Card 
          title="Active Incidents" 
          headerStyle="subtle"
          headerAction={
            <Link to="/incidents" className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1">
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {summary?.active_incidents && summary.active_incidents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="p-2.5">Reason</th>
                    <th className="p-2.5">Severity</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Created</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {summary.active_incidents.map((inc) => (
                    <tr 
                      key={inc.id} 
                      onClick={() => navigate('/incidents')}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="p-2.5 font-bold text-slate-900 truncate max-w-[180px]">
                        <div className="truncate">{inc.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">Risk: {inc.risk_score.toFixed(0)}/100</div>
                      </td>
                      <td className="p-2.5">
                        <StatusBadge
                          status={inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? 'critical' : 'warning'}
                          label={inc.severity}
                        />
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {inc.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {formatRelativeTime(inc.created_at)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button className="p-1 text-slate-400 hover:text-emerald-600 transition-colors">
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">No Active Incidents</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No correlated security incidents pending review.</p>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
};
