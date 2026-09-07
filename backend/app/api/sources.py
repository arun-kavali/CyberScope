import uuid
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
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
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    sources = db.scalars(select(DataSource).order_by(DataSource.created_at.desc())).all()
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
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    s = db.get(DataSource, source_id)
    if not s:
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
        db, name=ds_name, source_type="CSV", connection_config={"file_content": text_content, "filename": fname}
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
        db, name=ds_name, source_type="JSON", connection_config={"file_content": text_content, "filename": fname}
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
        db, name=ds_name, source_type=stype, connection_config={"file_content": text_content, "filename": fname}
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
        db, name=payload.name, source_type=stype, connection_config=payload.connection_config
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
        connection_config=payload.connection_config
    )
    return ImportResponseSchema(**res)
