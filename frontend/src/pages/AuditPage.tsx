import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { User, Search, ChevronLeft, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { getAuditLogsApi, AuditLogItem } from '../services/auditApi';
import { useRealtimeContext } from '../context/RealtimeContext';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const { lastEvent } = useRealtimeContext();

  const fetchAuditLogs = useCallback(async (p = page, filter = actionFilter) => {
    try {
      setIsLoading(true);
      const res = await getAuditLogsApi({
        page: p,
        page_size: 20,
        action: filter.trim() || undefined,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (err: any) {
      console.error('Failed to load audit logs', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter]);

  // Initial fetch + refetch on page change
  useEffect(() => {
    fetchAuditLogs(page, actionFilter);
  }, [page]);

  // Auto-polling interval (every 4 seconds) to pick up new audit entries automatically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAuditLogs(page, actionFilter);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchAuditLogs, page, actionFilter]);

  // Refetch whenever a new realtime event arrives
  useEffect(() => {
    if (lastEvent) {
      fetchAuditLogs(page, actionFilter);
    }
  }, [lastEvent]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAuditLogs(1, actionFilter);
  };

  const handleManualRefresh = () => {
    fetchAuditLogs(page, actionFilter);
  };

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Trail"
        subtitle="Audited log of analyst security actions, AI executions, and system decisions."
        phaseBadge="SOC Operations"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Audit Trail' }]}
        actions={
          <div className="flex items-center space-x-2">
            <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter action (e.g. LOGIN, INGEST)"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="pl-8 pr-3 py-1 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-emerald-600 outline-none w-48"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1 bg-brand-900 text-white rounded text-xs font-semibold hover:bg-brand-950"
              >
                Filter
              </button>
            </form>
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="p-1.5 border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Refresh Audit Trail"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
        }
      />

      <Card title="Operational Action Audit Log" subtitle="Append-only immutable audit trail with sanitized metadata" headerStyle="green">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Audit Event ID</th>
                <th className="py-2.5 px-3">Actor / Identity</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Target Resource</th>
                <th className="py-2.5 px-3">Reason / Justification</th>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{log.id.slice(0, 8)}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center space-x-1">
                    <User className="h-3 w-3 text-slate-400" />
                    <span>{log.actor_name || 'SYSTEM'}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{log.role || 'SYSTEM'}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-brand-700 text-[11px]">{log.action}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">
                    {log.target_type ? `${log.target_type}: ${log.target_id || ''}` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 truncate max-w-[220px]">{log.reason || '-'}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status="healthy" label="VERIFIED" />
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                    No audit records found. Operational and security activity will appear here in chronological order.
                  </td>
                </tr>
              )}
              {isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                      <span>Loading audit trail events...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination */}
        <div className="p-3 border-t flex items-center justify-between text-xs bg-slate-50">
          <span className="text-slate-600">
            Showing Page <span className="font-bold text-slate-900">{page}</span> of{' '}
            <span className="font-bold text-slate-900">{totalPages}</span> ({total} Total Audit Records)
          </span>
          <div className="flex space-x-1">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="p-1 border rounded disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1 border rounded disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
