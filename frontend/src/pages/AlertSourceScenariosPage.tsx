import React, { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { 
  RefreshCw, 
  CheckCircle2, 
  Play, 
  Send, 
  ChevronDown, 
  ChevronRight,
  Shield,
  Sliders
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { 
  generateScenarioPreviewApi, 
  submitBatchAlertsApi, 
  ScenarioPreviewResponse, 
  AlertBatchResponse,
  AlertCreatePayload
} from '../services/alertsApi';

const EXACT_SCENARIO_CATEGORIES: Record<string, string[]> = {
  AUTHENTICATION: [
    'Brute Force',
    'Credential Stuffing',
    'Impossible Travel',
    'Suspicious Login',
    'Privileged Login',
    'MFA Abuse'
  ],
  ENDPOINT: [
    'Malware Detection',
    'Suspicious PowerShell',
    'Suspicious Process',
    'Ransomware Behavior',
    'Privilege Escalation'
  ],
  NETWORK: [
    'Port Scan',
    'Command-and-Control Activity',
    'Data Exfiltration',
    'Suspicious DNS',
    'Unusual Network Connection'
  ],
  DATABASE: [
    'Unusual Query',
    'Bulk Data Read',
    'Privilege Abuse',
    'Suspicious Database Login'
  ],
  EMAIL: [
    'Phishing',
    'Malicious Attachment',
    'Suspicious Link'
  ]
};

const GENERATION_MODES = [
  'SINGLE ALERT',
  'MULTI-ALERT SEQUENCE',
  'HIGH-VOLUME BURST',
  'REPEATED EVENTS'
];

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const INTENTS = ['Suspicious', 'Benign / False Positive'];

export const AlertSourceScenariosPage: React.FC = () => {
  const { token } = useAuth();

  const [category, setCategory] = useState<string>('AUTHENTICATION');
  const [scenarioName, setScenarioName] = useState<string>('Brute Force');
  const [generationMode, setGenerationMode] = useState<string>('MULTI-ALERT SEQUENCE');
  const [severity, setSeverity] = useState<string>('HIGH');
  const [intent, setIntent] = useState<string>('Suspicious');
  const [quantity, setQuantity] = useState<number>(5);

  // Custom scenario parameter states
  const [paramUser, setParamUser] = useState<string>('usr_jdoe');
  const [paramSourceIp, setParamSourceIp] = useState<string>('203.0.113.45');
  const [paramDestIp, setParamDestIp] = useState<string>('10.0.1.10');
  const [paramProcess, setParamProcess] = useState<string>('powershell.exe');
  const [paramQuery, setParamQuery] = useState<string>('SELECT * FROM users_credentials;');
  const [paramReadVolume, setParamReadVolume] = useState<number>(50000);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewResponse, setPreviewResponse] = useState<ScenarioPreviewResponse | null>(null);
  const [batchResponse, setBatchResponse] = useState<AlertBatchResponse | null>(null);
  const [expandedPayloadIndex, setExpandedPayloadIndex] = useState<number | null>(null);

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const availableScenarios = EXACT_SCENARIO_CATEGORIES[newCat] || [];
    if (availableScenarios.length > 0) {
      setScenarioName(availableScenarios[0]);
    }
  };

  const handleGeneratePreview = async () => {
    if (!token) return;
    setError(null);
    setIsGenerating(true);
    setBatchResponse(null);

    const customParams: Record<string, any> = {};
    if (category === 'AUTHENTICATION') {
      customParams.user = paramUser;
      customParams.source_ip = paramSourceIp;
      customParams.attempt_count = quantity * 3;
    } else if (category === 'ENDPOINT') {
      customParams.user = paramUser;
      customParams.process = paramProcess;
    } else if (category === 'NETWORK') {
      customParams.source_ip = paramSourceIp;
      customParams.destination_ip = paramDestIp;
    } else if (category === 'DATABASE') {
      customParams.user = paramUser;
      customParams.query = paramQuery;
      customParams.read_volume = paramReadVolume;
    } else if (category === 'EMAIL') {
      customParams.user = paramUser;
    }

    try {
      const res = await generateScenarioPreviewApi(token, {
        category,
        scenario_name: scenarioName,
        generation_mode: generationMode,
        severity,
        intent,
        quantity,
        custom_params: customParams,
      });
      setPreviewResponse(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate scenario preview.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitBatch = async () => {
    if (!token || !previewResponse || previewResponse.alerts.length === 0) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const alertsToSubmit: AlertCreatePayload[] = previewResponse.alerts.map((a) => ({
        event_type: a.event_type,
        event_category: a.event_category,
        severity: a.severity,
        status: a.status || 'NEW',
        timestamp: a.timestamp,
        user_context: a.user_context,
        asset_context: a.asset_context,
        source_ip: a.source_ip,
        destination_ip: a.destination_ip,
        source_port: a.source_port,
        destination_port: a.destination_port,
        protocol: a.protocol,
        action: a.action,
        description: a.description,
        indicator: a.indicator,
        technique: a.technique,
        raw_payload: a.raw_payload,
        alert_metadata: a.alert_metadata,
      }));

      const res = await submitBatchAlertsApi(token, alertsToSubmit);
      setBatchResponse(res);
    } catch (err: any) {
      setError(err.message || 'Failed to submit batch alerts to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Synthetic Scenario Generator"
        subtitle="Pre-configured multi-stage threat scenario selection, preview, and batch ingestion"
        phaseBadge="Phase 6 Ingestion Active"
        breadcrumbs={[{ label: 'Alert Source' }, { label: 'Scenario Generator' }]}
      />

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {batchResponse && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-emerald-900 shadow-sm flex items-start space-x-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-emerald-950">
              Batch Ingestion Successful!
            </h4>
            <p className="text-xs text-emerald-800">
              Ingested <strong className="text-emerald-950">{batchResponse.accepted_count}</strong> synthetic alerts into PostgreSQL.
            </p>
          </div>
        </div>
      )}

      {/* Scenario Configuration Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Category & Scenario Selector */}
        <Card title="1. Category & Predefined Scenario" className="lg:col-span-1">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <div className="space-y-1">
                {Object.keys(EXACT_SCENARIO_CATEGORIES).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-between ${
                      category === cat
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-surface-subtle hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] font-mono opacity-80">
                      {EXACT_SCENARIO_CATEGORIES[cat].length} scenarios
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Predefined Scenario
              </label>
              <div className="space-y-1">
                {(EXACT_SCENARIO_CATEGORIES[category] || []).map((scen) => (
                  <button
                    key={scen}
                    type="button"
                    onClick={() => setScenarioName(scen)}
                    className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center space-x-2 ${
                      scenarioName === scen
                        ? 'bg-emerald-50 text-emerald-950 font-semibold border-l-4 border-emerald-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{scen}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column: Generation Controls & Dynamic Parameters */}
        <Card title="2. Scenario Configuration & Mode Parameters" className="lg:col-span-2">
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Generation Mode
                </label>
                <select
                  value={generationMode}
                  onChange={(e) => setGenerationMode(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {GENERATION_MODES.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {SEVERITIES.map((sev) => (
                    <option key={sev} value={sev}>{sev}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Scenario Intent
                </label>
                <select
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {INTENTS.map((int) => (
                    <option key={int} value={int}>{int}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Quantity (Max 100)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Dynamic Relevant Scenario Parameters */}
            <div className="p-4 bg-surface-subtle rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 border-b border-slate-200 pb-2">
                <Sliders className="h-4 w-4 text-brand-600" />
                <span>Relevant Parameters for {category} ({scenarioName})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {category === 'AUTHENTICATION' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">Target User</label>
                      <input
                        type="text"
                        value={paramUser}
                        onChange={(e) => setParamUser(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">Source IP</label>
                      <input
                        type="text"
                        value={paramSourceIp}
                        onChange={(e) => setParamSourceIp(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                  </>
                )}

                {category === 'ENDPOINT' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">User Context</label>
                      <input
                        type="text"
                        value={paramUser}
                        onChange={(e) => setParamUser(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">Process Name</label>
                      <input
                        type="text"
                        value={paramProcess}
                        onChange={(e) => setParamProcess(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                  </>
                )}

                {category === 'NETWORK' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">Source IP</label>
                      <input
                        type="text"
                        value={paramSourceIp}
                        onChange={(e) => setParamSourceIp(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">Destination IP</label>
                      <input
                        type="text"
                        value={paramDestIp}
                        onChange={(e) => setParamDestIp(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                  </>
                )}

                {category === 'DATABASE' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">DB User</label>
                      <input
                        type="text"
                        value={paramUser}
                        onChange={(e) => setParamUser(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">Query / Action</label>
                      <input
                        type="text"
                        value={paramQuery}
                        onChange={(e) => setParamQuery(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">Read Volume (Rows)</label>
                      <input
                        type="number"
                        value={paramReadVolume}
                        onChange={(e) => setParamReadVolume(parseInt(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                  </>
                )}

                {category === 'EMAIL' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">Recipient User</label>
                    <input
                      type="text"
                      value={paramUser}
                      onChange={(e) => setParamUser(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={isGenerating}
                className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Generating Preview...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Generate Synthetic Alert Preview</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Generated Alert Preview Section */}
      {previewResponse && (
        <Card
          title={`3. Generated Preview: ${previewResponse.scenario_name}`}
          subtitle={`${previewResponse.generated_count} synthetic alerts ready for review before batch submission`}
          headerAction={
            <button
              type="button"
              onClick={handleSubmitBatch}
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Submitting to PostgreSQL...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Batch to Backend ({previewResponse.generated_count})</span>
                </>
              )}
            </button>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-medium">
                Category: <strong>{previewResponse.category}</strong>
              </span>
              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-medium">
                Mode: <strong>{previewResponse.generation_mode}</strong>
              </span>
              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-medium">
                Severity: <strong className="text-brand-900">{previewResponse.severity}</strong>
              </span>
              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-medium">
                Intent: <strong>{previewResponse.intent}</strong>
              </span>
            </div>

            {/* Representative Preview Table */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Alert Code</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Source IP</th>
                    <th className="p-3">User Context</th>
                    <th className="p-3 text-right">Raw Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {previewResponse.alerts.map((alert, idx) => (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-400 font-sans">{idx + 1}</td>
                        <td className="p-3 font-bold text-brand-900">{alert.alert_code}</td>
                        <td className="p-3 font-sans text-slate-800">{alert.event_type}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-brand-100 text-brand-900 font-sans font-bold">
                            {alert.severity}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{new Date(alert.timestamp).toLocaleString()}</td>
                        <td className="p-3 text-slate-700">{alert.source_ip || '-'}</td>
                        <td className="p-3 text-slate-700 font-sans">{alert.user_context || '-'}</td>
                        <td className="p-3 text-right font-sans">
                          <button
                            type="button"
                            onClick={() => setExpandedPayloadIndex(expandedPayloadIndex === idx ? null : idx)}
                            className="inline-flex items-center space-x-1 text-brand-700 hover:text-brand-900 font-medium"
                          >
                            <span>Payload</span>
                            {expandedPayloadIndex === idx ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      </tr>
                      {expandedPayloadIndex === idx && (
                        <tr className="bg-slate-900 text-slate-100">
                          <td colSpan={8} className="p-4 font-mono text-[11px] overflow-x-auto">
                            <div className="font-semibold text-brand-400 mb-1 font-sans">Raw Payload JSON:</div>
                            <pre className="whitespace-pre-wrap">{JSON.stringify(alert.raw_payload, null, 2)}</pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
