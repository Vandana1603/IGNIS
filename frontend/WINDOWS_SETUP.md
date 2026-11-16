# IGNIS Phase 4 — Windows VS Code setup and checkpoints

This kit is **Prompt 3 of 7**. It only adds `frontend/` to your existing `D:\NASA\IGNIS` repository. It does **not** change Phase 1, Phase 2, Phase 3, or NASA source data.

## Preflight: existing backend

In **VS Code Terminal 1 (PowerShell)**:

```powershell
Set-Location D:\NASA\IGNIS
.\.venv\Scripts\Activate.ps1
python -m pytest -q tests\test_phase2.py tests\test_phase3.py
python -m uvicorn backend.main:app --reload
```

Check the real backend at http://127.0.0.1:8000/docs. Confirm the `/v2` and `/v3` endpoints exist. **Keep this terminal running**.

## Install Node.js

In **Terminal 2 (PowerShell)**:

```powershell
node --version
npm --version
```

Use Node.js 20.19+ or 22.12+ (recommended current LTS) for Vite compatibility. If missing, install the official Node.js LTS from https://nodejs.org/ then restart VS Code.

## Download and extract this kit

Download `IGNIS_Phase4_Frontend_Kit.zip` to your Windows Downloads folder. In Terminal 2:

```powershell
Set-Location D:\NASA\IGNIS
$zip = Join-Path $env:USERPROFILE 'Downloads\IGNIS_Phase4_Frontend_Kit.zip'
Test-Path $zip
$unpack = Join-Path $env:TEMP 'ignis_phase4_unpack'
Expand-Archive -Path $zip -DestinationPath $unpack -Force
Test-Path "$unpack\frontend\package.json"
Test-Path .\frontend\package.json
```

The first and second checks should be `True`; the last should be `False` for a new frontend. If a `frontend/` folder already exists, **do not blindly overwrite it**: back it up or merge carefully.

```powershell
Copy-Item "$unpack\frontend" '.\frontend' -Recurse -Force
Set-Location .\frontend
Get-ChildItem
```

## Install and check the frontend

```powershell
npm install
npm run typecheck
npm run test
npm run build
```

Expected:
- `npm install`: dependencies installed successfully (requires internet access to npm registry)
- `npm run typecheck`: TypeScript reports no errors
- `npm run test`: 6 scientific-helper tests pass
- `npm run build`: production `dist/` created

**Important:** These npm steps must be run on your Windows computer. The code kit was checked for TypeScript syntax and its API contract was checked against the existing backend, but npm packages could not be downloaded in the author's offline environment, so a full React/Vite build was not executed there.

## Verify the actual backend contract

Keep FastAPI running in Terminal 1. From Terminal 2, in `D:\NASA\IGNIS\frontend`:

```powershell
npm run verify:api
```

This script uses Node's built-in `fetch` to check the **real** `/v2` and `/v3` endpoints. It does not write to the backend or create any NASA records. Expected: `SUCCESS: Read-only frontend API contract checks passed.`

## Run the frontend

```powershell
npm run dev
```

Open http://127.0.0.1:5173/ . Vite proxies browser calls from `/api/v2/...` and `/api/v3/...` to `http://127.0.0.1:8000/v2/...` and `http://127.0.0.1:8000/v3/...`. **No FastAPI CORS change is required for this local setup.**

### Verification checklist

1. **Mission Overview** shows counts from `/v3/index-status` and `/v2/experiments`. For the six-record curated kit, it should show six imported tests and two represented investigations. Do not interpret those counts as NASA's entire archive.
2. **Research Intelligence**: search `methanol extinction` with `All terms in original values` to see FLEX 20CAL10 and 20CAL12, with source fields and ranking breakdown.
3. **Experiment Explorer**: choose FLEX and chart `Burn time; s` or `Droplet initial diameter; mm` from imported test records. Switch to BASS-II and inspect calibrated oxygen metrics.
4. **Comparison Lab**: compare two FLEX tests for compatible descriptive metrics; compare BASS-II with FLEX and confirm the Guard declines a joint numeric chart.
5. **Evidence Passport**: open PSI-25-B1; verify NASA source link, DOI, original `Air display` and `Calibrated initial O2 % by vol` values, and local SHA-256 hash.
6. **Methodology**: verify field weights and provenance are read from the backend.
7. **Responsive check**: use Chrome DevTools device toolbar at 375px and 768px; navigation should work without horizontal page overflow.
8. **Backend outage check**: stop FastAPI, refresh; the frontend should show a visible API error instead of invented fallback numbers.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `npm` not recognized | Install Node.js LTS; restart VS Code; check `node --version` |
| `npm install` network error | Check internet/proxy/firewall access to npm registry; retry later; no fake local dependencies are supplied |
| `vite` not recognized | Run `npm install` from `frontend/`, then `npm run dev` |
| Port 5173 already in use | Close old Vite process or change `server.port` in `vite.config.ts` |
| Port 8000 already in use | Stop the old backend process, or update the Vite proxy target to your real FastAPI port |
| API unavailable | Keep FastAPI running; check `http://127.0.0.1:8000/v3/index-status` |
| 404 on `/api/v3/search` | Ensure Phase 3 router is included in `backend/main.py`; restart FastAPI |
| JSON data mismatch | Re-run the Phase 2 ingestion and Python tests before trusting charts |
| Charts blank | Select one investigation and a numeric metric present in its imported records |
| Search empty | Check `match_mode` and filters; only indexed original table values are searchable |

## Deployment note

In development the Vite proxy avoids browser CORS. If deploying the frontend and backend to separate domains, set `VITE_API_BASE_URL` to the public backend origin and explicitly configure FastAPI's `CORSMiddleware` with **your real frontend origin**. Do not use `allow_origins=['*']` for a credentialed production application. Avoid placing secret API keys in `VITE_*` variables; they are embedded in the client bundle.

## Git milestone

From the root `D:\NASA\IGNIS`:

```powershell
git add frontend
git commit -m "Phase 4: NASA evidence-linked React research console"
```

`node_modules/`, `dist/`, and `.env` are ignored by `frontend/.gitignore`.
