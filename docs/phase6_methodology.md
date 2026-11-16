# IGNIS Phase 6 — Evidence-Grounded Scientific Intelligence: Methodology

## Scope and source boundaries

This component uses only the existing imported NASA PSI-25 BASS-II and PSI-69 FLEX curated table rows under `data/phase2`. It does not download NASA files, query a remote AI service, generate new experimental measurements, or make an operational fire-safety assessment.

The original investigation sources are:

- PSI-25 BASS-II: https://psi.nasa.gov/physci/repo/data/investigations/PSI-25 (DOI: 10.60555/4qc4-de67)
- PSI-69 FLEX: https://psi.nasa.gov/physci/repo/data/investigations/PSI-69 (DOI: 10.60555/mbq8-0451)

The included six starter rows were manually curated in Phase 2. Their local fingerprints establish local file integrity, not independent correctness of the manual transcription against NASA's current repository. Any presentation should identify the scope as a *curated subset*, not the entire NASA investigation.

## Architecture

1. `backend.phase3.retrieval.load_catalog()` verifies that normalized imported records still match the local curated CSV and manifest.
2. `backend.phase3.retrieval.evidence_fields()` assigns a stable field ID to each non-empty original table cell. These are the exact same IDs exposed by `/v3/evidence/{record_id}` and `/v5/passports/{record_id}`.
3. `backend.phase6.engine.ask()` classifies a question with transparent, fixed rules. It never uses a generative model or a web request.
4. Direct field lookup returns an original column, its original string value, and an original physical unit *only if Phase 2 already normalized that column*. Instrument display values are not converted to velocities.
5. Outcome filtering uses the literal FLEX `Test end` cell, not an incidental word such as `extinction` in a column header.
6. Two-record comparisons must pass Phase 5's Comparability Guard and use matching normalized metric keys, units, and original column labels. The only permitted interpretation is that recorded values can be shown descriptively; no causal explanation is produced.
7. General lexical retrieval uses Phase 3's `all_values` mode. Label-only matches cannot establish a record outcome.
8. Each observation and descriptive interpretation has at least one `evidence_id`. The Pydantic response validator refuses unresolved IDs, and the frontend hides claims if IDs cannot be resolved.

## Abstention policy

The engine refuses questions asking for causal relationships, mechanisms, predictions, correlations, fire risk, material safety rankings, operational recommendations, unavailable calibrated airflow velocities, or flame-spread rates. It also refuses absent/unknown test IDs, missing original fields, incompatible cross-investigation comparisons, ambiguous oxygen fields, and no-match queries.

**This is a conservative application policy, not a NASA-defined scientific threshold.** The absence of an answer is not evidence that NASA has no data elsewhere.

## Response schema

`POST /v6/ask` accepts `{ "question": "...", "max_records": 6 }`.

The response separates:

- `status`: `answered` or `abstained`
- `answer`: a deterministic textual rendering of direct observations
- `observations`: direct source-table statements with exact evidence IDs
- `interpretations`: at most limited, descriptive comparisons, separately labeled and cited
- `evidence`: the original table field values, exact field IDs, original source locators, NASA PSI URLs and DOIs, and local raw-row hashes
- `limitations`: scope, provenance, and Comparability Guard warnings
- `abstention_reason`: explicit reason when the requested inference is unsupported
- `independent_nasa_verification`: always `not_performed` for this local component

## Example queries

| Query | Expected response |
|---|---|
| `What was the burn time of FLEX test 20CAL10?` | Direct observation: 5 s; cites `Burn time; s` |
| `Which imported methanol tests ended in extinction?` | 20CAL10 and 20CAL12; cites exact `Test end` fields |
| `Compare burn times of 20CAL10 and 20CAL12` | 5 s and 3.2 s, descriptive only; cites both |
| `What was the fan display of B1?` | 62 as instrument display; no inferred airflow speed |
| `What material was B3?` | Original string `100 micron film 2 cm wide`; does not infer PMMA |
| `How does airflow influence flame spread?` | Abstains |
| `Which material is safest for spacecraft?` | Abstains |

## Known limitations and future research

- The SI engine is deterministic and rule-based, **not a trained scientific language model**. It does not interpret full NASA papers, imagery, videos, or experimental protocols.
- Search coverage is limited to the imported records; unknown tests or absent measurements are not inferred.
- Numeric comparison is descriptive and cannot isolate confounders or establish controlled equivalence.
- Local source-file SHA-256 fingerprints are not an independent audit of NASA's live source.
- A future LLM-based summarizer should only be added with strict citation verification, prompt-injection defenses, a deterministic fallback, and evaluation on a manually verified NASA corpus. It should not be described as validated until that evaluation is performed.
