"""Explainable lexical retrieval of ONLY imported NASA PSI table fields.

No embeddings, no LLM, no remote downloads, and no fabricated research passages.
A relevance score is an application retrieval score, NOT a scientific risk metric.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

from backend.phase2.catalog import get_records, get_sources
from backend.phase2.ingest import DATA, RAW
from backend.phase2.models import SourceInfo, TestRecord
from backend.phase3.models import (
    EvidenceField, EvidenceMatch, EvidenceResponse, IndexStatus,
    RankedRecord, ScoreContribution, SearchRequest, SearchResponse,
)

TOKEN_PATTERN = re.compile(r"[a-z0-9]+(?:\.[0-9]+)?", flags=re.IGNORECASE)
STOPWORDS = frozenset({
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does",
    "for", "from", "how", "in", "into", "is", "it", "of", "on", "or", "our",
    "the", "their", "these", "this", "to", "under", "was", "were", "what",
    "when", "where", "which", "who", "with", "would", "than", "between",
})

# Relative weights are application-defined ranking heuristics, not NASA ratings.
WEIGHTS = {
    "identifier": 4.0,
    "fuel_material": 3.5,
    "test_outcome": 3.2,
    "other_table_field": 1.2,
    "source_title": 0.4,
}
LABEL_ONLY_FACTOR = 0.55
METHOD = "field_weighted_idf_v1"
PROVENANCE = (
    "These are local transcriptions of selected NASA PSI table cells. Expanded BASS-II rows were cross-checked against selected NASA technical-report fields; full transcription verification was not performed. Source URLs and DOIs "
    "identify the originating investigation; local SHA-256 fingerprints detect changes, "
    "but do not independently certify NASA measurements. No NASA data is downloaded by search."
)


def tokenize(value: str) -> list[str]:
    """Literal, case-insensitive word/number tokens; no unverified synonyms."""
    return [t for t in TOKEN_PATTERN.findall(value.lower()) if t not in STOPWORDS]


def query_tokens(query: str) -> list[str]:
    return list(dict.fromkeys(tokenize(query)))


def locator(record: TestRecord) -> str:
    column = "Test #" if record.source_id == "PSI-25" else "FLEX Identifier"
    return f"Experimental Table > {column} = {record.test_id}"


def field_id(record_id: str, kind: str, name: str) -> str:
    digest = hashlib.sha256(f"{kind}\0{name}".encode("utf-8")).hexdigest()[:12]
    return f"{record_id}::field::{digest}"


def verify_derived_values(record: TestRecord) -> None:
    """Catch modifications of normalized metrics that Phase 2 raw hash alone misses."""
    key = "Test #" if record.source_id == "PSI-25" else "FLEX Identifier"
    if record.raw_fields.get(key) != record.test_id:
        raise ValueError(f"Raw identifier mismatch: {record.id}")
    fuel_key = "Fuel Sample Material" if record.source_id == "PSI-25" else "Fuel"
    if record.raw_fields.get(fuel_key) != record.fuel_material_raw:
        raise ValueError(f"Raw fuel/material mismatch: {record.id}")
    if record.source_id == "PSI-69" and record.raw_fields.get("Test end") != record.reported_test_end:
        raise ValueError(f"Raw test outcome mismatch: {record.id}")
    for key, metric in record.metrics.items():
        raw = record.raw_fields.get(metric.original_column)
        if raw != metric.original_value:
            raise ValueError(f"Metric original-value mismatch: {record.id}/{key}")
        try:
            raw_number = Decimal(raw)
        except (TypeError, InvalidOperation) as exc:
            raise ValueError(f"Metric is not numeric in raw row: {record.id}/{key}") from exc
        if not raw_number.is_finite() or not math.isclose(
            float(raw_number), metric.value, rel_tol=1e-12, abs_tol=1e-12
        ):
            raise ValueError(f"Normalized metric differs from raw NASA table value: {record.id}/{key}")
    for label, value in record.instrument_displays.items():
        if record.raw_fields.get(label) != value:
            raise ValueError(f"Instrument display/raw mismatch: {record.id}/{label}")


def load_catalog() -> tuple[list[TestRecord], dict[str, SourceInfo], dict]:
    records = get_records()  # Phase 2 verifies raw-row fingerprints and curated-file hashes.
    sources = {s.source_id: s for s in get_sources()}
    manifest_path = DATA / "import_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("record_count") != len(records):
        raise ValueError("Import manifest count differs from imported records; rerun Phase 2")
    if set(manifest.get("source_files", {})) != {r.source_id for r in records}:
        raise ValueError("Import manifest source IDs do not match records")
    # Validate generated JSON against the exact curated CSV rows, not just its own hash.
    expected_rows = {}
    for source_id, filename in manifest["source_files"].items():
        csv_path = RAW / filename
        id_column = "Test #" if source_id == "PSI-25" else "FLEX Identifier"
        with csv_path.open("r", encoding="utf-8-sig", newline="") as stream:
            for row in csv.DictReader(stream):
                clean = {name: (value or "").strip() for name, value in row.items()}
                key = (source_id, clean[id_column])
                if key in expected_rows:
                    raise ValueError(f"Duplicate curated CSV test ID: {key}")
                expected_rows[key] = clean
    if len(expected_rows) != len(records):
        raise ValueError("Curated CSV row count differs from imported catalog")
    for source in sources.values():
        if source.url.host != "psi.nasa.gov":
            raise ValueError(f"Unexpected source host for {source.source_id}")
    for record in records:
        verify_derived_values(record)
        if record.source_id not in sources:
            raise ValueError(f"Unknown source for {record.id}")
        if record.raw_fields != expected_rows.get((record.source_id, record.test_id)):
            raise ValueError(f"Raw row differs from curated CSV: {record.id}")
    return records, sources, manifest


def evidence_fields(record: TestRecord, source: SourceInfo) -> list[EvidenceField]:
    result = []
    for name, value in record.raw_fields.items():
        if not value or value.strip().lower() in {"na", "n/a", "null", "none", "—", "-"}:
            continue
        result.append(EvidenceField(
            evidence_id=field_id(record.id, "raw", name),
            record_id=record.id, source_id=record.source_id,
            evidence_kind="transcribed_table_field", field_name=name,
            original_value=value,
            source_locator=f"{locator(record)} > column: {name}",
            source_url=str(source.url), doi=source.doi,
            raw_row_sha256=record.raw_row_sha256,
        ))
    result.append(EvidenceField(
        evidence_id=field_id(record.id, "metadata", "Investigation title"),
        record_id=record.id, source_id=record.source_id,
        evidence_kind="curated_source_metadata", field_name="Investigation title",
        original_value=source.title, source_locator="Investigation metadata > title",
        source_url=str(source.url), doi=source.doi, raw_row_sha256=None,
    ))
    return result


def weight_for(field: EvidenceField) -> float:
    if field.evidence_kind == "curated_source_metadata":
        return WEIGHTS["source_title"]
    if field.field_name in {"Test #", "FLEX Identifier", "FLEX Test #"}:
        return WEIGHTS["identifier"]
    if field.field_name in {"Fuel Sample Material", "Fuel"}:
        return WEIGHTS["fuel_material"]
    if field.field_name == "Test end":
        return WEIGHTS["test_outcome"]
    return WEIGHTS["other_table_field"]


def match_location(field: EvidenceField, term: str) -> str | None:
    in_label = term in set(tokenize(field.field_name))
    in_value = term in set(tokenize(field.original_value))
    if in_label and in_value:
        return "both"
    if in_value:
        return "value"
    if in_label:
        return "label"
    return None


def _notices(query: str, records: list[TestRecord], results_count: int) -> tuple[str, list[str]]:
    lowered = query.lower()
    tokens = set(query_tokens(query))
    notices = [
        "Ranking reflects literal matches in imported table fields, not scientific importance, flame hazard, fire risk, or causation.",
        "Search results are evidence pointers, not generated scientific answers. Confirm source context before interpretation.",
    ]
    all_keys = {key for r in records for key in r.metrics}
    if "extinction" in tokens:
        notices.append("Extinction can match a column label even when Test end is Disruption; use outcome=Extinction or match_mode=all_values to require stronger evidence.")
    if "spread" in tokens and not any("flame_spread" in key for key in all_keys):
        notices.append("No normalized flame-spread-rate measurement is available in these imported rows.")
    if "airflow" in tokens or ("flow" in tokens and tokens & {"velocity", "speed", "rate"}):
        if not any("airflow" in key or "flow_velocity" in key for key in all_keys):
            notices.append("No calibrated airflow velocity measurement is available in these imported rows; instrument displays are not velocities.")
    all_words = set(TOKEN_PATTERN.findall(lowered))
    causal = bool(all_words & {"cause", "causes", "caused", "influence", "affect", "effect", "effects", "why", "predict", "risk", "safe", "safer", "prove"}) or "how does" in lowered
    if causal:
        notices.append("This table-only search cannot establish causal effects, predictions, or spacecraft fire-safety recommendations.")
    if results_count == 0:
        notices.append("No imported record matched the searchable terms and filters. This is not evidence that NASA has no research on the topic.")
        return "no_matching_records", notices
    return ("insufficient_evidence_for_inference" if causal else "matching_records_only"), notices


def search(request: SearchRequest) -> SearchResponse:
    terms = query_tokens(request.query)
    if not terms:
        raise ValueError("Query has no searchable terms; include a fuel, test ID, measurement, or outcome")
    all_records, sources, _ = load_catalog()
    selected = [
        r for r in all_records
        if request.investigation in (None, r.source_id)
        and request.outcome in (None, r.reported_test_end)
    ]
    documents = [(r, evidence_fields(r, sources[r.source_id])) for r in selected]
    n = len(documents)
    # Document frequency: a term counts once per record, not once per repeated table field.
    dfs = {
        term: sum(any(match_location(f, term) for f in fields) for _, fields in documents)
        for term in terms
    }
    ranked = []
    for record, fields in documents:
        evidence_matches = []
        best_by_term = {}
        for field in fields:
            hits = []
            for term in terms:
                location = match_location(field, term)
                if location is None:
                    continue
                hits.append(term)
                idf = math.log((n + 1) / (dfs[term] + 1)) + 1
                field_weight = weight_for(field) * (LABEL_ONLY_FACTOR if location == "label" else 1.0)
                contribution = idf * field_weight
                candidate = (contribution, field.evidence_id, field_weight, idf, location)
                # Maximum per term prevents long rows with repeated labels dominating.
                if term not in best_by_term or candidate[0] > best_by_term[term][0] or (
                    candidate[0] == best_by_term[term][0] and candidate[1] < best_by_term[term][1]
                ):
                    best_by_term[term] = candidate
            if hits:
                # One evidence match per original field; no generated NASA quotes.
                locs = {match_location(field, t) for t in hits}
                where = "both" if "both" in locs or locs == {"label", "value"} else next(iter(locs))
                evidence_matches.append(EvidenceMatch(
                    evidence=field, matched_terms=hits, matched_in=where,
                ))
        if not best_by_term or (request.match_mode == "all" and len(best_by_term) != len(terms)):
            continue
        if request.match_mode == "all_values" and not all(
            any(term in tokenize(f.original_value) for f in fields) for term in terms
        ):
            continue
        breakdown = []
        for term in terms:
            if term in best_by_term:
                amount, evidence_id, weight, idf, where = best_by_term[term]
                breakdown.append(ScoreContribution(
                    term=term, idf=round(idf, 6), field_weight=round(weight, 6),
                    contribution=round(amount, 6), evidence_id=evidence_id, matched_in=where,
                ))
        score = round(sum(best_by_term[t][0] for t in terms if t in best_by_term), 6)
        ranked.append(RankedRecord(
            record_id=record.id, source_id=record.source_id,
            test_id=record.test_id, fuel_material_raw=record.fuel_material_raw,
            reported_test_end=record.reported_test_end, relevance_score=score,
            matched_terms=[t for t in terms if t in best_by_term],
            unmatched_terms=[t for t in terms if t not in best_by_term],
            score_contributions=breakdown, evidence_matches=evidence_matches,
            evidence_passport_url=f"/v2/evidence-passports/{record.id}",
            limitations=record.limitations,
        ))
    ranked.sort(key=lambda item: (-item.relevance_score, item.record_id))
    answer_status, notices = _notices(request.query, selected, len(ranked))
    page = ranked[request.offset:request.offset + request.limit]
    return SearchResponse(
        query=request.query, query_terms=terms, investigation=request.investigation,
        match_mode=request.match_mode, outcome=request.outcome, total_matches=len(ranked),
        returned_count=len(page), offset=request.offset, results=page,
        ranking_method=METHOD, answer_status=answer_status, notices=notices,
    )


def get_evidence(record_id: str) -> EvidenceResponse | None:
    records, sources, _ = load_catalog()
    record = next((r for r in records if r.id == record_id), None)
    if record is None:
        return None
    fields = evidence_fields(record, sources[record.source_id])
    return EvidenceResponse(
        record_id=record.id, source_id=record.source_id,
        evidence_fields=fields, field_count=len(fields),
        evidence_passport_url=f"/v2/evidence-passports/{record.id}",
        provenance_notice=PROVENANCE,
    )


def get_index_status() -> IndexStatus:
    records, _, manifest = load_catalog()
    return IndexStatus(
        indexed_record_count=len(records),
        investigations=sorted({r.source_id for r in records}),
        source_files=manifest["source_files"],
        source_file_sha256=manifest["file_sha256"],
        source_method=manifest["method"],
        provenance_notice=PROVENANCE,
    )


def ranking_method() -> dict:
    return {
        "name": METHOD,
        "algorithm": "Literal case-insensitive token overlap; maximum weighted TF-IDF-style contribution per query term and record",
        "idf_formula": "ln((N + 1) / (df + 1)) + 1, where N is filtered indexed records",
        "weights": WEIGHTS,
        "label_only_multiplier": LABEL_ONLY_FACTOR,
        "match_modes": ["any", "all", "all_values"],
        "match_mode_notes": "all_values requires each term in original field values; all permits column-label matches",
        "tie_break": "ascending record_id",
        "no_semantic_inference": True,
        "no_nasa_download": True,
        "score_interpretation": "Application relevance only, not scientific importance or risk",
        "indexed_evidence": "Original nonempty Phase 2 raw_fields and curated investigation title only",
    }
