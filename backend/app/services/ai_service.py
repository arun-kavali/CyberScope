import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.config import settings
from app.models.intelligence import (
    AlertAnalysis, RiskScore, AnomalyScore, CorrelationResult, Incident, IncidentAlert, IncidentTimeline, AIIntelligence
)
from app.models.evidence import Alert, Investigation
from app.services.llm import ollama_service, OllamaServiceException
from app.services.prompt_builder import (
    SYSTEM_GROUNDING_INSTRUCTION,
    build_alert_explanation_prompt,
    build_incident_summary_prompt,
    build_investigation_narrative_prompt
)
from app.schemas.ai import AIStructuredOutput, validate_and_filter_evidence_references
from app.realtime.publisher import (
    publish_ai_intelligence_started,
    publish_ai_intelligence_completed,
    publish_ai_intelligence_failed
)

logger = logging.getLogger("cyberscope.ai_service")

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class AIService:
    """
    High-level AI Orchestration Service for CyberScope.
    Handles evidence aggregation, prompt assembly, Ollama invocation,
    structured output validation, DB persistence, and realtime events.
    Enforces strict failure isolation: AI errors NEVER crash parent operations.
    """

    async def generate_alert_intelligence(
        self, db: Session, alert_id: uuid.UUID, force_refresh: bool = False
    ) -> AIIntelligence:
        """
        Generates or retrieves structured AI intelligence explanation for a single alert.
        """
        # 1. Check existing record
        existing = (
            db.query(AIIntelligence)
            .filter(
                AIIntelligence.target_type == "ALERT",
                AIIntelligence.target_id == alert_id,
                AIIntelligence.intelligence_type == "ALERT_EXPLANATION"
            )
            .first()
        )
        if existing and existing.status == "COMPLETED" and not force_refresh:
            return existing

        # 2. Fetch alert & related evidence
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            raise ValueError(f"Alert with ID {alert_id} not found.")

        risk = db.query(RiskScore).filter(RiskScore.alert_id == alert_id).first()
        anomaly = db.query(AnomalyScore).filter(AnomalyScore.alert_id == alert_id).first()
        
        # Check correlation
        corr_desc = None
        corr_res = db.query(CorrelationResult).order_by(CorrelationResult.created_at.desc()).first()
        if corr_res and corr_res.correlated_alert_ids:
            corr_ids = corr_res.correlated_alert_ids.get("alert_ids", [])
            if str(alert_id) in [str(cid) for cid in corr_ids]:
                corr_desc = corr_res.rule_name

        # Prepare evidence dicts & valid ID set
        valid_ids = {str(alert.id)}
        if risk: valid_ids.add(str(risk.id))
        if anomaly: valid_ids.add(str(anomaly.id))

        alert_dict = {
            "id": str(alert.id),
            "alert_code": alert.alert_code,
            "event_type": alert.event_type,
            "event_category": alert.event_category,
            "severity": alert.severity,
            "status": alert.status,
            "timestamp": alert.timestamp.isoformat() if alert.timestamp else "",
            "description": alert.description,
            "user_context": alert.user_context,
            "asset_context": alert.asset_context,
            "source_ip": alert.source_ip,
            "destination_ip": alert.destination_ip,
            "technique": alert.technique,
            "indicator": alert.indicator,
            "raw_payload": alert.raw_payload or {}
        }
        risk_dict = {
            "id": str(risk.id) if risk else "",
            "score": risk.score if risk else 0.0,
            "confidence": risk.confidence if risk else 0.0,
            "false_positive_likelihood": risk.false_positive_likelihood if risk else 0.0,
            "contributors": risk.contributors if risk else {}
        } if risk else None

        anomaly_dict = {
            "id": str(anomaly.id) if anomaly else "",
            "anomaly_score": anomaly.anomaly_score if anomaly else 0.0,
            "detector_name": anomaly.detector_name if anomaly else "",
            "reasons": anomaly.reasons if anomaly else {}
        } if anomaly else None

        corr_dict = {"rule_name": corr_desc} if corr_desc else None

        # 3. Create/update DB record to PROCESSING
        record = existing or AIIntelligence(
            id=uuid.uuid4(),
            target_type="ALERT",
            target_id=alert_id,
            intelligence_type="ALERT_EXPLANATION",
            model_name=settings.OLLAMA_MODEL,
            prompt_version=settings.PROMPT_VERSION,
            intelligence_version=settings.INTELLIGENCE_VERSION
        )
        record.status = "PROCESSING"
        record.updated_at = utc_now()
        db.add(record)
        db.commit()

        await publish_ai_intelligence_started(str(record.id), "ALERT", str(alert_id))

        # 4. Invoke Ollama & Process Response with Failure Isolation
        try:
            prompt = build_alert_explanation_prompt(alert_dict, risk_dict, anomaly_dict, corr_dict)
            raw_output = await ollama_service.generate_structured_intelligence(prompt, SYSTEM_GROUNDING_INSTRUCTION)
            
            # Validate output Pydantic & references
            validated_output, valid_refs = validate_and_filter_evidence_references(raw_output, valid_ids)
            parsed_model = AIStructuredOutput(**validated_output)

            record.status = "COMPLETED"
            record.structured_output = parsed_model.model_dump()
            record.evidence_references = [r.model_dump() for r in parsed_model.evidence_references]
            record.error_info = None
            record.updated_at = utc_now()
            db.commit()

            await publish_ai_intelligence_completed(str(record.id), "ALERT", str(alert_id), record.structured_output)
            return record

        except Exception as err:
            logger.error(f"AI Alert Intelligence generation failed for alert {alert_id}: {err}")
            record.status = "FAILED"
            record.error_info = {"error": "AI analysis is currently unavailable. Please try again."}
            record.updated_at = utc_now()
            db.commit()

            await publish_ai_intelligence_failed(str(record.id), "ALERT", str(alert_id), "AI analysis is currently unavailable. Please try again.")
            return record

    async def generate_incident_intelligence(
        self, db: Session, incident_id: uuid.UUID, force_refresh: bool = False
    ) -> AIIntelligence:
        """
        Generates structured AI summary for an incident based on correlated alerts and timeline.
        """
        existing = (
            db.query(AIIntelligence)
            .filter(
                AIIntelligence.target_type == "INCIDENT",
                AIIntelligence.target_id == incident_id,
                AIIntelligence.intelligence_type == "INCIDENT_SUMMARY"
            )
            .first()
        )
        if existing and existing.status == "COMPLETED" and not force_refresh:
            return existing

        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident with ID {incident_id} not found.")

        # Get correlated alerts
        incident_alerts = db.query(IncidentAlert).filter(IncidentAlert.incident_id == incident_id).all()
        alert_ids = [ia.alert_id for ia in incident_alerts]
        alerts = db.query(Alert).filter(Alert.id.in_(alert_ids)).all() if alert_ids else []

        # Get timeline
        timeline = db.query(IncidentTimeline).filter(IncidentTimeline.incident_id == incident_id).order_by(IncidentTimeline.timestamp.asc()).all()

        valid_ids = {str(incident.id)} | {str(a.id) for a in alerts}

        incident_dict = {
            "id": str(incident.id),
            "incident_number": incident.incident_number,
            "title": incident.title,
            "summary": incident.summary,
            "severity": incident.severity,
            "status": incident.status,
            "risk_score": incident.risk_score,
            "confidence_score": incident.confidence_score,
            "created_at": incident.created_at.isoformat() if incident.created_at else ""
        }
        alerts_dict = [{
            "id": str(a.id),
            "alert_code": a.alert_code,
            "severity": a.severity,
            "event_type": a.event_type,
            "user_context": a.user_context,
            "asset_context": a.asset_context,
            "timestamp": a.timestamp.isoformat() if a.timestamp else "",
            "description": a.description
        } for a in alerts]

        timeline_dict = [{
            "event_type": t.event_type,
            "description": t.description,
            "timestamp": t.timestamp.isoformat() if t.timestamp else ""
        } for t in timeline]

        record = existing or AIIntelligence(
            id=uuid.uuid4(),
            target_type="INCIDENT",
            target_id=incident_id,
            intelligence_type="INCIDENT_SUMMARY",
            model_name=settings.OLLAMA_MODEL,
            prompt_version=settings.PROMPT_VERSION,
            intelligence_version=settings.INTELLIGENCE_VERSION
        )
        record.status = "PROCESSING"
        record.updated_at = utc_now()
        db.add(record)
        db.commit()

        await publish_ai_intelligence_started(str(record.id), "INCIDENT", str(incident_id))

        try:
            prompt = build_incident_summary_prompt(incident_dict, alerts_dict, timeline_dict)
            raw_output = await ollama_service.generate_structured_intelligence(prompt, SYSTEM_GROUNDING_INSTRUCTION)
            
            validated_output, _ = validate_and_filter_evidence_references(raw_output, valid_ids)
            parsed_model = AIStructuredOutput(**validated_output)

            record.status = "COMPLETED"
            record.structured_output = parsed_model.model_dump()
            record.evidence_references = [r.model_dump() for r in parsed_model.evidence_references]
            record.error_info = None
            record.updated_at = utc_now()
            db.commit()

            await publish_ai_intelligence_completed(str(record.id), "INCIDENT", str(incident_id), record.structured_output)
            return record

        except Exception as err:
            logger.error(f"AI Incident Intelligence generation failed for incident {incident_id}: {err}")
            record.status = "FAILED"
            record.error_info = {"error": "AI analysis is currently unavailable. Please try again."}
            record.updated_at = utc_now()
            db.commit()

            await publish_ai_intelligence_failed(str(record.id), "INCIDENT", str(incident_id), "AI analysis is currently unavailable. Please try again.")
            return record

    async def generate_investigation_narrative(
        self, db: Session, incident_id: uuid.UUID, force_refresh: bool = False
    ) -> AIIntelligence:
        """
        Generates investigation workspace narrative & advisory recommendations for an incident.
        """
        existing = (
            db.query(AIIntelligence)
            .filter(
                AIIntelligence.target_type == "INVESTIGATION",
                AIIntelligence.target_id == incident_id,
                AIIntelligence.intelligence_type == "INVESTIGATION_NARRATIVE"
            )
            .first()
        )
        if existing and existing.status == "COMPLETED" and not force_refresh:
            return existing

        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident with ID {incident_id} not found.")

        inv = db.query(Investigation).filter(Investigation.id == incident.investigation_id).first() if incident.investigation_id else None
        
        # Correlated alerts & timeline
        incident_alerts = db.query(IncidentAlert).filter(IncidentAlert.incident_id == incident_id).all()
        alert_ids = [ia.alert_id for ia in incident_alerts]
        alerts = db.query(Alert).filter(Alert.id.in_(alert_ids)).all() if alert_ids else []

        timeline = db.query(IncidentTimeline).filter(IncidentTimeline.incident_id == incident_id).order_by(IncidentTimeline.timestamp.asc()).all()

        # Related incidents (same user or asset)
        user_names = {a.user_context for a in alerts if a.user_context}
        asset_names = {a.asset_context for a in alerts if a.asset_context}
        related_incidents_list = []
        if user_names or asset_names:
            other_ia = db.query(IncidentAlert).join(Alert).filter(
                IncidentAlert.incident_id != incident_id,
                (Alert.user_context.in_(user_names) | Alert.asset_context.in_(asset_names))
            ).limit(5).all()
            rel_inc_ids = list({ia.incident_id for ia in other_ia})
            if rel_inc_ids:
                rel_incs = db.query(Incident).filter(Incident.id.in_(rel_inc_ids)).all()
                related_incidents_list = [{
                    "incident_number": ri.incident_number,
                    "title": ri.title,
                    "severity": ri.severity,
                    "status": ri.status
                } for ri in rel_incs]

        valid_ids = {str(incident.id)} | {str(a.id) for a in alerts}

        incident_dict = {
            "id": str(incident.id),
            "incident_number": incident.incident_number,
            "title": incident.title,
            "severity": incident.severity,
            "status": incident.status,
            "risk_score": incident.risk_score,
            "confidence_score": incident.confidence_score
        }
        inv_dict = {
            "notes": inv.notes if inv else "None",
            "status": inv.status if inv else "IN_PROGRESS"
        }
        alerts_dict = [{
            "id": str(a.id),
            "alert_code": a.alert_code,
            "severity": a.severity,
            "event_type": a.event_type,
            "user_context": a.user_context,
            "asset_context": a.asset_context,
            "indicator": a.indicator,
            "technique": a.technique,
            "timestamp": a.timestamp.isoformat() if a.timestamp else ""
        } for a in alerts]
        timeline_dict = [{
            "event_type": t.event_type,
            "description": t.description,
            "timestamp": t.timestamp.isoformat() if t.timestamp else ""
        } for t in timeline]

        record = existing or AIIntelligence(
            id=uuid.uuid4(),
            target_type="INVESTIGATION",
            target_id=incident_id,
            intelligence_type="INVESTIGATION_NARRATIVE",
            model_name=settings.OLLAMA_MODEL,
            prompt_version=settings.PROMPT_VERSION,
            intelligence_version=settings.INTELLIGENCE_VERSION
        )
        record.status = "PROCESSING"
        record.updated_at = utc_now()
        db.add(record)
        db.commit()

        await publish_ai_intelligence_started(str(record.id), "INVESTIGATION", str(incident_id))

        try:
            prompt = build_investigation_narrative_prompt(incident_dict, inv_dict, alerts_dict, timeline_dict, related_incidents_list)
            raw_output = await ollama_service.generate_structured_intelligence(prompt, SYSTEM_GROUNDING_INSTRUCTION)

            validated_output, _ = validate_and_filter_evidence_references(raw_output, valid_ids)
            parsed_model = AIStructuredOutput(**validated_output)

            record.status = "COMPLETED"
            record.structured_output = parsed_model.model_dump()
            record.evidence_references = [r.model_dump() for r in parsed_model.evidence_references]
            record.error_info = None
            record.updated_at = utc_now()
            db.commit()

            await publish_ai_intelligence_completed(str(record.id), "INVESTIGATION", str(incident_id), record.structured_output)
            return record

        except Exception as err:
            logger.error(f"AI Investigation Narrative generation failed for incident {incident_id}: {err}")
            record.status = "FAILED"
            record.error_info = {"error": "AI analysis is currently unavailable. Please try again."}
            record.updated_at = utc_now()
            db.commit()

            await publish_ai_intelligence_failed(str(record.id), "INVESTIGATION", str(incident_id), "AI analysis is currently unavailable. Please try again.")
            return record

ai_service = AIService()
