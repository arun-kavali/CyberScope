import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Database, CheckCircle2, RefreshCw, Zap, Plus, Upload, Check, AlertTriangle, ArrowRight, FileSpreadsheet, Server } from 'lucide-react';
import {
  getSourcesApi,
  uploadCsvSourceApi,
  uploadJsonSourceApi,
  uploadExcelSourceApi,
  connectDatabaseSourceApi,
  validateSourceDataApi,
  importSourceDataApi,
  DataSourceItem,
  SchemaDiscoveryResponse,
  ValidationResponse,
  ImportResponse
} from '../services/sourcesApi';

const CANONICAL_TARGET_FIELDS = [
  { key: 'event_type', label: 'Event Type (Required)', required: true },
  { key: 'severity', label: 'Severity (LOW/MED/HIGH/CRIT)', required: true },
  { key: 'event_category', label: 'Event Category' },
  { key: 'description', label: 'Description / Summary' },
  { key: 'source_ip', label: 'Source IP' },
  { key: 'destination_ip', label: 'Destination IP' },
  { key: 'user_id', label: 'User / Identity' },
  { key: 'asset_id', label: 'Asset / Host' },
  { key: 'indicator', label: 'Indicator' },
  { key: 'technique', label: 'ATT&CK Technique' },
  { key: 'timestamp', label: 'Timestamp' }
];

