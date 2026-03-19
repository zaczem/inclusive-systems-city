#!/usr/bin/env python3
import csv
import hmac
import io
import json
import os
import secrets
import sqlite3
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8000"))
ADMIN_KEY = os.environ.get("ADMIN_KEY", "local-research-key").strip()
DB_PATH = Path(os.environ.get("LOG_DB_PATH", str(ROOT / "research_logs.sqlite3")))

SESSIONS = set()

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}

FIELDNAMES = [
    "sessionUUID",
    "role",
    "caseID",
    "round",
    "decisionTimestamp",
    "responseTimeMs",
    "clickX",
    "clickY",
    "spatialAccuracy",
    "issueClassification",
    "classificationCorrect",
    "justificationText",
    "justificationScore",
    "confidenceRating",
    "barrierComplexityScore",
    "visualSalienceScore",
    "severityIndex",
    "experimentCondition",
    "researchMode",
    "anonymizedMode",
    "datasetVersion",
    "caseOrderSeed",
    "randomizedCaseOrder",
    "mode",
    "indicatorChanges",
    "participantCode",
    "consentResearch",
]


def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db_connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS research_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sessionUUID TEXT NOT NULL,
                role TEXT NOT NULL,
                caseID TEXT NOT NULL,
                round INTEGER NOT NULL,
                decisionTimestamp TEXT NOT NULL,
                responseTimeMs INTEGER NOT NULL,
                clickX REAL,
                clickY REAL,
                spatialAccuracy INTEGER NOT NULL,
                issueClassification TEXT NOT NULL,
                classificationCorrect INTEGER NOT NULL,
                justificationText TEXT NOT NULL,
                justificationScore REAL NOT NULL,
                confidenceRating INTEGER NOT NULL,
                barrierComplexityScore INTEGER NOT NULL,
                visualSalienceScore INTEGER NOT NULL,
                severityIndex INTEGER NOT NULL,
                experimentCondition TEXT NOT NULL,
                researchMode INTEGER NOT NULL,
                anonymizedMode INTEGER NOT NULL,
                datasetVersion TEXT NOT NULL,
                caseOrderSeed INTEGER NOT NULL,
                randomizedCaseOrder TEXT NOT NULL,
                mode TEXT NOT NULL,
                indicatorChanges TEXT NOT NULL,
                participantCode TEXT NOT NULL,
                consentResearch INTEGER NOT NULL
            )
            """
        )


def parse_cookie_header(cookie_header: str) -> dict:
    out = {}
    if not cookie_header:
        return out
    for segment in cookie_header.split(";"):
        if "=" not in segment:
            continue
        key, val = segment.split("=", 1)
        out[key.strip()] = val.strip()
    return out


def sanitize_log(payload: dict) -> dict:
    indicator_changes = payload.get("indicatorChanges", [])
    if not isinstance(indicator_changes, list):
        indicator_changes = []

    randomized_order = payload.get("randomizedCaseOrder", [])
    if not isinstance(randomized_order, list):
        randomized_order = []

    def as_bool(value):
        return bool(value)

    return {
        "sessionUUID": str(payload.get("sessionUUID", "")),
        "role": str(payload.get("role", "public")),
        "caseID": str(payload.get("caseID", "")),
        "round": int(payload.get("round", 0) or 0),
        "decisionTimestamp": str(payload.get("decisionTimestamp", "")),
        "responseTimeMs": int(payload.get("responseTimeMs", 0) or 0),
        "clickX": payload.get("clickX", None),
        "clickY": payload.get("clickY", None),
        "spatialAccuracy": as_bool(payload.get("spatialAccuracy", False)),
        "issueClassification": str(payload.get("issueClassification", "")),
        "classificationCorrect": as_bool(payload.get("classificationCorrect", False)),
        "justificationText": str(payload.get("justificationText", ""))[:200],
        "justificationScore": float(payload.get("justificationScore", 0) or 0),
        "confidenceRating": int(payload.get("confidenceRating", 0) or 0),
        "barrierComplexityScore": int(payload.get("barrierComplexityScore", 0) or 0),
        "visualSalienceScore": int(payload.get("visualSalienceScore", 0) or 0),
        "severityIndex": int(payload.get("severityIndex", 0) or 0),
        "experimentCondition": str(payload.get("experimentCondition", "untimed")),
        "researchMode": as_bool(payload.get("researchMode", False)),
        "anonymizedMode": as_bool(payload.get("anonymizedMode", True)),
        "datasetVersion": str(payload.get("datasetVersion", "")),
        "caseOrderSeed": int(payload.get("caseOrderSeed", 0) or 0),
        "randomizedCaseOrder": [str(x) for x in randomized_order[:100]],
        "mode": str(payload.get("mode", "spatial")),
        "indicatorChanges": [str(x) for x in indicator_changes[:50]],
        "participantCode": str(payload.get("participantCode", ""))[:64],
        "consentResearch": bool(payload.get("consentResearch", False)),
    }


def insert_log(record: dict) -> None:
    with db_connect() as conn:
        conn.execute(
            """
            INSERT INTO research_logs (
                sessionUUID, role, caseID, round, decisionTimestamp, responseTimeMs,
                clickX, clickY, spatialAccuracy, issueClassification, classificationCorrect,
                justificationText, justificationScore, confidenceRating, barrierComplexityScore,
                visualSalienceScore, severityIndex, experimentCondition, researchMode,
                anonymizedMode, datasetVersion, caseOrderSeed, randomizedCaseOrder, mode,
                indicatorChanges, participantCode, consentResearch
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["sessionUUID"],
                record["role"],
                record["caseID"],
                record["round"],
                record["decisionTimestamp"],
                record["responseTimeMs"],
                record["clickX"],
                record["clickY"],
                int(record["spatialAccuracy"]),
                record["issueClassification"],
                int(record["classificationCorrect"]),
                record["justificationText"],
                record["justificationScore"],
                record["confidenceRating"],
                record["barrierComplexityScore"],
                record["visualSalienceScore"],
                record["severityIndex"],
                record["experimentCondition"],
                int(record["researchMode"]),
                int(record["anonymizedMode"]),
                record["datasetVersion"],
                record["caseOrderSeed"],
                json.dumps(record["randomizedCaseOrder"], ensure_ascii=True),
                record["mode"],
                json.dumps(record["indicatorChanges"], ensure_ascii=True),
                record["participantCode"],
                int(record["consentResearch"]),
            ),
        )


