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
  const url = new URL(`${API_BASE_URL}/audit`);
  if (params?.page) url.searchParams.set('page', params.page.toString());
  if (params?.page_size) url.searchParams.set('page_size', params.page_size.toString());
  if (params?.action) url.searchParams.set('action', params.action);
  if (params?.target_type) url.searchParams.set('target_type', params.target_type);

  const res = await fetch(url.toString(), {
    headers: getHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit logs: ${res.statusText}`);
  }
  return res.json();
}
