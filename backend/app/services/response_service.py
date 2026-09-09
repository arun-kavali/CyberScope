import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.models.response import ResponsePolicy, ResponseAction, SandboxUser, SandboxEndpoint, SandboxFirewallRule
from app.models.auth import UserSession
from app.models.evidence import Investigation
from app.services.audit_service import AuditService
from app.services.investigation import start_incident_investigation

SUPPORTED_ACTIONS = {
    "BLOCK_IP",
    "DISABLE_USER",
    "TERMINATE_SESSION",
    "ISOLATE_ENDPOINT",
    "ISOLATE_HOST",
    "QUARANTINE_ARTIFACT",
    "INVESTIGATE_FURTHER"
}

class ResponseService:
    @staticmethod
    def seed_default_policies(db: Session) -> None:
        """
        Seeds deterministic response policies if they do not exist yet.
        """
        policies_data = [
            {
                "policy_id_code": "POL-001",
                "policy_name": "High-Risk Malicious IP Block Policy",
                "conditions": {"min_risk": 90, "min_confidence": 85, "malicious_indicator": True},
                "action": "BLOCK_IP",
                "enabled": True,
                "requires_approval": True
            },
            {
                "policy_id_code": "POL-002",
                "policy_name": "Compromised Account Containment Policy",
                "conditions": {"min_risk": 80, "credential_compromised": True},
                "action": "DISABLE_USER",
                "enabled": True,
                "requires_approval": True
            },
            {
                "policy_id_code": "POL-003",
                "policy_name": "Ransomware Endpoint Isolation Policy",
                "conditions": {"min_risk": 85, "ransomware_signature": True},
                "action": "ISOLATE_ENDPOINT",
                "enabled": True,
                "requires_approval": True
            },
            {
                "policy_id_code": "POL-004",
                "policy_name": "Session Anomaly Invalidation Policy",
                "conditions": {"session_anomaly": True},
                "action": "TERMINATE_SESSION",
                "enabled": True,
                "requires_approval": True
            },
            {
                "policy_id_code": "POL-005",
                "policy_name": "Malicious Artifact Quarantine Policy",
                "conditions": {"malicious_file": True},
                "action": "QUARANTINE_ARTIFACT",
                "enabled": True,
                "requires_approval": True
            },
            {
                "policy_id_code": "POL-006",
                "policy_name": "Suspicious Activity Triage Escalation Policy",
                "conditions": {"suspicious_activity": True},
                "action": "INVESTIGATE_FURTHER",
                "enabled": True,
                "requires_approval": False
            }
        ]

        for p_data in policies_data:
            existing = db.scalar(select(ResponsePolicy).where(ResponsePolicy.policy_id_code == p_data["policy_id_code"]))
            if not existing:
                policy = ResponsePolicy(
                    policy_id_code=p_data["policy_id_code"],
                    policy_name=p_data["policy_name"],
                    conditions=p_data["conditions"],
                    action=p_data["action"],
                    enabled=p_data["enabled"],
                    requires_approval=p_data["requires_approval"]
                )
                db.add(policy)
        db.commit()

    @staticmethod
    def seed_sandbox_entities(db: Session) -> None:
        """
        Seeds standard sandbox entities (USR-4821, EP-0017, 185.220.101.5).
        """
        user = db.scalar(select(SandboxUser).where(SandboxUser.user_code == "USR-4821"))
        if not user:
            db.add(SandboxUser(user_code="USR-4821", username="jdoe", status="ACTIVE"))

        ep = db.scalar(select(SandboxEndpoint).where(SandboxEndpoint.endpoint_code == "EP-0017"))
        if not ep:
            db.add(SandboxEndpoint(endpoint_code="EP-0017", hostname="WORKSTATION-017", ip_address="10.0.4.17", status="CONNECTED"))

        fw = db.scalar(select(SandboxFirewallRule).where(SandboxFirewallRule.ip_address == "185.220.101.5"))
        if not fw:
            db.add(SandboxFirewallRule(rule_code="FW-9901", ip_address="185.220.101.5", action="ALLOWED"))

        db.commit()

    @staticmethod
    def list_policies(db: Session) -> List[ResponsePolicy]:
        ResponseService.seed_default_policies(db)
        return db.scalars(select(ResponsePolicy).order_by(ResponsePolicy.policy_id_code.asc())).all()

    @staticmethod
    def evaluate_policies(
        db: Session,
        target_entity_type: str,
        target_entity_id: str,
        risk_score: float = 0.0,
        confidence_score: float = 0.0,
        malicious_indicator: bool = False,
        context: Optional[Dict[str, Any]] = None
    ) -> ResponseAction:
        ResponseService.seed_default_policies(db)
        policies = db.scalars(select(ResponsePolicy).where(ResponsePolicy.enabled == True)).all()
        ctx = context or {}

        matched_policy = None
        for p in policies:
            conds = p.conditions or {}
            min_r = conds.get("min_risk", 0)
            min_c = conds.get("min_confidence", 0)
            req_mal = conds.get("malicious_indicator", False)

            match = True
            if min_r and risk_score < min_r:
                match = False
            if min_c and confidence_score < min_c:
                match = False
            if req_mal and not malicious_indicator:
                match = False
            
            # Additional contextual checks
            for key, val in conds.items():
                if key not in ("min_risk", "min_confidence", "malicious_indicator"):
                    if ctx.get(key) != val:
                        match = False
                        break
            
            if match:
                matched_policy = p
                break

        action_type = matched_policy.action if matched_policy else "INVESTIGATE_FURTHER"
        status = "PENDING_APPROVAL" if (matched_policy and matched_policy.requires_approval) else "RECOMMENDED"

        action_record = ResponseAction(
            action_type=action_type,
            policy_id=matched_policy.id if matched_policy else None,
            target_entity_type=target_entity_type.upper(),
            target_entity_id=target_entity_id,
            status=status,
            execution_payload={
                "risk_score": risk_score,
                "confidence_score": confidence_score,
                "malicious_indicator": malicious_indicator,
                "context": ctx,
                "policy_code": matched_policy.policy_id_code if matched_policy else "DEFAULT"
            }
        )
        db.add(action_record)
        db.commit()
        db.refresh(action_record)

        # Audit recommendation event
        AuditService.log_event(
            db=db,
            action="RESPONSE_RECOMMENDATION_GENERATED",
            target_type=target_entity_type,
            target_id=target_entity_id,
            reason=f"Policy {matched_policy.policy_id_code if matched_policy else 'DEFAULT'} generated recommendation {action_type}",
            audit_metadata={"action_id": str(action_record.id), "status": status}
        )

        return action_record

    @staticmethod
    def create_action(
        db: Session,
        action_type: str,
        target_entity_type: str,
        target_entity_id: str,
        policy_id: Optional[uuid.UUID] = None,
        requested_by: Optional[uuid.UUID] = None,
        reason: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ResponseAction:
        if action_type.upper() not in SUPPORTED_ACTIONS:
            raise ValueError(f"Unsupported response action: {action_type}")

        policy = db.get(ResponsePolicy, policy_id) if policy_id else None
        requires_appr = policy.requires_approval if policy else True

        status = "PENDING_APPROVAL" if requires_appr else "APPROVED"

        action_record = ResponseAction(
            action_type=action_type.upper(),
            policy_id=policy.id if policy else None,
            target_entity_type=target_entity_type.upper(),
            target_entity_id=target_entity_id,
            status=status,
            requested_by=requested_by,
            execution_payload={"reason": reason, "context": context or {}}
        )
        db.add(action_record)
        db.commit()
        db.refresh(action_record)

        AuditService.log_event(
            db=db,
            action="RESPONSE_ACTION_REQUESTED",
            actor_user_id=requested_by,
            target_type=target_entity_type,
            target_id=target_entity_id,
            reason=reason or f"Requested response action {action_type}",
            audit_metadata={"action_id": str(action_record.id), "status": status}
        )

        return action_record

    @staticmethod
    def execute_sandbox_action(db: Session, action: ResponseAction) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Executes action STRICTLY within local database sandbox environment.
        Returns (previous_state, new_state).
        """
        ResponseService.seed_sandbox_entities(db)
        atype = action.action_type
        target_id = action.target_entity_id
        prev_state = {}
        new_state = {}

        if atype == "BLOCK_IP":
            fw = db.scalar(select(SandboxFirewallRule).where(SandboxFirewallRule.ip_address == target_id))
            if not fw:
                fw = SandboxFirewallRule(rule_code=f"FW-{uuid.uuid4().hex[:6]}", ip_address=target_id, action="ALLOWED")
                db.add(fw)
                db.flush()

            prev_state = {"ip_address": fw.ip_address, "action": fw.action}
            fw.action = "BLOCKED"
            db.commit()
            new_state = {"ip_address": fw.ip_address, "action": fw.action}

        elif atype == "DISABLE_USER":
            user = db.scalar(select(SandboxUser).where((SandboxUser.user_code == target_id) | (SandboxUser.username == target_id)))
            if not user:
                user = SandboxUser(user_code=target_id, username=target_id, status="ACTIVE")
                db.add(user)
                db.flush()

            prev_state = {"user_code": user.user_code, "username": user.username, "status": user.status}
            user.status = "BLOCKED"
            db.commit()
            new_state = {"user_code": user.user_code, "username": user.username, "status": user.status}

        elif atype == "TERMINATE_SESSION":
            # Revoke active user sessions in DB for sandbox user
            sessions = db.scalars(select(UserSession).where(UserSession.is_revoked == False)).all()
            revoked_count = len(sessions)
            for s in sessions:
                s.is_revoked = True
            db.commit()
            prev_state = {"active_sessions": revoked_count, "status": "ACTIVE"}
            new_state = {"active_sessions": 0, "status": "TERMINATED"}

        elif atype in ("ISOLATE_ENDPOINT", "ISOLATE_HOST"):
            ep = db.scalar(select(SandboxEndpoint).where((SandboxEndpoint.endpoint_code == target_id) | (SandboxEndpoint.hostname == target_id)))
            if not ep:
                ep = SandboxEndpoint(endpoint_code=target_id, hostname=target_id, ip_address="10.0.0.99", status="CONNECTED")
                db.add(ep)
                db.flush()

            prev_state = {"endpoint_code": ep.endpoint_code, "hostname": ep.hostname, "status": ep.status}
            ep.status = "ISOLATED"
            db.commit()
            new_state = {"endpoint_code": ep.endpoint_code, "hostname": ep.hostname, "status": ep.status}

        elif atype == "QUARANTINE_ARTIFACT":
            prev_state = {"artifact_id": target_id, "status": "ACCESSIBLE"}
            new_state = {"artifact_id": target_id, "status": "QUARANTINED"}

        elif atype == "INVESTIGATE_FURTHER":
            inv = Investigation(
                summary=f"Investigation for response action target {target_id}",
                notes=f"Investigation initiated for response action target {target_id}",
                status="IN_PROGRESS"
            )
            db.add(inv)
            db.commit()
            prev_state = {"target_id": target_id, "status": "UNINVESTIGATED"}
            new_state = {"target_id": target_id, "investigation_id": str(inv.id), "status": "IN_PROGRESS"}

        return prev_state, new_state

    @staticmethod
    def approve_action(db: Session, action_id: uuid.UUID, analyst_id: uuid.UUID, reason: Optional[str] = None) -> ResponseAction:
        action = db.get(ResponseAction, action_id)
        if not action:
            raise ValueError("Response action not found")

        if action.status in ("EXECUTED", "ROLLED_BACK"):
            raise ValueError(f"Action is already in state {action.status}")

        action.approved_by = analyst_id
        prev_state, new_state = ResponseService.execute_sandbox_action(db, action)
        
        action.status = "EXECUTED"
        action.executed_at = datetime.now(timezone.utc)
        payload = dict(action.execution_payload or {})
        payload.update({"previous_state": prev_state, "new_state": new_state, "approval_reason": reason})
        action.execution_payload = payload
        db.commit()
        db.refresh(action)

        AuditService.log_event(
            db=db,
            action="RESPONSE_ACTION_APPROVED_AND_EXECUTED",
            actor_user_id=analyst_id,
            target_type=action.target_entity_type,
            target_id=action.target_entity_id,
            reason=reason or f"Approved and executed sandbox response action {action.action_type}",
            previous_state=prev_state,
            new_state=new_state,
            audit_metadata={"action_id": str(action.id), "action_type": action.action_type}
        )

        return action

    @staticmethod
    def reject_action(db: Session, action_id: uuid.UUID, analyst_id: uuid.UUID, reason: str) -> ResponseAction:
        action = db.get(ResponseAction, action_id)
        if not action:
            raise ValueError("Response action not found")

        if action.status == "EXECUTED":
            raise ValueError("Cannot reject an action that has already been executed. Use rollback instead.")

        prev_status = action.status
        action.status = "REJECTED"
        payload = dict(action.execution_payload or {})
        payload.update({"rejection_reason": reason})
        action.execution_payload = payload
        db.commit()
        db.refresh(action)

        AuditService.log_event(
            db=db,
            action="RESPONSE_ACTION_REJECTED",
            actor_user_id=analyst_id,
            target_type=action.target_entity_type,
            target_id=action.target_entity_id,
            reason=reason,
            previous_state={"status": prev_status},
            new_state={"status": "REJECTED"},
            audit_metadata={"action_id": str(action.id)}
        )

        return action

    @staticmethod
    def rollback_action(db: Session, action_id: uuid.UUID, analyst_id: uuid.UUID, reason: Optional[str] = None) -> ResponseAction:
        action = db.get(ResponseAction, action_id)
        if not action:
            raise ValueError("Response action not found")

        if action.status != "EXECUTED":
            raise ValueError("Only EXECUTED actions can be rolled back")

        payload = action.execution_payload or {}
        prev_state = payload.get("previous_state") or {}
        curr_state = payload.get("new_state") or {}

        if not prev_state and action.action_type not in ("QUARANTINE_ARTIFACT", "TERMINATE_SESSION"):
            raise ValueError("Action does not have a safe previous state for rollback")

        # Restore previous state in sandbox
        atype = action.action_type
        target_id = action.target_entity_id

        if atype == "BLOCK_IP":
            fw = db.scalar(select(SandboxFirewallRule).where(SandboxFirewallRule.ip_address == target_id))
            if fw:
                fw.action = prev_state.get("action", "ALLOWED")

        elif atype == "DISABLE_USER":
            user = db.scalar(select(SandboxUser).where((SandboxUser.user_code == target_id) | (SandboxUser.username == target_id)))
            if user:
                user.status = prev_state.get("status", "ACTIVE")

        elif atype in ("ISOLATE_ENDPOINT", "ISOLATE_HOST"):
            ep = db.scalar(select(SandboxEndpoint).where((SandboxEndpoint.endpoint_code == target_id) | (SandboxEndpoint.hostname == target_id)))
            if ep:
                ep.status = prev_state.get("status", "CONNECTED")

        action.status = "ROLLED_BACK"
        payload_updated = dict(payload)
        payload_updated.update({"rolled_back_at": datetime.now(timezone.utc).isoformat(), "rollback_reason": reason})
        action.execution_payload = payload_updated
        db.commit()
        db.refresh(action)

        AuditService.log_event(
            db=db,
            action="RESPONSE_ACTION_ROLLED_BACK",
            actor_user_id=analyst_id,
            target_type=action.target_entity_type,
            target_id=action.target_entity_id,
            reason=reason or f"Rolled back sandbox response action {action.action_type}",
            previous_state=curr_state,
            new_state=prev_state,
            audit_metadata={"action_id": str(action.id)}
        )

        return action
