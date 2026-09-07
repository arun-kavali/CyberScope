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

export async function runOperationalAnalyticsApi(token: string, days = 30): Promise<OperationalAnalyticsSummary> {
  const res = await fetch(`${API_BASE_URL}/analytics/run?days=${days}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to run operational analytics' }));
    throw new Error(errorData.detail || `Server returned status ${res.status}`);
  }

  return res.json();
}

export async function getOperationalAnalyticsSummaryApi(token: string, days = 30): Promise<OperationalAnalyticsSummary> {
  const res = await fetch(`${API_BASE_URL}/analytics/summary?days=${days}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch operational analytics summary' }));
    throw new Error(errorData.detail || `Server returned status ${res.status}`);
  }

  return res.json();
}

export async function getOperationalFindingsApi(token: string): Promise<OperationalFinding[]> {
  const res = await fetch(`${API_BASE_URL}/analytics/findings`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch operational findings' }));
    throw new Error(errorData.detail || `Server returned status ${res.status}`);
  }

  return res.json();
}
