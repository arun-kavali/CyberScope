import React, { useState } from 'react';
import { Send, CheckCircle2, RefreshCw, Zap, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { submitSingleAlertApi, submitBatchAlertsApi, AlertRecord, generateScenarioPreviewApi } from '../services/alertsApi';

const CATEGORIES = ['AUTHENTICATION', 'ENDPOINT', 'NETWORK', 'DATABASE', 'EMAIL'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

export const AlertSourceSubmitPage: React.FC = () => {
  const { token } = useAuth();

  const [sourceSystem, setSourceSystem] = useState('');
  const [category, setCategory] = useState('AUTHENTICATION');
  const [eventType, setEventType] = useState('');
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
    if (!sourceSystem.trim() || !eventType.trim()) {
      setError('Source System and Alert Type are required fields.');
      return;
    }

    let parsedPayload = {};
    if (rawLogData.trim()) {
      try {
        parsedPayload = JSON.parse(rawLogData);
      } catch {
        parsedPayload = { raw: rawLogData };
      }
    }

    setError(null);
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
      setEventType('');
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
      // Determine category and scenario_name based on user selection
      let cat = 'AUTHENTICATION';
      let scName = 'Brute Force';
      if (selectedScenario === 'Credential Stuffing') {
        cat = 'AUTHENTICATION';
        scName = 'Credential Stuffing';
      } else if (selectedScenario === 'Impossible Travel') {
        cat = 'AUTHENTICATION';
        scName = 'Impossible Travel';
      } else if (selectedScenario === 'Privilege Escalation') {
        cat = 'ENDPOINT';
        scName = 'Privilege Escalation';
      } else if (selectedScenario === 'Malware Detection') {
        cat = 'ENDPOINT';
        scName = 'Malware Detection';
      }

      // 1. Generate 5 coherent related alerts
      const preview = await generateScenarioPreviewApi(token, {
        category: cat,
        scenario_name: scName,
        generation_mode: 'MULTI-ALERT SEQUENCE',
        severity: 'HIGH',
        intent: 'SUSPICIOUS',
        quantity: 5
      });

      // 2. Submit all 5 alerts to the backend batch ingestion pipeline
      const batchRes = await submitBatchAlertsApi(token, preview.alerts as any);

      setInjectionSuccess(
        `Scenario "${selectedScenario}" injected successfully into CyberScope pipeline! 5 related alerts generated, validated, normalized, and correlated into an Incident (${batchRes.accepted_count} alerts persisted to PostgreSQL).`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to inject scenario alerts.');
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">

      {/* Error Alert Box */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 text-xs flex items-start space-x-2.5 shadow-2xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-900">Submission Error</h4>
            <p className="font-medium mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Success Notification Box */}
      {submittedAlert && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 text-emerald-950 text-xs flex items-start space-x-3 shadow-2xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-emerald-900 text-sm">
              Alert Successfully Submitted & Normalized!
            </h4>
            <p className="text-emerald-800 font-medium">
              Alert Code: <code className="font-mono bg-emerald-100/80 px-2 py-0.5 rounded text-emerald-950 font-bold">{submittedAlert.alert_code}</code> | ID: <code className="font-mono text-emerald-700">{submittedAlert.id}</code>
            </p>
          </div>
        </div>
      )}

      {/* Injection Success Box */}
      {injectionSuccess && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 text-emerald-950 text-xs flex items-start space-x-3 shadow-2xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-emerald-900 text-sm">Scenario Alerts Injected</h4>
            <p className="text-emerald-800 font-medium">{injectionSuccess}</p>
          </div>
        </div>
      )}

      {/* CARD 1: SUBMIT SECURITY ALERT (Matching Reference Image 1 & 2) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-start space-x-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 border border-emerald-100">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Submit Security Alert</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Submit alerts to the CyberScope SOC for automated analysis and correlation.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitAlert} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Source System <span className="text-emerald-600 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              value={sourceSystem}
              onChange={(e) => setSourceSystem(e.target.value)}
              placeholder="e.g., Authentication System, Firewall, EDR"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 font-medium transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alert Type <span className="text-emerald-600 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="e.g., Brute Force Attack, Malware Detection"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 font-medium transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Event Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-semibold transition-all"
            >
              {SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>{sev}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Raw Log Data (Optional)</label>
            <textarea
              rows={4}
              value={rawLogData}
              onChange={(e) => setRawLogData(e.target.value)}
              placeholder='{"source_ip": "192.168.1.100", "message": "Alert details..."}'
              className="w-full p-3.5 text-xs font-mono bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <span className="text-[11px] text-slate-400 mt-1 block font-medium">
              Enter JSON data or plain text. Plain text will be wrapped in a message object.
            </span>
          </div>

          {/* Full-width Green Button (Matching Reference Screenshot) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Submitting Security Alert...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Submit Alert</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* CARD 2: SCENARIO-BASED ALERT INJECTION (Matching Reference Image) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-start space-x-3 border-b border-slate-100 pb-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 border border-emerald-100">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Scenario-Based Alert Injection</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Generate coherent multi-alert attack scenarios for demo and testing.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium transition-all"
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
            className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isInjecting ? (
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <Zap className="h-4 w-4 text-emerald-600" />
            )}
            <span>Inject Scenario Alerts</span>
          </button>

          <p className="text-[11px] text-slate-400 text-center font-medium">
            Alerts will be automatically analyzed and correlated into incidents.
          </p>
        </div>
      </div>

      {/* CARD 3: ABOUT ALERT PROCESSING (Matching Reference Image Yellow Info Card) */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 text-xs text-amber-950 space-y-2 shadow-2xs">
        <div className="flex items-center space-x-2 font-bold text-amber-950 text-xs">
          <Info className="h-4 w-4 text-amber-600 shrink-0" />
          <span>About Alert Processing</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-amber-900/90 text-[11px] font-medium pl-1 leading-relaxed">
          <li>Submitted alerts are automatically analyzed by AI</li>
          <li>Risk scores and severity are calculated deterministically</li>
          <li>Related alerts are correlated into incidents by rule engine</li>
          <li>SOC Analysts are notified of critical alerts</li>
        </ul>
      </div>

    </div>
  );
};
