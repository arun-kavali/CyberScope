import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  getExecutionGapsApi,
  getNegativeSpaceApi,
  getOperationalAnomaliesApi,
  getOperationalFindingsApi,
  ExecutionGapRecord,
  NegativeSpaceRecord,
  OperationalAnomalyRecord,
  OperationalFinding
} from '../services/analyticsApi';
import { CheckCircle2 } from 'lucide-react';

export const FindingsPage: React.FC = () => {
  const { token } = useAuth();

  // 1. Fetch Execution Gaps
  const { data: executionGaps, isLoading: isLoadingGaps } = useQuery<ExecutionGapRecord[]>({
    queryKey: ['execution-gaps'],
    queryFn: () => getExecutionGapsApi(token || ''),
    enabled: !!token,
  });

  // 2. Fetch Negative Space Indicators
  const { data: negativeSpace, isLoading: isLoadingNS } = useQuery<NegativeSpaceRecord[]>({
    queryKey: ['negative-space'],
    queryFn: () => getNegativeSpaceApi(token || ''),
    enabled: !!token,
  });

  // 3. Fetch Operational Anomalies
  const { data: anomalies, isLoading: isLoadingAnomalies } = useQuery<OperationalAnomalyRecord[]>({
    queryKey: ['operational-anomalies'],
    queryFn: () => getOperationalAnomaliesApi(token || ''),
    enabled: !!token,
  });

  // 4. Fetch General Operational Findings
  const { data: findings } = useQuery<OperationalFinding[]>({
    queryKey: ['operational-findings-page'],
    queryFn: () => getOperationalFindingsApi(token || ''),
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
        title="Evidence-Backed Operational Findings & Gaps"
        subtitle="Execution gaps, negative-space indicators, and behavioral operational anomaly findings derived from PostgreSQL database evidence"
        phaseBadge="Phase 18 Operational Intelligence"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Findings' }]}
      />

      {/* 1. EXECUTION GAPS CARD */}
      <Card
        title="Execution Gap Findings"
        subtitle="Operational prioritization indicators: unusually fast closures, missing escalations & repetitive investigation patterns"
        headerStyle="green"
      >
        {isLoadingGaps ? (
          <LoadingState message="Scanning evidence for execution gaps..." />
        ) : !executionGaps || executionGaps.length === 0 ? (
          <EmptyState
            title="No Execution Gaps Detected"
            description="No workflow execution gaps or threshold deviations observed in database records."
            icon={CheckCircle2}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Finding Type</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Evidence Reason</th>
                  <th className="py-2.5 px-3">Threshold</th>
                  <th className="py-2.5 px-3">Supporting Records</th>
                  <th className="py-2.5 px-3">Logged Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                {executionGaps.map((gap) => (
                  <tr key={gap.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{gap.finding_type}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={getSeverityBadgeType(gap.severity)} label={gap.severity} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">{gap.reason}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{gap.threshold !== undefined ? gap.threshold : '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {JSON.stringify(gap.supporting_records || {})}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {new Date(gap.created_at).toUTCString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 2. NEGATIVE SPACE CARD */}
      <Card
        title="Negative Space Telemetry Indicators"
        subtitle="Operational indicators identifying absence or deviation from expected activity baselines (Non-accusatory monitoring indicators)"
        headerStyle="default"
      >
        {isLoadingNS ? (
          <LoadingState message="Analyzing telemetry stream for negative space indicators..." />
        ) : !negativeSpace || negativeSpace.length === 0 ? (
          <EmptyState
            title="No Negative Space Indicators"
            description="All expected category, asset, and source telemetry streams are operating within expected baselines."
            icon={CheckCircle2}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Indicator Type</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Expected Activity Baseline</th>
                  <th className="py-2.5 px-3">Observed Activity</th>
                  <th className="py-2.5 px-3">Interpretation / Potential Indicator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                {negativeSpace.map((ns) => (
                  <tr key={ns.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-900">
                      {ns.finding_type || 'NEGATIVE_SPACE'}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={getSeverityBadgeType(ns.severity || 'MEDIUM')} label={ns.severity || 'MEDIUM'} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{ns.expected_activity}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{ns.observed_activity}</td>
                    <td className="py-2.5 px-3 text-amber-900 font-medium leading-relaxed bg-amber-50/40 p-2 rounded border border-amber-100">
                      {ns.potential_indicator || 'Expected activity was not observed. Monitoring coverage may require review.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 3. OPERATIONAL ANOMALIES CARD */}
      <Card
        title="Operational Behavioral Anomalies"
        subtitle="Statistical deviations calculated against 14-day rolling operational baselines"
        headerStyle="default"
      >
        {isLoadingAnomalies ? (
          <LoadingState message="Calculating statistical operational anomalies..." />
        ) : !anomalies || anomalies.length === 0 ? (
          <EmptyState
            title="No Operational Behavioral Anomalies"
            description="Alert volume, investigation duration, and escalation rate are operating within standard standard deviation baselines."
            icon={CheckCircle2}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Metric</th>
                  <th className="py-2.5 px-3">Baseline</th>
                  <th className="py-2.5 px-3">Observed Value</th>
                  <th className="py-2.5 px-3">Statistical Deviation</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                {anomalies.map((anom) => (
                  <tr key={anom.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{anom.metric}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{anom.baseline}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{anom.observed}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-700">+{anom.deviation} &sigma;</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{anom.threshold_method}</td>
                    <td className="py-2.5 px-3 text-slate-700">{anom.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 4. GENERAL OPERATIONAL FINDINGS CARD */}
      {findings && findings.length > 0 && (
        <Card title="General Operational Security Findings" subtitle="Rule trigger evidence and correlated findings" headerStyle="green">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Finding Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Impact Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                {findings.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{f.title}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{f.category}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={getSeverityBadgeType(f.severity)} label={f.severity} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{f.impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
