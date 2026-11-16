# IGNIS Phase 3 — Retrieval methodology and scientific limitations

## Source scope

The index is generated dynamically from the **already imported and validated** Phase 2 catalog (`data/phase2/experiments.json`), with original table cells from `raw_fields` and the curated investigation title from `data/phase2/sources.json`. It does not fetch NASA, scrape research papers, use an LLM, create research passages, or invent experimental measurements. The original source locator, NASA PSI URL, DOI, and raw row SHA-256 accompany each table-field match.

The source excerpts were manually transcribed into curated CSVs in Phase 2. Source links are attribution and verification pointers; file hashes check local integrity, **not scientific correctness or official NASA certification**.

## Algorithm

- Tokenization: case-insensitive literal words/numbers; a small stopword list; no synonyms, stemming, embeddings, or semantic inference.
- Searchable evidence: original nonempty table-column labels and cell values, plus clearly labeled curated investigation title metadata.
- Relevance: per query term, choose the maximum weighted matching field in each record. `IDF = ln((N + 1) / (df + 1)) + 1`, where N is the number of filtered imported records and df is the number of records matching the term.
- Relative weights: test identifiers 4.0; fuel/material 3.5; test outcome 3.2; other table fields 1.2; curated source title 0.4. Matches in a column label only receive 55% of that field's weight.
- Final relevance score: sum of the best contributions per matched term. Deterministic tie-break by ascending record ID.
- `match_mode=any` returns partial matches; `match_mode=all` requires all non-stopword query tokens in either field labels or values; `match_mode=all_values` requires all tokens in original **cell values**. For example, FLEX 20CAL08 contains "extinction" in the column label "Visible flame extinction diameter" but its reported test ending is "Disruption". To filter outcomes, use `outcome=Extinction`, not just a free-text query.
- Search results expose matched/unmatched terms, original source fields, field-level evidence IDs, and per-term score contributions.

This score is a **retrieval relevance heuristic**, not a physical combustion measurement, a NASA ranking, an AI accuracy metric, or a spacecraft safety score. The weight choices are application design parameters and have not been experimentally validated.

## Answerability and scientific limitations

The engine returns evidence pointers, **not** a causal or predictive scientific answer. It flags questions requesting causal inference. When asked about flame spread rates or calibrated airflow velocity, it warns when those quantities are absent from the imported normalized metrics. BASS-II `Air display` and `Fan display` remain instrument readouts; `Calibrated initial O2 % by vol` is not silently reinterpreted as ambient oxygen. FLEX burn times and outcomes remain reported observations, not proof of why a test ended.

A missing search result means **the selected imported rows lack literal matching fields**; it does not mean NASA has no relevant experiment or publication. A match on a column *label* does not mean that the cell value establishes a scientific relationship. Use the Evidence Passport and original NASA source to verify any interpretation.

## Reproducibility

Run `python -m backend.phase2.ingest --include-flex` after reviewing curated source files, then `python -m pytest -q tests/test_phase3.py`. The search module reloads and validates the Phase 2 catalog and manifest on each request, avoiding stale cached data. See `PHASE3_README.md` for Windows setup, API calls, and expected checkpoints.
