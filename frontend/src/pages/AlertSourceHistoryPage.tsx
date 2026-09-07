import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { History, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAlertsHistoryApi, AlertRecord } from '../services/alertsApi';

const CATEGORIES = ['ALL', 'AUTHENTICATION', 'ENDPOINT', 'NETWORK', 'DATABASE', 'EMAIL'];
const SEVERITIES = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const AlertSourceHistoryPage: React.FC = () => {
  const { token } = useAuth();

  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await getAlertsHistoryApi(token, {
        page,
        page_size: pageSize,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
      });
      setAlerts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve submission history.');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, pageSize, selectedCategory, selectedSeverity]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert Submission History"
        subtitle="Real-time log of synthetic alerts persisted in local PostgreSQL database"
        phaseBadge="Phase 6 History Active"
        breadcrumbs={[{ label: 'Alert Source' }, { label: 'Submission History' }]}
        actions={
          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Log</span>
          </button>
        }
      />

      {error && <ErrorState message={error} onRetry={fetchHistory} />}

      <Card
        title="Persisted PostgreSQL Alerts Log"
        headerAction={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-xs">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                className="text-xs bg-white border border-slate-300 rounded p-1 font-medium focus:ring-1 focus:ring-brand-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => { setSelectedSeverity(e.target.value); setPage(1); }}
                className="text-xs bg-white border border-slate-300 rounded p-1 font-bold text-slate-900 focus:ring-1 focus:ring-brand-500"
              >
                {SEVERITIES.map((sev) => (
                  <option key={sev} value={sev}>{sev}</option>
                ))}
              </select>
            </div>
          </div>
        }
      >
        {isLoading ? (
          <LoadingState message="Fetching Submission History..." subtext="Querying alerts from PostgreSQL..." />
        ) : alerts.length === 0 ? (
          <EmptyState
            title="No Persisted Alerts Found"
            description="No synthetic alerts match the selected criteria in PostgreSQL. Submit alerts using Submit Alert or Scenario Generator."
            icon={History}
          />
        ) : (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Alert ID / Code</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Event Timestamp</th>
                    <th className="p-3">User Context</th>
                    <th className="p-3">Source IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {alerts.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-brand-900">
                        {item.alert_code}
                      </td>
                      <td className="p-3 font-sans text-slate-800 font-medium">{item.event_type}</td>
                      <td className="p-3 font-sans text-slate-600">{item.event_category}</td>
                      <td className="p-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-900 border border-red-200'
                            : item.severity === 'HIGH'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : item.severity === 'MEDIUM'
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="p-3 font-sans">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{new Date(item.timestamp).toLocaleString()}</td>
                      <td className="p-3 font-sans text-slate-700">{item.user_context || '-'}</td>
                      <td className="p-3 text-slate-700">{item.source_ip || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 text-xs">
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
    </div>
  );
};
