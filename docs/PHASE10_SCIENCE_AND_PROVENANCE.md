# IGNIS — Expanded NASA PSI Experiment Evidence and Optional RAG

## Scientific source boundaries

**Primary references**:
- NASA PSI-25 BASS-II original investigation: https://psi.nasa.gov/physci/repo/data/investigations/PSI-25 (DOI 10.60555/4qc4-de67)
- NASA PSI-69 FLEX original investigation: https://psi.nasa.gov/physci/repo/data/investigations/PSI-69 (DOI 10.60555/mbq8-0451)
- NASA/TM-20210011385, *Burning and Suppression of Solids–II (BASS-II) Summary Report*, Appendix A. https://ntrs.nasa.gov/citations/20210011385

The shipped 25 BASS-II rows were manually transcribed from a community-hosted copy of the NASA PSI-25 experiment table: https://raw.githubusercontent.com/Hekimovraiz/FIRE-X/main/Nasa_data/PSI-25_Experimental%20table_BASS-II.csv. Test IDs and selected original fields were cross-checked against NASA's published Appendix A test matrices. The NASA-hosted CSV itself was **not** directly downloaded, and the complete contents of all records were **not** subject to an independent cell-by-cell audit. Describing those records as "fully NASA-verified live records" would be inaccurate. They are **locally curated records linked to official NASA primary literature, with partial cross-checks**.

The original three FLEX rows remain the initial manually curated subset and have not been replaced. NASA may have hundreds of additional tests; those unimported tests must not be counted as imported evidence.

## Changes in record count

| Source | Before | After | Conditions and limitations |
|---|---:|---:|---|
| BASS-II / PSI-25 | 3 | 25 | B1–B22 and F1–F3, original sample materials, O2 readings and raw instrument displays |
| FLEX / PSI-69 | 3 | 3 | Three methanol droplet experiments with original burn time and reported test end |
| **Total** | **6** | **28** | Curated subset only, not all NASA PSI experiments |

BASS-II `Fan display` / `Air display` are preserved as strings; they can include changing settings over the course of one experiment and are **not automatically converted to a physical speed**. Negative or missing sensor readings are preserved verbatim, not treated as physical negative concentrations.

## Evidence pipeline

`Curated CSV -> Phase 2 normalized catalog with SHA-256 -> Phase 3 original-field evidence IDs -> Phase 5 comparisons -> Phase 6 deterministic SI -> Phase 10 extractive/optional AI-assisted RAG`.

The default RAG flow retrieves original source-table fields. Each field has a stable evidence ID and links to its test's NASA PSI page; the matching import file is protected by SHA-256. This proves local reproducibility, **not** independent authenticity of the upstream mirrored CSV.

Optional remote RAG sends a limited number of previously retrieved original table cells to a server-side language model. Returned wording must cite existing evidence IDs; new numerical values or unsupported causal/safety claims are rejected. These checks help but **cannot guarantee factual correctness or safe scientific interpretation**. AI is disabled without both an API key and explicit server opt-in. Do not call default mode a generative AI assistant.

## No invented results

- The liquid and solid laboratory flame animations remain **illustrative behavior models**, not simulations predicting observed combustion quantities.
- No oxygen percentage slider changes the historical NASA values.
- No cross-investigation risk scoring or material safety ranking.
- No claim about partial-gravity flight measurements in PSI.
- A search match or similarity score is for retrieval only, not experiment quality, hazard or scientific priority.

## Reproducibility

Run `python -m scripts.check_phase10` and `python -m pytest -q tests`. For any new NASA export, use `scripts/extend_psi.py` to preview before applying and create local backups. The `data/phase10/provenance.json` ledger records per-record provenance and review boundaries.
