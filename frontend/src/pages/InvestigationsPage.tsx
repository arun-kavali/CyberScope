import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  User, 
  HardDrive, 
  Activity, 
  FileText, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Server,
  X,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import { 
  fetchIncidents, 
  fetchIncidentIntelligence, 
  fetchIncidentTimeline,
  startInvestigation,
  addInvestigationNote,
  IncidentSummaryRecord,
  IncidentIntelligenceSummary,
  IncidentTimelineEvent
} from '../services/incidentsApi';
import {
  fetchAIStatus,
  generateInvestigationNarrative,
  getSafeAiErrorMessage,
  AIStatus,
  AIIntelligenceRecord
} from '../services/aiApi';

export const InvestigationsPage: React.FC = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const incidentIdParam = searchParams.get('incident_id');

  // Incidents dropdown / selector state
  const [incidents, setIncidents] = useState<IncidentSummaryRecord[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [incidentsLoading, setIncidentsLoading] = useState<boolean>(true);

  // Investigation detail & intelligence state
  const [intel, setIntel] = useState<IncidentIntelligenceSummary | null>(null);
  const [timeline, setTimeline] = useState<IncidentTimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Note submission state
  const [noteInput, setNoteInput] = useState<string>('');
  const [noteSubmitting, setNoteSubmitting] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Selected Alert for inspection
  const [inspectAlert, setInspectAlert] = useState<Record<string, any> | null>(null);

  // Local AI Intelligence State
  const [aiRecord, setAiRecord] = useState<AIIntelligenceRecord | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  const checkOllamaStatus = async () => {
    try {
      const res = await fetchAIStatus(token || undefined);
      setAiStatus(res);
    } catch (e: any) {
      setAiStatus({ available: false, mode: 'ollama', model: 'llama3', url: 'http://localhost:11434', reason: getSafeAiErrorMessage() });
    }
  };

  const handleGenerateAINarrative = async (forceRefresh: boolean = false) => {
    if (!selectedIncidentId) return;
    try {
      setAiLoading(true);
      setAiError(null);
      const rec = await generateInvestigationNarrative(selectedIncidentId, forceRefresh, token || undefined);
      setAiRecord(rec);
      if (rec.status === 'FAILED') {
        setAiError(getSafeAiErrorMessage(rec.error_info?.error));
      }
    } catch (err: any) {
      setAiError(getSafeAiErrorMessage(err.message));
    } finally {
      setAiLoading(false);
    }
  };

  // Load incidents list for dropdown selector
  const loadIncidentsList = async () => {
    try {
      setIncidentsLoading(true);
      const res = await fetchIncidents(1, 100, undefined, undefined, token || undefined);
      setIncidents(res.items);
      
      // Auto-select incident from URL param or default to first incident
      if (incidentIdParam && res.items.some(i => i.id === incidentIdParam)) {
        setSelectedIncidentId(incidentIdParam);
      } else if (res.items.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(res.items[0].id);
      }
    } catch (err: any) {
      if (err.message?.includes('expired') || err.message?.includes('token')) {
        setError('Your session has expired. Please sign in again.');
      } else {
        setError(err.message || 'Failed to load incidents');
      }
    } finally {
      setIncidentsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidentsList();
  }, [token]);

  // Load investigation data whenever selected incident changes
  const loadInvestigationData = async (incId: string) => {
    if (!incId) return;
    try {
      setLoading(true);
      setError(null);
      
      // Fetch intelligence summary and timeline in parallel
      const [intelRes, timelineRes] = await Promise.all([
        fetchIncidentIntelligence(incId, token || undefined),
        fetchIncidentTimeline(incId, token || undefined)
      ]);

      setIntel(intelRes);
      setTimeline(timelineRes);
      if (intelRes.ai_intelligence) {
        setAiRecord(intelRes.ai_intelligence as any);
      } else {
        setAiRecord(null);
      }
      checkOllamaStatus();
    } catch (err: any) {
      if (err.message?.includes('expired') || err.message?.includes('token')) {
        setError('Your session has expired. Please sign in again.');
      } else {
        setError(err.message || 'Failed to load investigation workspace data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedIncidentId) {
      setSearchParams({ incident_id: selectedIncidentId });
      loadInvestigationData(selectedIncidentId);
    }
  }, [selectedIncidentId, token]);

  const handleSelectIncidentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedIncidentId(e.target.value);
  };

  const handleStartInvestigationClick = async () => {
    if (!selectedIncidentId) return;
    try {
      setLoading(true);
      await startInvestigation(selectedIncidentId, token || undefined);
      await loadInvestigationData(selectedIncidentId);
      await loadIncidentsList();
    } catch (err: any) {
      setError(err.message || 'Failed to start investigation');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || !selectedIncidentId) return;

    try {
      setNoteSubmitting(true);
      setNoteError(null);
      const res = await addInvestigationNote(selectedIncidentId, noteInput.trim(), token || undefined);
      
      // Update local state with new notes list
      if (intel) {
        setIntel({
          ...intel,
          notes: res.notes
        });
      }
      setNoteInput('');
      // Refresh timeline
      const updatedTimeline = await fetchIncidentTimeline(selectedIncidentId);
      setTimeline(updatedTimeline);
    } catch (err: any) {
      setNoteError(err.message || 'Failed to add note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigations"
        subtitle="Deep evidence investigation workspace, analyst notes, timeline, and AI analysis."
        phaseBadge="SOC Operations"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Investigations' }]}
      />

      {/* Selector & Actions Control Bar */}
      <Card headerStyle="default">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 flex-1">
            <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0">
              <Search className="h-5 w-5" />
            </div>
            <div className="flex-1 max-w-md">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Select Active Incident / Investigation:
              </label>
              <select
                value={selectedIncidentId}
                onChange={handleSelectIncidentChange}
                disabled={incidentsLoading}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {incidents.length === 0 ? (
                  <option value="">No incidents available</option>
                ) : (
                  incidents.map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      {inc.incident_number} — {inc.severity} — [{inc.status}] {inc.title.substring(0, 45)}...
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {intel && intel.status === 'OPEN' && (
              <button
                onClick={handleStartInvestigationClick}
                disabled={loading}
                className="flex items-center space-x-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs"
              >
                <Activity className="h-4 w-4" />
                <span>Start Investigation</span>
              </button>
            )}

            <button
              onClick={() => selectedIncidentId && loadInvestigationData(selectedIncidentId)}
              disabled={loading}
              className="flex items-center space-x-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors font-medium"
            >
              <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Workspace</span>
            </button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-500 text-xs bg-white border border-slate-200 rounded-xl">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-brand-600" />
          Loading investigation evidence canvas...
        </div>
      ) : intel ? (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-bold text-brand-700">{intel.incident_number}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadgeClass(intel.severity)}`}>
                    {intel.severity}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(intel.status)}`}>
                    {intel.status}
                  </span>
                  {intel.investigation_id && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>INVESTIGATION ACTIVE</span>
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{intel.title}</h2>
              </div>

              {/* Metrics & AI Action */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Risk Score</div>
                    <div className="text-lg font-bold text-slate-900">{intel.risk_score} <span className="text-xs font-normal text-slate-500">/ 100</span></div>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Confidence</div>
                    <div className="text-lg font-bold text-slate-900">{intel.confidence_score}%</div>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Evidence Alerts</div>
                    <div className="text-lg font-bold text-slate-900">{intel.evidence_chain.length}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleGenerateAINarrative(true)}
                  disabled={aiLoading}
                  className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-4 py-3 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                  title="Generate structured evidence-grounded AI narrative via local Ollama"
                >
                  <Sparkles className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
                  <span>{aiLoading ? 'Running Local Ollama...' : 'Generate AI Narrative'}</span>
                </button>
              </div>
            </div>

            {/* Summary Cards Grid: What Happened, Why Suspicious, Potential Impact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* What Happened */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-brand-900">
                  <FileText className="h-4 w-4 text-brand-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">What Happened</h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{intel.what_happened}</p>
              </div>

              {/* Why Suspicious */}
              <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Why Suspicious</h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{intel.why_suspicious.summary}</p>
                {intel.why_suspicious.triggered_rules.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] font-bold text-amber-800">Triggered Detection Rules:</div>
                    {intel.why_suspicious.triggered_rules.map((r, idx) => (
                      <div key={idx} className="text-[11px] bg-white p-1.5 rounded border border-amber-200 text-slate-800 font-medium">
                        {r.rule_id} — {r.rule_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Potential Impact */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-slate-900">
                  <Server className="h-4 w-4 text-slate-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Potential Impact</h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{intel.potential_impact.summary}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {intel.potential_impact.affected_users.map((u, i) => (
                    <span key={i} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium flex items-center">
                      <User className="h-3 w-3 mr-1 text-slate-400" /> {u}
                    </span>
                  ))}
                  {intel.potential_impact.affected_assets.map((a, i) => (
                    <span key={i} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium flex items-center">
                      <HardDrive className="h-3 w-3 mr-1 text-slate-400" /> {a}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200">
                  {intel.potential_impact.disclaimer}
                </div>
              </div>
            </div>

            {/* Phase 14 — Local Ollama AI Intelligence Workspace Section */}
            {aiLoading ? (
              <div className="p-6 bg-emerald-50/50 border border-emerald-200 rounded-xl text-center text-xs space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-700" />
                <p className="font-bold text-emerald-900">Querying Local Ollama AI Model ({aiStatus?.model || 'llama3'})...</p>
                <p className="text-slate-600">Generating evidence-grounded investigation narrative and advisory recommendations.</p>
              </div>
            ) : aiRecord && aiRecord.status === 'COMPLETED' && aiRecord.structured_output ? (
              <div className="bg-white border-2 border-emerald-600/30 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="bg-emerald-700 text-white p-1.5 rounded-lg">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Local Ollama AI Intelligence Narrative</h3>
                      <p className="text-[11px] text-slate-500">Evidence-grounded explanation assistant • Model: <span className="font-mono font-semibold text-slate-700">{aiRecord.model_name}</span> (Prompt v{aiRecord.prompt_version})</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      COMPLETED
                    </span>
                    <button
                      onClick={() => handleGenerateAINarrative(true)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium underline flex items-center space-x-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Regenerate</span>
                    </button>
                  </div>
                </div>

                {/* Structured AI Output Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Recommended Investigation Steps */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs uppercase tracking-wider">
                      <CheckSquare className="h-4 w-4 text-brand-600" />
                      <span>Advisory Investigation Steps</span>
                    </div>
                    {aiRecord.structured_output.recommended_investigation.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No specific additional investigation steps suggested.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {aiRecord.structured_output.recommended_investigation.map((step, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <span className="text-brand-600 font-bold">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Recommended Response Actions (Advisory Only) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs uppercase tracking-wider">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span>Advisory Response Concepts</span>
                      </div>
                      <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        Advisory Only — No Execution
                      </span>
                    </div>
                    {aiRecord.structured_output.recommended_response.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No automated response actions recommended.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {aiRecord.structured_output.recommended_response.map((act, idx) => (
                          <span key={idx} className="text-xs font-semibold bg-white text-slate-800 border border-slate-300 px-2 py-1 rounded-md shadow-2xs flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                            {act}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence References & Limitations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                    <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Validated Evidence References</div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {aiRecord.evidence_references && aiRecord.evidence_references.length > 0 ? (
                        aiRecord.evidence_references.map((ref, idx) => (
                          <span key={idx} className="text-[10px] font-mono bg-white text-brand-800 border border-brand-200 px-2 py-0.5 rounded font-medium">
                            {ref.label || ref.id} ({ref.type})
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">All conclusions grounded in supplied incident evidence chain.</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-slate-600">
                    <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center space-x-1">
                      <Info className="h-3.5 w-3.5 text-slate-500" />
                      <span>Uncertainty & Scope Boundaries</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{aiRecord.structured_output.uncertainty || 'Based strictly on observed evidence; further context required.'}</p>
                  </div>
                </div>
              </div>
            ) : (aiRecord && aiRecord.status === 'FAILED') || aiError ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-amber-950 flex items-center space-x-2">
                      <span>Local Ollama AI Generation Note</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 border border-amber-300 uppercase">
                        FAILED
                      </span>
                    </div>
                    <p className="text-amber-900 font-medium">
                      {getSafeAiErrorMessage(aiRecord?.error_info?.error || aiError)}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Core security analysis, deterministic rules, risk scoring, anomaly detection, and incident correlation remain 100% operational.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerateAINarrative(true)}
                  className="px-3.5 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-amber-700" />
                  <span>Retry AI Generation</span>
                </button>
              </div>
            ) : aiStatus && !aiStatus.available ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Local AI unavailable.</strong> Core security analysis, deterministic rules, risk scoring, anomaly detection, and incident correlation remain fully functional.
                    {aiStatus.reason && <span className="text-amber-800 block text-[11px] font-medium mt-0.5">({getSafeAiErrorMessage(aiStatus.reason)})</span>}
                  </span>
                </div>
                <button
                  onClick={() => checkOllamaStatus()}
                  className="px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold rounded-lg shrink-0 transition-colors"
                >
                  Retry Health Check
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>Generate evidence-grounded AI narrative and recommendations with local Ollama ({aiStatus?.model || 'llama3'}).</span>
                </div>
                <button
                  onClick={() => handleGenerateAINarrative(true)}
                  disabled={aiLoading}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shrink-0 transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Generate AI Narrative</span>
                </button>
              </div>
            )}
          </div>

          {/* Main 2-Column Canvas Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2 cols): Correlated Evidence & Timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Correlated Evidence Traceability Table */}
              <Card title="Correlated Evidence Traceability Chain">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Alert Code</th>
                        <th className="py-2.5 px-3">Event Type</th>
                        <th className="py-2.5 px-3">Severity</th>
                        <th className="py-2.5 px-3">Risk Score</th>
                        <th className="py-2.5 px-3">Anomaly</th>
                        <th className="py-2.5 px-3 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {intel.evidence_chain.map((ev) => (
                        <tr key={ev.alert_id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-brand-700">
                            {ev.alert_code}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {ev.event_type}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadgeClass(ev.severity)}`}>
                              {ev.severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">
                            {ev.risk_score !== null ? `${ev.risk_score}/100` : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">
                            {ev.anomaly_score !== null ? `${ev.anomaly_score}/100` : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setInspectAlert(ev)}
                              className="text-xs text-brand-700 hover:text-brand-900 font-semibold"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Chronological Incident & Investigation Timeline */}
              <Card title="Chronological Investigation Timeline">
                <div className="relative pl-5 border-l-2 border-slate-200 space-y-4">
                  {timeline.map((item) => (
                    <div key={item.id} className="relative group">
                      <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-white" />
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">{item.event_type}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-0.5">{item.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recommendations Placeholder (Strictly Neutral, No LLM) */}
              <Card title="Analytical Recommendations & Next Steps">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center space-x-3 text-xs text-slate-600">
                  <Info className="h-5 w-5 text-brand-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800">Intelligence Status: </span>
                    <span>{intel.recommendations_placeholder}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column (1 col): Analyst Notes & Related Incidents */}
            <div className="space-y-6">
              {/* Analyst Investigation Notes Panel */}
              <Card title="Analyst Investigation Notes">
                <div className="space-y-4">
                  {/* Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Enter analyst observation, context, or investigation findings..."
                      rows={3}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                    />
                    {noteError && (
                      <div className="text-[11px] text-red-600">{noteError}</div>
                    )}
                    <button
                      type="submit"
                      disabled={noteSubmitting || !noteInput.trim()}
                      className="w-full flex items-center justify-center space-x-1.5 text-xs bg-brand-700 hover:bg-brand-800 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{noteSubmitting ? 'Posting Note...' : 'Add Investigation Note'}</span>
                    </button>
                  </form>

                  {/* Existing Notes List */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Recorded Analyst Notes ({intel.notes.length})
                    </div>
                    {intel.notes.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-2">
                        No analyst notes recorded yet.
                      </div>
                    ) : (
                      intel.notes.map((n) => (
                        <div key={n.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-semibold text-brand-800 flex items-center space-x-1">
                              <User className="h-3 w-3 mr-0.5 text-brand-600" />
                              {n.analyst_name}
                            </span>
                            <span>{new Date(n.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-800 text-xs leading-relaxed font-normal">{n.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>

              {/* Related Incidents */}
              <Card title="Related Incidents">
                {intel.related_incidents.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-2">
                    No related incidents found sharing user/asset context.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {intel.related_incidents.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedIncidentId(r.id)}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg hover:border-brand-300 cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-brand-700">{r.incident_number}</span>
                          <span className={`px-1.5 py-0.25 rounded text-[9px] font-bold border ${getSeverityBadgeClass(r.severity)}`}>
                            {r.severity}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-800 truncate">{r.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      ) : null}

      {/* Inspect Alert Modal */}
      {inspectAlert && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-mono text-sm font-bold text-brand-700">{inspectAlert.alert_code}</span>
              <button onClick={() => setInspectAlert(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div><span className="font-semibold text-slate-500">Event Type:</span> <span className="font-bold text-slate-800">{inspectAlert.event_type}</span></div>
              <div><span className="font-semibold text-slate-500">Severity:</span> <span className="font-bold text-slate-800">{inspectAlert.severity}</span></div>
              <div><span className="font-semibold text-slate-500">Timestamp:</span> <span className="text-slate-800">{inspectAlert.timestamp}</span></div>
              <div><span className="font-semibold text-slate-500">Risk Score:</span> <span className="font-bold text-slate-800">{inspectAlert.risk_score}/100</span></div>
              <div><span className="font-semibold text-slate-500">Anomaly Score:</span> <span className="font-bold text-slate-800">{inspectAlert.anomaly_score}/100</span></div>
            </div>
            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setInspectAlert(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
