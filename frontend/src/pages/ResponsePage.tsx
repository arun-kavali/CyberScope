import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import {
  Play,
  RotateCcw,
  XCircle,
  Plus,
  Ban,
  UserX,
  Zap,
  Laptop,
  FileCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldAlert
} from 'lucide-react';
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

interface PlaybookConfig {
  id: string;
  title: string;
  type: string;
  defaultTarget: string;
  icon: any;
  color: string;
  btnColor: string;
  description: string;
  reason: string;
}

export const ResponsePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [actions, setActions] = useState<ResponseActionItem[]>([]);
  const [policies, setPolicies] = useState<ResponsePolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Playbook execution confirmation modal state
  const [activePlaybook, setActivePlaybook] = useState<PlaybookConfig | null>(null);
  const [playbookTarget, setPlaybookTarget] = useState<string>('');
  const [playbookReason, setPlaybookReason] = useState<string>('');

  // Request modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionType, setActionType] = useState('BLOCK_IP');
  const [targetType, setTargetType] = useState('IP');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');

  // Rejection modal
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchResponseData = async () => {
    setIsLoading(true);
    try {
      const [actionsData, policiesData] = await Promise.all([
        getResponseActionsApi().catch(() => []),
        getResponsePoliciesApi().catch(() => [])
      ]);
      setActions(actionsData);
      setPolicies(policiesData);
    } catch (err: any) {
      console.error('Failed to load response data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResponseData();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 5000);
  };

  const playbooks: PlaybookConfig[] = [
    {
      id: 'BLOCK_IP',
      title: 'Block Source IP',
      type: 'IP',
      defaultTarget: '185.220.101.5',
      icon: Ban,
      color: 'bg-rose-100 text-rose-700',
      btnColor: 'bg-rose-600 hover:bg-rose-700',
      description: 'Block malicious IP on perimeter firewall',
      reason: 'Perimeter firewall block for high-risk threat actor IP'
    },
    {
      id: 'DISABLE_USER',
      title: 'Disable User Account',
      type: 'USER',
      defaultTarget: 'usr_jdoe',
      icon: UserX,
      color: 'bg-amber-100 text-amber-700',
      btnColor: 'bg-amber-600 hover:bg-amber-700',
      description: 'Disable compromised user identity',
      reason: 'Active user account suspension due to credential compromise'
    },
    {
      id: 'TERMINATE_SESSION',
      title: 'Terminate User Session',
      type: 'USER',
      defaultTarget: 'usr_jdoe',
      icon: Zap,
      color: 'bg-blue-100 text-blue-700',
      btnColor: 'bg-blue-600 hover:bg-blue-700',
      description: 'Force immediate token revocation',
      reason: 'Session token invalidation for security reset'
    },
    {
      id: 'ISOLATE_HOST',
      title: 'Isolate Host Asset',
      type: 'ENDPOINT',
      defaultTarget: 'EP-0017',
      icon: Laptop,
      color: 'bg-purple-100 text-purple-700',
      btnColor: 'bg-purple-600 hover:bg-purple-700',
      description: 'Isolate host network interface',
      reason: 'Network isolation to contain endpoint malware propagation'
    },
    {
      id: 'QUARANTINE_ARTIFACT',
      title: 'Quarantine Artifact',
      type: 'ARTIFACT',
      defaultTarget: 'hash_malicious_payload',
      icon: FileCheck,
      color: 'bg-teal-100 text-teal-700',
      btnColor: 'bg-teal-600 hover:bg-teal-700',
      description: 'Isolate suspicious executable file',
      reason: 'File quarantine for sandbox malware containment'
    },
    {
      id: 'INVESTIGATE_FURTHER',
      title: 'Investigate Further',
      type: 'ALERT',
      defaultTarget: 'ALT-9901',
      icon: Search,
      color: 'bg-emerald-100 text-emerald-700',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
      description: 'Escalate to deep investigation case',
      reason: 'Automated triage investigation creation'
    }
  ];

  const handleOpenPlaybookModal = (pb: PlaybookConfig) => {
    setActivePlaybook(pb);
    setPlaybookTarget(pb.defaultTarget);
    setPlaybookReason(pb.reason);
  };

  const handleConfirmExecutePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlaybook || !playbookTarget.trim()) return;

    const type = activePlaybook.id;
    setLoadingActionId(type);
    setActionNotice(null);
    try {
      const action = await createResponseActionApi({
        action_type: type,
        target_entity_type: activePlaybook.type,
        target_entity_id: playbookTarget.trim(),
        reason: playbookReason || activePlaybook.reason,
      });

      if (action.status === 'PENDING_APPROVAL') {
        try {
          const executed = await approveResponseActionApi(action.id, `Executed via Playbook: ${type}`);
          showNotification('success', `Playbook '${activePlaybook.title}' executed successfully (${executed.status}).`);
        } catch (apprErr: any) {
          showNotification('success', `Playbook '${activePlaybook.title}' requested (${action.status}).`);
        }
      } else {
        showNotification('success', `Playbook '${activePlaybook.title}' executed successfully.`);
      }

      setActivePlaybook(null);
      fetchResponseData();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      showNotification('error', `Failed to execute ${activePlaybook.title}: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleApprove = async (id: string) => {
    setLoadingActionId(id);
    setActionNotice(null);
    try {
      const executed = await approveResponseActionApi(id, 'Approved via Response Center');
      showNotification('success', `Action ${id.slice(0, 8)} approved & executed (${executed.status}).`);
      fetchResponseData();
    } catch (err: any) {
      showNotification('error', `Approval failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setLoadingActionId(rejectId);
    setActionNotice(null);
    try {
      await rejectResponseActionApi(rejectId, rejectReason);
      showNotification('success', `Action ${rejectId.slice(0, 8)} rejected.`);
      setRejectId(null);
      setRejectReason('');
      fetchResponseData();
    } catch (err: any) {
      showNotification('error', `Rejection failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleRollback = async (id: string) => {
    setLoadingActionId(id);
    setActionNotice(null);
    try {
      const rolledBack = await rollbackResponseActionApi(id, 'Rolled back via Response Center');
      showNotification('success', `Action ${id.slice(0, 8)} rolled back (${rolledBack.status}).`);
      fetchResponseData();
    } catch (err: any) {
      showNotification('error', `Rollback failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleReTriggerAction = async (action: ResponseActionItem) => {
    setLoadingActionId(action.id);
    setActionNotice(null);
    try {
      const newAction = await createResponseActionApi({
        action_type: action.action_type,
        target_entity_type: action.target_entity_type,
        target_entity_id: action.target_entity_id,
        reason: `Re-triggered action for ${action.target_entity_id}`
      });

      if (newAction.status === 'PENDING_APPROVAL') {
        const executed = await approveResponseActionApi(newAction.id, 'Re-triggered and approved by analyst');
        showNotification('success', `Re-triggered action '${newAction.action_type}' executed successfully (${executed.status}).`);
      } else {
        showNotification('success', `Re-triggered action '${newAction.action_type}' created.`);
      }
      fetchResponseData();
    } catch (err: any) {
      showNotification('error', `Re-trigger failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim()) return;
    setLoadingActionId('CREATE_MODAL');
    setActionNotice(null);
    try {
      const created = await createResponseActionApi({
        action_type: actionType,
        target_entity_type: targetType,
        target_entity_id: targetId,
        reason: reason || 'Manual action requested by SOC Analyst',
      });
      showNotification('success', `Response Action '${created.action_type}' requested successfully.`);
      setShowCreateModal(false);
      setTargetId('');
      setReason('');
      fetchResponseData();
    } catch (err: any) {
      showNotification('error', `Failed to request action: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Response"
        subtitle="Controlled response execution, host containment, user isolation, and action approvals."
        phaseBadge="SOC Operations"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Response' }]}
        actions={
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Request Response Action</span>
            </button>
            <button
              type="button"
              onClick={fetchResponseData}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 bg-white text-slate-700 border border-slate-200 font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Global Notification Banner */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-700 font-bold px-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Controlled Response Playbooks Interactive Grid */}
      <Card title="Controlled Response Playbooks" subtitle="Execute sandbox containment policies with full audit tracking" headerStyle="green">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {playbooks.map((pb) => {
            const IconComp = pb.icon;
            const isPendingThis = loadingActionId === pb.id;
            return (
              <div
                key={pb.id}
                className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50 hover:bg-slate-100/80 transition-colors flex flex-col justify-between"
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2.5 rounded-lg shrink-0 ${pb.color}`}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h5 className="font-bold text-slate-900 text-xs truncate">{pb.title}</h5>
                    <p className="text-[11px] text-slate-500 leading-tight">{pb.description}</p>
                    <p className="text-[10px] text-slate-400 font-mono pt-1">Default Target: {pb.defaultTarget}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenPlaybookModal(pb)}
                  disabled={isPendingThis}
                  className={`w-full py-2 ${pb.btnColor} text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPendingThis ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Execute {pb.title}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

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
            <div className="col-span-3 text-xs text-slate-500 p-2">Standard Response Policies Active</div>
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
                <th className="py-2.5 px-3 text-right">Analyst Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
              {actions.map((a) => {
                const isPendingThisAction = loadingActionId === a.id;
                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-900">{a.id.slice(0, 8)}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{a.action_type}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{a.target_entity_type}: {a.target_entity_id}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{a.policy_id_code || 'MANUAL'}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge
                        status={
                          a.status === 'EXECUTED'
                            ? 'healthy'
                            : a.status === 'PENDING_APPROVAL'
                            ? 'warning'
                            : a.status === 'ROLLED_BACK'
                            ? 'info'
                            : 'critical'
                        }
                        label={a.status}
                      />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      {(a.status === 'PENDING_APPROVAL' || a.status === 'RECOMMENDED') && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(a.id)}
                            disabled={isPendingThisAction}
                            className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-800 inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                          >
                            {isPendingThisAction ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            <span>Approve & Execute</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectId(a.id)}
                            disabled={isPendingThisAction}
                            className="px-2.5 py-1 bg-rose-700 text-white rounded-lg text-[11px] font-bold hover:bg-rose-800 inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                      {a.status === 'EXECUTED' && (
                        <button
                          type="button"
                          onClick={() => handleRollback(a.id)}
                          disabled={isPendingThisAction}
                          className="px-2.5 py-1 bg-slate-700 text-white rounded-lg text-[11px] font-bold hover:bg-slate-800 inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                        >
                          {isPendingThisAction ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          <span>Rollback</span>
                        </button>
                      )}
                      {(a.status === 'ROLLED_BACK' || a.status === 'REJECTED') && (
                        <button
                          type="button"
                          onClick={() => handleReTriggerAction(a)}
                          disabled={isPendingThisAction}
                          className="px-2.5 py-1 bg-emerald-800 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-900 inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                        >
                          {isPendingThisAction ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          <span>Re-trigger Action</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {actions.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 font-medium">
                    No active response actions recorded. Click "Request Response Action" or execute a playbook above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Playbook Execution Confirmation Modal */}
      {activePlaybook && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="h-5 w-5 text-emerald-700" />
                <h3 className="font-extrabold text-slate-900 text-sm">Execute {activePlaybook.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePlaybook(null)}
                className="text-slate-400 font-bold hover:text-slate-700 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmExecutePlaybook} className="space-y-3">
              <p className="text-slate-600 text-[11px]">{activePlaybook.description}</p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Identifier ({activePlaybook.type})</label>
                <input
                  type="text"
                  required
                  value={playbookTarget}
                  onChange={(e) => setPlaybookTarget(e.target.value)}
                  placeholder={`e.g. ${activePlaybook.defaultTarget}`}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Execution Justification</label>
                <textarea
                  value={playbookReason}
                  onChange={(e) => setPlaybookReason(e.target.value)}
                  placeholder="Justification reason for executing controlled action"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs h-16 focus:ring-1 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900 font-medium">
                Note: Action will execute in CyberScope sandbox with complete audit log tracking.
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setActivePlaybook(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingActionId === activePlaybook.id}
                  className={`px-4 py-1.5 ${activePlaybook.btnColor} text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1.5`}
                >
                  {loadingActionId === activePlaybook.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Confirm & Execute</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Action Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-slate-900 text-sm">Request Response Action</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 font-bold hover:text-slate-700 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 bg-white"
                >
                  <option value="BLOCK_IP">BLOCK_IP (Sandbox Firewall)</option>
                  <option value="DISABLE_USER">DISABLE_USER (Sandbox Identity)</option>
                  <option value="TERMINATE_SESSION">TERMINATE_SESSION (Revoke Token)</option>
                  <option value="ISOLATE_HOST">ISOLATE_HOST (Host Network Isolation)</option>
                  <option value="QUARANTINE_ARTIFACT">QUARANTINE_ARTIFACT (File Containment)</option>
                  <option value="INVESTIGATE_FURTHER">INVESTIGATE_FURTHER (Triage Case)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Entity Type</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 bg-white"
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
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Justification Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for requesting action"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs h-16"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingActionId === 'CREATE_MODAL'}
                  className="px-4 py-1.5 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                >
                  {loadingActionId === 'CREATE_MODAL' ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-4 space-y-3 text-xs">
            <h3 className="font-extrabold text-slate-900 text-sm">Reject Response Action</h3>
            <p className="text-slate-600 text-[11px]">Specify reason for rejecting this response recommendation:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection justification reason"
              className="w-full p-2 border border-slate-300 rounded-lg h-16"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={loadingActionId === rejectId}
                className="px-3 py-1.5 bg-rose-700 text-white font-bold rounded-lg hover:bg-rose-800 disabled:opacity-50 cursor-pointer"
              >
                {loadingActionId === rejectId ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
