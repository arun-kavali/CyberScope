import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import {
  getExecutionGapsApi,
  getNegativeSpaceApi,
  getOperationalAnomaliesApi,
  getOperationalFindingsApi,
  getPeerBenchmarksApi,
  getFindingDetailApi,
  ExecutionGapRecord,
  NegativeSpaceRecord,
  OperationalAnomalyRecord,
  OperationalFinding,
  PeerBenchmarkRecord,
  FindingDetailRecord
} from '../services/analyticsApi';
import { CheckCircle2, GitCommit, X } from 'lucide-react';

export const FindingsPage: React.FC = () => {
  const { token } = useAuth();
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

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

  // 4. Fetch Peer Benchmarks
  const { data: peerBenchmarks, isLoading: isLoadingPeer } = useQuery<PeerBenchmarkRecord[]>({
    queryKey: ['peer-benchmarks-page'],
    queryFn: () => getPeerBenchmarksApi(token || ''),
    enabled: !!token,
  });

  // 5. Fetch General Operational Findings
  const { data: findings } = useQuery<OperationalFinding[]>({
    queryKey: ['operational-findings-page'],
    queryFn: () => getOperationalFindingsApi(token || ''),
    enabled: !!token,
  });

  // 6. Fetch Traceability Detail for Selected Finding
  const { data: findingDetail, isLoading: isLoadingDetail } = useQuery<FindingDetailRecord | null>({
    queryKey: ['finding-detail', selectedFindingId],
    queryFn: () => getFindingDetailApi(token || '', selectedFindingId || ''),
    enabled: !!token && !!selectedFindingId,
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

      {/* TRACEABILITY MODAL / DRAWER CARD */}
      {selectedFindingId && (
        <Card
          title="Evidence Traceability Chain"
          subtitle="5-Node evidence chain mapping Finding → Incident/Case → Investigation → Alert/Event → Normalized Evidence"
          headerStyle="green"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider block">Finding ID: {selectedFindingId}</span>
              {findingDetail && (
                <h3 className="text-sm font-bold text-slate-900 mt-1">{findingDetail.title}</h3>
              )}
            </div>
            <button
              onClick={() => setSelectedFindingId(null)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isLoadingDetail ? (
            <LoadingState message="Resolving 5-node evidence traceability chain..." />
          ) : !findingDetail ? (
            <EmptyState title="Finding Detail Unavailable" description="Could not resolve finding details or evidence links." icon={CheckCircle2} />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 overflow-x-auto pb-2">
                {findingDetail.evidence_chain.map((node, i) => (
                  <React.Fragment key={i}>
                    <div className={`p-3 rounded-lg border min-w-[180px] max-w-[220px] shadow-xs ${node.status === 'RESOLVED' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{node.node_type}</span>
                        <StatusBadge status={node.status === 'RESOLVED' ? 'healthy' : 'neutral'} label={node.status} />
                      </div>
                      <span className="text-xs font-bold text-slate-900 block truncate">{node.title || node.node_type}</span>
                      {node.record_id && (
                        <span className="text-[10px] font-mono text-slate-500 block truncate mt-0.5" title={node.record_id}>{node.record_id}</span>
                      )}
                    </div>
                    {i < findingDetail.evidence_chain.length - 1 && (
                      <span className="text-slate-400 font-bold text-base">&rarr;</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="p-3 bg-slate-900 text-slate-100 font-mono text-[11px] rounded-md overflow-x-auto">
                <span className="text-emerald-400 font-bold block mb-1">Traceability Metadata & Payload Context</span>
                <pre>{JSON.stringify(findingDetail, null, 2)}</pre>
              </div>
            </div>
          )}
        </Card>
      )}

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
                  <th className="py-2.5 px-3">Action</th>
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
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => setSelectedFindingId(gap.id)}
                        className="inline-flex items-center space-x-1 font-bold text-brand-700 hover:text-brand-900 text-[11px] bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded border border-brand-200 transition-colors"
                      >
                        <GitCommit className="h-3 w-3" />
                        <span>Trace Evidence</span>
                      </button>
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

      {/* 4. PEER BENCHMARKING CARD */}
      <Card
        title="Peer Operational Benchmarking"
        subtitle="Normalized operational performance comparisons against Enterprise SOC Peer Group baselines"
        headerStyle="green"
      >
        {isLoadingPeer ? (
          <LoadingState message="Calculating peer operational benchmarks..." />
        ) : !peerBenchmarks || peerBenchmarks.length === 0 ? (
          <EmptyState
            title="No Peer Benchmark Data"
            description="Insufficient telemetry data to calculate normalized peer benchmarks."
            icon={CheckCircle2}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Metric Name</th>
                  <th className="py-2.5 px-3">Subject Value</th>
                  <th className="py-2.5 px-3">Peer Baseline</th>
                  <th className="py-2.5 px-3">Deviation</th>
                  <th className="py-2.5 px-3">Status / Direction</th>
                  <th className="py-2.5 px-3">Sample Size</th>
                  <th className="py-2.5 px-3">Peer Group</th>
                  <th className="py-2.5 px-3">Methodology</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                {peerBenchmarks.map((pb) => (
                  <tr key={pb.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{pb.metric_name}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{pb.subject_value ?? pb.normalized_metric}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{pb.peer_baseline ?? '-'}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                      {pb.deviation !== undefined ? (pb.deviation > 0 ? `+${pb.deviation}` : pb.deviation) : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge
                        status={pb.direction === 'INSUFFICIENT_DATA' ? 'neutral' : pb.direction === 'NORMAL' ? 'healthy' : 'warning'}
                        label={pb.direction || 'NORMAL'}
                      />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{pb.sample_size ?? '-'}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold">{pb.peer_group}</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500 leading-tight">{pb.methodology || 'Normalized comparison against peer group.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 5. GENERAL OPERATIONAL FINDINGS CARD */}
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
