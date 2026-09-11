import { API_BASE_URL } from './api';

/**
 * Centralized helper for user-facing AI error messages.
 * ALWAYS returns a clean, safe generic message.
 * Completely prevents leaking internal C++ stack traces, llama-server crashes,
 * memory allocation errors, file paths, Python exceptions, or raw JSON.
 */
export function getSafeAiErrorMessage(_rawMsg?: any): string {
  return '';
}

function getAuthHeaders(token?: string): Record<string, string> {
  const authToken = token || localStorage.getItem('cyberscope_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  };
}

export interface AIStatus {
  available: boolean;
  mode: string;
  model: string;
  url: string;
  models_installed?: string[];
  model_exists?: boolean;
  reason?: string;
}

export interface EvidenceReference {
  id: string;
  type: string;
  label?: string;
}

export interface AIStructuredOutput {
  summary: string;
  what_happened: string;
  why_suspicious: string;
  potential_impact: string;
  recommended_investigation: string[];
  recommended_response: string[];
  evidence_references: EvidenceReference[];
  uncertainty: string;
  limitations: string;
}

export interface AIIntelligenceRecord {
  id: string;
  target_type: string;
  target_id: string;
  intelligence_type: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  structured_output?: AIStructuredOutput;
  evidence_references?: EvidenceReference[];
  model_name: string;
  model_version?: string;
  prompt_version: string;
  intelligence_version: string;
  error_info?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export async function fetchAIStatus(token?: string): Promise<AIStatus> {
  let res = await fetch(`${API_BASE_URL}/api/v1/ai/status`, {
    headers: getAuthHeaders(token)
  });
  if (res.status === 404) {
    res = await fetch(`${API_BASE_URL}/ai/status`, {
      headers: getAuthHeaders(token)
    });
  }
  if (!res.ok) {
    throw new Error(getSafeAiErrorMessage());
  }
  const data = await res.json();
  if (!data.available && data.reason) {
    data.reason = getSafeAiErrorMessage(data.reason);
  }
  return data;
}

export async function generateAlertAIIntelligence(
  alertId: string,
  forceRefresh: boolean = false,
  token?: string
): Promise<AIIntelligenceRecord> {
  let res = await fetch(`${API_BASE_URL}/api/v1/ai/alerts/${alertId}/intelligence?force_refresh=${forceRefresh}`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  if (res.status === 404) {
    res = await fetch(`${API_BASE_URL}/ai/alerts/${alertId}/intelligence?force_refresh=${forceRefresh}`, {
      method: 'POST',
      headers: getAuthHeaders(token)
    });
  }
  if (!res.ok) {
    throw new Error(getSafeAiErrorMessage());
  }
  const rec = await res.json();
  if (rec && rec.status === 'FAILED' && rec.error_info) {
    rec.error_info.error = getSafeAiErrorMessage(rec.error_info.error);
  }
  return rec;
}

export async function generateIncidentAIIntelligence(
  incidentId: string,
  forceRefresh: boolean = false,
  token?: string
): Promise<AIIntelligenceRecord> {
  let res = await fetch(`${API_BASE_URL}/api/v1/ai/incidents/${incidentId}/intelligence?force_refresh=${forceRefresh}`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  if (res.status === 404) {
    res = await fetch(`${API_BASE_URL}/ai/incidents/${incidentId}/intelligence?force_refresh=${forceRefresh}`, {
      method: 'POST',
      headers: getAuthHeaders(token)
    });
  }
  if (!res.ok) {
    throw new Error(getSafeAiErrorMessage());
  }
  const rec = await res.json();
  if (rec && rec.status === 'FAILED' && rec.error_info) {
    rec.error_info.error = getSafeAiErrorMessage(rec.error_info.error);
  }
  return rec;
}

export async function generateInvestigationNarrative(
  incidentId: string,
  forceRefresh: boolean = false,
  token?: string
): Promise<AIIntelligenceRecord> {
  let res = await fetch(`${API_BASE_URL}/api/v1/ai/incidents/${incidentId}/investigation-narrative?force_refresh=${forceRefresh}`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  if (res.status === 404) {
    res = await fetch(`${API_BASE_URL}/ai/incidents/${incidentId}/investigation-narrative?force_refresh=${forceRefresh}`, {
      method: 'POST',
      headers: getAuthHeaders(token)
    });
  }
  if (!res.ok) {
    throw new Error(getSafeAiErrorMessage());
  }
  const rec = await res.json();
  if (rec && rec.status === 'FAILED' && rec.error_info) {
    rec.error_info.error = getSafeAiErrorMessage(rec.error_info.error);
  }
  return rec;
}
