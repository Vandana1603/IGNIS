# IGNIS — Microgravity Fire Intelligence (Phase 4 frontend)

Premium React research console for the **Flame in Freefall** NASA Space Apps Challenge. Connects to the user's **existing** FastAPI Phase 2 and Phase 3 endpoints. It does not download NASA data, fabricate experiment values, or use an LLM.

**Quick start**: see [`WINDOWS_SETUP.md`](./WINDOWS_SETUP.md).

## Features

- Mission Overview: imported record counts and represented investigations, derived from API responses
- Research Intelligence: explainable, field-weighted lexical ranking and original source-field matches
- Experiment Explorer: investigation-filtered tables and scientifically compatible charts
- Comparison Lab: Phase 2 Comparability Guard, shared measurements and warnings
- Evidence Passport: original NASA test IDs, DOIs, raw fields, hashes, units and limitations
- Methodology: transparent field weights, source metadata and data-provenance constraints

## Data policy

The UI never uses mock NASA telemetry or hardcoded research measurements. It reads real curated experimental excerpts from the running backend. All charts are derived from imported numeric fields and restricted to a single investigation, original source column and unit. A retrieval score is **not** a scientific risk score. This phase does **not** implement LLM summaries or a certified fire-safety predictor.

## Architecture

```
Browser / React + TypeScript + Tailwind + Recharts
        |
        | /api (Vite development proxy)
        v
Existing FastAPI :8000
  /v2/sources
  /v2/experiments
  /v2/evidence-passports/{id}
  /v2/compare
  /v3/index-status
  /v3/ranking-method
  /v3/search
  /v3/evidence/{id}
        |
        v
Existing data/phase2 curated NASA PSI records
```

## Commands

```powershell
npm install
npm run typecheck
npm run test
npm run build
npm run verify:api
npm run dev
```

See `WINDOWS_SETUP.md` for the two-terminal PowerShell workflow, scientific checks, and troubleshooting.
