import uuid
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.auth.dependencies import require_soc_analyst
from app.models.identity import Profile
from app.models.sources import DataSource, DataSourceConnection
from app.schemas.sources import (
    DataSourceCreateSchema,
    DataSourceResponseSchema,
    SchemaDiscoveryResponseSchema,
    FieldMappingRequestSchema,
    FieldMappingResponseSchema,
    ValidationRequestSchema,
    ValidationResponseSchema,
    ImportRequestSchema,
    ImportResponseSchema,
    sanitize_connection_config
)
from app.services.sources_service import SourcesService

router = APIRouter(prefix="/sources", tags=["Sources"])

@router.get("", response_model=List[DataSourceResponseSchema])
def list_data_sources(
    include_disconnected: bool = Query(False),
    demo_mode: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    stmt = select(DataSource)
    if not demo_mode:
        stmt = stmt.where(DataSource.created_by_user_id == current_user.id)
    if not include_disconnected:
        stmt = stmt.where(DataSource.status != "DISCONNECTED")

    sources = db.scalars(stmt.order_by(DataSource.created_at.desc())).all()
    res = []
    for s in sources:
        config = s.connections[0].connection_config if s.connections else None
        res.append(DataSourceResponseSchema(
            id=s.id,
            name=s.name,
            type=s.type,
            status=s.status,
            connection_config=sanitize_connection_config(config),
            created_at=s.created_at,
            updated_at=s.updated_at
        ))
    return res

@router.get("/{source_id}", response_model=DataSourceResponseSchema)
def get_data_source_detail(
    source_id: uuid.UUID,
    demo_mode: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    s = db.get(DataSource, source_id)
    if not s:
        raise HTTPException(status_code=404, detail="Data source not found")
    if not demo_mode and s.created_by_user_id and s.created_by_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Data source not found")
    config = s.connections[0].connection_config if s.connections else None
    return DataSourceResponseSchema(
        id=s.id,
        name=s.name,
        type=s.type,
        status=s.status,
        connection_config=sanitize_connection_config(config),
        created_at=s.created_at,
        updated_at=s.updated_at
    )

@router.post("/csv", response_model=SchemaDiscoveryResponseSchema)
async def upload_csv_source(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty CSV file uploaded")

    fname = file.filename or "data.csv"
    ds_name = name or fname or "CSV Data Source"
    text_content = content.decode("utf-8", errors="replace")
    ds = SourcesService.create_data_source(
        db, name=ds_name, source_type="CSV", connection_config={"file_content": text_content, "filename": fname}, created_by_user_id=current_user.id
    )
    schema_info = SourcesService.discover_schema(
        db=db, source_id=ds.id, source_type="CSV", content=content, filename=fname
    )
    return schema_info

@router.post("/json", response_model=SchemaDiscoveryResponseSchema)
async def upload_json_source(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty JSON file uploaded")

    fname = file.filename or "data.json"
    ds_name = name or fname or "JSON Data Source"
    text_content = content.decode("utf-8", errors="replace")
    ds = SourcesService.create_data_source(
        db, name=ds_name, source_type="JSON", connection_config={"file_content": text_content, "filename": fname}, created_by_user_id=current_user.id
    )
    schema_info = SourcesService.discover_schema(
        db=db, source_id=ds.id, source_type="JSON", content=content, filename=fname
    )
    return schema_info

@router.post("/excel", response_model=SchemaDiscoveryResponseSchema)
async def upload_excel_source(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty Excel file uploaded")

    fname = file.filename or "data.xlsx"
    stype = "XLSX" if fname.endswith(".xlsx") else "XLS"
    ds_name = name or fname or "Excel Data Source"
    text_content = content.decode("utf-8", errors="replace")
    ds = SourcesService.create_data_source(
        db, name=ds_name, source_type=stype, connection_config={"file_content": text_content, "filename": fname}, created_by_user_id=current_user.id
    )
    schema_info = SourcesService.discover_schema(
        db=db, source_id=ds.id, source_type=stype, content=content, filename=fname
    )
    return schema_info

@router.post("/database", response_model=SchemaDiscoveryResponseSchema)
def connect_database_source(
    payload: DataSourceCreateSchema,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    stype = payload.type.upper()
    if stype not in ("POSTGRESQL", "MYSQL", "MONGODB", "SUPABASE", "REST", "REST_API"):
        raise HTTPException(status_code=400, detail=f"Unsupported database/API connector type: {payload.type}")

    ds = SourcesService.create_data_source(
        db, name=payload.name, source_type=stype, connection_config=payload.connection_config, created_by_user_id=current_user.id
    )
    schema_info = SourcesService.discover_schema(
        db=db, source_id=ds.id, source_type=stype, connection_config=payload.connection_config
    )
    return schema_info

@router.post("/map-schema", response_model=FieldMappingResponseSchema)
def map_source_schema(
    payload: FieldMappingRequestSchema,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    try:
        mapping = SourcesService.save_field_mapping(
            db=db, source_id=payload.data_source_id, field_mappings=payload.field_mappings
        )
        from app.services.audit_service import AuditService
        AuditService.log_event(
            db=db,
            action="DATA_SOURCE_SCHEMA_MAPPED",
            actor_user_id=current_user.id,
            target_type="DATA_SOURCE",
            target_id=str(payload.data_source_id),
            reason="Saved field mappings for data source",
            audit_metadata={"mapped_fields_count": len(payload.field_mappings or {})}
        )
        return FieldMappingResponseSchema(
            data_source_id=mapping.data_source_id,
            field_mappings=mapping.field_mappings or {},
            is_validated=mapping.is_validated,
            updated_at=mapping.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/validate", response_model=ValidationResponseSchema)
def validate_source_data(
    payload: ValidationRequestSchema,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    res = SourcesService.validate_records(
        db=db,
        source_id=payload.data_source_id,
        source_type=payload.source_type,
        field_mappings=payload.field_mappings,
        connection_config=payload.connection_config
    )
    from app.services.audit_service import AuditService
    AuditService.log_event(
        db=db,
        action="DATA_SOURCE_VALIDATED",
        actor_user_id=current_user.id,
        target_type="DATA_SOURCE",
        target_id=str(payload.data_source_id) if payload.data_source_id else None,
        reason="Validated data source records against canonical schema",
        audit_metadata={"valid_count": res.get("valid_count"), "invalid_count": res.get("invalid_count")}
    )
    return ValidationResponseSchema(**res)

@router.post("/import", response_model=ImportResponseSchema)
def import_source_data(
    payload: ImportRequestSchema,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    res = SourcesService.import_records(
        db=db,
        source_id=payload.data_source_id,
        source_type=payload.source_type,
        field_mappings=payload.field_mappings,
        connection_config=payload.connection_config,
        submitted_by_user_id=current_user.id
    )
    from app.services.audit_service import AuditService
    AuditService.log_event(
        db=db,
        action="DATA_SOURCE_DATA_IMPORTED",
        actor_user_id=current_user.id,
        target_type="DATA_SOURCE",
        target_id=str(payload.data_source_id) if payload.data_source_id else None,
        reason=f"Imported {res.get('imported_records', 0)} records into canonical pipeline",
        audit_metadata=res
    )
    return ImportResponseSchema(**res)

# ==========================================
# CONNECTED DATA SOURCE ACTIONS & AUDITING
# ==========================================

FORBIDDEN_SQL_TERMS = {"DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE", "DELETE", "UPDATE", "INSERT"}

@router.post("/{source_id}/test")
def test_data_source_connection(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Tests connection to a data source (PostgreSQL, CSV, JSON, Excel, etc.).
    Measures connection latency and records audit event.
    """
    import time
    from datetime import datetime, timezone
    from app.auth.service import get_workspace_user_ids
    from app.services.audit_service import AuditService

    ws_user_ids = get_workspace_user_ids(db, current_user)
    ds = db.get(DataSource, source_id)
    if not ds or (ds.created_by_user_id and ds.created_by_user_id not in ws_user_ids):
        raise HTTPException(status_code=404, detail="Data source not found")

    stype = ds.type.upper()
    conn_config = ds.connections[0].connection_config if ds.connections else {}
    start_t = time.time()
    success = False
    msg = ""

    if stype in ("CSV", "JSON", "XLS", "XLSX"):
        if conn_config and ("file_content" in conn_config or "filename" in conn_config):
            success = True
            msg = f"{stype} data source file accessibility verified."
        else:
            success = False
            msg = f"{stype} file content missing or inaccessible."
    elif stype == "POSTGRESQL":
        try:
            from app.services.sources.db_connectors import PostgreSQLConnector
            connector = PostgreSQLConnector(conn_config)
            success = connector.validate_connection()
            if success:
                msg = f"PostgreSQL database connection to '{connector.database}' at {connector.host}:{connector.port} successful."
            else:
                msg = "Connection failed: Host or database unavailable."
        except Exception as e:
            success = False
            err_str = str(e).lower()
            if "password" in err_str or "auth" in err_str:
                msg = "Connection failed: Authentication failed."
            elif "timeout" in err_str or "connect" in err_str:
                msg = "Connection failed: Host unavailable or connection timeout."
            else:
                msg = "Connection failed: Database unavailable."
    else:
        success = False
        msg = f"Connector '{stype}' is architecture-ready but not currently available."

    latency_ms = round((time.time() - start_t) * 1000, 2)

    if ds.connections:
        ds.connections[0].last_tested_at = datetime.now(timezone.utc)
        ds.connections[0].status = "ACTIVE" if success else "ERROR"
        db.commit()

    AuditService.log_event(
        db,
        action="DATA_SOURCE_CONNECTION_TESTED",
        actor_user_id=current_user.id,
        target_type="DATA_SOURCE",
        target_id=str(ds.id),
        audit_metadata={"success": success, "latency_ms": latency_ms, "message": msg}
    )

    return {
        "data_source_id": ds.id,
        "success": success,
        "status": "CONNECTED" if success else "ERROR",
        "message": msg,
        "latency_ms": latency_ms
    }

@router.post("/{source_id}/schema/refresh", response_model=SchemaDiscoveryResponseSchema)
def refresh_data_source_schema(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Refreshes discovered schema metadata for a connected data source.
    """
    from app.auth.service import get_workspace_user_ids
    from app.services.audit_service import AuditService

    ws_user_ids = get_workspace_user_ids(db, current_user)
    ds = db.get(DataSource, source_id)
    if not ds or (ds.created_by_user_id and ds.created_by_user_id not in ws_user_ids):
        raise HTTPException(status_code=404, detail="Data source not found")

    conn_config = ds.connections[0].connection_config if ds.connections else {}
    schema_info = SourcesService.discover_schema(
        db=db, source_id=ds.id, source_type=ds.type, connection_config=conn_config
    )

    AuditService.log_event(
        db,
        action="DATA_SOURCE_SCHEMA_REFRESHED",
        actor_user_id=current_user.id,
        target_type="DATA_SOURCE",
        target_id=str(ds.id),
        audit_metadata={"fields_count": len(schema_info.get("fields", []))}
    )
    return schema_info

@router.get("/{source_id}/preview")
def preview_data_source_data(
    source_id: uuid.UUID,
    table_name: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Safely previews data rows for a connected data source.
    Enforces maximum 100 row limit and blocks forbidden SQL operations.
    """
    from app.auth.service import get_workspace_user_ids
    from app.services.sources_service import get_connector_for_source

    ws_user_ids = get_workspace_user_ids(db, current_user)
    ds = db.get(DataSource, source_id)
    if not ds or (ds.created_by_user_id and ds.created_by_user_id not in ws_user_ids):
        raise HTTPException(status_code=404, detail="Data source not found")

    if table_name:
        for forbidden in FORBIDDEN_SQL_TERMS:
            if forbidden in table_name.upper():
                raise HTTPException(status_code=400, detail=f"Forbidden SQL term '{forbidden}' detected in preview request.")

    conn_config = ds.connections[0].connection_config if ds.connections else {}
    capped_limit = min(limit, 100)

    try:
        connector = get_connector_for_source(ds.type, config=conn_config)
        records = connector.fetch_records(limit=capped_limit)
        cols = list(records[0].keys()) if records else []
        return {
            "data_source_id": ds.id,
            "columns": cols,
            "records": records[:capped_limit],
            "total_rows": len(records)
        }
    except Exception as e:
        return {
            "data_source_id": ds.id,
            "columns": [],
            "records": [],
            "total_rows": 0,
            "message": f"Preview failed: {str(e)}"
        }

@router.post("/{source_id}/sync", response_model=ImportResponseSchema)
def sync_data_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Manually triggers full ingestion sync for a connected data source.
    Processes records through normalization, enrichment, detection, and scoring.
    """
    from app.auth.service import get_workspace_user_ids
    from app.services.audit_service import AuditService
    from app.models.sources import DataSourceMapping

    ws_user_ids = get_workspace_user_ids(db, current_user)
    ds = db.get(DataSource, source_id)
    if not ds or (ds.created_by_user_id and ds.created_by_user_id not in ws_user_ids):
        raise HTTPException(status_code=404, detail="Data source not found")

    conn_config = ds.connections[0].connection_config if ds.connections else {}
    mapping_rec = db.scalar(select(DataSourceMapping).where(DataSourceMapping.data_source_id == ds.id))
    field_mappings = mapping_rec.field_mappings if mapping_rec else {}

    AuditService.log_event(
        db,
        action="DATA_SOURCE_SYNC_STARTED",
        actor_user_id=current_user.id,
        target_type="DATA_SOURCE",
        target_id=str(ds.id)
    )

    try:
        res = SourcesService.import_records(
            db=db,
            source_id=ds.id,
            source_type=ds.type,
            field_mappings=field_mappings,
            connection_config=conn_config,
            submitted_by_user_id=current_user.id
        )

        AuditService.log_event(
            db,
            action="DATA_SOURCE_SYNC_COMPLETED",
            actor_user_id=current_user.id,
            target_type="DATA_SOURCE",
            target_id=str(ds.id),
            audit_metadata={"imported_records": res.get("imported_records", 0)}
        )
        return ImportResponseSchema(**res)
    except Exception as e:
        AuditService.log_event(
            db,
            action="DATA_SOURCE_SYNC_FAILED",
            actor_user_id=current_user.id,
            target_type="DATA_SOURCE",
            target_id=str(ds.id),
            audit_metadata={"error": str(e)}
        )
        raise HTTPException(status_code=400, detail=f"Sync failed: {str(e)}")

@router.post("/{source_id}/disconnect", response_model=DataSourceResponseSchema)
def disconnect_data_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Disconnects a data source.
    Future ingestion is stopped while historical imported security evidence is safely preserved.
    """
    from app.auth.service import get_workspace_user_ids
    from app.services.audit_service import AuditService

    ws_user_ids = get_workspace_user_ids(db, current_user)
    ds = db.get(DataSource, source_id)
    if not ds or (ds.created_by_user_id and ds.created_by_user_id not in ws_user_ids):
        raise HTTPException(status_code=404, detail="Data source not found")

    ds.status = "DISCONNECTED"
    if ds.connections:
        ds.connections[0].status = "INACTIVE"
    db.commit()
    db.refresh(ds)

    AuditService.log_event(
        db,
        action="DATA_SOURCE_DISCONNECTED",
        actor_user_id=current_user.id,
        target_type="DATA_SOURCE",
        target_id=str(ds.id),
        reason="User requested data source disconnection"
    )

    config = ds.connections[0].connection_config if ds.connections else None
    return DataSourceResponseSchema(
        id=ds.id,
        name=ds.name,
        type=ds.type,
        status=ds.status,
        connection_config=sanitize_connection_config(config),
        created_at=ds.created_at,
        updated_at=ds.updated_at
    )
