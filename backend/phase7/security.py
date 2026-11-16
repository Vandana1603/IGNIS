"""Small, explicit API hardening layer. No authentication or rate limiting is claimed.

Content-Length protection applies only to declared lengths on selected POST routes;
reverse-proxy request size limits are still required for a public deployment.
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

MAX_DECLARED_BODY_BYTES = 65536
PROTECTED_POST_PATHS = frozenset({"/v2/compare", "/v3/search", "/v5/compare", "/v6/ask", "/v8/sync/check", "/v8/sync/stage"})


def install_security(app: FastAPI) -> None:
    if getattr(app.state, "ignis_phase7_hardening", False):
        return
    app.state.ignis_phase7_hardening = True

    @app.middleware("http")
    async def phase7_security_headers(request: Request, call_next):
        path = request.url.path
        if request.method == "POST" and path in PROTECTED_POST_PATHS:
            raw_length = request.headers.get("content-length")
            if raw_length is not None:
                try:
                    declared_length = int(raw_length)
                except ValueError:
                    response = JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)
                else:
                    if declared_length < 0:
                        response = JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)
                    elif declared_length > MAX_DECLARED_BODY_BYTES:
                        response = JSONResponse({"detail": "Request body too large"}, status_code=413)
                    else:
                        response = await call_next(request)
            else:
                response = await call_next(request)
        else:
            response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if path.startswith(("/v2/", "/v3/", "/v5/", "/v6/", "/v7/", "/v8/")):
            response.headers["Cache-Control"] = "no-store"
        return response
