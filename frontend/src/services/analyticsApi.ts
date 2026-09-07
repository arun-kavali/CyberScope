import { API_BASE_URL } from './api';

export interface AlertAnalytics {
  total_alerts: number;
  severity_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  source_distribution: Record<string, number>;
  critical_high_ratio: number;
  repeated_patterns_count: number;
}

export interface IncidentAnalytics {
  total_incidents: number;
  status_distribution: Record<string, number>;
  severity_distribution: Record<string, number>;
  closure_rate: number;
  reopened_count: number;
}

export interface InvestigationAnalytics {
  total_investigations: number;
  status_distribution: Record<string, number>;
  mean_duration_minutes: number;
  median_duration_minutes: number;
}

export interface EscalationAnalytics {
  total_escalations: number;
  escalation_rate: number;
  severity_distribution: Record<string, number>;
}

export interface DispositionAnalytics {
  total_dispositions: number;
  disposition_distribution: Record<string, number>;
  fp_benign_ratio: number;
}

export interface EntityAnalytics {
  top_assets: Array<{ asset: string; alert_count: number }>;
  top_users: Array<{ user: string; alert_count: number }>;
  top_sources: Array<{ source: string; alert_count: number }>;
}

export interface TimeSeriesPoint {
  date: string;
  alerts: number;
  incidents: number;
  investigations: number;
  escalations: number;
}

export interface OperationalAnalyticsSummary {
  alert_analytics: AlertAnalytics;
  incident_analytics: IncidentAnalytics;
  investigation_analytics: InvestigationAnalytics;
  escalation_analytics: EscalationAnalytics;
  disposition_analytics: DispositionAnalytics;
  entity_analytics: EntityAnalytics;
  time_series: TimeSeriesPoint[];
  data_quality_status: string;
  disclaimer: string;
}

export interface OperationalFinding {
  id: string;
  title: string;
  category: string;
  severity: string;
  impact: string;
  recommendations?: Record<string, any>;
  created_at: string;
}

export interface ExecutionGapRecord {
  id: string;
  finding_type: string;
  severity: string;
  reason: string;
  evidence?: Record<string, any>;
  supporting_records?: Record<string, any>;
  threshold?: number;
  peer_context?: Record<string, any>;
  created_at: string;
}

export interface NegativeSpaceRecord {
  id: string;
  finding_type?: string;
  severity?: string;
  expected_activity: string;
  observed_activity: string;
  baseline_comparison?: Record<string, any>;
  potential_indicator?: string;
  supporting_evidence?: Record<string, any>;
  created_at: string;
}

export interface PeerBenchmarkRecord {
  id: string;
  metric_name: string;
  normalized_metric: number;
  peer_group: string;
  subject_entity?: string;
  subject_value?: number;
  peer_baseline?: number;
  deviation?: number;
  direction?: string;
  sample_size?: number;
  time_range?: string;
  methodology?: string;
  comparison_context?: Record<string, any>;
  created_at: string;
}

export interface OperationalAnomalyRecord {
  id: string;
  metric: string;
  baseline: number;
  observed: number;
  deviation: number;
  interpretation: string;
  threshold_method: string;
  supporting_records?: Record<string, any>;
  timestamp: string;
}

export interface RiskContributor {
  contributor_type: string;
  contribution: number;
  supporting_evidence?: Record<string, any>;
  source_record?: Record<string, any>;
  calculation_method: string;
  timestamp: string;
}

export interface SupervisoryRiskRecord {
  overall_score: number;
  status: string;
  contributors: RiskContributor[];
  calculation_methodology: string;
  data_quality_status: string;
  timestamp: string;
}

export interface ReviewPriorityRecord {
  id: string;
  target_type: string;
  target_id: string;
  rank: number;
  priority_score: number;
  severity: string;
  reason: string;
  risk_indicator: number;
  evidence_references?: Record<string, any>;
  supporting_findings?: Array<Record<string, any>>;
  created_at: string;
}

export interface TraceabilityNode {
  node_type: string;
  status: string;
  record_id?: string;
  title?: string;
  details?: Record<string, any>;
}

export interface FindingDetailRecord {
  finding_id: string;
  finding_type: string;
  category?: string;
  severity: string;
  risk_score?: number;
  title: string;
  summary: string;
  reason: string;
  evidence_references?: Record<string, any>;
  analytical_signals?: Record<string, any>;
  peer_context?: Record<string, any>;
  created_at: string;
  evidence_chain: TraceabilityNode[];
}

export interface EvidenceDetailRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  evidence_payload?: Record<string, any>;
  sanitized: boolean;
  created_at: string;
}

export async function runOperationalAnalyticsApi(token: string, days = 30): Promise<OperationalAnalyticsSummary> {
  const res = await fetch(`${API_BASE_URL}/analytics/run?days=${days}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to run operational analytics');
  return res.json();
}

export async function getOperationalAnalyticsSummaryApi(token: string, days = 30): Promise<OperationalAnalyticsSummary> {
  const res = await fetch(`${API_BASE_URL}/analytics/summary?days=${days}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch analytics summary');
  return res.json();
}

export async function getOperationalFindingsApi(token: string): Promise<OperationalFinding[]> {
  const res = await fetch(`${API_BASE_URL}/analytics/findings`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getExecutionGapsApi(token: string): Promise<ExecutionGapRecord[]> {
  const res = await fetch(`${API_BASE_URL}/analytics/execution-gaps`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getNegativeSpaceApi(token: string): Promise<NegativeSpaceRecord[]> {
  const res = await fetch(`${API_BASE_URL}/analytics/negative-space`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getPeerBenchmarksApi(token: string): Promise<PeerBenchmarkRecord[]> {
  const res = await fetch(`${API_BASE_URL}/analytics/peer-benchmarks`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getOperationalAnomaliesApi(token: string): Promise<OperationalAnomalyRecord[]> {
  const res = await fetch(`${API_BASE_URL}/analytics/anomalies`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getSupervisoryRiskApi(token: string): Promise<SupervisoryRiskRecord | null> {
  const res = await fetch(`${API_BASE_URL}/analytics/supervisory-risk`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getReviewPrioritiesApi(token: string): Promise<ReviewPriorityRecord[]> {
  const res = await fetch(`${API_BASE_URL}/analytics/review-priorities`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getFindingDetailApi(token: string, findingId: string): Promise<FindingDetailRecord | null> {
  const res = await fetch(`${API_BASE_URL}/analytics/findings/${findingId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getFindingTraceabilityApi(token: string, findingId: string): Promise<FindingDetailRecord | null> {
  const res = await fetch(`${API_BASE_URL}/analytics/findings/${findingId}/traceability`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getEvidenceDetailApi(token: string, evidenceId: string): Promise<EvidenceDetailRecord | null> {
  const res = await fetch(`${API_BASE_URL}/analytics/evidence/${evidenceId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}
