import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.models.identity import Profile
from app.models.intelligence import (
    Incident,
    IncidentAlert,
    IncidentTimeline,
    CorrelationResult,
    AlertAnalysis,
    RiskScore
)
from app.models.evidence import Alert
from app.auth.dependencies import require_soc_analyst
from app.services.audit_service import AuditService
from app.realtime.publisher import publish_incident_resolved

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", status_code=status.HTTP_200_OK)
@router.get("/", status_code=status.HTTP_200_OK)
async def list_incidents(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    incident_status: Optional[str] = Query(None, alias="status", description="Filter by status (OPEN, IN_PROGRESS, RESOLVED)"),
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)"),
    demo_mode: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves paginated list of correlated security incidents for SOC Analysts.
    Protected by SOC_ANALYST RBAC.
    """
    stmt = select(Incident)

    from app.auth.service import get_workspace_user_ids
    ws_user_ids = get_workspace_user_ids(db, current_user)
    user_incidents_subq = select(IncidentAlert.incident_id).join(Alert, Alert.id == IncidentAlert.alert_id).where(Alert.submitted_by_user_id.in_(ws_user_ids))
    stmt = stmt.where(Incident.id.in_(user_incidents_subq))

    if incident_status:
        stmt = stmt.where(Incident.status == incident_status.upper())
    if severity:
        stmt = stmt.where(Incident.severity == severity.upper())

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    offset = (page - 1) * limit

    incidents = db.scalars(
        stmt.order_by(desc(Incident.created_at)).offset(offset).limit(limit)
    ).all()

    items = []
    for inc in incidents:
        alert_count = db.scalar(
            select(func.count(IncidentAlert.id)).where(IncidentAlert.incident_id == inc.id)
        ) or 0

        items.append({
            "id": str(inc.id),
            "incident_number": inc.incident_number,
            "title": inc.title,
            "summary": inc.summary,
            "severity": inc.severity,
            "risk_score": float(inc.risk_score),
            "confidence_score": float(inc.confidence_score),
            "status": inc.status,
            "correlated_alert_count": alert_count,
            "created_at": inc.created_at.isoformat() if inc.created_at else None,
            "updated_at": inc.updated_at.isoformat() if inc.updated_at else None
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/{incident_id}", status_code=status.HTTP_200_OK)
async def get_incident_detail(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves detailed incident view including linked correlated alerts, correlation explanation,
    risk/confidence scores, and chronological timeline.
    Protected by SOC_ANALYST RBAC.
    """
    try:
        inc_uuid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID UUID format")

    incident = db.scalar(select(Incident).where(Incident.id == inc_uuid))
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")

    # Fetch correlated alerts
    inc_alerts = db.scalars(
        select(IncidentAlert).where(IncidentAlert.incident_id == inc_uuid).order_by(IncidentAlert.added_at.asc())
    ).all()

    alert_ids = [ia.alert_id for ia in inc_alerts]
    alerts = db.scalars(select(Alert).where(Alert.id.in_(alert_ids))).all() if alert_ids else []

    correlated_alerts_list = []
    for al in alerts:
        # Fetch individual alert analysis and risk scores
        analysis = db.scalar(select(AlertAnalysis).where(AlertAnalysis.alert_id == al.id))
        risk_rec = db.scalar(select(RiskScore).where(RiskScore.alert_id == al.id))

        correlated_alerts_list.append({
            "id": str(al.id),
            "alert_code": al.alert_code,
            "event_type": al.event_type,
            "event_category": al.event_category,
            "severity": al.severity,
            "status": al.status,
            "timestamp": al.timestamp.isoformat() if al.timestamp else None,
            "user_context": al.user_context,
            "asset_context": al.asset_context,
            "source_ip": al.source_ip,
            "destination_ip": al.destination_ip,
            "risk_score": float(risk_rec.score) if risk_rec else None,
            "confidence_score": float(risk_rec.confidence) if risk_rec else None
        })

    # Fetch timeline entries
    timeline_entries = db.scalars(
        select(IncidentTimeline)
        .where(IncidentTimeline.incident_id == inc_uuid)
        .order_by(IncidentTimeline.timestamp.asc())
    ).all()

    timeline_list = [
        {
            "id": str(te.id),
            "event_type": te.event_type,
            "description": te.description,
            "timestamp": te.timestamp.isoformat() if te.timestamp else None
        }
        for te in timeline_entries
    ]

    # Retrieve correlation result evidence from findings of first alert
    correlation_explanation = {
        "summary": incident.summary,
        "matched_signals": [],
        "correlation_score": float(incident.risk_score)
    }

    if alerts:
        first_analysis = db.scalar(select(AlertAnalysis).where(AlertAnalysis.alert_id == alerts[0].id))
        if first_analysis and first_analysis.findings:
            corr_findings = first_analysis.findings.get("correlation", {})
            if corr_findings:
                correlation_explanation = {
                    "summary": corr_findings.get("explanation", incident.summary),
                    "matched_signals": corr_findings.get("signals", []),
                    "correlation_score": corr_findings.get("score", float(incident.risk_score)),
                    "correlated_alert_count": corr_findings.get("correlated_alert_count", len(alerts))
                }

    return {
        "id": str(incident.id),
        "incident_number": incident.incident_number,
        "title": incident.title,
        "summary": incident.summary,
        "severity": incident.severity,
        "risk_score": float(incident.risk_score),
        "confidence_score": float(incident.confidence_score),
        "status": incident.status,
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
        "updated_at": incident.updated_at.isoformat() if incident.updated_at else None,
        "correlated_alerts": correlated_alerts_list,
        "correlation_explanation": correlation_explanation,
        "timeline": timeline_list
    }

