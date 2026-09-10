import { API_BASE_URL } from './api';

const API_BASE = `${API_BASE_URL}/api/v1/sources`;

export interface DataSourceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  records_count?: number;
  connection_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DiscoveredField {
  field_name: string;
  detected_type: string;
  nullable: boolean;
  sample_values: any[];
  confidence: number;
}

export interface SchemaDiscoveryResponse {
  data_source_id?: string;
  source_type: string;
  total_fields: number;
  fields: DiscoveredField[];
  preview_rows: Record<string, any>[];
  estimated_records: number;
}

export interface ValidationResponse {
  data_source_id?: string;
  valid_count: number;
  invalid_count: number;
  warnings: string[];
  errors: string[];
  sample_invalid_records: Record<string, any>[];
}

export interface ImportResponse {
  data_source_id?: string;
  status: string;
  total_records: number;
  imported_records: number;
  skipped_records: number;
  invalid_records: number;
  duplicate_records: number;
  errors: string[];
}

function getHeaders(authToken?: string): HeadersInit {
  const token = authToken || localStorage.getItem('cyberscope_token') || '';
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function getSourcesApi(): Promise<DataSourceItem[]> {
  const res = await fetch(API_BASE, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch data sources: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadCsvSourceApi(file: File, name?: string): Promise<SchemaDiscoveryResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const res = await fetch(`${API_BASE}/csv`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'CSV upload failed');
  }
  return res.json();
}

export async function uploadJsonSourceApi(file: File, name?: string): Promise<SchemaDiscoveryResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const res = await fetch(`${API_BASE}/json`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'JSON upload failed');
  }
  return res.json();
}

export async function uploadExcelSourceApi(file: File, name?: string): Promise<SchemaDiscoveryResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const res = await fetch(`${API_BASE}/excel`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Excel upload failed');
  }
  return res.json();
}

export async function connectDatabaseSourceApi(payload: {
  name: string;
  type: string;
  connection_config?: Record<string, any>;
}): Promise<SchemaDiscoveryResponse> {
  const res = await fetch(`${API_BASE}/database`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Database connection failed');
  }
  return res.json();
}

export async function mapSourceSchemaApi(payload: {
  data_source_id: string;
  field_mappings: Record<string, string>;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/map-schema`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Field mapping failed');
  }
  return res.json();
}

export async function validateSourceDataApi(payload: {
  data_source_id?: string;
  source_type?: string;
  field_mappings: Record<string, string>;
  connection_config?: Record<string, any>;
}): Promise<ValidationResponse> {
  const res = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Data validation failed');
  }
  return res.json();
}

export async function importSourceDataApi(payload: {
  data_source_id?: string;
  source_type?: string;
  field_mappings: Record<string, string>;
  connection_config?: Record<string, any>;
}): Promise<ImportResponse> {
  const res = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Data import failed');
  }
  return res.json();
}

export async function testSourceConnectionApi(sourceId: string): Promise<{
  data_source_id: string;
  success: boolean;
  status: string;
  message: string;
  latency_ms?: number;
}> {
  const res = await fetch(`${API_BASE}/${sourceId}/test`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Test connection failed');
  }
  return res.json();
}

export async function refreshSourceSchemaApi(sourceId: string): Promise<SchemaDiscoveryResponse> {
  const res = await fetch(`${API_BASE}/${sourceId}/schema/refresh`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Schema refresh failed');
  }
  return res.json();
}

export async function previewSourceDataApi(sourceId: string, limit: number = 20): Promise<{
  data_source_id: string;
  columns: string[];
  records: Record<string, any>[];
  total_rows: number;
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/${sourceId}/preview?limit=${limit}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Preview data failed');
  }
  return res.json();
}

export async function syncSourceDataApi(sourceId: string): Promise<ImportResponse> {
  const res = await fetch(`${API_BASE}/${sourceId}/sync`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Sync failed');
  }
  return res.json();
}

export async function disconnectSourceApi(sourceId: string): Promise<DataSourceItem> {
  const res = await fetch(`${API_BASE}/${sourceId}/disconnect`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Disconnect failed');
  }
  return res.json();
}