export const DataSourcesPage: React.FC = () => {
  const [activeSources, setActiveSources] = useState<DataSourceItem[]>([]);
  const [showWizard, setShowWizard] = useState(false);

  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [sourceType, setSourceType] = useState<string>('CSV');
  const [sourceName, setSourceName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Connection config for DB/REST
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('cyberscope');
  const [tableName, setTableName] = useState('alerts');
  const [dbUser, setDbUser] = useState('postgres');
  const [dbPass, setDbPass] = useState('');
  const [restUrl, setRestUrl] = useState('https://api.securityprovider.com/v1/alerts');

  // Discovery, Mapping, Validation, Import results
  const [discovery, setDiscovery] = useState<SchemaDiscoveryResponse | null>(null);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [validationRes, setValidationRes] = useState<ValidationResponse | null>(null);
  const [importRes, setImportRes] = useState<ImportResponse | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const staticConnectors = [
    { name: 'Active Directory Domain Controller', category: 'AUTHENTICATION', eps: '142 EPS', status: 'healthy' as const, latency: '42ms', format: 'Kerberos / NTLM Syslog' },
    { name: 'CrowdStrike Falcon EDR', category: 'ENDPOINT', eps: '480 EPS', status: 'healthy' as const, latency: '18ms', format: 'JSON Webhook API' },
    { name: 'Palo Alto Enterprise Firewall', category: 'NETWORK', eps: '1,250 EPS', status: 'healthy' as const, latency: '12ms', format: 'CEF / Syslog' },
    { name: 'PostgreSQL Core Audit Log', category: 'DATABASE', eps: '65 EPS', status: 'healthy' as const, latency: '5ms', format: 'pgaudit Stream' },
    { name: 'Microsoft Defender 365 Email', category: 'EMAIL', eps: '95 EPS', status: 'healthy' as const, latency: '120ms', format: 'Graph Security API' },
    { name: 'CyberScope Synthetic Generator', category: 'SIMULATOR', eps: 'Manual / Batch', status: 'healthy' as const, latency: '<1ms', format: 'Canonical JSON' },
  ];

  const fetchSources = async () => {
    try {
      const data = await getSourcesApi();
      setActiveSources(data);
    } catch (err) {
      console.error('Failed to load sources', err);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleStartWizard = () => {
    setShowWizard(true);
    setStep(1);
    setSourceType('CSV');
    setSourceName('');
    setSelectedFile(null);
    setDiscovery(null);
    setFieldMappings({});
    setValidationRes(null);
    setImportRes(null);
    setWizardError(null);
  };

  const handleRunDiscovery = async () => {
    setIsProcessing(true);
    setWizardError(null);
    try {
      let res: SchemaDiscoveryResponse;
      if (['CSV', 'JSON', 'XLS', 'XLSX'].includes(sourceType)) {
        if (!selectedFile) throw new Error('Please select a file to upload');
        const nameToUse = sourceName || selectedFile.name;
        if (sourceType === 'CSV') res = await uploadCsvSourceApi(selectedFile, nameToUse);
        else if (sourceType === 'JSON') res = await uploadJsonSourceApi(selectedFile, nameToUse);
        else res = await uploadExcelSourceApi(selectedFile, nameToUse);
      } else {
        const nameToUse = sourceName || `${sourceType} Source`;
        let config: Record<string, any> = {};
        if (['POSTGRESQL', 'MYSQL'].includes(sourceType)) {
          config = { host, port: parseInt(port), database, table_name: tableName, user: dbUser, password: dbPass };
        } else if (sourceType === 'MONGODB') {
          config = { connection_string: `mongodb://${host}:${port}`, database, collection: tableName };
        } else if (sourceType === 'SUPABASE') {
          config = { project_url: restUrl, table_name: tableName, api_key: dbPass };
        } else if (sourceType === 'REST') {
          config = { url: restUrl, method: 'GET', auth_token: dbPass };
        }
        res = await connectDatabaseSourceApi({ name: nameToUse, type: sourceType, connection_config: config });
      }

      setDiscovery(res);
      // Auto-suggest mapping
      const initialMap: Record<string, string> = {};
      res.fields.forEach(f => {
        const lower = f.field_name.toLowerCase();
        for (const target of CANONICAL_TARGET_FIELDS) {
          if (lower === target.key || lower.includes(target.key)) {
            initialMap[f.field_name] = target.key;
            break;
          }
        }
      });
      setFieldMappings(initialMap);
      setStep(3);
    } catch (err: any) {
      setWizardError(err.message || 'Discovery failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunValidation = async () => {
    setIsProcessing(true);
    setWizardError(null);
    try {
      const res = await validateSourceDataApi({
        data_source_id: discovery?.data_source_id,
        source_type: sourceType,
        field_mappings: fieldMappings,
      });
      setValidationRes(res);
      setStep(5);
    } catch (err: any) {
      setWizardError(err.message || 'Validation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = async () => {
    setIsProcessing(true);
    setWizardError(null);
    try {
      const res = await importSourceDataApi({
        data_source_id: discovery?.data_source_id,
        source_type: sourceType,
        field_mappings: fieldMappings,
      });
      setImportRes(res);
      setStep(7);
      fetchSources();
    } catch (err: any) {
      setWizardError(err.message || 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Data Source Center & Import Pipeline"
        subtitle="Active security telemetry streams, multi-format import wizard, canonical schema parsers, and connection health"
        phaseBadge="Phase 21 Active"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Data Sources' }]}
        actions={
          <div className="flex space-x-2">
            <button
              onClick={handleStartWizard}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 bg-emerald-700 text-white font-semibold rounded hover:bg-emerald-800 transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Import Data Source</span>
            </button>
            <button
              onClick={fetchSources}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 bg-brand-900 text-white font-semibold rounded hover:bg-brand-950 transition-colors shadow-2xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Poll Connector Health</span>
            </button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card title="Ingestion Throughput" subtitle="Aggregated Realtime Metrics">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">2,032 EPS</div>
              <div className="text-[11px] text-slate-500 font-medium">Aggregated Events Per Second</div>
            </div>
            <div className="p-2 bg-brand-50 text-brand-700 rounded-lg">
              <Zap className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card title="Active Connectors" subtitle="Configured Ingestion Pipelines">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                {6 + activeSources.length} Active
              </div>
              <div className="text-[11px] text-emerald-700 font-bold">100% Operational Health</div>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card title="Canonical Normalization" subtitle="CyberScope Ingestion Schema">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">v1.4 Schema</div>
              <div className="text-[11px] text-slate-500 font-medium">Phase 7 Pipeline Integrated</div>
            </div>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Database className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Import Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Wizard Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold">Data Source Import Pipeline Wizard</h3>
                <p className="text-[11px] text-slate-400">
                  Step {step} of 7 — {step === 1 ? 'Source Selection' : step === 2 ? 'Connect & Upload' : step === 3 ? 'Schema Discovery' : step === 4 ? 'Field Mapping' : step === 5 ? 'Validation' : step === 6 ? 'Import Execution' : 'Result'}
                </p>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="text-slate-400 hover:text-white font-bold text-lg px-2"
              >
                ×
              </button>
            </div>

            {/* Error banner */}
            {wizardError && (
              <div className="bg-rose-50 border-b border-rose-200 p-3 text-xs text-rose-800 flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{wizardError}</span>
              </div>
            )}

            {/* Wizard Body */}
            <div className="p-5 overflow-y-auto flex-1 text-xs space-y-4">
              {/* Step 1: Select Source Type */}
              {step === 1 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs">Select Data Source Type</h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    {['CSV', 'JSON', 'XLS', 'XLSX', 'POSTGRESQL', 'MYSQL', 'MONGODB', 'SUPABASE', 'REST'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setSourceType(t)}
                        className={`p-3 rounded-lg border text-left flex flex-col space-y-1 transition-all ${
                          sourceType === t
                            ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 text-slate-900'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{t}</span>
                          {['CSV', 'JSON', 'XLS', 'XLSX'].includes(t) ? (
                            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                          ) : (
                            <Server className="h-4 w-4 text-brand-800" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {['CSV', 'JSON', 'XLS', 'XLSX'].includes(t) ? 'File Upload Import' : 'Database / API Connector'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Data Source Name (Optional)</label>
                    <input
                      type="text"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder={`e.g. ${sourceType} Production Telemetry`}
                      className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Upload File / Connection Config */}
              {step === 2 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs">Configure {sourceType} Connection</h4>
                  {['CSV', 'JSON', 'XLS', 'XLSX'].includes(sourceType) ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-600 transition-colors">
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700 mb-1">Select {sourceType} File to Upload</p>
                      <input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-600"
                      />
                      {selectedFile && (
                        <p className="mt-2 font-bold text-emerald-700 text-xs">Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {['POSTGRESQL', 'MYSQL', 'MONGODB'].includes(sourceType) && (
                        <>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Host</label>
                            <input type="text" value={host} onChange={(e) => setHost(e.target.value)} className="w-full p-2 border rounded" />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Port</label>
                            <input type="text" value={port} onChange={(e) => setPort(e.target.value)} className="w-full p-2 border rounded" />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Database</label>
                            <input type="text" value={database} onChange={(e) => setDatabase(e.target.value)} className="w-full p-2 border rounded" />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Table / Collection</label>
                            <input type="text" value={tableName} onChange={(e) => setTableName(e.target.value)} className="w-full p-2 border rounded" />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Database User</label>
                            <input type="text" value={dbUser} onChange={(e) => setDbUser(e.target.value)} className="w-full p-2 border rounded" />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Database Password</label>
                            <input type="password" value={dbPass} onChange={(e) => setDbPass(e.target.value)} className="w-full p-2 border rounded" />
                          </div>
                        </>
                      )}

                      {['SUPABASE', 'REST'].includes(sourceType) && (
                        <div className="col-span-2">
                          <label className="block font-bold text-slate-700 mb-1">Endpoint / Project URL</label>
                          <input type="text" value={restUrl} onChange={(e) => setRestUrl(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 & 4: Schema Discovery & Field Mapping */}
              {step === 3 && discovery && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-900">Discovered Schema: </span>
                      <span className="font-mono text-emerald-700 font-semibold">{discovery.total_fields} fields found</span>
                    </div>
                    <span className="font-mono text-slate-500">{discovery.estimated_records} estimated records</span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-xs">Field Mapping (Source Field → CyberScope Canonical Field)</h4>
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b text-slate-700 font-bold uppercase text-[10px]">
                          <th className="py-2 px-3">Discovered Field</th>
                          <th className="py-2 px-3">Inferred Type</th>
                          <th className="py-2 px-3">Sample Value</th>
                          <th className="py-2 px-3">Maps To CyberScope Canonical Field</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {discovery.fields.map((f) => (
                          <tr key={f.field_name} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900 font-mono">{f.field_name}</td>
                            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{f.detected_type}</td>
                            <td className="py-2 px-3 text-slate-500 font-mono text-[11px] truncate max-w-[150px]">
                              {f.sample_values?.[0] !== undefined ? String(f.sample_values[0]) : '-'}
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={fieldMappings[f.field_name] || ''}
                                onChange={(e) => setFieldMappings({ ...fieldMappings, [f.field_name]: e.target.value })}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-600 bg-white"
                              >
                                <option value="">-- Ignore Field --</option>
                                {CANONICAL_TARGET_FIELDS.map((t) => (
                                  <option key={t.key} value={t.key}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 5: Validation Results */}
              {step === 5 && validationRes && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs">Validation Check Results</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-center">
                      <div className="text-xl font-bold text-emerald-800 font-mono">{validationRes.valid_count}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">Valid Records Ready for Import</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-center">
                      <div className="text-xl font-bold text-amber-800 font-mono">{validationRes.invalid_count}</div>
                      <div className="text-[11px] text-amber-700 font-semibold">Invalid / Warning Records</div>
                    </div>
                  </div>

                  {validationRes.warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-1">
                      <div className="font-bold text-amber-900 text-[11px]">Validation Warnings:</div>
                      {validationRes.warnings.map((w, idx) => (
                        <div key={idx} className="text-amber-800 text-[11px]">• {w}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 7: Completion Summary */}
              {step === 7 && importRes && (
                <div className="space-y-4 text-center py-4">
                  <div className="inline-flex p-3 bg-emerald-100 text-emerald-700 rounded-full mb-2">
                    <Check className="h-8 w-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Data Source Import Pipeline Completed</h4>
                  <p className="text-xs text-slate-600">
                    Import Status: <span className="font-bold text-emerald-700 font-mono">{importRes.status}</span>
                  </p>

                  <div className="grid grid-cols-4 gap-2 border rounded-lg p-3 bg-slate-50 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 font-mono text-base">{importRes.total_records}</div>
                      <div className="text-[10px] text-slate-500">Total Records</div>
                    </div>
                    <div>
                      <div className="font-bold text-emerald-700 font-mono text-base">{importRes.imported_records}</div>
                      <div className="text-[10px] text-slate-500">Imported & Normalized</div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-600 font-mono text-base">{importRes.skipped_records}</div>
                      <div className="text-[10px] text-slate-500">Duplicates Skipped</div>
                    </div>
                    <div>
                      <div className="font-bold text-amber-700 font-mono text-base">{importRes.invalid_records}</div>
                      <div className="text-[10px] text-slate-500">Invalid Records</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Controls */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              {step > 1 && step < 7 ? (
                <button
                  onClick={() => setStep(step === 5 ? 3 : step - 1)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 font-semibold hover:bg-slate-100"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step === 1 && (
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center space-x-1 px-4 py-2 bg-emerald-700 text-white font-bold rounded hover:bg-emerald-800"
                >
                  <span>Next: Configure Connection</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {step === 2 && (
                <button
                  onClick={handleRunDiscovery}
                  disabled={isProcessing}
                  className="flex items-center space-x-1 px-4 py-2 bg-emerald-700 text-white font-bold rounded hover:bg-emerald-800 disabled:opacity-50"
                >
                  <span>{isProcessing ? 'Discovering Schema...' : 'Run Schema Discovery'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {step === 3 && (
                <button
                  onClick={handleRunValidation}
                  disabled={isProcessing}
                  className="flex items-center space-x-1 px-4 py-2 bg-emerald-700 text-white font-bold rounded hover:bg-emerald-800 disabled:opacity-50"
                >
                  <span>{isProcessing ? 'Validating...' : 'Validate Mapped Records'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {step === 5 && (
                <button
                  onClick={handleExecuteImport}
                  disabled={isProcessing}
                  className="flex items-center space-x-1 px-4 py-2 bg-brand-900 text-white font-bold rounded hover:bg-brand-950 disabled:opacity-50"
                >
                  <span>{isProcessing ? 'Importing & Normalizing...' : 'Execute Import Pipeline'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {step === 7 && (
                <button
                  onClick={() => setShowWizard(false)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded hover:bg-slate-950"
                >
                  Close Wizard
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Ingestion Telemetry Connectors Table */}
      <Card title="Active Ingestion Telemetry Connectors" subtitle="Configured log streams, raw to canonical mapping, and latency" headerStyle="green">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Connector Name</th>
                <th className="py-2.5 px-3">Category / Type</th>
                <th className="py-2.5 px-3">Format / Transport</th>
                <th className="py-2.5 px-3">Volume</th>
                <th className="py-2.5 px-3">Ingest Latency</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
              {activeSources.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors bg-emerald-50/20">
                  <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center space-x-1.5">
                    <Database className="h-3.5 w-3.5 text-emerald-700" />
                    <span>{s.name}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-brand-900">{s.type}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">Import Pipeline Connector</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">Imported</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">&lt;1ms (Pipeline)</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status="healthy" label={s.status} />
                  </td>
                </tr>
              ))}
              {staticConnectors.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{c.name}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-brand-900">{c.category}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{c.format}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{c.eps}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">{c.latency}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={c.status} label="Healthy" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
