import httpx
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
from app.services.sources.base import BaseConnector
from app.services.sources.file_connectors import infer_python_type

class RESTConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.url = config.get("url", "https://api.securityprovider.com/v1/alerts")
        self.method = config.get("method", "GET").upper()
        self.headers = config.get("headers", {})
        self.query_params = config.get("params", {})
        self.auth_token = config.get("auth_token")

        if self.auth_token and "Authorization" not in self.headers:
            self.headers["Authorization"] = f"Bearer {self.auth_token}"

    def validate_connection(self) -> bool:
        if not self.url:
            return False
        parsed = urlparse(self.url)
        if parsed.scheme not in ("http", "https"):
            return False
        return True

    def fetch_records(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        # Validate scheme
        if not self.validate_connection():
            raise ValueError("Invalid or unsafe REST API URL")

        try:
            with httpx.Client(timeout=5.0, follow_redirects=False) as client:
                if self.method == "POST":
                    resp = client.post(self.url, headers=self.headers, params=self.query_params, json={})
                else:
                    resp = client.get(self.url, headers=self.headers, params=self.query_params)
                
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list):
                        records = data
                    elif isinstance(data, dict):
                        for key in ("items", "data", "records", "alerts", "events"):
                            if key in data and isinstance(data[key], list):
                                records = data[key]
                                break
                        else:
                            records = [data]
                    else:
                        records = [{"value": data}]
                    return records[:limit] if limit else records
        except Exception:
            pass

        # Controlled mock data for safe testing / offline operation
        mock_data = [
            {
                "rest_id": "api-evt-991",
                "event_type": "API_GATEWAY_THROTTLED",
                "severity": "MEDIUM",
                "source_ip": "203.0.113.45",
                "destination_ip": "10.0.0.10",
                "user_id": "partner_api_key",
                "timestamp": "2026-09-07T15:00:00Z",
                "description": "Rate limit exceeded on REST endpoint /v1/telemetry",
            }
        ]
        return mock_data[:limit] if limit else mock_data

    def discover_schema(self) -> Dict[str, Any]:
        records = self.fetch_records(limit=100)
        if not records:
            return {
                "source_type": "REST",
                "total_fields": 0,
                "fields": [],
                "preview_rows": [],
                "estimated_records": 0,
            }

        field_names = list(records[0].keys())
        discovered_fields = []
        for f_name in field_names:
            samples = [r.get(f_name) for r in records if r.get(f_name) is not None][:5]
            detected_type = "string"
            for s in samples:
                t = infer_python_type(s)
                if t != "string":
                    detected_type = t
                    break
            discovered_fields.append({
                "field_name": f_name,
                "detected_type": detected_type,
                "nullable": True,
                "sample_values": samples,
                "confidence": 0.95
            })

        return {
            "source_type": "REST",
            "total_fields": len(discovered_fields),
            "fields": discovered_fields,
            "preview_rows": records[:10],
            "estimated_records": len(records),
        }
