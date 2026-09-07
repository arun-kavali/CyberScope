import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  getSupervisoryRiskApi,
  getReviewPrioritiesApi,
  SupervisoryRiskRecord,
  ReviewPriorityRecord
} from '../services/analyticsApi';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ReviewPrioritiesPage: React.FC = () => {
  const { token } = useAuth();

  // 1. Fetch Supervisory Risk Indicator
  const { data: riskIndicator, isLoading: isLoadingRisk } = useQuery<SupervisoryRiskRecord | null>({
    queryKey: ['supervisory-risk'],
    queryFn: () => getSupervisoryRiskApi(token || ''),
    enabled: !!token,
  });

  // 2. Fetch Review Priorities Queue
  const { data: priorities, isLoading: isLoadingPriorities } = useQuery<ReviewPriorityRecord[]>({
    queryKey: ['review-priorities'],
    queryFn: () => getReviewPrioritiesApi(token || ''),
    enabled: !!token,
  });

  const getSeverityBadgeType = (sev?: string): 'critical' | 'warning' | 'info' | 'neutral' => {
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
        title="Review Priorities & Supervisory Risk Indicators"
        subtitle="Operational triage queue prioritized by evidence-backed risk indicators, negative space deviations, and execution gaps"
        phaseBadge="Phase 19 Operational Review"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Review Priorities' }]}
      />

      {/* 1. SUPERVISORY RISK INDICATOR CARD */}
      <Card
        title="Supervisory Operational Risk Indicator"
        subtitle="Bounded 0–100 operational prioritization indicator explainable by evidence-linked risk contributors"
        headerStyle="green"
      >
        {isLoadingRisk ? (
          <LoadingState message="Calculating supervisory risk indicator from evidence..." />
        ) : !riskIndicator ? (
          <EmptyState
            title="Insufficient Evidence Data"
            description="Unable to compute supervisory risk score due to insufficient active stream telemetry."
            icon={CheckCircle2}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-center justify-center bg-white p-3 rounded-md border border-slate-200 shadow-sm min-w-[100px]">
                  <span className="text-3xl font-extrabold text-brand-900 font-mono">
                    {riskIndicator.overall_score}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Out of 100</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold text-slate-900">Overall Operational Risk Level</span>
                    <StatusBadge
                      status={riskIndicator.status === 'HIGH_ATTENTION' ? 'critical' : riskIndicator.status === 'ELEVATED' ? 'warning' : 'healthy'}
                      label={riskIndicator.status}
                    />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{riskIndicator.calculation_methodology}</p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 font-mono">
                <div>Data Quality: <span className="font-bold text-slate-700">{riskIndicator.data_quality_status}</span></div>
                <div>Updated: {new Date(riskIndicator.timestamp).toUTCString()}</div>
              </div>
            </div>

            {/* Risk Contributors Breakdown */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Evidence-Linked Risk Contributors</h4>
              {!riskIndicator.contributors || riskIndicator.contributors.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No operational risk contributors detected.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {riskIndicator.contributors.map((c, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-md shadow-xs flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{c.contributor_type}</span>
                        <span className="text-[11px] text-slate-600 leading-tight block mt-0.5">{c.calculation_method}</span>
                        <span className="text-[10px] font-mono text-slate-400 block mt-1">
                          Source: {c.source_record?.table || 'Evidence'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 whitespace-nowrap ml-2">
                        +{c.contribution} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 2. PRIORITIZED ANALYST TRIAGE QUEUE CARD */}
      <Card
        title="Prioritized Analyst Review Queue"
        subtitle="Ranked targets requiring SOC analyst investigation, traceable to normalized database evidence"
        headerStyle="default"
      >
        {isLoadingPriorities ? (
          <LoadingState message="Fetching review priority queue..." />
        ) : !priorities || priorities.length === 0 ? (
          <EmptyState
            title="No Items Pending Review"
            description="All incidents, execution gaps, and assets are within acceptable operational baselines."
            icon={CheckCircle2}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Target Type</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Priority Score</th>
                  <th className="py-2.5 px-3">Evidence-Grounded Reason</th>
                  <th className="py-2.5 px-3">Target ID</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                {priorities.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-extrabold text-brand-900 text-sm">#{p.rank}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{p.target_type}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={getSeverityBadgeType(p.severity)} label={p.severity} />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-extrabold text-rose-700">{p.priority_score} / 100</td>
                    <td className="py-2.5 px-3 text-slate-800 leading-relaxed font-medium">{p.reason}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 truncate max-w-[140px]" title={p.target_id}>
                      {p.target_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <Link
                        to={`/investigations?target_id=${p.target_id}`}
                        className="inline-flex items-center space-x-1 font-bold text-brand-700 hover:text-brand-900 text-[11px]"
                      >
                        <span>Investigate</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
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
