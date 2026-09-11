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
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Filter,
  Info,
  ShieldCheck,
  Layers,
  Activity,
  Clock
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
  badgeBg: string;
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

  // Filters and table interactive states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

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
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeBg: 'bg-rose-100 text-rose-800',
      btnColor: 'bg-rose-700 hover:bg-rose-800 text-white',
      description: 'Block malicious IP on perimeter firewall',
      reason: 'Perimeter firewall block for high-risk threat actor IP'
    },
    {
      id: 'DISABLE_USER',
      title: 'Disable User Account',
      type: 'USER',
      defaultTarget: 'usr_jdoe',
      icon: UserX,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-800',
      btnColor: 'bg-amber-700 hover:bg-amber-800 text-white',
      description: 'Disable compromised user identity',
      reason: 'Active user account suspension due to credential compromise'
    },
    {
      id: 'TERMINATE_SESSION',
      title: 'Terminate User Session',
      type: 'USER',
      defaultTarget: 'usr_jdoe',
      icon: Zap,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeBg: 'bg-blue-100 text-blue-800',
      btnColor: 'bg-blue-700 hover:bg-blue-800 text-white',
      description: 'Force immediate token revocation',
      reason: 'Session token invalidation for security reset'
    },
    {
      id: 'ISOLATE_HOST',
      title: 'Isolate Host Asset',
      type: 'ENDPOINT',
      defaultTarget: 'EP-0017',
      icon: Laptop,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      badgeBg: 'bg-purple-100 text-purple-800',
      btnColor: 'bg-purple-700 hover:bg-purple-800 text-white',
      description: 'Isolate host network interface',
      reason: 'Network isolation to contain endpoint malware propagation'
    },
    {
      id: 'QUARANTINE_ARTIFACT',
      title: 'Quarantine Artifact',
      type: 'ARTIFACT',
      defaultTarget: 'hash_malicious_payload',
      icon: FileCheck,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      badgeBg: 'bg-teal-100 text-teal-800',
      btnColor: 'bg-teal-700 hover:bg-teal-800 text-white',
      description: 'Isolate suspicious executable file',
      reason: 'File quarantine for sandbox malware containment'
    },
    {
      id: 'INVESTIGATE_FURTHER',
      title: 'Investigate Further',
      type: 'ALERT',
      defaultTarget: 'ALT-9901',
      icon: Search,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      btnColor: 'bg-emerald-700 hover:bg-emerald-800 text-white',
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

  // Filter actions based on search term and status filter
  const filteredActions = actions.filter((a) => {
    const matchesSearch =
      !searchTerm ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.target_entity_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.policy_id_code && a.policy_id_code.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = actions.filter((a) => a.status === 'PENDING_APPROVAL' || a.status === 'RECOMMENDED').length;
  const executedCount = actions.filter((a) => a.status === 'EXECUTED').length;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Response"
        subtitle="Controlled response execution, host containment, user isolation, and audited sandbox approvals."
        phaseBadge="SOC Operations"
        breadcrumbs={[{ label: 'CyberScope' }, { label: 'Response' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1.5 text-xs px-3.5 py-1.5 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 transition-colors shadow-sm cursor-pointer"
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
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm transition-all animate-fadeIn ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center space-x-2.5">
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
            className="text-slate-400 hover:text-slate-700 font-bold px-1.5 py-0.5 cursor-pointer text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Playbooks Configured</span>
            <Layers className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{playbooks.length}</div>
          <div className="text-[10px] text-slate-400">Sandbox containment procedures</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Active Policies</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{policies.length}</div>
          <div className="text-[10px] text-slate-400">Automated policy rules</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Pending Approvals</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700 flex items-center space-x-1.5">
            <span>{pendingCount}</span>
            {pendingCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping inline-block" />}
          </div>
          <div className="text-[10px] text-slate-400">Requires analyst approval</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Actions Executed</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{executedCount}</div>
          <div className="text-[10px] text-slate-400">Successfully contained</div>
        </div>
      </div>

      {/* Controlled Response Playbooks Interactive Grid */}
      <Card
        title="Controlled Response Playbooks"
        subtitle="Pre-configured sandbox containment procedures with step-by-step audit logs"
        headerStyle="green"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {playbooks.map((pb) => {
            const IconComp = pb.icon;
            const isPendingThis = loadingActionId === pb.id;
            return (
              <div
                key={pb.id}
                className="group border border-slate-200 hover:border-emerald-500/50 rounded-xl p-4 space-y-3 bg-white hover:bg-slate-50/70 transition-all flex flex-col justify-between shadow-2xs hover:shadow-md"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-lg border ${pb.color}`}>
                      <IconComp className="h-4.5 w-4.5" />
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${pb.badgeBg}`}>
                      {pb.type}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900 text-xs group-hover:text-emerald-800 transition-colors">
                      {pb.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 leading-snug pt-0.5">
                      {pb.description}
                    </p>
                  </div>

                  <div className="bg-slate-50 group-hover:bg-white p-2 rounded-lg border border-slate-100 text-[10px] space-y-1 transition-colors">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Default Target:</span>
                      <span className="font-mono font-semibold text-slate-700">{pb.defaultTarget}</span>
                    </div>
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
                      <span>Execute Playbook</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Response Policy Summary */}
      <Card
        title="Active Response Policies"
        subtitle="Automated containment rules and trigger thresholds"
        headerStyle="green"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {policies.length > 0 ? (
            policies.map((p) => {
              const isExpanded = expandedPolicyId === p.id;
              return (
                <div
                  key={p.id}
                  className="p-3 border rounded-xl bg-white border-slate-200 hover:border-emerald-300 transition-all text-xs space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-800 font-mono font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {p.policy_id_code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {p.action}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-slate-900">{p.policy_name}</div>
                    <div className="text-[11px] text-slate-500 pt-0.5">
                      Approval Required: <span className="font-semibold text-slate-700">{p.requires_approval ? 'YES (Human-in-the-loop)' : 'NO (Automated)'}</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">
                      Updated: {new Date(p.updated_at).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedPolicyId(isExpanded ? null : p.id)}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Less' : 'Details'}</span>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="p-2 bg-slate-50 rounded-lg text-[10px] space-y-1 font-mono text-slate-600 border border-slate-200 animate-fadeIn">
                      <div>Policy ID: {p.id}</div>
                      <div>Created At: {new Date(p.created_at).toLocaleString()}</div>
                      <div>Conditions: {p.conditions ? JSON.stringify(p.conditions) : 'Standard Severity Threshold'}</div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-3 text-xs text-slate-500 p-4 text-center border border-dashed rounded-xl bg-slate-50">
              Standard Response Policies Active
            </div>
          )}
        </div>
      </Card>

      {/* Controlled Response Action Center */}
      <Card
        title="Controlled Response Action Center"
        subtitle="Audited containment actions with manual override & sandbox rollback"
        headerStyle="green"
        headerAction={
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium text-[11px]">{filteredActions.length} of {actions.length} Actions</span>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Table Search & Status Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by ID, action type, target..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] font-semibold">
              <span className="text-slate-400 flex items-center space-x-1 shrink-0 mr-1">
                <Filter className="h-3 w-3" />
                <span>Status:</span>
              </span>
              {['ALL', 'PENDING_APPROVAL', 'EXECUTED', 'ROLLED_BACK', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer ${
                    statusFilter === st
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All Actions' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Action Center Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3.5">Action ID</th>
                  <th className="py-3 px-3.5">Response Action</th>
                  <th className="py-3 px-3.5">Target Entity</th>
                  <th className="py-3 px-3.5">Policy Code</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Execution Time</th>
                  <th className="py-3 px-3.5 text-right">Operational Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
                {filteredActions.map((a) => {
                  const isPendingThisAction = loadingActionId === a.id;
                  const isExpanded = expandedActionId === a.id;
                  return (
                    <React.Fragment key={a.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3 px-3.5 font-mono font-bold text-emerald-800">
                          <button
                            type="button"
                            onClick={() => setExpandedActionId(isExpanded ? null : a.id)}
                            className="hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <span>{a.id.slice(0, 8)}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-3 w-3 text-slate-400" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3.5 font-bold text-slate-900">{a.action_type}</td>

                        <td className="py-3 px-3.5 font-mono text-slate-700">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold mr-1.5">
                            {a.target_entity_type}
                          </span>
                          <span>{a.target_entity_id}</span>
                        </td>

                        <td className="py-3 px-3.5 font-mono font-semibold text-slate-800">
                          {a.policy_id_code ? (
                            <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {a.policy_id_code}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">MANUAL</span>
                          )}
                        </td>

                        <td className="py-3 px-3.5">
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

                        <td className="py-3 px-3.5 font-mono text-slate-500 text-[11px]">
                          {new Date(a.created_at).toLocaleString()}
                        </td>

                        <td className="py-3 px-3.5 text-right space-x-1.5">
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

                      {/* Expandable Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 animate-fadeIn">
                          <td colSpan={7} className="p-3.5 text-xs text-slate-700 border-b border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                              <div>
                                <span className="font-bold text-slate-900 block mb-1">Target Information</span>
                                <div className="text-[11px] font-mono space-y-0.5 text-slate-600">
                                  <div>Type: {a.target_entity_type}</div>
                                  <div>ID: {a.target_entity_id}</div>
                                  <div>Action Code: {a.action_type}</div>
                                </div>
                              </div>

                              <div>
                                <span className="font-bold text-slate-900 block mb-1">Audit Tracking</span>
                                <div className="text-[11px] space-y-0.5 text-slate-600">
                                  <div>Requested By: <span className="font-mono">{a.requested_by || 'System Triage'}</span></div>
                                  <div>Approved By: <span className="font-mono">{a.approved_by || (a.status === 'EXECUTED' ? 'SOC Analyst' : 'Pending')}</span></div>
                                  <div>Executed At: <span className="font-mono">{a.executed_at ? new Date(a.executed_at).toLocaleString() : 'N/A'}</span></div>
                                </div>
                              </div>

                              <div>
                                <span className="font-bold text-slate-900 block mb-1">Execution Payload / Metadata</span>
                                <div className="text-[11px] font-mono bg-slate-50 p-2 rounded border border-slate-200 max-h-24 overflow-y-auto text-slate-700">
                                  {a.execution_payload ? JSON.stringify(a.execution_payload, null, 2) : 'Full sandbox containment log committed to PostgreSQL audit trail.'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filteredActions.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                      <div className="max-w-xs mx-auto space-y-2">
                        <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto" />
                        <p>No response actions match the selected filter.</p>
                        <button
                          type="button"
                          onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
                          className="text-xs text-emerald-700 hover:underline font-bold cursor-pointer"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Playbook Execution Confirmation Modal */}
      {activePlaybook && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-md ${activePlaybook.badgeBg}`}>
                  <ShieldAlert className="h-4.5 w-4.5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">Execute {activePlaybook.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePlaybook(null)}
                className="text-slate-400 font-bold hover:text-slate-700 cursor-pointer text-base"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmExecutePlaybook} className="space-y-3.5">
              <p className="text-slate-600 text-[11px] leading-relaxed">{activePlaybook.description}</p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Target Identifier ({activePlaybook.type})</label>
                  <button
                    type="button"
                    onClick={() => setPlaybookTarget(activePlaybook.defaultTarget)}
                    className="text-[10px] text-emerald-700 hover:underline font-bold cursor-pointer"
                  >
                    Use default
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={playbookTarget}
                  onChange={(e) => setPlaybookTarget(e.target.value)}
                  placeholder={`e.g. ${activePlaybook.defaultTarget}`}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-600 outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Execution Justification</label>
                <textarea
                  value={playbookReason}
                  onChange={(e) => setPlaybookReason(e.target.value)}
                  placeholder="Justification reason for executing controlled action"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs h-20 focus:ring-1 focus:ring-emerald-600 outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 text-[11px] text-emerald-900 font-medium flex items-start space-x-2">
                <Info className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>Note: Action will execute in CyberScope sandbox with complete audit log tracking.</span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActivePlaybook(null)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingActionId === activePlaybook.id}
                  className={`px-4 py-2 ${activePlaybook.btnColor} font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1.5 shadow-2xs`}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Request Response Action</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 font-bold hover:text-slate-700 cursor-pointer text-base"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 bg-white"
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
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 bg-white"
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
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Justification Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for requesting action"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs h-20"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingActionId === 'CREATE_MODAL'}
                  className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 disabled:opacity-50 cursor-pointer shadow-2xs"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-4 space-y-3.5 text-xs">
            <h3 className="font-extrabold text-slate-900 text-sm">Reject Response Action</h3>
            <p className="text-slate-600 text-[11px]">Specify reason for rejecting this response recommendation:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection justification reason"
              className="w-full p-2.5 border border-slate-300 rounded-lg h-20 outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <div className="flex justify-end space-x-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={loadingActionId === rejectId}
                className="px-4 py-1.5 bg-rose-700 text-white font-bold rounded-lg hover:bg-rose-800 disabled:opacity-50 cursor-pointer shadow-2xs"
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
