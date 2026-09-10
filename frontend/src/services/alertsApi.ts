import { API_BASE_URL } from './api';

export interface AlertCreatePayload {
  event_type: string;
  event_category: string;
  severity: string;
  status?: string;
  timestamp?: string;
  user_context?: string;
  asset_context?: string;
  source_ip?: string;
  destination_ip?: string;
  source_port?: number;
  destination_port?: number;
  protocol?: string;
  action?: string;
  description: string;
  indicator?: string;
  technique?: string;
  raw_payload?: Record<string, any>;
  alert_metadata?: Record<string, any>;
}

export interface ScenarioGeneratePayload {
  category: string;
  scenario_name: string;
  generation_mode: string;
  severity: string;
  intent: string;
  quantity: number;
  start_time?: string;
  custom_params?: Record<string, any>;
}

export interface ScenarioPreviewResponse {
  category: string;
  scenario_name: string;
  generation_mode: string;
  severity: string;
  intent: string;
  generated_count: number;
  alerts: Record<string, any>[];
}

export interface AlertRecord {
  id: string;
  alert_code: string;
  source_id?: string;
  event_type: string;
  event_category: string;
  severity: string;
  status: string;
  timestamp: string;
  user_context?: string;
  asset_context?: string;
  source_ip?: string;
  destination_ip?: string;
  source_port?: number;
  destination_port?: number;
  protocol?: string;
  action?: string;
  description: string;
  indicator?: string;
  technique?: string;
  raw_payload?: Record<string, any>;
  alert_metadata?: Record<string, any>;
  created_at: string;
}

export interface AlertBatchResponse {
  accepted_count: number;
  rejected_count: number;
  duplicate_count?: number;
  alerts: AlertRecord[];
  message: string;
}

export async function submitSingleAlertApi(token: string, payload: AlertCreatePayload): Promise<AlertRecord> {
  const res = await fetch(`${API_BASE_URL}/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to submit alert' }));
    const detailMsg = Array.isArray(errorData.detail)
      ? errorData.detail.join(' | ')
      : (errorData.detail || `Server returned status ${res.status}`);
    throw new Error(detailMsg);
  }

  return res.json();
}

export async function submitBatchAlertsApi(token: string, alerts: AlertCreatePayload[]): Promise<AlertBatchResponse> {
  const res = await fetch(`${API_BASE_URL}/alerts/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ alerts }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to submit batch alerts' }));
    const detailMsg = Array.isArray(errorData.detail)
      ? errorData.detail.join(' | ')
      : (errorData.detail || `Server returned status ${res.status}`);
    throw new Error(detailMsg);
  }

  return res.json();
}

export async function generateScenarioPreviewApi(token: string, payload: ScenarioGeneratePayload): Promise<ScenarioPreviewResponse> {
  const res = await fetch(`${API_BASE_URL}/alerts/generate-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to generate scenario preview' }));
    throw new Error(errorData.detail || `Server returned status ${res.status}`);
  }

  return res.json();
}

export async function importSampleDatasetApi(token: string, quantity: number = 20): Promise<AlertBatchResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/alerts/sample-dataset?quantity=${quantity}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to import sample dataset' }));
    throw new Error(errorData.detail || `Server returned status ${res.status}`);
  }

  return res.json();
}

export async function getAlertsHistoryApi(
  token: string,
  params: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    severity?: string;
    status?: string;
    user?: string;
    asset?: string;
    source_ip?: string;
    event_type?: string;
    risk_min?: number;
    risk_max?: number;
    start_time?: string;
    end_time?: string;
  } = {}
): Promise<AlertRecord[]> {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.page_size) query.append('page_size', params.page_size.toString());
  if (params.search) query.append('search', params.search);
  if (params.category) query.append('category', params.category);
  if (params.severity) query.append('severity', params.severity);
  if (params.status) query.append('status', params.status);
  if (params.user) query.append('user', params.user);
  if (params.asset) query.append('asset', params.asset);
  if (params.source_ip) query.append('source_ip', params.source_ip);
  if (params.event_type) query.append('event_type', params.event_type);
  if (params.risk_min !== undefined) query.append('risk_min', params.risk_min.toString());
  if (params.risk_max !== undefined) query.append('risk_max', params.risk_max.toString());
  if (params.start_time) query.append('start_time', params.start_time);
  if (params.end_time) query.append('end_time', params.end_time);

  const res = await fetch(`${API_BASE_URL}/alerts?${query.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch submission history' }));
    throw new Error(errorData.detail || `Server returned status ${res.status}`);
  }

  return res.json();
}

export async function getAlertByIdApi(token: string, alertId: string): Promise<AlertRecord> {
  const res = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Alert not found' }));
    throw new Error(errorData.detail || `Server returned status ${res.status}`);
  }

  return res.json();
}

