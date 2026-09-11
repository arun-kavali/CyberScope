import { API_BASE_URL } from './api';

export interface AuditLogItem {
  id: string;
  actor_user_id?: string;
  actor_name?: string;
  role?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  reason?: string;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  audit_metadata?: Record<string, any>;
  timestamp: string;
}

export interface AuditLogListResponse {
  total: number;
  page: number;
  page_size: number;
  items: AuditLogItem[];
}

function getHeaders(token?: string): HeadersInit {
  const authToken = token || localStorage.getItem('cyberscope_token') || localStorage.getItem('token') || '';
  return {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };
}

export async function getAuditLogsApi(params?: {
  page?: number;
  page_size?: number;
  action?: string;
  target_type?: string;
}, token?: string): Promise<AuditLogListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.page_size) queryParams.set('page_size', params.page_size.toString());
  if (params?.action) queryParams.set('action', params.action);
  if (params?.target_type) queryParams.set('target_type', params.target_type);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  let res = await fetch(`${API_BASE_URL}/api/v1/audit${queryString}`, {
    headers: getHeaders(token),
  });
  if (res.status === 404) {
    res = await fetch(`${API_BASE_URL}/audit${queryString}`, {
      headers: getHeaders(token),
    });
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch audit logs: ${res.statusText}`);
  }
  return res.json();
}
