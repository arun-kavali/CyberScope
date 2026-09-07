import csv
import json
import io
import zipfile
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional
from app.services.sources.base import BaseConnector

def infer_python_type(val: Any) -> str:
    if val is None or val == "":
        return "string"
    if isinstance(val, bool) or str(val).lower() in ("true", "false"):
        return "boolean"
    if isinstance(val, int):
        return "integer"
    if isinstance(val, float):
        return "float"
    val_str = str(val).strip()
    try:
        int(val_str)
        return "integer"
    except ValueError:
        pass
    try:
        float(val_str)
        return "float"
    except ValueError:
        pass
    if any(sep in val_str for sep in ("-", "/", ":", "T")):
        if len(val_str) >= 10:
            return "datetime"
    return "string"


class CSVConnector(BaseConnector):
    def __init__(self, content: bytes, filename: str = "data.csv"):
        self.content = content
        self.filename = filename

    def validate_connection(self) -> bool:
        if not self.content or len(self.content.strip()) == 0:
            return False
        try:
            text = self.content.decode("utf-8-sig", errors="replace")
            reader = csv.reader(io.StringIO(text))
            first_line = next(reader, None)
            return first_line is not None and len(first_line) > 0
        except Exception:
            return False

    def fetch_records(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        text = self.content.decode("utf-8-sig", errors="replace")
        stream = io.StringIO(text)
        reader = csv.DictReader(stream)
        records = []
        for i, row in enumerate(reader):
            if limit and i >= limit:
                break
            # Clean keys and values
            clean_row = {k.strip() if k else f"field_{idx}": (v.strip() if v else None) for idx, (k, v) in enumerate(row.items())}
            records.append(clean_row)
        return records

    def discover_schema(self) -> Dict[str, Any]:
        records = self.fetch_records(limit=100)
        if not records:
            return {
                "source_type": "CSV",
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

        total_records = len(self.fetch_records())
        return {
            "source_type": "CSV",
            "total_fields": len(discovered_fields),
            "fields": discovered_fields,
            "preview_rows": records[:10],
            "estimated_records": total_records,
        }


class JSONConnector(BaseConnector):
    def __init__(self, content: bytes, filename: str = "data.json"):
        self.content = content
        self.filename = filename

    def validate_connection(self) -> bool:
        if not self.content:
            return False
        try:
            data = json.loads(self.content.decode("utf-8", errors="replace"))
            return isinstance(data, (list, dict))
        except Exception:
            return False

    def fetch_records(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        text = self.content.decode("utf-8", errors="replace")
        data = json.loads(text)
        if isinstance(data, dict):
            # If object has a data or items key that is a list
            for key in ("items", "data", "records", "events", "alerts"):
                if key in data and isinstance(data[key], list):
                    data = data[key]
                    break
            else:
                data = [data]
        
        if not isinstance(data, list):
            data = [data]

        records = []
        for i, item in enumerate(data):
            if limit and i >= limit:
                break
            if isinstance(item, dict):
                records.append(item)
            else:
                records.append({"value": item})
        return records

    def discover_schema(self) -> Dict[str, Any]:
        records = self.fetch_records(limit=100)
        if not records:
            return {
                "source_type": "JSON",
                "total_fields": 0,
                "fields": [],
                "preview_rows": [],
                "estimated_records": 0,
            }

        # Gather set of all keys across sample records
        field_keys = set()
        for r in records:
            field_keys.update(r.keys())

        discovered_fields = []
        for f_name in sorted(list(field_keys)):
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

        total_records = len(self.fetch_records())
        return {
            "source_type": "JSON",
            "total_fields": len(discovered_fields),
            "fields": discovered_fields,
            "preview_rows": records[:10],
            "estimated_records": total_records,
        }


class ExcelConnector(BaseConnector):
    def __init__(self, content: bytes, filename: str = "data.xlsx"):
        self.content = content
        self.filename = filename

    def validate_connection(self) -> bool:
        if not self.content:
            return False
        try:
            if self.filename.endswith(".xlsx") or self.content.startswith(b"PK\x03\x04"):
                with zipfile.ZipFile(io.BytesIO(self.content)) as z:
                    return "xl/workbook.xml" in z.namelist()
            return len(self.content) > 0
        except Exception:
            return False

    def fetch_records(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        # Lightweight stdlib parsing of .xlsx (ZIP container + sharedStrings + sheet1)
        records = []
        try:
            if self.content.startswith(b"PK\x03\x04"):
                with zipfile.ZipFile(io.BytesIO(self.content)) as z:
                    shared_strings = []
                    if "xl/sharedStrings.xml" in z.namelist():
                        ss_tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
                        ns = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
                        for si in ss_tree.findall(".//main:si", ns):
                            t = si.find("main:t", ns)
                            shared_strings.append(t.text if t is not None else "")

                    sheet_name = "xl/worksheets/sheet1.xml"
                    if sheet_name in z.namelist():
                        sheet_tree = ET.fromstring(z.read(sheet_name))
                        ns = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
                        rows = sheet_tree.findall(".//main:row", ns)
                        if rows:
                            headers = []
                            header_row = rows[0]
                            for c in header_row.findall("main:c", ns):
                                v = c.find("main:v", ns)
                                val = v.text if v is not None else ""
                                if c.attrib.get("t") == "s" and val.isdigit() and int(val) < len(shared_strings):
                                    val = shared_strings[int(val)]
                                headers.append(val or f"field_{len(headers)}")

                            for i, row_elem in enumerate(rows[1:]):
                                if limit and i >= limit:
                                    break
                                row_data = {}
                                cells = row_elem.findall("main:c", ns)
                                for c_idx, c in enumerate(cells):
                                    if c_idx < len(headers):
                                        v = c.find("main:v", ns)
                                        val = v.text if v is not None else ""
                                        if c.attrib.get("t") == "s" and val.isdigit() and int(val) < len(shared_strings):
                                            val = shared_strings[int(val)]
                                        row_data[headers[c_idx]] = val
                                if row_data:
                                    records.append(row_data)
        except Exception:
            pass

        # Fallback if binary or parsing yields no records (e.g. CSV-like text inside XLS file)
        if not records:
            try:
                text = self.content.decode("utf-8", errors="replace")
                reader = csv.DictReader(io.StringIO(text))
                for i, r in enumerate(reader):
                    if limit and i >= limit:
                        break
                    records.append(dict(r))
            except Exception:
                pass

        return records

    def discover_schema(self) -> Dict[str, Any]:
        records = self.fetch_records(limit=100)
        if not records:
            return {
                "source_type": "XLSX" if self.filename.endswith(".xlsx") else "XLS",
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

        total_records = len(self.fetch_records())
        return {
            "source_type": "XLSX" if self.filename.endswith(".xlsx") else "XLS",
            "total_fields": len(discovered_fields),
            "fields": discovered_fields,
            "preview_rows": records[:10],
            "estimated_records": total_records,
        }