export interface TriggeredRule {
  rule_id: string;
  rule_name: string;
  rule_version: string;
  matched: boolean;
  severity: string;
  reason: string;
  evidence: Record<string, any>;
}

export interface ScoreContributor {
  name: string;
  category: string;
  weight: number;
  observed: any;
  reason: string;
  source?: string;
}

export interface RiskScoreData {
  score: number;
  confidence: number;
  false_positive_likelihood: number;
  version: string;
  disclaimer: string;
  contributors?: {
    risk_contributors?: ScoreContributor[];
    confidence_contributors?: ScoreContributor[];
    fp_contributors?: ScoreContributor[];
    score_disclaimer?: string;
  };
}

export interface AnomalyFeatureDetail {
  feature_name: string;
  baseline: number;
  observed: number;
  deviation: number;
  z_score: number;
  interpretation: string;
}

export interface AnomalyScoreData {
  score: number;
  status: string;
  version: string;
  summary: string;
  anomalous_features?: AnomalyFeatureDetail[];
  reasons?: Record<string, any>;
  disclaimer: string;
}

export interface AlertAnalysisRecord {
  id: string;
  alert_id: string;
  summary: string;
  findings?: {
    triage_status?: string;
    triggered_rules_count?: number;
    triggered_rules?: TriggeredRule[];
    threat_indicator_match?: Record<string, any>;
    triage_priority_input?: string;
    risk_score_id?: string;
    risk_score?: RiskScoreData;
    anomaly_score_id?: string;
    anomaly_score?: AnomalyScoreData;
  };
  analysis_metadata?: {
    triage_version?: string;
    context_enrichment?: Record<string, any>;
    processed_at?: string;
  };
  created_at: string;
}

export async function getAlertAnalysisApi(token: string, alertId: string): Promise<AlertAnalysisRecord> {
  const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/analysis`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch alert analysis' }));
    throw new Error(errorData.detail || `Server returned status ${res.status}`);
  }

  return res.json();
}

export async function reanalyzeAlertApi(token: string, alertId: string): Promise<AlertAnalysisRecord> {
  const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/reanalyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to reanalyze alert' }));
    throw new Error(errorData.detail || `Server returned status ${res.status}`);
  }

  return res.json();
}

export interface RelatedAlertRecord {
  id: string;
  alert_code: string;
  event_type: string;
  event_category: string;
  severity: string;
  status: string;
  timestamp: string;
  correlation_reason: string;
}

export interface AlertIncidentRelationship {
  id: string;
  incident_number: string;
  title: string;
  severity: string;
  risk_score: number;
  confidence_score: number;
  status: string;
  created_at: string;
}

export interface AlertTimelineEvent {
  event_type: string;
  description: string;
  timestamp: string;
  source?: string;
}

export async function getRelatedAlertsApi(token: string, alertId: string): Promise<RelatedAlertRecord[]> {
  const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/related`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getAlertIncidentRelationshipApi(token: string, alertId: string): Promise<AlertIncidentRelationship | null> {
  const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/incident`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getAlertTimelineApi(token: string, alertId: string): Promise<AlertTimelineEvent[]> {
  const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/timeline`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getAlertAiRecordApi(token: string, alertId: string): Promise<any | null> {
  const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/ai`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateAlertAiIntelligenceApi(token: string, alertId: string, forceRefresh = false): Promise<any> {
  const query = forceRefresh ? '?force_refresh=true' : '';
  const res = await fetch(`${API_BASE_URL}/ai/alerts/${alertId}/intelligence${query}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to generate AI intelligence' }));
    throw new Error(errorData.detail || `Server returned status ${res.status}`);
  }
  return res.json();
}

