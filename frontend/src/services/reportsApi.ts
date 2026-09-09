import { API_BASE_URL } from './api';

export interface ReportItem {
  id: string;
  report_number: string;
  title: string;
  report_type: string;
  format: string;
  generated_by?: string;
  created_at: string;
  content_summary?: Record<string, any>;
  file_path?: string;
}

export interface PaginatedReportsResponse {
  items: ReportItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ReportGenerateRequest {
  report_type: string;
  title?: string;
  format: string;
}

function getAuthHeaders(token?: string): HeadersInit {
  const authToken = token || localStorage.getItem('cyberscope_token') || localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };
}

export const reportsApi = {
  getReports: async (page = 1, pageSize = 20, reportType?: string, token?: string): Promise<PaginatedReportsResponse> => {
    const url = new URL(`${API_BASE_URL}/reports`);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('page_size', pageSize.toString());
    if (reportType) url.searchParams.set('report_type', reportType);

    const res = await fetch(url.toString(), {
      headers: getAuthHeaders(token),
    });
    if (!res.ok) throw new Error(`Failed to load reports: ${res.statusText}`);
    return res.json();
  },

  generateReport: async (req: ReportGenerateRequest, token?: string): Promise<ReportItem> => {
    const res = await fetch(`${API_BASE_URL}/reports/generate`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`Failed to generate report: ${res.statusText}`);
    return res.json();
  },

  downloadReport: async (reportId: string, filename: string, token?: string): Promise<void> => {
    const authToken = token || localStorage.getItem('cyberscope_token') || localStorage.getItem('token') || '';
    const res = await fetch(`${API_BASE_URL}/reports/${reportId}/download`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!res.ok) throw new Error(`Failed to download report: ${res.statusText}`);

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
