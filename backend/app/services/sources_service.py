import uuid
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.sources import DataSource, DataSourceConnection, DataSourceSchema, DataSourceMapping, AlertSource
from app.models.evidence import Alert
from app.schemas.sources import sanitize_connection_config
from app.services.sources.base import BaseConnector
from app.services.sources.file_connectors import CSVConnector, JSONConnector, ExcelConnector
from app.services.sources.db_connectors import PostgreSQLConnector, MySQLConnector, MongoDBConnector, SupabaseConnector
from app.services.sources.rest_connector import RESTConnector
from app.services.ingestion import process_alert_ingestion


CYBERSCOPE_REQUIRED_FIELDS = {"event_type", "severity"}
CYBERSCOPE_CANONICAL_FIELDS = {
    "id", "source_id", "event_type", "event_category", "severity", "timestamp",
    "user_id", "asset_id", "source_ip", "destination_ip", "source_port", "destination_port",
    "protocol", "action", "status", "description", "indicator", "technique", "raw_payload", "metadata"
}

def get_connector_for_source(source_type: str, content: Optional[bytes] = None, filename: str = "", config: Optional[Dict[str, Any]] = None) -> BaseConnector:
    stype = source_type.upper()
    if config and not content and "file_content" in config:
        content = config["file_content"].encode("utf-8") if isinstance(config["file_content"], str) else config["file_content"]
        if not filename and "filename" in config:
            filename = config["filename"]

    if stype == "CSV":
        return CSVConnector(content or b"", filename)
    elif stype == "JSON":
        return JSONConnector(content or b"", filename)
    elif stype in ("XLS", "XLSX"):
        return ExcelConnector(content or b"", filename or "data.xlsx")
    elif stype == "POSTGRESQL":
        return PostgreSQLConnector(config or {})
    elif stype == "MYSQL":
        return MySQLConnector(config or {})
    elif stype == "MONGODB":
        return MongoDBConnector(config or {})
    elif stype == "SUPABASE":
        return SupabaseConnector(config or {})
    elif stype in ("REST", "REST_API"):
        return RESTConnector(config or {})
    else:
        raise ValueError(f"Unsupported data source type: {source_type}")


