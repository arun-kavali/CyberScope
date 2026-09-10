import { DashboardSummaryResponse } from '../types';
import { API_BASE_URL } from './api';

export async function fetchDashboardSummary(token?: string, demoMode?: boolean): Promise<DashboardSummaryResponse> {
  const authToken = token || localStorage.getItem('cyberscope_token') || localStorage.getItem('token') || '';
  const headers: HeadersInit = {
    'Accept': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const query = demoMode ? '?demo_mode=true' : '';
  // Primary canonical API route: /api/v1/dashboard/summary
  let response = await fetch(`${API_BASE_URL}/api/v1/dashboard/summary${query}`, { headers });
  
  // Fallback to /dashboard/summary if root route is used
  if (response.status === 404) {
    response = await fetch(`${API_BASE_URL}/dashboard/summary${query}`, { headers });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch dashboard summary metrics (HTTP ${response.status}).`);
  }

  return response.json();
}
