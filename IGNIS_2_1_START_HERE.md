# IGNIS 2.1 — Focused NASA Research Mission Control

## What changes

This is a **frontend-only, additive presentation upgrade** to your existing Phase 8 project. It retains all FastAPI routes, all original experiment files, field traceability, comparison safeguards, and live PSI investigation checks. It does **not** introduce a new NASA experiment dataset, unverified scientific measurements, AI model, or ISS telemetry service.

- Replaces the cluttered Mission Overview with a short cinematic hero, one clear primary CTA, three verified data counters, a genuine FLEX measurement preview, and three feature entry points.
- Adds `/mission`: a four-step guided judging demo, using imported records, a `/v5/compare` request, evidence links, and `/v6/ask` abstention.
- Adds `/sources`: a concise NASA reference library with tabbed **Data**, **Science**, **Historical lessons**, and **Technology transfer**. All source links are the NASA resources supplied with the challenge.
- Makes secondary navigation collapsible. Streamlines `/laboratory` secondary content and `/sync` technical details without removing functionality.
- Adds `frontend/e2e/mission21.spec.ts` for browser regression tests.

## Install in Windows VS Code

### Option A — Safe additive installer (recommended)

1. Download `IGNIS_Clean_Mission_Upgrade.zip` to your Downloads folder.
2. In VS Code open your existing project `D:\NASA\IGNIS`.
3. Use PowerShell:

```powershell
Set-Location D:\NASA\IGNIS
$zip = Join-Path $env:USERPROFILE 'Downloads\IGNIS_Clean_Mission_Upgrade.zip'
Test-Path $zip
$unpack = Join-Path $env:TEMP 'ignis_clean_mission_upgrade'
Expand-Archive -Path $zip -DestinationPath $unpack -Force
python "$unpack\install_mission.py" --root 'D:\NASA\IGNIS' --dry-run
python "$unpack\install_mission.py" --root 'D:\NASA\IGNIS'
```

**Stop if the dry run reports a conflict.** The installer validates the expected prior Phase 8 source and refuses to overwrite changed user files. It backs up replacements in `.ignis_mission_backup/` and does not touch `data/` or backend files. If your project differs, compare changed files manually or use Option B in a separate directory.

### Option B — Complete source, separate folder

Extract `IGNIS_Clean_Mission_Full_Source.zip` to a new directory such as `D:\NASA\IGNIS_Demo`. Do not overwrite your existing project. The source ZIP intentionally excludes venv and `node_modules`, so you need to install dependencies.

## Run backend and frontend

**Terminal 1 (IGNIS root):**

```powershell
.\.venv\Scripts\Activate.ps1
python -m pytest -q tests
python -m uvicorn backend.main:app --reload
```

**Terminal 2 (frontend):**

```powershell
Set-Location D:\NASA\IGNIS\frontend
npm install
npm run typecheck
npm run test
npm run build
npm run dev
```

Open http://127.0.0.1:5173/ (new clean home). Additional routes:
- http://127.0.0.1:5173/mission — 4-step guided demo
- http://127.0.0.1:5173/laboratory — interactive experimental schematics with source values
- http://127.0.0.1:5173/sync — on-demand source checks and manual staging
- http://127.0.0.1:5173/sources — all requested NASA references, in four small groups

**Browser tests (both servers running):**

```powershell
npx playwright install chromium
npx playwright test e2e/mission21.spec.ts --config=playwright.config.ts
```

If Playwright is not installed, install it using `npm install -D @playwright/test` before running browser tests. `npm run test` runs existing Vitest unit tests, not Playwright.

## Verified versus pending checks

- The full **115-test Python backend suite passed** against the supplied reference source. No backend change was made in this upgrade.
- **TypeScript static validation passed** against the project source and installed type definitions.
- **React production build, Vitest execution, Playwright browser tests, and online NASA source checks are pending on Windows**. The current tool environment only provided Windows-specific native frontend dependencies, so do not claim those are independently passed here.
- The original `data/` files were SHA-256 compared before and after this UI upgrade; they are unchanged.

Read `docs/NASA_RESOURCE_MAP.md` for scientific source attribution and `docs/JUDGING_DEMO_150_SECONDS.md` for the judging narrative. The official NASA Space Apps website lists submission closing **Nov 15, 2026 at 11:59 PM local time** (check local-event instructions for earlier deadlines).
