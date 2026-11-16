# IGNIS Phase 8 — Live NASA Research Sync + Interactive Microgravity Laboratory

## Scope

This extension is built on the user-supplied IGNIS Phase 2–7 backend and React frontend. It leaves `data/phase2` and all existing `/v2`, `/v3`, `/v5`, `/v6`, and `/v7` semantics unchanged.

### Official source links

- NASA PSI-25 BASS-II: https://psi.nasa.gov/physci/repo/data/investigations/PSI-25 — DOI 10.60555/4qc4-de67
- NASA PSI-69 FLEX: https://psi.nasa.gov/physci/repo/data/investigations/PSI-69 — DOI 10.60555/mbq8-0451

## What is truly live?

**On-demand repository checks are genuine HTTPS requests** from the FastAPI backend to the two allowlisted NASA PSI investigation pages. Check timestamps and HTTP response metadata are displayed as obtained at runtime. PSI landing pages may require JavaScript to expose file lists; if a file is absent from the fetched HTML, IGNIS explicitly says so. No undocumented NASA PSI REST API is claimed.

A remote page becoming reachable or changing its HTML **does not mean an ISS experiment is currently transmitting**, nor does it establish that new experimental data are available. A remote failure is reported as `unavailable`; no success or timestamp is fabricated.

### File discovery and staging

- `/v8/sync/status`: cached source checks and existing catalog counts (offline read; no remote fetch).
- `/v8/sync/check`: POST `{ "source_id": "PSI-69" }` for a genuine HTTPS request (use `null` to check both).
- `/v8/sync/stage`: POST `{ "source_id": "PSI-69", "artifact_id": "<id from check>" }`. Downloads only a discovered NASA PSI link; only trusted HTTPS host; 20 MB maximum; no ZIP extraction; saves to `data/phase8/staged` with SHA-256 metadata.
- `/v8/sync/staged`: lists staged files and fingerprints.
- `/v8/sync/preview/{filename}`: when a staged file is a CSV/TSV with the expected original `Test #` or `FLEX Identifier` column, performs **original-string** matching with local imported IDs. Outputs candidate new test IDs, raw field differences, or incomplete column overlap. It neither converts units nor validates the remote file against the NASA investigation beyond source URL and file digest. It never merges records or changes existing measurements.

A staging preview is not an ingestion pipeline; promoting data into the scientific catalog would require explicit source-specific format validation, units, provenance checks, compatibility checks, and user approval. This intentional boundary prevents unreviewed NASA files from contaminating the verified demo.

### Security and operations

- Network destination: only `https://psi.nasa.gov` (fixed known investigation URLs, no user-supplied remote URLs).
- Redirects outside this host are rejected.
- GET source check is offline; POST initiates external requests explicitly.
- Page payload max 2 MiB; staged file max 20 MiB. HTTP timeout 8 seconds per remote request.
- JSON status is saved atomically under the new `data/phase8/` directory.
- Data original SHA-256 fingerprints and `/v7/readiness` remain active.
- `/v8` gets no-store/security headers and request-size checks via existing Phase 7 middleware.
- For public deployment, also implement authentication, rate limiting, HTTPS reverse proxy, and request-count/egress caps; these are **not** provided by this educational prototype.

## Interactive laboratory

- Two original vector apparatus illustrations: BASS-II solid-fuel flow duct (inside MSG), and FLEX liquid-droplet combustion apparatus (MDCA / CIR).
- Schematics are **illustrative, not engineering drawings, measured flame geometries, NASA imagery, experimental video, or accurate scale**.
- Fuel, ambient, imaging, and apparatus controls show original raw table strings from the selected record.
- Evidence IDs load from `/v3/evidence/{record_id}`; Passport links open the existing audited record.
- Charts are computed from the user's local imported `/v2/experiments`, grouped **within a single investigation**, original metric and unit.
- Comparison links use the existing `/v5/compare` scientific guard; no numerical cross-investigation merging.
- Source-available conditions are displayed exactly as captured. BASS-II fan displays are not calibrated airflow velocities; no physical simulation is claimed.

## Verification and truthful claims

1. Existing 97 tests in the uploaded project passed unchanged before new Phase 8 tests were added.
2. New 18 backend tests verify allowed URLs, remote failure reporting, HTML metadata discovery, SHA staging, CSV preview, non-import, API compatibility and security response headers using mocked network transport.
3. The complete merged backend suite contains 115 passing tests in the test environment.
4. React TypeScript (`tsc -b`) passed against the uploaded dependency tree; the Vite production bundle could not run in this Linux environment because the ZIP contains Windows-only Rollup binaries. Verify it on Windows after `npm install`.
5. Actual NASA network access could not be exercised in this isolated environment. An on-device live check is required before claiming successful real remote sync.
6. Chromium UI tests and external production deployment require testing on the user's Windows machine; no passing result is claimed for them here.
