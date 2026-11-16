# IGNIS — Deployment Readiness Guide

## Current status

A successful local build is **not** a production deployment. IGNIS uses curated manually transcribed NASA PSI table excerpts and deterministic source-linked research logic. Do not advertise this as NASA-endorsed, flight-certified, or a scientifically validated prediction system.

## Local demo (recommended for a short hackathon)

1. FastAPI on `127.0.0.1:8000` using `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`.
2. React/Vite on `127.0.0.1:5173` using `npm run dev`; Vite proxies `/api` to FastAPI.
3. Verify `GET /v7/readiness`, `POST /v3/search`, `GET /v5/passports/PSI-25-B1`, and `POST /v6/ask`.
4. Run `node frontend/scripts/verify-phase7.mjs` and manually rehearse the demonstration.

## Production architecture (example, not deployed or tested here)

```text
Browser HTTPS
  └── Reverse proxy (TLS + request limits + static assets)
       ├── /          -> frontend/dist SPA files
       └── /api/*     -> 127.0.0.1:8000/v2, /v3, /v5, /v6, /v7
```

Build React with the default `/api` prefix (`VITE_API_BASE_URL` unset):

```powershell
Set-Location D:\NASA\IGNIS\frontend
npm ci
npm run typecheck
npm run test
npm run build
```

If no `package-lock.json` exists, use `npm install` once and commit the resulting lockfile before a reproducible `npm ci` deployment.

### Example reverse proxy (Linux Nginx; illustrative configuration only)

```nginx
server {
    listen 443 ssl http2;
    server_name ignis.example.org;

    # Configure a real trusted certificate and private key here.
    ssl_certificate /etc/letsencrypt/live/ignis.example.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ignis.example.org/privkey.pem;

    root /srv/ignis/frontend/dist;
    index index.html;
    client_max_body_size 64k;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 20s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

This is a **starting example**, not a turnkey production configuration. A production operator must validate TLS, headers, HTTP-to-HTTPS redirect, cache rules, service supervision, request limits, host validation, logs, and access controls for their hosting environment.

Run Uvicorn behind the proxy bound to loopback. Do not expose development Vite (`npm run dev`) publicly. Keep Python venv and curated CSV files on the server in the expected `data/phase2` directory. The importer is **not** a startup network download.

## Mandatory checks before calling the deployment ready

- [ ] Deployed HTTPS URL works in a fresh private browser session.
- [ ] `/api/v7/readiness` reports the actual imported catalog count.
- [ ] `/api/v3/search`, `/api/v5/passports/...`, `/api/v6/ask` work from the deployed frontend.
- [ ] Refreshing `/insights` and `/passport/PSI-25-B1` loads the SPA instead of 404.
- [ ] No `.env`, API keys, server logs, raw Python traceback, or filesystem paths are publicly served.
- [ ] Reverse proxy request size and rate limits are configured and tested.
- [ ] Python and Node dependencies are pinned and checked for known vulnerabilities.
- [ ] Legal attribution, NASA source DOIs, curated-subset limitations, and non-operational disclaimer are visible.
- [ ] Performance and error states checked on mobile and slow networks.

## Never claim without evidence

- No claim of independent NASA verification unless the official source rows were actually rechecked.
- No claim of security certification, penetration testing, or accessibility compliance based solely on unit tests.
- No claim that search relevance or the deterministic SI engine predicts fire risk or material safety.
