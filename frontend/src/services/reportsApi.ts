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
    const query = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (reportType) query.set('report_type', reportType);

    let res = await fetch(`${API_BASE_URL}/api/v1/reports?${query.toString()}`, {
      headers: getAuthHeaders(token),
    });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/reports?${query.toString()}`, {
        headers: getAuthHeaders(token),
      });
    }
    if (!res.ok) throw new Error(`Failed to load reports: ${res.statusText}`);
    return res.json();
  },

  generateReport: async (req: ReportGenerateRequest, token?: string): Promise<ReportItem> => {
    let res = await fetch(`${API_BASE_URL}/api/v1/reports/generate`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(req),
    });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(req),
      });
    }
    if (!res.ok) throw new Error(`Failed to generate report: ${res.statusText}`);
    return res.json();
  },

  downloadReport: async (reportId: string, filename: string, token?: string): Promise<void> => {
    const authToken = token || localStorage.getItem('cyberscope_token') || localStorage.getItem('token') || '';
    let res = await fetch(`${API_BASE_URL}/api/v1/reports/${reportId}/download`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/reports/${reportId}/download`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    }
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
