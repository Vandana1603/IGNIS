# IGNIS 2.4 — Expanded Evidence & Optional RAG

**Scope:** An additive upgrade of the IGNIS 2.3 FastAPI + React project. The existing laboratory, animation controls, home layout, research tools, /v2, /v3, /v5, /v6, /v7 and /v8 APIs remain available.

## What actually changed

- **28 imported experiment records** instead of six: **25 BASS-II solid fuel tests** (B1–B22 plus F1–F3, including PMMA and Nomex specimens) and the **original three FLEX methanol tests** (20CAL08, 20CAL10, 20CAL12).
- New raw BASS-II rows are manual transcriptions from a publicly mirrored PSI-25 experiment table. Test IDs and selected readings were cross-checked against **NASA/TM-20210011385, Appendix A**. The full original NASA-hosted export has **not** been independently downloaded or audited. Do not claim "28 fully verified NASA downloads." Details are in `data/phase10/provenance.json` and `docs/PHASE10_SCIENCE_AND_PROVENANCE.md`.
- Existing B1, B3, B4 and all FLEX records retain original source-cell values. The imported BASS CSV and generated catalog have intentionally changed to increase coverage; the FLEX CSV and existing web/laboratory code have not.
- Optional evidence-first RAG: `POST /v10/rag/ask` uses original evidence ID citations; `GET /v10/rag/status` and `GET /v10/rag/provenance/{record_id}` provide source information. Existing `/v6/ask` works unchanged.
- A **collapsed** Extended Evidence Retrieval section inside **Scientific Insights** keeps the dashboard visually clean.
- Existing six-record-dependent tests were updated for 28 records; new Phase 10 tests verify provenance, abstention and RAG fallback.

## Installation — Windows VS Code (safe upgrade ZIP)

Save `IGNIS_Expanded_Data_RAG_Upgrade.zip` into Downloads. In PowerShell:

```powershell
Set-Location D:\NASA\IGNIS
.\.venv\Scripts\Activate.ps1
$zip = Join-Path $env:USERPROFILE 'Downloads\IGNIS_Expanded_Data_RAG_Upgrade.zip'
Test-Path $zip
$unpack = Join-Path $env:TEMP 'ignis_expanded_rag'
Expand-Archive -LiteralPath $zip -DestinationPath $unpack -Force
python "$unpack\install_phase10.py" --root 'D:\NASA\IGNIS' --dry-run
```

If the last command reports **DRY RUN PASSED**, apply:

```powershell
python "$unpack\install_phase10.py" --root 'D:\NASA\IGNIS'
python -m scripts.check_phase10
python -m pytest -q tests
```

Expected from this project source: **138 passed**. This includes updated baseline expectations and Phase 10 tests. Do not run the old Phase 2 importer against an unreviewed external file; imported original values are protected by hashes.

## Launch

Backend, Terminal 1:

```powershell
Set-Location D:\NASA\IGNIS
.\.venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --reload
```

Frontend, Terminal 2:

```powershell
Set-Location D:\NASA\IGNIS\frontend
npm install
npm run typecheck
npm run test
npm run build
npm run dev
```

Open: http://127.0.0.1:5173/insights and expand **Extended evidence retrieval**. Visit `/laboratory` to select BASS-II solid fuel records; the dropdown now derives from all 25 imported BASS-II records. The visual effects remain qualitative and are **not** burn-time predictions.

## Check the API

```powershell
Invoke-RestMethod http://127.0.0.1:8000/v10/rag/status
$body = @{ question = 'What is the material of F1?'; mode = 'extractive' } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:8000/v10/rag/ask -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 8
Invoke-RestMethod http://127.0.0.1:8000/v10/rag/provenance/PSI-25-F1
```

## Optional AI-assisted RAG, not required for offline use

**Default: evidence-only, no external model.** To enable AI-assisted wording for a LOCAL demo, set the API key on the *backend machine*; never place it in the frontend, a `.env` committed to Git, or the ZIP. The key may incur API usage fees. For this optional mode only:

```powershell
$env:OPENAI_API_KEY = Read-Host 'OpenAI API key'
$env:IGNIS_ENABLE_REMOTE_RAG = '1'
$env:OPENAI_MODEL = 'gpt-4o-mini'
python -m uvicorn backend.main:app --reload
```

Do not enable AI on an unauthenticated public backend: add authentication and server-side quotas first. AI output undergoes citation checks and original-number checks but is **not scientifically validated**; failed responses fall back to original-field retrieval. The remote API could **not** be exercised here because no API key was supplied; its fallback and output-validation paths were tested with mocks.

## Import more verified NASA data later

The app has a reviewed-file import pathway. Download an official BASS-II or FLEX experimental table from the NASA PSI page using your browser. Map it to the exact reviewed CSV headers, preserving units and missing cells. Preview without making changes:

```powershell
python scripts\extend_psi.py --source-id PSI-69 --file 'C:\Users\YOUR_USER\Downloads\flex_reviewed.csv'
```

Then, after checking test IDs, original values, and source attribution:

```powershell
python scripts\extend_psi.py --source-id PSI-69 --file 'C:\Users\YOUR_USER\Downloads\flex_reviewed.csv' --apply --confirm-official-source
python -m scripts.check_phase10
```

This detects duplicate/conflicting IDs, rejects unreviewed headers, validates units/ranges, creates a backup and does not silently invent data. It requires an **actual** NASA-sourced file. No live ISS telemetry is claimed.

## Verification honesty

- Verified here: import and cross-file integrity, Python tests, API response contracts, fallback and citation validation, TypeScript type-check.
- Not verified here: Windows frontend production build, Chromium browser tests, live NASA download, **actual optional OpenAI API call** and independent NASA audit of every newly transcribed field.
- Safety: no oxygen-to-risk prediction, calibrated airflow extrapolation, lunar flame simulation or spacecraft recommendation.
