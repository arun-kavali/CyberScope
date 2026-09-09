import os
import io
import json
import uuid
import csv
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.models.audit import Report, AuditLog
from app.models.evidence import Alert
from app.models.intelligence import (
    Incident,
    AlertAnalysis,
    RiskScore,
    AnomalyScore
)
from app.models.analytics import (
    ExecutionGapFinding,
    NegativeSpaceFinding,
    PeerBenchmark
)
from app.services.audit_service import AuditService
from app.services.data_quality_service import DataQualityService

REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../storage/reports"))

def escape_pdf_str(s: str) -> str:
    return str(s).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

def generate_pdf_document(title: str, report_num: str, created_at_str: str, sections: List[Tuple[str, List[str]]]) -> bytes:
    """
    Generates a valid, pure-Python PDF 1.4 document without third-party dependencies.
    """
    stream_content = []
    stream_content.append("BT")
    stream_content.append("/F1 16 Tf")
    stream_content.append("40 750 Td")
    stream_content.append(f"({escape_pdf_str(title)}) Tj")
    stream_content.append("0 -20 Td")
    stream_content.append("/F1 9 Tf")
    stream_content.append(f"(Report ID: {escape_pdf_str(report_num)} | Generated: {escape_pdf_str(created_at_str)} | System: CyberScope v1.0) Tj")
    stream_content.append("0 -25 Td")

    for sec_title, sec_lines in sections:
        stream_content.append("/F1 11 Tf")
        stream_content.append(f"--- {escape_pdf_str(sec_title)} --- Tj")
        stream_content.append("0 -15 Td")
        stream_content.append("/F1 8 Tf")
        for line in sec_lines:
            # Handle long lines
            clean_line = escape_pdf_str(line[:110])
            stream_content.append(f"({clean_line}) Tj")
            stream_content.append("0 -11 Td")
        stream_content.append("0 -8 Td")

    stream_content.append("ET")
    text_stream = "\n".join(stream_content).encode("latin-1", errors="replace")

    objects = []
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj")
    objects.append(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj")
    objects.append(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj")
    objects.append(b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj")

    stream_len = len(text_stream)
    objects.append(f"5 0 obj\n<< /Length {stream_len} >>\nstream\n".encode("latin-1") + text_stream + b"\nendstream\nendobj")

    pdf_bytes = bytearray()
    pdf_bytes.extend(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf_bytes))
        pdf_bytes.extend(obj + b"\n")

    xref_start = len(pdf_bytes)
    pdf_bytes.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("latin-1"))
    for off in offsets[1:]:
        pdf_bytes.extend(f"{off:010d} 00000 n \n".encode("latin-1"))

    pdf_bytes.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode("latin-1"))
    return bytes(pdf_bytes)

