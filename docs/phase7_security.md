# IGNIS Phase 7 — Security Review and Limitations

## Implemented basic controls

- Existing Pydantic schemas validate request fields and reject invalid or oversized question strings with HTTP 422.
- Phase 7 adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `Permissions-Policy` to API responses.
- Phase 7 adds `Cache-Control: no-store` to `/v2`, `/v3`, `/v5`, `/v6`, and `/v7` responses.
- Selected JSON POST endpoints reject a declared `Content-Length` over 65,536 bytes. This is not complete streamed-body enforcement.
- The readiness endpoint returns a sanitized HTTP 503 on local catalog integrity errors.
- Frontend render errors are caught by a boundary; it does not replace page-level API error handling.
- The deterministic SI engine does not call external LLM APIs or download NASA data.

## Threats not solved by this kit

- Authentication/authorization (the API is public/read-only by design).
- Rate limiting, bot protection, or denial-of-service controls.
- Complete request size enforcement for chunked/undeclared bodies (must be enforced by the reverse proxy).
- TLS termination and HSTS (hosting/proxy responsibility).
- Full content security policy and external font/script review (hosting responsibility).
- Production monitoring, incident response, dependency vulnerability scans, or penetration testing.
- Correctness of manually transcribed NASA rows (requires independent source verification).

## Security verification commands

```powershell
python -m pytest -q tests\test_phase7.py
python -m pip check
npm audit --omit=dev
```

`npm audit` requires registry connectivity and may report advisories that need triage. Do not silently ignore failures. `pip check` validates dependency consistency, not vulnerability status.

Use `git status --short` and `git ls-files` to ensure `.env` and generated reports are not committed. Never paste real tokens or passwords into screenshots, demos, or public README files.
