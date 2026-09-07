const API_BASE = '/api/v1/response';

export interface ResponsePolicyItem {
  id: string;
  policy_id_code: string;
  policy_name: string;
  conditions?: Record<string, any>;
  action: string;
  enabled: boolean;
  requires_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResponseActionItem {
  id: string;
  action_type: string;
  policy_id?: string;
  policy_id_code?: string;
  target_entity_type: string;
  target_entity_id: string;
  status: string;
  requested_by?: string;
  approved_by?: string;
  execution_payload?: Record<string, any>;
  executed_at?: string;
  created_at: string;
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('cyberscope_token') || localStorage.getItem('token') || '';
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function getResponsePoliciesApi(): Promise<ResponsePolicyItem[]> {
  const res = await fetch(`${API_BASE}/policies`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch response policies: ${res.statusText}`);
  }
  return res.json();
}

export async function getResponseActionsApi(): Promise<ResponseActionItem[]> {
  const res = await fetch(`${API_BASE}/actions`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch response actions: ${res.statusText}`);
  }
  return res.json();
}

export async function createResponseActionApi(payload: {
  action_type: string;
  target_entity_type: string;
  target_entity_id: string;
  policy_id?: string;
  reason?: string;
}): Promise<ResponseActionItem> {
  const res = await fetch(`${API_BASE}/actions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to create response action');
  }
  return res.json();
}

export async function approveResponseActionApi(id: string, reason?: string): Promise<ResponseActionItem> {
  const res = await fetch(`${API_BASE}/actions/${id}/approve`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason: reason || 'Approved by analyst' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to approve response action');
  }
  return res.json();
}

export async function rejectResponseActionApi(id: string, reason: string): Promise<ResponseActionItem> {
  const res = await fetch(`${API_BASE}/actions/${id}/reject`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to reject response action');
  }
  return res.json();
}

export async function rollbackResponseActionApi(id: string, reason?: string): Promise<ResponseActionItem> {
  const res = await fetch(`${API_BASE}/actions/${id}/rollback`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason: reason || 'Rollback requested by analyst' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to rollback response action');
  }
  return res.json();
}
