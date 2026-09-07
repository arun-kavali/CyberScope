import { API_BASE_URL } from './api';

export interface IncidentSummaryRecord {
  id: string;
  incident_number: string;
  title: string;
  summary: string;
  severity: string;
  risk_score: number;
  confidence_score: number;
  status: string;
  correlated_alert_count: number;
  created_at: string;
  updated_at: string;
}

export interface IncidentListResponse {
  items: IncidentSummaryRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CorrelatedAlertSummary {
  id: string;
  alert_code: string;
  event_type: string;
  event_category: string;
  severity: string;
  status: string;
  timestamp: string;
  user_context?: string;
  asset_context?: string;
  source_ip?: string;
  destination_ip?: string;
  risk_score?: number;
  confidence_score?: number;
}

export interface IncidentTimelineEvent {
  id: string;
  event_type: string;
  description: string;
  actor_profile_id?: string;
  timestamp: string;
}

export interface MatchedSignalDetail {
  signal_type: string;
  weight: number;
  detail: string;
}

export interface CorrelationExplanation {
  summary: string;
  matched_signals: MatchedSignalDetail[];
  correlation_score: number;
  correlated_alert_count?: number;
}

export interface IncidentDetailRecord {
  id: string;
  incident_number: string;
  title: string;
  summary: string;
  severity: string;
  risk_score: number;
  confidence_score: number;
  status: string;
  created_at: string;
  updated_at: string;
  correlated_alerts: CorrelatedAlertSummary[];
  correlation_explanation: CorrelationExplanation;
  timeline: IncidentTimelineEvent[];
}

function getAuthHeaders(token?: string): Record<string, string> {
  const authToken = token || localStorage.getItem('cyberscope_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  };
}

export async function fetchIncidents(
  page: number = 1,
  limit: number = 20,
  status?: string,
  severity?: string,
  token?: string
): Promise<IncidentListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });

  if (status) params.append('status', status);
  if (severity) params.append('severity', severity);

  const res = await fetch(`${API_BASE_URL}/incidents?${params.toString()}`, {
    headers: getAuthHeaders(token)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch incidents' }));
    throw new Error(errorData.detail || `Incidents fetch failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchIncidentById(
  incidentId: string,
  token?: string
): Promise<IncidentDetailRecord> {
  const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}`, {
    headers: getAuthHeaders(token)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch incident details' }));
    throw new Error(errorData.detail || `Incident fetch failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchIncidentTimeline(
  incidentId: string,
  token?: string
): Promise<IncidentTimelineEvent[]> {
  const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/timeline`, {
    headers: getAuthHeaders(token)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch incident timeline' }));
    throw new Error(errorData.detail || `Incident timeline fetch failed with status ${res.status}`);
  }

  return res.json();
}
