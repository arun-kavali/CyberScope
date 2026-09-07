import { DashboardSummaryResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchDashboardSummary(token: string): Promise<DashboardSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/summary`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch dashboard summary metrics.');
  }

  return response.json();
}