class ReportService:

    @staticmethod
    def _compile_report_data(db: Session) -> Dict[str, Any]:
        """
        Compiles evidence-backed data across all system modules.
        Includes system version metadata and secret sanitization.
        """
        now = datetime.now(timezone.utc)

        # 1. Executive Summary
        total_alerts = db.scalar(select(func.count(Alert.id))) or 0
        critical_alerts = db.scalar(select(func.count(Alert.id)).where(Alert.severity == "CRITICAL")) or 0
        high_alerts = db.scalar(select(func.count(Alert.id)).where(Alert.severity == "HIGH")) or 0
        total_incidents = db.scalar(select(func.count(Incident.id))) or 0
        open_incidents = db.scalar(select(func.count(Incident.id)).where(Incident.status.in_(["OPEN", "IN_PROGRESS"]))) or 0

        avg_risk = db.scalar(select(func.avg(RiskScore.score))) or 0.0

        exec_summary = {
            "total_alerts": total_alerts,
            "critical_alerts": critical_alerts,
            "high_alerts": high_alerts,
            "total_incidents": total_incidents,
            "open_incidents": open_incidents,
            "mean_risk_score": round(float(avg_risk), 2),
            "status": "EVALUATED"
        }

        # 2. Recent Incidents
        recent_incidents = []
        inc_records = db.scalars(select(Incident).order_by(desc(Incident.created_at)).limit(10)).all()
        for inc in inc_records:
            recent_incidents.append({
                "incident_number": inc.incident_number,
                "title": inc.title,
                "severity": inc.severity,
                "status": inc.status,
                "created_at": inc.created_at.isoformat() if inc.created_at else None
            })

        # 3. Detailed Findings & Evidence
        detailed_findings = []
        analyses = db.scalars(select(AlertAnalysis).order_by(desc(AlertAnalysis.created_at)).limit(10)).all()
        for a in analyses:
            findings_dict = a.findings or {}
            meta_dict = a.analysis_metadata or {}
            detailed_findings.append({
                "analysis_id": str(a.id),
                "alert_id": str(a.alert_id),
                "finding_summary": a.summary,
                "confidence_score": findings_dict.get("confidence_score", 85.0),
                "false_positive_risk": findings_dict.get("false_positive_risk", 15.0),
                "rule_matches": findings_dict.get("rule_matches", [])
            })

        # 4. Operational Intelligence (Gaps, Negative Space, Peer Deviations)
        gaps = [
            {"finding_type": g.finding_type, "severity": g.severity, "reason": g.reason}
            for g in db.scalars(select(ExecutionGapFinding).limit(10)).all()
        ]

        neg_space = [
            {"expected_activity": n.expected_activity, "observed_activity": n.observed_activity, "potential_indicator": n.potential_indicator}
            for n in db.scalars(select(NegativeSpaceFinding).limit(10)).all()
        ]

        peer_devs = [
            {"peer_group": p.peer_group, "metric_name": p.metric_name, "normalized_metric": p.normalized_metric}
            for p in db.scalars(select(PeerBenchmark).limit(10)).all()
        ]

        # 5. Data Quality Report
        dq_summary = DataQualityService.run_quality_checks(db)

        # 6. Audit Trail Information
        recent_audits = [
            {"action": log.action, "target_type": log.target_type, "target_id": log.target_id, "timestamp": log.timestamp.isoformat()}
            for log in db.scalars(select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(10)).all()
        ]

        # Recommendations
        recommendations = [
            "Maintain automated correlation rules for credential stuffing and impossible travel",
            "Review unlinked high-severity alerts flagged by data quality validation",
            "Enforce mandatory approval policy for ISOLATE_ENDPOINT and DISABLE_USER actions"
        ]

        # Combine into complete report payload with versioning
        report_data = {
            "metadata": {
                "system_name": "CyberScope SOC Platform",
                "dataset_version": "v1.0.0",
                "rule_version": "v1.0.0",
                "model_version": "ollama-llama3:latest",
                "prompt_version": "v1.0.0",
                "generated_at": now.isoformat()
            },
            "executive_summary": exec_summary,
            "incidents": recent_incidents,
            "detailed_findings": detailed_findings,
            "execution_gaps": gaps,
            "negative_space_findings": neg_space,
            "peer_deviations": peer_devs,
            "data_quality": {
                "quality_score": dq_summary.quality_score,
                "total_issues": dq_summary.total_issues_found,
                "critical_issues": dq_summary.critical_issues,
                "high_issues": dq_summary.high_issues
            },
            "recent_audits": recent_audits,
            "recommendations": recommendations
        }

        # Sanitize sensitive fields recursively
        return AuditService.sanitize_dict(report_data)

    @staticmethod
    def generate_report(
        db: Session,
        report_type: str = "EXECUTIVE_SUMMARY",
        title: Optional[str] = None,
        fmt: str = "PDF",
        generated_by: Optional[uuid.UUID] = None
    ) -> Report:
        """
        Generates and persists a report record and saves the file in local storage.
        """
        os.makedirs(REPORTS_DIR, exist_ok=True)
        report_num = f"RPT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        fmt_upper = fmt.upper()
        report_title = title or f"{report_type.replace('_', ' ').title()} Report"

        content = ReportService._compile_report_data(db)
        created_at = datetime.now(timezone.utc)
        file_ext = fmt_upper.lower()
        file_name = f"{report_num}.{file_ext}"
        file_path = os.path.join(REPORTS_DIR, file_name)

        if fmt_upper == "JSON":
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(content, f, indent=2)

        elif fmt_upper == "CSV":
            with open(file_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["Section", "Key", "Value"])
                writer.writerow(["Metadata", "Report Number", report_num])
                writer.writerow(["Metadata", "Generated At", content["metadata"]["generated_at"]])
                writer.writerow(["Metadata", "Dataset Version", content["metadata"]["dataset_version"]])
                writer.writerow(["Metadata", "Rule Version", content["metadata"]["rule_version"]])
                
                for k, v in content["executive_summary"].items():
                    writer.writerow(["Executive Summary", k, str(v)])

                for inc in content["incidents"]:
                    writer.writerow(["Incident", inc["incident_number"], f"{inc['title']} ({inc['severity']}) - Status: {inc['status']}"])

                for gap in content["execution_gaps"]:
                    writer.writerow(["Execution Gap", gap["finding_type"], f"{gap['severity']} - {gap['reason']}"])

                for rec in content["recommendations"]:
                    writer.writerow(["Recommendation", "Action", rec])

        else:  # PDF format (default)
            sections = [
                ("Executive Summary", [
                    f"Total Alerts: {content['executive_summary']['total_alerts']} | Critical: {content['executive_summary']['critical_alerts']} | High: {content['executive_summary']['high_alerts']}",
                    f"Total Incidents: {content['executive_summary']['total_incidents']} | Open: {content['executive_summary']['open_incidents']}",
                    f"Mean System Risk Score: {content['executive_summary']['mean_risk_score']}/100"
                ]),
                ("Key Incidents", [
                    f"[{i['incident_number']}] {i['title']} - Severity: {i['severity']} (Status: {i['status']})"
                    for i in content["incidents"][:5]
                ] or ["No active incidents recorded."]),
                ("Execution Gaps & Anomalies", [
                    f"[{g['finding_type']}] Severity: {g['severity']} - {g['reason']}"
                    for g in content["execution_gaps"][:5]
                ] or ["No execution gaps identified."]),
                ("Data Quality Governance", [
                    f"Data Quality Score: {content['data_quality']['quality_score']}/100 | Total Issues: {content['data_quality']['total_issues']}"
                ]),
                ("System Metadata & Versioning", [
                    f"Dataset Version: {content['metadata']['dataset_version']} | Rule Version: {content['metadata']['rule_version']}",
                    f"Model Version: {content['metadata']['model_version']} | Prompt Version: {content['metadata']['prompt_version']}"
                ]),
                ("Strategic Recommendations", [
                    f"- {rec}" for rec in content["recommendations"]
                ])
            ]

            pdf_bytes = generate_pdf_document(
                title=report_title,
                report_num=report_num,
                created_at_str=created_at.strftime("%Y-%m-%d %H:%M UTC"),
                sections=sections
            )
            with open(file_path, "wb") as f:
                f.write(pdf_bytes)

        report = Report(
            report_number=report_num,
            title=report_title,
            report_type=report_type,
            generated_by=generated_by,
            content_summary={
                "format": fmt_upper,
                "executive_summary": content["executive_summary"],
                "metadata": content["metadata"],
                "data_quality_score": content["data_quality"]["quality_score"]
            },
            file_path=file_path,
            created_at=created_at
        )

        db.add(report)
        db.commit()
        db.refresh(report)

        AuditService.log_event(
            db=db,
            action="REPORT_GENERATED",
            actor_user_id=generated_by,
            target_type="Report",
            target_id=str(report.id),
            reason=f"Generated {fmt_upper} report {report_num} ({report_type})",
            audit_metadata={"report_number": report_num, "format": fmt_upper}
        )

        return report

    @staticmethod
    def list_reports(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        report_type: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None
    ) -> Tuple[List[Report], int]:
        stmt = select(Report)
        if report_type:
            stmt = stmt.where(Report.report_type == report_type)
        if user_id:
            stmt = stmt.where((Report.generated_by == user_id) | (Report.generated_by.is_(None)))

        total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        stmt = stmt.order_by(desc(Report.created_at)).offset((page - 1) * page_size).limit(page_size)
        items = list(db.scalars(stmt).all())
        return items, total

    @staticmethod
    def get_report_by_id(db: Session, report_id: uuid.UUID) -> Optional[Report]:
        return db.get(Report, report_id)
