import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Play, RotateCcw, XCircle, Plus } from 'lucide-react';
import {
  getResponseActionsApi,
  getResponsePoliciesApi,
  approveResponseActionApi,
  rejectResponseActionApi,
  rollbackResponseActionApi,
  createResponseActionApi,
  ResponseActionItem,
  ResponsePolicyItem
} from '../services/responseApi';

export const ResponsePage: React.FC = () => {
  const [actions, setActions] = useState<ResponseActionItem[]>([]);
  const [policies, setPolicies] = useState<ResponsePolicyItem[]>([]);

  // New Action Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionType, setActionType] = useState('BLOCK_IP');
  const [targetType, setTargetType] = useState('IP');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');

  // Rejection modal
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchResponseData = async () => {
    try {
      const [actionsData, policiesData] = await Promise.all([
        getResponseActionsApi().catch(() => []),
        getResponsePoliciesApi().catch(() => [])
      ]);
      setActions(actionsData);
      setPolicies(policiesData);
    } catch (err: any) {
      console.error('Failed to load response data', err);
    }
  };

  useEffect(() => {
    fetchResponseData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await approveResponseActionApi(id, 'Approved via Response Center');
      fetchResponseData();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      await rejectResponseActionApi(rejectId, rejectReason);
      setRejectId(null);
      setRejectReason('');
      fetchResponseData();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  const handleRollback = async (id: string) => {
    try {
      await rollbackResponseActionApi(id, 'Rolled back via Response Center');
      fetchResponseData();
    } catch (err: any) {
      alert(err.message || 'Rollback failed');
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim()) return;
    try {
      await createResponseActionApi({
        action_type: actionType,
        target_entity_type: targetType,
        target_entity_id: targetId,
        reason: reason || 'Manual action requested by SOC Analyst',
      });
      setShowCreateModal(false);
      setTargetId('');
      setReason('');
      fetchResponseData();
    } catch (err: any) {
      alert(err.message || 'Failed to request action');
    }
  };

  const staticActions = [
    { id: 'ACT-901', action: 'Isolate Host Network Interface', target: 'WORKSTATION-482.cyberscope.local', incidentId: 'INC-2026-0001', status: 'EXECUTED', type: 'Containment', timestamp: '2026-09-07 14:22:10 UTC' },
    { id: 'ACT-902', action: 'Disable Active Directory User Session', target: 'usr_jdoe', incidentId: 'INC-2026-0001', status: 'EXECUTED', type: 'Identity', timestamp: '2026-09-07 14:22:15 UTC' },
    { id: 'ACT-903', action: 'Block Outbound IP on Firewall', target: '198.51.100.14', incidentId: 'INC-2026-0003', status: 'PENDING_APPROVAL', type: 'Network', timestamp: '2026-09-07 15:05:00 UTC' },
    { id: 'ACT-904', action: 'Kill Suspicious Process Tree', target: 'PID 4892 (powershell.exe)', incidentId: 'INC-2026-0001', status: 'EXECUTED', type: 'Endpoint', timestamp: '2026-09-07 14:23:00 UTC' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Controlled Response Execution & Containment"
        subtitle="Analyst response actions, host containment, account isolation, and sandbox rollback controls"
        phaseBadge="Phase 22 Active"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Response' }]}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 bg-emerald-700 text-white font-semibold rounded hover:bg-emerald-800 transition-colors shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Request Response Action</span>
          </button>
        }
      />

      {/* Response Policy Summary */}
      <Card title="Active Response Policies" subtitle="Configured policy rules, conditions, and containment triggers" headerStyle="green">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {policies.length > 0 ? (
            policies.map((p) => (
              <div key={p.id} className="p-2.5 border rounded-lg bg-slate-50 border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-brand-900 font-mono">{p.policy_id_code}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">{p.action}</span>
                </div>
                <div className="font-semibold text-slate-800">{p.policy_name}</div>
                <div className="text-[10px] text-slate-500 font-mono">Requires Approval: {p.requires_approval ? 'YES' : 'NO'}</div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-xs text-slate-500 p-2">Standard Phase 22 Response Policies Active</div>
          )}
        </div>
      </Card>

      {/* Controlled Response Action Center */}
      <Card title="Controlled Response Action Center" subtitle="Audited containment actions with manual override & sandbox rollback" headerStyle="green">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Action ID</th>
                <th className="py-2.5 px-3">Response Action</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Policy Code</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Analyst Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
              {actions.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{a.id.slice(0, 8)}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{a.action_type}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{a.target_entity_type}: {a.target_entity_id}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{a.policy_id_code || 'MANUAL'}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge
                      status={
                        a.status === 'EXECUTED' ? 'healthy' : a.status === 'PENDING_APPROVAL' ? 'warning' : a.status === 'ROLLED_BACK' ? 'info' : 'critical'
                      }
                      label={a.status}
                    />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 space-x-1">
                    {(a.status === 'PENDING_APPROVAL' || a.status === 'RECOMMENDED') && (
                      <>
                        <button
                          onClick={() => handleApprove(a.id)}
                          className="px-2 py-1 bg-emerald-700 text-white rounded text-[10px] font-bold hover:bg-emerald-800 inline-flex items-center space-x-1"
                        >
                          <Play className="h-2.5 w-2.5" />
                          <span>Approve & Execute</span>
                        </button>
                        <button
                          onClick={() => setRejectId(a.id)}
                          className="px-2 py-1 bg-rose-700 text-white rounded text-[10px] font-bold hover:bg-rose-800 inline-flex items-center space-x-1"
                        >
                          <XCircle className="h-2.5 w-2.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                    {a.status === 'EXECUTED' && (
                      <button
                        onClick={() => handleRollback(a.id)}
                        className="px-2 py-1 bg-slate-700 text-white rounded text-[10px] font-bold hover:bg-slate-800 inline-flex items-center space-x-1"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        <span>Rollback</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {staticActions.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors opacity-80">
                  <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{a.id}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{a.action}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{a.target}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{a.incidentId}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={a.status === 'EXECUTED' ? 'healthy' : 'warning'} label={a.status} />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{a.timestamp}</td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-400 italic">Static Demo Reference</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Action Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-slate-900 text-sm">Request Response Action</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 font-bold hover:text-slate-700">×</button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-600 bg-white"
                >
                  <option value="BLOCK_IP">BLOCK_IP (Sandbox Firewall)</option>
                  <option value="DISABLE_USER">DISABLE_USER (Sandbox Identity)</option>
                  <option value="TERMINATE_SESSION">TERMINATE_SESSION (Revoke Token)</option>
                  <option value="ISOLATE_ENDPOINT">ISOLATE_ENDPOINT (Host Network)</option>
                  <option value="QUARANTINE_ARTIFACT">QUARANTINE_ARTIFACT (File Containment)</option>
                  <option value="INVESTIGATE_FURTHER">INVESTIGATE_FURTHER (Phase 13 Workflow)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Entity Type</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-600 bg-white"
                >
                  <option value="IP">IP Address</option>
                  <option value="USER">User / Account</option>
                  <option value="ENDPOINT">Endpoint / Hostname</option>
                  <option value="ARTIFACT">File / Artifact</option>
                  <option value="ALERT">Alert</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Entity Identifier</label>
                <input
                  type="text"
                  required
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="e.g. 185.220.101.5 or USR-4821 or EP-0017"
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Justification Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for requesting action"
                  className="w-full p-2 border border-slate-300 rounded text-xs h-16"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 border rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-700 text-white font-bold rounded hover:bg-emerald-800">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-4 space-y-3 text-xs">
            <h3 className="font-extrabold text-slate-900">Reject Response Action</h3>
            <p className="text-slate-600 text-[11px]">Specify reason for rejecting this response recommendation:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection justification reason"
              className="w-full p-2 border border-slate-300 rounded h-16"
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setRejectId(null)} className="px-3 py-1.5 border rounded">Cancel</button>
              <button onClick={handleReject} className="px-3 py-1.5 bg-rose-700 text-white font-bold rounded">Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