class SourcesService:
    @staticmethod
    def create_data_source(
        db: Session,
        name: str,
        source_type: str,
        connection_config: Optional[Dict[str, Any]] = None,
        created_by_user_id: Optional[uuid.UUID] = None
    ) -> DataSource:
        ds = DataSource(
            name=name,
            type=source_type.upper(),
            status="CONNECTED",
            created_by_user_id=created_by_user_id
        )
        db.add(ds)
        db.flush()

        conn = DataSourceConnection(
            data_source_id=ds.id,
            connection_config=connection_config,
            status="ACTIVE"
        )
        db.add(conn)
        db.commit()
        db.refresh(ds)

        from app.services.audit_service import AuditService
        AuditService.log_event(
            db=db,
            action="DATA_SOURCE_CREATED",
            actor_user_id=created_by_user_id,
            target_type="DATA_SOURCE",
            target_id=str(ds.id),
            reason=f"Created {source_type.upper()} data source '{name}'",
            new_state={"name": name, "type": source_type.upper(), "status": ds.status}
        )
        return ds

    @staticmethod
    def discover_schema(
        db: Session,
        source_id: Optional[uuid.UUID] = None,
        source_type: Optional[str] = None,
        content: Optional[bytes] = None,
        filename: str = "",
        connection_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        ds = None
        if source_id:
            ds = db.get(DataSource, source_id)
            if ds:
                source_type = ds.type
                if not connection_config and ds.connections:
                    connection_config = ds.connections[0].connection_config

        if not source_type:
            source_type = "CSV"

        connector = get_connector_for_source(source_type, content, filename, connection_config)
        schema_info = connector.discover_schema()

        if ds:
            ds_schema = DataSourceSchema(
                data_source_id=ds.id,
                discovered_schema=schema_info,
                version=1
            )
            db.add(ds_schema)
            db.commit()
            schema_info["data_source_id"] = ds.id

        return schema_info

    @staticmethod
    def save_field_mapping(
        db: Session,
        source_id: uuid.UUID,
        field_mappings: Dict[str, str]
    ) -> DataSourceMapping:
        ds = db.get(DataSource, source_id)
        if not ds:
            raise ValueError("Data source not found")

        mapping = db.scalars(
            select(DataSourceMapping).where(DataSourceMapping.data_source_id == source_id)
        ).first()

        if not mapping:
            mapping = DataSourceMapping(
                data_source_id=source_id,
                field_mappings=field_mappings,
                is_validated=True
            )
            db.add(mapping)
        else:
            mapping.field_mappings = field_mappings
            mapping.is_validated = True

        db.commit()
        db.refresh(mapping)
        return mapping

    @staticmethod
    def validate_records(
        db: Session,
        source_id: Optional[uuid.UUID] = None,
        source_type: Optional[str] = None,
        field_mappings: Optional[Dict[str, str]] = None,
        content: Optional[bytes] = None,
        filename: str = "",
        connection_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        ds = None
        if source_id:
            ds = db.get(DataSource, source_id)
            if ds:
                source_type = ds.type
                if not connection_config and ds.connections:
                    connection_config = ds.connections[0].connection_config
                if not field_mappings and ds.mappings:
                    field_mappings = ds.mappings[0].field_mappings

        if not source_type:
            source_type = "CSV"
        if not field_mappings:
            field_mappings = {}

        connector = get_connector_for_source(source_type, content, filename, connection_config)
        raw_records = connector.fetch_records()

        valid_count = 0
        invalid_count = 0
        warnings = []
        errors = []
        sample_invalid = []

        # Check required target fields in mapping
        mapped_targets = set(field_mappings.values())
        missing_req = CYBERSCOPE_REQUIRED_FIELDS - mapped_targets
        if missing_req:
            warnings.append(f"Missing required CyberScope canonical fields in mapping: {', '.join(missing_req)}")

        for idx, record in enumerate(raw_records):
            record_errors = []
            mapped_record = {}
            for src_field, target_field in field_mappings.items():
                if src_field in record:
                    mapped_record[target_field] = record[src_field]

            # Validate event_type presence or fallback
            if not mapped_record.get("event_type") and not record.get("event_type"):
                record_errors.append(f"Row {idx+1}: Missing required field 'event_type'")

            # Validate severity if present
            sev = mapped_record.get("severity") or record.get("severity")
            if sev and str(sev).upper() not in ("LOW", "INFORMATIONAL", "INFO", "MEDIUM", "HIGH", "CRITICAL"):
                record_errors.append(f"Row {idx+1}: Invalid severity value '{sev}'")

            if record_errors:
                invalid_count += 1
                if len(sample_invalid) < 5:
                    sample_invalid.append({"row": idx + 1, "record": record, "errors": record_errors})
                errors.extend(record_errors[:2])
            else:
                valid_count += 1

        return {
            "data_source_id": source_id,
            "valid_count": valid_count,
            "invalid_count": invalid_count,
            "warnings": list(set(warnings)),
            "errors": errors[:10],
            "sample_invalid_records": sample_invalid
        }

    @staticmethod
    def import_records(
        db: Session,
        source_id: Optional[uuid.UUID] = None,
        source_type: Optional[str] = None,
        field_mappings: Optional[Dict[str, str]] = None,
        content: Optional[bytes] = None,
        filename: str = "",
        connection_config: Optional[Dict[str, Any]] = None,
        submitted_by_user_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        ds = None
        if source_id:
            ds = db.get(DataSource, source_id)
            if ds:
                source_type = ds.type
                if not connection_config and ds.connections:
                    connection_config = ds.connections[0].connection_config
                if not field_mappings and ds.mappings:
                    field_mappings = ds.mappings[0].field_mappings
                if not submitted_by_user_id:
                    submitted_by_user_id = ds.created_by_user_id

        if not source_type:
            source_type = "CSV"
        if not field_mappings:
            field_mappings = {}

        connector = get_connector_for_source(source_type, content, filename, connection_config)
        raw_records = connector.fetch_records()

        total = len(raw_records)
        imported = 0
        skipped = 0
        invalid = 0
        duplicates = 0
        errors = []

        # Get or create an AlertSource record for foreign key reference
        alert_source = db.scalar(select(AlertSource).where(AlertSource.name == f"{source_type} Import Source"))
        if not alert_source:
            alert_source = AlertSource(
                name=f"{source_type} Import Source",
                source_type=source_type.upper(),
                status="ACTIVE"
            )
            db.add(alert_source)
            db.flush()

        source_uuid = alert_source.id

        for idx, raw_item in enumerate(raw_records):
            try:
                # Build canonical payload from mapping
                payload = {}
                for src_field, target_field in field_mappings.items():
                    if src_field in raw_item:
                        payload[target_field] = raw_item[src_field]

                # Fallbacks for unmapped standard fields if present in raw_item
                for key in ("event_type", "severity", "event_category", "description", "source_ip", "destination_ip", "user_id", "asset_id"):
                    if key not in payload and key in raw_item:
                        payload[key] = raw_item[key]

                # Ensure required fields for Phase 7 validation
                if not payload.get("timestamp"):
                    payload["timestamp"] = "2026-09-07T12:00:00Z"
                if not payload.get("event_type"):
                    payload["event_type"] = f"{source_type.upper()}_IMPORT_EVENT"
                if not payload.get("severity"):
                    payload["severity"] = "INFORMATIONAL"
                if not payload.get("event_category"):
                    etype = str(payload.get("event_type", "")).upper()
                    if any(k in etype for k in ("AUTH", "LOGIN", "SUDO", "PASSWORD", "KERBEROS")):
                        payload["event_category"] = "AUTHENTICATION"
                    elif any(k in etype for k in ("PROCESS", "MALWARE", "FILE", "ENDPOINT", "HOST")):
                        payload["event_category"] = "ENDPOINT"
                    elif any(k in etype for k in ("DATABASE", "SQL", "QUERY", "TABLE", "AUDIT")):
                        payload["event_category"] = "DATABASE"
                    elif any(k in etype for k in ("EMAIL", "MAIL", "PHISHING")):
                        payload["event_category"] = "EMAIL"
                    else:
                        payload["event_category"] = "NETWORK"
                if not payload.get("description"):
                    payload["description"] = f"Imported record #{idx+1} from {source_type} data source"
                if "user_context" not in payload and "user_id" in payload:
                    payload["user_context"] = payload["user_id"]
                if "asset_context" not in payload and "asset_id" in payload:
                    payload["asset_context"] = payload["asset_id"]

                payload["raw_payload"] = raw_item

                # Pass through existing Phase 7 normalization & ingestion pipeline!
                ingest_res = process_alert_ingestion(
                    db=db,
                    alert_data=payload,
                    source_id=source_uuid,
                    is_batch=True,
                    submitted_by_user_id=submitted_by_user_id
                )

                if ingest_res.status == "SUCCESS":
                    imported += 1
                elif ingest_res.status == "DUPLICATE":
                    duplicates += 1
                    skipped += 1
                else:
                    invalid += 1
                    if ingest_res.validation and ingest_res.validation.get("issues"):
                        errors.extend(ingest_res.validation["issues"])

            except Exception as e:
                invalid += 1
                errors.append(f"Row {idx+1}: {str(e)}")

        status = "COMPLETED" if invalid == 0 else ("PARTIAL" if imported > 0 else "FAILED")

        if ds:
            ds.status = status
            db.commit()

        return {
            "data_source_id": source_id,
            "status": status,
            "total_records": total,
            "imported_records": imported,
            "skipped_records": skipped,
            "invalid_records": invalid,
            "duplicate_records": duplicates,
            "errors": errors[:10]
        }
