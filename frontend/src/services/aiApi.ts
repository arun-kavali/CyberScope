import { API_BASE_URL } from './api';

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
  const res = await fetch(`${API_BASE_URL}/ai/status`, {
    headers: getAuthHeaders(token)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch AI status' }));
    throw new Error(errorData.detail || `AI status check failed with status ${res.status}`);
  }
  return res.json();
}

export async function generateAlertAIIntelligence(
  alertId: string,
  forceRefresh: boolean = false,
  token?: string
): Promise<AIIntelligenceRecord> {
  const res = await fetch(`${API_BASE_URL}/ai/alerts/${alertId}/intelligence?force_refresh=${forceRefresh}`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to generate alert AI intelligence' }));
    throw new Error(errorData.detail || `Alert AI intelligence failed with status ${res.status}`);
  }
  return res.json();
}

export async function generateIncidentAIIntelligence(
  incidentId: string,
  forceRefresh: boolean = false,
  token?: string
): Promise<AIIntelligenceRecord> {
  const res = await fetch(`${API_BASE_URL}/ai/incidents/${incidentId}/intelligence?force_refresh=${forceRefresh}`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to generate incident AI intelligence' }));
    throw new Error(errorData.detail || `Incident AI intelligence failed with status ${res.status}`);
  }
  return res.json();
}

export async function generateInvestigationNarrative(
  incidentId: string,
  forceRefresh: boolean = false,
  token?: string
): Promise<AIIntelligenceRecord> {
  const res = await fetch(`${API_BASE_URL}/ai/incidents/${incidentId}/investigation-narrative?force_refresh=${forceRefresh}`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to generate investigation narrative' }));
    throw new Error(errorData.detail || `Investigation narrative failed with status ${res.status}`);
  }
  return res.json();
}
