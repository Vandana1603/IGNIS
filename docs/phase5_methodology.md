# IGNIS Phase 5 — Evidence Audit & Comparability Guard

## Scope

This implementation adds a **read-only** `/v5` FastAPI router and additive React panels. It does not overwrite or re-ingest NASA data, change the existing `/v2` and `/v3` contracts, download any NASA files, generate experimental measurements, or create a predictive safety score.

## Source chain

1. NASA PSI investigation reference and DOI in `data/phase2/sources.json`.
2. Selected **manually transcribed** original table cells in `data/phase2/raw/*.csv`.
3. Phase 2 importer-normalized `data/phase2/experiments.json` and `import_manifest.json`.
4. Phase 3 `load_catalog()` validates curated CSV file hashes, row correspondence, source IDs, numeric normalization, and original field labels.
5. Phase 5 passport exposes the local chain, original cells, stable Phase 3 evidence IDs, DOI and source locator.

SHA-256 fingerprints demonstrate **local integrity**, not independent scientific verification. `checked_date` is existing metadata; `/v5` does not access NASA's live website. `independent_nasa_verification` is always `not_performed`.

## Comparability rules

1. Same record vs itself: blocked.
2. Different investigation or experiment type: blocked; no numeric pair returned.
3. Same investigation: only metrics with identical keys, original column labels, and units are displayed side by side. These are descriptive only.
4. Reported context is checked by **literal equality**, with missing values called out. Context columns are explicitly enumerated in `backend/phase5/audit.py`.
5. BASS-II `Fan display`, `Air display`, flow restrictor and radiometer gain are *instrument settings/readouts*, never interpreted as calibrated airflow velocity.
6. FLEX droplet diameter, ambient pressure, composition and fuel are treated as reported context, not controlled experimental conditions.
7. Different context values do not establish which variable caused a difference in another metric.
8. No tolerance, statistical significance test, calibrated hazard cutoff, risk score, or spacecraft safety claim is introduced.

## Endpoint contract

- `GET /v5/passports/{record_id}` — local audit and all original fields
- `GET /v5/passports/{record_id}/fields/{evidence_id}` — single indexed source field
- `POST /v5/compare` — `{"left_id":"PSI-25-B1","right_id":"PSI-25-B4"}`

The original `/v2/compare` and `/v2/evidence-passports` endpoints remain unchanged, as do `/v3/search` and `/v3/evidence`.

## Limits

- The starter catalog contains **six selected curated records** (three BASS-II, three FLEX), not the complete NASA repository.
- NASA's original source tables must be independently reviewed by a human before asserting row-level verification.
- Only source fields present in the imported CSVs are auditable. Missing experimental details cannot be inferred.
- A comparison within one investigation is **not** evidence of controlled experimental conditions or causation.
- All numeric comparisons and visualizations are descriptive and unsuitable for flight-certified safety decisions.