def fetch_logs() -> list[dict]:
    with db_connect() as conn:
        rows = conn.execute(
            """
            SELECT sessionUUID, role, caseID, round, decisionTimestamp, responseTimeMs,
                   clickX, clickY, spatialAccuracy, issueClassification, classificationCorrect,
                   justificationText, justificationScore, confidenceRating, barrierComplexityScore,
                   visualSalienceScore, severityIndex, experimentCondition, researchMode,
                   anonymizedMode, datasetVersion, caseOrderSeed, randomizedCaseOrder, mode,
                   indicatorChanges, participantCode, consentResearch
            FROM research_logs
            ORDER BY id ASC
            """
        ).fetchall()

    out = []
    for row in rows:
        row_dict = dict(row)
        row_dict["spatialAccuracy"] = bool(row_dict["spatialAccuracy"])
        row_dict["classificationCorrect"] = bool(row_dict["classificationCorrect"])
        row_dict["researchMode"] = bool(row_dict["researchMode"])
        row_dict["anonymizedMode"] = bool(row_dict["anonymizedMode"])
        row_dict["consentResearch"] = bool(row_dict["consentResearch"])
        row_dict["randomizedCaseOrder"] = json.loads(row_dict["randomizedCaseOrder"] or "[]")
        row_dict["indicatorChanges"] = json.loads(row_dict["indicatorChanges"] or "[]")
        out.append(row_dict)
    return out


