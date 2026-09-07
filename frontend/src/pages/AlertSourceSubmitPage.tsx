import React, { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { Send, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { submitSingleAlertApi, AlertRecord } from '../services/alertsApi';

const CATEGORIES = ['AUTHENTICATION', 'ENDPOINT', 'NETWORK', 'DATABASE', 'EMAIL'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];


export const AlertSourceSubmitPage: React.FC = () => {
  const { token } = useAuth();

  const [category, setCategory] = useState('AUTHENTICATION');
  const [eventType, setEventType] = useState('Suspicious Login');
  const [severity, setSeverity] = useState('HIGH');
  const [description, setDescription] = useState('Synthetic authentication anomaly observed from external source.');
  const [userContext, setUserContext] = useState('usr_jdoe');
  const [assetContext, setAssetContext] = useState('WORKSTATION-482.cyberscope.local');
  const [sourceIp, setSourceIp] = useState('203.0.113.45');
  const [destIp, setDestIp] = useState('10.0.1.10');
  const [protocol, setProtocol] = useState('TCP');
  const [action, setAction] = useState('DETECTED');
  const [indicator, setIndicator] = useState('auth_failure_burst:usr_jdoe');
  const [technique, setTechnique] = useState('T1110 - Brute Force');
  const [rawJson, setRawJson] = useState('{\n  "attempt_count": 5,\n  "auth_method": "Active Directory"\n}');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAlert, setSubmittedAlert] = useState<AlertRecord | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!eventType.trim() || !description.trim()) {
      setError('Please provide both Event Type and Description.');
      return;
    }

    let parsedPayload = {};
    if (rawJson.trim()) {
      try {
        parsedPayload = JSON.parse(rawJson);
      } catch (err) {
        setError('Invalid Raw Payload JSON format. Please check JSON syntax.');
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);
    setSubmittedAlert(null);

    try {
      const result = await submitSingleAlertApi(token, {
        event_category: category,
        event_type: eventType.trim(),
        severity,
        description: description.trim(),
        user_context: userContext.trim() || undefined,
        asset_context: assetContext.trim() || undefined,
        source_ip: sourceIp.trim() || undefined,
        destination_ip: destIp.trim() || undefined,
        protocol: protocol.trim() || undefined,
        action: action.trim() || undefined,
        indicator: indicator.trim() || undefined,
        technique: technique.trim() || undefined,
        raw_payload: parsedPayload,
        alert_metadata: { synthetic: true, source: "Manual Form Submission" }

      });
      setSubmittedAlert(result);
    } catch (err: any) {
      setError(err.message || 'Failed to submit synthetic alert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submit Synthetic Security Alert"
        subtitle="Manual alert ingestion through Phase 7 validation, normalization, and data-quality pipeline"
        phaseBadge="Phase 7 Pipeline Active"
        breadcrumbs={[{ label: 'Alert Source' }, { label: 'Submit Alert' }]}
      />

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {submittedAlert && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-emerald-900 shadow-sm flex items-start space-x-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-emerald-950">
              Alert Successfully Validated, Normalized & Persisted!
            </h4>
            <p className="text-xs text-emerald-800">
              Alert Code: <code className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900 font-bold">{submittedAlert.alert_code}</code> | Database ID: <code className="font-mono text-[11px] text-emerald-700">{submittedAlert.id}</code>
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-semibold">
                Validation: Passed
              </span>
              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-semibold">
                Normalization: Applied
              </span>
              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-semibold">
                Data Quality: {submittedAlert.alert_metadata?.data_quality?.status || 'PASSED'}
              </span>
            </div>
          </div>
        </div>
      )}

      <Card title="Synthetic Alert Constructor Form">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Event Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Event Type
              </label>
              <input
                type="text"
                required
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="e.g. Brute Force"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none font-bold"
              >
                {SEVERITIES.map((sev) => (
                  <option key={sev} value={sev}>{sev}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                User Context
              </label>
              <input
                type="text"
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Asset Context
              </label>
              <input
                type="text"
                value={assetContext}
                onChange={(e) => setAssetContext(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Source IP
              </label>
              <input
                type="text"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Destination IP
              </label>
              <input
                type="text"
                value={destIp}
                onChange={(e) => setDestIp(e.target.value)}
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Protocol
              </label>
              <input
                type="text"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Action
              </label>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Indicator
              </label>
              <input
                type="text"
                value={indicator}
                onChange={(e) => setIndicator(e.target.value)}
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                MITRE Technique
              </label>
              <input
                type="text"
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Raw JSON Payload
            </label>
            <textarea
              rows={4}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              className="w-full text-xs font-mono bg-slate-900 text-slate-100 rounded-lg p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Submitting to PostgreSQL...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Synthetic Alert</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
