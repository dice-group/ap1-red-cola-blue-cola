"""HTTP service: JSON API under /api and the static web interface under /."""

from __future__ import annotations

import json
import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from apps.api import views
from packages.engine import (
    DemoEngine,
    InvalidAction,
    RoundNotFinished,
    SessionNotFound,
    UndefinedConfiguration,
    load_content,
)

WEB_ROOT = Path(__file__).resolve().parents[1] / "web"
STATIC_FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/icons.js": ("icons.js", "text/javascript; charset=utf-8"),
    "/theme.js": ("theme.js", "text/javascript; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/fonts/lobster-latin.woff2": ("fonts/lobster-latin.woff2", "font/woff2"),
    "/fonts/anton-latin.woff2": ("fonts/anton-latin.woff2", "font/woff2"),
    "/fonts/space-mono-400-latin.woff2": ("fonts/space-mono-400-latin.woff2", "font/woff2"),
    "/fonts/space-mono-700-latin.woff2": ("fonts/space-mono-700-latin.woff2", "font/woff2"),
}
MAX_BODY_BYTES = 16 * 1024
INVESTIGATION_ROUTE = re.compile(r"^/api/scenarios/(?P<id>[\w-]+)/investigation$")
MISSION_ROUTE = re.compile(r"^/api/sessions/(?P<id>[\w-]+)/mission$")
SESSION_ROUTE = re.compile(r"^/api/sessions/(?P<id>[\w-]+)(?:/(?P<action>turns|legitimate|reset|result))?$")


class ApiError(Exception):
    def __init__(self, status: HTTPStatus, message: str) -> None:
        super().__init__(message)
        self.status = status


def make_handler(engine: DemoEngine, *, quiet: bool = False) -> type[BaseHTTPRequestHandler]:
    content = engine.content

    class Handler(BaseHTTPRequestHandler):
        server_version = "RedColaDemo/1.0"

        def do_GET(self) -> None:
            path = self.path.split("?", 1)[0]
            if path in STATIC_FILES:
                return self._static(*STATIC_FILES[path])
            self._json_route("GET", path)

        def do_POST(self) -> None:
            self._json_route("POST", self.path.split("?", 1)[0])

        def log_message(self, format: str, *args) -> None:
            if not quiet:
                super().log_message(format, *args)

        # --- Routing -----------------------------------------------------------

        def _json_route(self, method: str, path: str) -> None:
            try:
                status, payload = self._dispatch(method, path)
            except ApiError as error:
                status, payload = error.status, {"error": str(error)}
            except SessionNotFound:
                status, payload = HTTPStatus.NOT_FOUND, {"error": "Session not found. Start a new round."}
            except (InvalidAction, RoundNotFinished) as error:
                status, payload = HTTPStatus.BAD_REQUEST, {"error": str(error)}
            except UndefinedConfiguration as error:
                status, payload = HTTPStatus.CONFLICT, {"error": str(error)}
            self._send(status, json.dumps(payload).encode(), "application/json")

        def _dispatch(self, method: str, path: str) -> tuple[HTTPStatus, dict]:
            if path == "/api/catalog" and method == "GET":
                return HTTPStatus.OK, views.catalog(content)

            case = INVESTIGATION_ROUTE.match(path)
            if case and method == "GET":
                if case["id"] not in content.scenarios:
                    raise ApiError(HTTPStatus.NOT_FOUND, "Unknown scenario.")
                return HTTPStatus.OK, views.investigation(content, case["id"])

            if path == "/api/sessions" and method == "POST":
                body = self._body()
                defense_ids = body.get("defenseIds", [])
                if not isinstance(defense_ids, list) or not all(isinstance(d, str) for d in defense_ids):
                    raise ApiError(HTTPStatus.BAD_REQUEST, "defenseIds must be a list of strings.")
                mission_id = body.get("missionId")
                if mission_id is not None and not isinstance(mission_id, str):
                    raise ApiError(HTTPStatus.BAD_REQUEST, "missionId must be a string.")
                session = engine.create_session(str(body.get("role")), str(body.get("scenarioId")), defense_ids, mission_id)
                return HTTPStatus.CREATED, views.session(content, session)

            # A mission's hidden defenses are revealed only once that attempt is over.
            reveal = MISSION_ROUTE.match(path)
            if reveal and method == "GET":
                session = engine.get_session(reveal["id"])
                if not session.mission_id:
                    raise ApiError(HTTPStatus.NOT_FOUND, "This session is not part of a mission.")
                engine.round_result(session.id)  # raises RoundNotFinished while the attempt is running
                return HTTPStatus.OK, views.mission_debrief(content, session.mission_id)

            match = SESSION_ROUTE.match(path)
            if not match:
                raise ApiError(HTTPStatus.NOT_FOUND, "Not found.")
            session_id, action = match["id"], match["action"]

            if method == "GET" and action is None:
                return HTTPStatus.OK, views.session(content, engine.get_session(session_id))
            if method == "GET" and action == "result":
                return HTTPStatus.OK, views.round_result(content, engine.round_result(session_id))
            if method == "POST" and action == "turns":
                result = engine.run_attack_turn(session_id)
                return HTTPStatus.OK, views.turn(content, engine.get_session(session_id), result)
            if method == "POST" and action == "legitimate":
                return HTTPStatus.OK, views.legitimate(content, engine.run_legitimate_request(session_id))
            if method == "POST" and action == "reset":
                return HTTPStatus.OK, views.session(content, engine.reset(session_id))
            raise ApiError(HTTPStatus.METHOD_NOT_ALLOWED, "Method not allowed.")

        # --- I/O ---------------------------------------------------------------

        def _body(self) -> dict:
            length = int(self.headers.get("Content-Length") or 0)
            if length > MAX_BODY_BYTES:
                raise ApiError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Request body too large.")
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError as error:
                raise ApiError(HTTPStatus.BAD_REQUEST, "Request body must be JSON.") from error
            if not isinstance(body, dict):
                raise ApiError(HTTPStatus.BAD_REQUEST, "Request body must be a JSON object.")
            return body

        def _static(self, name: str, content_type: str) -> None:
            self._send(HTTPStatus.OK, (WEB_ROOT / name).read_bytes(), content_type)

        def _send(self, status: HTTPStatus, data: bytes, content_type: str) -> None:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'")
            self.end_headers()
            self.wfile.write(data)

    return Handler


def create_server(host: str = "127.0.0.1", port: int = 8000, *, quiet: bool = False) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), make_handler(DemoEngine(load_content()), quiet=quiet))


def serve(host: str, port: int) -> None:
    server = create_server(host, port)
    print(f"RED COLA – BLUE COLA demo (simulated mode) running at http://{host}:{server.server_port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