class Handler(BaseHTTPRequestHandler):
    server_version = "BarrierBreakerHTTP/1.0"

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/log-session":
            self.handle_log_session()
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/admin":
            if not self.has_admin_access(parsed):
                self.send_text(HTTPStatus.UNAUTHORIZED, "Unauthorized")
                return
            self.send_text(HTTPStatus.OK, "Admin access granted")
            return

        if parsed.path == "/admin/dashboard":
            if not self.has_admin_access(parsed):
                self.send_text(HTTPStatus.UNAUTHORIZED, "Unauthorized")
                return
            cookie = self.issue_session_cookie(parsed)
            headers = {"Set-Cookie": cookie} if cookie else None
            self.serve_static_file(ROOT / "admin-dashboard.html", extra_headers=headers)
            return

        if parsed.path == "/api/admin/logs":
            if not self.has_admin_access(parsed):
                self.send_json(HTTPStatus.UNAUTHORIZED, {"ok": False})
                return
            cookie = self.issue_session_cookie(parsed)
            headers = {"Set-Cookie": cookie} if cookie else None
            items = fetch_logs()
            self.send_json(HTTPStatus.OK, {"ok": True, "total": len(items), "items": items}, extra_headers=headers)
            return

        if parsed.path == "/api/admin/logs.csv":
            if not self.has_admin_access(parsed):
                self.send_text(HTTPStatus.UNAUTHORIZED, "Unauthorized")
                return
            cookie = self.issue_session_cookie(parsed)
            headers = {"Set-Cookie": cookie} if cookie else None
            self.send_csv_logs(fetch_logs(), extra_headers=headers)
            return

        if parsed.path == "/api/admin/session-role":
            query = parse_qs(parsed.query or "")
            action = (query.get("action") or ["activate"])[0].strip().lower()
            if action == "deactivate":
                if not self.validate_admin_key(parsed):
                    self.send_json(HTTPStatus.OK, {"ok": True, "role": "public"})
                    return
                self.clear_admin_session()
                self.send_json(
                    HTTPStatus.OK,
                    {"ok": True, "role": "public"},
                    extra_headers={"Set-Cookie": self.clear_session_cookie()},
                )
                return

            role = "research" if self.has_admin_access(parsed) else "public"
            cookie = self.issue_session_cookie(parsed) if role == "research" else None
            headers = {"Set-Cookie": cookie} if cookie else None
            self.send_json(HTTPStatus.OK, {"ok": True, "role": role}, extra_headers=headers)
            return

        self.serve_static_request(parsed.path)

    def handle_log_session(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > 1_000_000:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False})
            return

        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except Exception:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False})
            return

        record = sanitize_log(payload if isinstance(payload, dict) else {})
        insert_log(record)
        self.send_json(HTTPStatus.ACCEPTED, {"ok": True})

    def serve_static_request(self, url_path: str):
        clean = "/index.html" if url_path == "/" else url_path
        if ".." in clean:
            self.send_error(HTTPStatus.BAD_REQUEST)
            return
        local = ROOT / clean.lstrip("/")
        self.serve_static_file(local)

    def serve_static_file(self, file_path: Path, extra_headers: dict | None = None):
        if not file_path.exists() or not file_path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        content = file_path.read_bytes()
        mime = MIME_TYPES.get(file_path.suffix.lower(), "application/octet-stream")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(content)))
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(content)

    def send_json(self, status: int, payload: dict, extra_headers: dict | None = None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def send_text(self, status: int, text: str):
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_csv_logs(self, rows: list[dict], extra_headers: dict | None = None):
        sio = io.StringIO()
        writer = csv.DictWriter(sio, fieldnames=FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            encoded = dict(row)
            encoded["randomizedCaseOrder"] = "|".join(row.get("randomizedCaseOrder", []))
            encoded["indicatorChanges"] = "|".join(row.get("indicatorChanges", []))
            writer.writerow(encoded)

        body = sio.getvalue().encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def has_admin_access(self, parsed):
        cookies = parse_cookie_header(self.headers.get("Cookie", ""))
        sid = cookies.get("adminSession")
        if sid and sid in SESSIONS:
            return True

        return self.validate_admin_key(parsed)

    def validate_admin_key(self, parsed):
        provided = self.extract_admin_key(parsed)
        if not ADMIN_KEY or not provided:
            return False
        return hmac.compare_digest(provided, ADMIN_KEY)

    def extract_admin_key(self, parsed):
        x_admin = self.headers.get("X-Admin-Key", "").strip()
        if x_admin:
            return x_admin

        auth = self.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            return auth[7:].strip()

        query = parse_qs(parsed.query or "")
        return (query.get("token") or query.get("key") or [""])[0].strip()

    def issue_session_cookie(self, parsed):
        provided = self.extract_admin_key(parsed)
        if not ADMIN_KEY or not provided:
            return None
        if not hmac.compare_digest(provided, ADMIN_KEY):
            return None

        sid = secrets.token_hex(18)
        SESSIONS.add(sid)
        return f"adminSession={sid}; HttpOnly; SameSite=Strict; Path=/"

    def clear_admin_session(self):
        cookies = parse_cookie_header(self.headers.get("Cookie", ""))
        sid = cookies.get("adminSession")
        if sid and sid in SESSIONS:
            SESSIONS.discard(sid)

    def clear_session_cookie(self):
        return "adminSession=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"

    def log_message(self, _format, *_args):
        return


def main():
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Barrier Breaker server running on http://localhost:{PORT}/index.html")
    print(f"SQLite log database: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
