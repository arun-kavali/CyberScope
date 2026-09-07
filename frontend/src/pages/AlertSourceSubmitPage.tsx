import React, { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { Send, CheckCircle2, RefreshCw, Zap, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { submitSingleAlertApi, AlertRecord, generateScenarioPreviewApi } from '../services/alertsApi';

const CATEGORIES = ['AUTHENTICATION', 'ENDPOINT', 'NETWORK', 'DATABASE', 'EMAIL'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const AlertSourceSubmitPage: React.FC = () => {
  const { token } = useAuth();

  const [sourceSystem, setSourceSystem] = useState('Authentication System');
  const [category, setCategory] = useState('AUTHENTICATION');
  const [eventType, setEventType] = useState('Suspicious Login');
  const [severity, setSeverity] = useState('Medium');
  const [rawLogData, setRawLogData] = useState('{\n  "source_ip": "192.168.1.100",\n  "message": "Alert details..."\n}');
  
  const [selectedScenario, setSelectedScenario] = useState('Random Scenario');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAlert, setSubmittedAlert] = useState<AlertRecord | null>(null);
  const [injectionSuccess, setInjectionSuccess] = useState<string | null>(null);

  const handleSubmitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!eventType.trim()) {
      setError('Alert Type is required.');
      return;
    }

    let parsedPayload = {};
    if (rawLogData.trim()) {
      try {
        parsedPayload = JSON.parse(rawLogData);
      } catch (err) {
        parsedPayload = { raw: rawLogData };
      }
    }

    setError(null);
    setIsSubmitting(false);
    setSubmittedAlert(null);
    setInjectionSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await submitSingleAlertApi(token, {
        event_category: category,
        event_type: eventType.trim(),
        severity: severity.toUpperCase(),
        description: `Alert from ${sourceSystem}: ${eventType}`,
        raw_payload: parsedPayload,
        alert_metadata: { source_system: sourceSystem }
      });
      setSubmittedAlert(result);
    } catch (err: any) {
      setError(err.message || 'Failed to submit security alert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInjectScenario = async () => {
    if (!token) return;
    setIsInjecting(true);
    setError(null);
    setSubmittedAlert(null);
    setInjectionSuccess(null);

    try {
      await generateScenarioPreviewApi(token, {
        category: 'AUTHENTICATION',
        scenario_name: 'Brute Force',
        generation_mode: 'SINGLE',
        severity: 'HIGH',
        intent: 'TESTING',
        quantity: 3
      });
      setInjectionSuccess('Scenario alerts successfully injected and sent to SOC triage pipeline.');
    } catch (err: any) {
      setError(err.message || 'Failed to inject scenario alerts.');
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <PageHeader
        title="Alert Source Portal"
        subtitle="Submit telemetry alerts to the CyberScope SOC for automated analysis and correlation."
        phaseBadge="Alert Source Active"
        breadcrumbs={[{ label: 'Alert Source' }, { label: 'Submit Alert' }]}
      />

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {submittedAlert && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 shadow-2xs flex items-start space-x-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-emerald-950">
              Alert Successfully Submitted & Normalized!
            </h4>
            <p className="text-xs text-emerald-800">
              Alert Code: <code className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900 font-bold">{submittedAlert.alert_code}</code> | ID: <code className="font-mono text-[11px] text-emerald-700">{submittedAlert.id}</code>
            </p>
          </div>
        </div>
      )}

      {injectionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 shadow-2xs flex items-start space-x-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-emerald-950">{injectionSuccess}</p>
        </div>
      )}

      {/* Main Submit Form (Reference Image Layout) */}
      <Card title="Submit Security Alert" subtitle="Submit alerts to the CyberScope SOC for automated analysis and correlation." headerStyle="green">
        <form onSubmit={handleSubmitAlert} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Source System *</label>
            <input
              type="text"
              required
              value={sourceSystem}
              onChange={(e) => setSourceSystem(e.target.value)}
              placeholder="e.g., Authentication System, Firewall, EDR"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Event Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alert Type *</label>
              <input
                type="text"
                required
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="e.g., Brute Force Attack, Malware Detection"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Raw Log Data (Optional)</label>
            <textarea
              rows={3}
              value={rawLogData}
              onChange={(e) => setRawLogData(e.target.value)}
              placeholder='{"source_ip": "192.168.1.100", "message": "Alert details..."}'
              className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Enter JSON data or plain text. Plain text will be wrapped in a message object.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Submitting Alert...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Submit Security Alert</span>
              </>
            )}
          </button>
        </form>
      </Card>

      {/* Scenario-Based Alert Injection (Reference Image Second Card) */}
      <Card title="Scenario-Based Alert Injection" subtitle="Generate coherent multi-alert attack scenarios for demo and testing." headerStyle="green">
        <div className="space-y-3">
          <div>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
            >
              <option value="Random Scenario">Random Scenario</option>
              <option value="Brute Force">Brute Force Attack Scenario</option>
              <option value="Credential Stuffing">Credential Stuffing Sequence</option>
              <option value="Impossible Travel">Impossible Travel Anomaly</option>
              <option value="Privilege Escalation">Privilege Escalation Burst</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleInjectScenario}
            disabled={isInjecting}
            className="w-full py-2 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-lg shadow-2xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isInjecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-600" /> : <Zap className="h-3.5 w-3.5 text-brand-600" />}
            <span>Inject Scenario Alerts</span>
          </button>
        </div>
      </Card>

      {/* About Alert Processing */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
        <div className="flex items-center space-x-1.5 font-bold text-amber-950">
          <Info className="h-4 w-4 text-amber-600" />
          <span>About Alert Processing</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-amber-800/90 text-[11px] pl-1">
          <li>Submitted alerts are automatically analyzed by CyberScope AI.</li>
          <li>Risk scores and severity are calculated deterministically.</li>
          <li>Related alerts are correlated into incidents by rule engine.</li>
          <li>SOC Analysts are notified of critical alerts in real time.</li>
        </ul>
      </div>
    </div>
  );
};