from pydantic import BaseModel, Field
from app.services.investigation import (
    start_incident_investigation,
    add_investigation_note,
    get_incident_intelligence_summary
)

class NoteCreateSchema(BaseModel):
    note: str = Field(..., min_length=1, description="Analyst investigation note text")

@router.get("/{incident_id}/timeline", status_code=status.HTTP_200_OK)
async def get_incident_timeline(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves chronological timeline for a specific incident.
    Protected by SOC_ANALYST RBAC.
    """
    try:
        inc_uuid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID UUID format")

    incident = db.scalar(select(Incident).where(Incident.id == inc_uuid))
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")

    timeline_entries = db.scalars(
        select(IncidentTimeline)
        .where(IncidentTimeline.incident_id == inc_uuid)
        .order_by(IncidentTimeline.timestamp.asc())
    ).all()

    return [
        {
            "id": str(te.id),
            "event_type": te.event_type,
            "description": te.description,
            "actor_profile_id": str(te.actor_profile_id) if te.actor_profile_id else None,
            "timestamp": te.timestamp.isoformat() if te.timestamp else None
        }
        for te in timeline_entries
    ]

@router.post("/{incident_id}/start-investigation", status_code=status.HTTP_200_OK)
async def start_investigation_endpoint(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Starts or retrieves active investigation for a specific incident.
    Transitions incident status from OPEN to IN_PROGRESS.
    Protected by SOC_ANALYST RBAC.
    """
    try:
        inc_uuid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID UUID format")

    try:
        investigation, incident = start_incident_investigation(db, inc_uuid, current_user)
        return {
            "status": "success",
            "message": f"Investigation activated for incident '{incident.incident_number}'.",
            "investigation": {
                "id": str(investigation.id),
                "incident_id": str(incident.id),
                "incident_number": incident.incident_number,
                "incident_status": incident.status,
                "investigation_status": investigation.status,
                "summary": investigation.summary,
                "created_at": investigation.created_at.isoformat() if investigation.created_at else None,
                "updated_at": investigation.updated_at.isoformat() if investigation.updated_at else None
            }
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.post("/{incident_id}/notes", status_code=status.HTTP_201_CREATED)
async def add_investigation_note_endpoint(
    incident_id: str,
    payload: NoteCreateSchema,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Adds a timestamped analyst investigation note.
    Protected by SOC_ANALYST RBAC.
    """
    try:
        inc_uuid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID UUID format")

    try:
        new_note, all_notes = add_investigation_note(db, inc_uuid, payload.note, current_user)
        return {
            "status": "success",
            "note": new_note,
            "notes": all_notes
        }
    except ValueError as ve:
        raise HTTPException(status_code=404 if "not found" in str(ve) else 400, detail=str(ve))

@router.get("/{incident_id}/intelligence", status_code=status.HTTP_200_OK)
async def get_incident_intelligence_endpoint(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves evidence-grounded investigation summary payload ('What Happened', 'Why Suspicious', 'Potential Impact').
    Protected by SOC_ANALYST RBAC.
    """
    try:
        inc_uuid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID UUID format")

    try:
        summary = get_incident_intelligence_summary(db, inc_uuid)
        return summary
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.post("/{incident_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_incident_endpoint(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Resolves an incident, updating status to RESOLVED, appending timeline event, and logging audit entry.
    Protected by SOC_ANALYST RBAC.
    """
    try:
        inc_uuid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID UUID format")

    incident = db.scalar(select(Incident).where(Incident.id == inc_uuid))
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")

    old_status = incident.status
    incident.status = "RESOLVED"
    incident.updated_at = datetime.now(timezone.utc)

    # Append timeline entry
    timeline_event = IncidentTimeline(
        incident_id=incident.id,
        event_type="INCIDENT_RESOLVED",
        description=f"Incident '{incident.incident_number}' resolved by SOC Analyst ({current_user.username}).",
        actor_profile_id=current_user.id,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(timeline_event)
    db.commit()

    # Log audit entry
    AuditService.log_event(
        db=db,
        action="INCIDENT_RESOLVED",
        actor_user_id=current_user.id,
        role=current_user.role.name if current_user.role else "SOC_ANALYST",
        target_type="INCIDENT",
        target_id=str(incident.id),
        reason=f"Incident {incident.incident_number} resolved by SOC Analyst",
        previous_state={"status": old_status},
        new_state={"status": "RESOLVED"}
    )

    publish_incident_resolved(incident, current_user)

    return {
        "status": "success",
        "message": f"Incident '{incident.incident_number}' resolved successfully.",
        "incident_id": str(incident.id),
        "new_status": "RESOLVED"
    }


