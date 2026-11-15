"""Offline, deterministic scientific evidence assistant for the imported PSI rows.

No generative model, external request, scientific extrapolation, or synthetic NASA
measurement. Every returned observation cites an actual Phase 3 evidence field.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from backend.phase2.models import TestRecord
from backend.phase3.models import EvidenceField, SearchRequest
from backend.phase3.retrieval import evidence_fields, load_catalog, search
from backend.phase5.guard import compare_advanced
from backend.phase6.models import AskRequest, AskResponse, EvidenceReference, GroundedClaim

METHOD = "deterministic_evidence_rules_v1"
PROVENANCE_NOTICE = (
    "Imported rows are locally curated transcriptions of NASA PSI tables. "
    "Evidence IDs and SHA-256 checks establish local traceability, not independent NASA verification."
)
LIMITATIONS = [
    PROVENANCE_NOTICE,
    "Coverage is restricted to the records currently imported into this project; it is not the full NASA PSI repository.",
    "Descriptions of recorded tests do not establish causal effects, predictive validity, or operational fire safety.",
]

# No scientific thresholds. These phrases are a conservative refusal policy.
UNSUPPORTED = (
    (re.compile(r"\b(why|cause|causes|caused|causal|effect|effects|affect|affects|"
                r"influence|influences|impact|impacts|prove|proves|because|correlation|"
                r"correlate|predict|prediction|forecast)\b|\bhow\s+(?:does|do|did|would)\b", re.I),
     "The selected test-table cells cannot establish causation, correlations, mechanisms, or predictions."),
    (re.compile(r"\b(safe|safer|safest|safety|risk|hazard|danger|recommend|recommendation|"
                r"certif(?:y|ied)|design\s+limit|threshold|fire\s+suppression\s+protocol)\b", re.I),
     "These curated experiments cannot justify spacecraft safety rankings, design limits, or operational recommendations."),
    (re.compile(r"\b(airflow\s+(?:velocity|speed|rate)|flow\s+velocity|flame\s+spread\s+rate|"
                r"flame\s+spread\s+speed|spread\s+velocity)\b", re.I),
     "The imported BASS-II rows contain instrument displays, not calibrated airflow velocities or flame-spread rates."),
    (re.compile(r"\b(nasa\s+(?:concludes|concluded|recommends|proved)|scientists\s+conclude)\b", re.I),
     "Experimental-table cells do not include a supported scientific conclusion or recommendation."),
)

# Intent-to-column mapping, never unit conversion. Prefer more specific phrases.
FIELD_PATTERNS = [
    (r"\bvisible\s+flame\s+extinction\s+diameter\b|\bextinction\s+diameter\b", "Visible flame extinction diameter; mm"),
    (r"\binitial\s+droplet\s+diameter\b|\bdroplet\s+(?:initial\s+)?diameter\b", "Droplet initial diameter; mm"),
    (r"\bburning\s+rate\b", "Burning rate; mm2/s"),
    (r"\bburn\s+times?\b|\bburning\s+times?\b|\bburn\s+duration\b", "Burn time; s"),
    (r"\bambient\s+pressure\b|\bpressure\b", "Ambient pressure; mmHg"),
    (r"\bfan\s+display\b|\bfan\s+readout\b", "Fan display"),
    (r"\bair\s+display\b|\bair\s+readout\b", "Air display"),
    (r"\bcalibrated\s+initial\s+o(?:xygen|2)\b|\binitial\s+o(?:xygen|2)\b", "@initial_o2"),
    (r"\bcalibrated\s+final\s+o(?:xygen|2)\b|\bfinal\s+o(?:xygen|2)\b", "@final_o2"),
    (r"\btest\s+end\b|\btest\s+outcome\b|\brecorded\s+ending\b|\boutcome\b", "Test end"),
    (r"\bfuel\b|\bmaterial\b", "@fuel"),
]
QUESTION_FILLER = {
    "find", "show", "list", "which", "what", "are", "was", "were", "has", "have",
    "please", "nasa", "psi", "experiments", "experiment", "tests", "test",
    "records", "record", "about", "related", "containing", "data", "from", "the",
    "with", "in", "for", "all", "of", "on", "to", "me", "is", "ended", "end",
}


def requested_column(question: str, source_id: str) -> str | None:
    for pattern, column in FIELD_PATTERNS:
        if re.search(pattern, question, flags=re.I):
            if column == "@fuel":
                return "Fuel Sample Material" if source_id == "PSI-25" else "Fuel"
            if column == "@initial_o2":
                return ("Calibrated initial O2 % by vol" if source_id == "PSI-25"
                        else "O2 initial ambient composition; mole fraction")
            if column == "@final_o2":
                return ("Calibrated final O2 % by vol" if source_id == "PSI-25"
                        else "@unavailable")
            return column
    return None


def identify_records(question: str, records: list[TestRecord]) -> list[TestRecord]:
    found = []
    for record in records:
        names = (record.id, record.test_id)
        if any(re.search(r"(?<![a-z0-9])" + re.escape(name) + r"(?![a-z0-9])", question, re.I)
               for name in names):
            found.append(record)
    return found


def unsupported_reason(question: str) -> str | None:
    for pattern, reason in UNSUPPORTED:
        if pattern.search(question):
            return reason
    # Generic oxygen requests are ambiguous: do not choose initial vs final for BASS-II.
    if re.search(r"\b(?:oxygen|o2)\b", question, re.I) and not re.search(
        r"\b(?:initial|final)\b", question, re.I
    ):
        return "Specify the original oxygen field (initial or final) and a test ID; these fields are not interchangeable."
    return None


@dataclass
class Builder:
    request: AskRequest
    count: int
    observations: list[GroundedClaim] = field(default_factory=list)
    interpretations: list[GroundedClaim] = field(default_factory=list)
    refs: dict[str, EvidenceReference] = field(default_factory=dict)
    record_ids: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=lambda: list(LIMITATIONS))

    def add(self, text: str, fields: list[EvidenceField], kind: str = "observation") -> None:
        if not fields:
            raise ValueError("A scientific claim requires at least one source-table field")
        for f in fields:
            self.refs[f.evidence_id] = EvidenceReference(
                evidence_id=f.evidence_id, record_id=f.record_id,
                source_id=f.source_id, field_name=f.field_name,
                original_value=f.original_value, source_locator=f.source_locator,
                source_url=f.source_url, doi=f.doi,
                raw_row_sha256=f.raw_row_sha256,
            )
            if f.record_id not in self.record_ids:
                self.record_ids.append(f.record_id)
        claim = GroundedClaim(kind=kind, text=text, evidence_ids=[f.evidence_id for f in fields])
        if kind == "observation":
            self.observations.append(claim)
        else:
            self.interpretations.append(claim)

    def done(self, mode: str) -> AskResponse:
        return AskResponse(
            question=self.request.question, status="answered", mode=mode,
            answer=" ".join(c.text for c in self.observations),
            observations=self.observations, interpretations=self.interpretations,
            evidence=list(self.refs.values()), source_record_ids=self.record_ids,
            limitations=self.notes, abstention_reason=None,
            imported_record_count=self.count,
        )

    def abstain(self, reason: str) -> AskResponse:
        return AskResponse(
            question=self.request.question, status="abstained", mode="abstention",
            answer="Insufficient evidence in the imported NASA PSI table excerpts to answer this question.",
            observations=[], interpretations=[], evidence=[], source_record_ids=[],
            limitations=self.notes, abstention_reason=reason,
            imported_record_count=self.count,
        )


def field_for(record: TestRecord, name: str, indexed: dict[str, dict[str, EvidenceField]]) -> EvidenceField | None:
    return indexed[record.id].get(name)


def _lookup_one(builder: Builder, record: TestRecord, indexed: dict[str, dict[str, EvidenceField]]) -> AskResponse:
    column = requested_column(builder.request.question, record.source_id)
    if column == "@unavailable":
        return builder.abstain("The requested final-oxygen field is not present for this investigation in the imported excerpt.")
    if column is None:
        columns = (["Test #", "Fuel Sample Material", "Date"] if record.source_id == "PSI-25"
                   else ["FLEX Identifier", "Fuel", "Test end"])
        selected = [field_for(record, col, indexed) for col in columns]
        selected = [f for f in selected if f is not None]
        builder.add(f"{record.id}: " + "; ".join(f"{f.field_name} = {f.original_value}" for f in selected) + ".", selected)
        return builder.done("record_lookup")
    evidence = field_for(record, column, indexed)
    if evidence is None:
        return builder.abstain(f"The original field '{column}' is not available for {record.id} in the imported excerpt.")
    metric = next((m for m in record.metrics.values() if m.original_column == column), None)
    suffix = f" {metric.unit}" if metric else " (original table value; no calibrated unit inferred)"
    builder.add(f"{record.id}: {column} = {evidence.original_value}{suffix}.", [evidence])
    if column in {"Fan display", "Air display"}:
        builder.notes.append("Fan display and Air display are instrument readouts; they are not calibrated airflow velocities.")
    if column == "Fuel Sample Material" and record.test_id == "B3":
        builder.notes.append("The B3 material description does not explicitly identify PMMA; no material identity is inferred.")
    return builder.done("record_lookup")


def _compare(builder: Builder, pair: list[TestRecord], indexed: dict[str, dict[str, EvidenceField]]) -> AskResponse:
    left, right = pair
    guard = compare_advanced(left.id, right.id)
    if guard is None:
        return builder.abstain("The selected test records were not found in the imported catalog.")
    if guard.category != "within_investigation_descriptive":
        return builder.abstain(
            f"Comparability Guard: {guard.category}. The records cannot support a shared numeric comparison."
        )
    column = requested_column(builder.request.question, left.source_id)
    if column is None or column == "@unavailable":
        return builder.abstain("Specify a common original measured field, such as burn time, for a descriptive comparison.")
    pair_metric = next((p for p in guard.numeric_pairs if p.original_column == column), None)
    if pair_metric is None:
        return builder.abstain(
            f"The field '{column}' is not a compatible normalized measurement in both selected records."
        )
    a = field_for(left, column, indexed)
    b = field_for(right, column, indexed)
    if a is None or b is None:
        return builder.abstain("A required original evidence field is absent; comparison was withheld.")
    builder.add(f"{left.id}: {column} = {a.original_value} {pair_metric.unit}.", [a])
    builder.add(f"{right.id}: {column} = {b.original_value} {pair_metric.unit}.", [b])
    builder.add(
        "The two recorded values are displayed side by side only; their difference does not establish a causal relationship.",
        [a, b], kind="interpretation",
    )
    builder.notes.append(f"Comparability Guard context status: {guard.context_status}.")
    builder.notes.extend(guard.notices)
    return builder.done("record_comparison")


def _filter_outcomes(builder: Builder, records: list[TestRecord], indexed: dict[str, dict[str, EvidenceField]]) -> AskResponse | None:
    question = builder.request.question.lower()
    if not re.search(r"\b(extinction|disruption)\b", question):
        return None
    if re.search(r"\b(bass|bass-ii|psi-25)\b", question):
        return builder.abstain("The imported BASS-II rows do not contain a 'Test end' outcome column.")
    if "extinction" in question and "disruption" in question:
        return builder.abstain("Specify one recorded ending (Extinction or Disruption) for an outcome filter.")
    wanted = "Extinction" if "extinction" in question else "Disruption"
    fuel = "methanol" if "methanol" in question else None
    selected = [r for r in records if r.source_id == "PSI-69" and r.reported_test_end == wanted
                and (fuel is None or r.fuel_material_raw.lower() == fuel)]
    if not selected:
        return builder.abstain(f"No imported FLEX record has the requested recorded ending '{wanted}' and fuel filter.")
    for r in selected[:builder.request.max_records]:
        cols = ["FLEX Identifier", "Test end"] + (["Fuel"] if fuel else [])
        evidence = [field_for(r, c, indexed) for c in cols]
        if any(f is None for f in evidence):
            return builder.abstain("An original FLEX outcome or identifier field is missing.")
        evidence = [f for f in evidence if f is not None]
        builder.add(f"{r.id}: recorded Test end = {r.raw_fields['Test end']}"
                    + (f"; Fuel = {r.raw_fields['Fuel']}" if fuel else "") + ".", evidence)
    if len(selected) > builder.request.max_records:
        builder.notes.append(f"Displayed {builder.request.max_records} of {len(selected)} matching imported records.")
    return builder.done("outcome_filter")


def _lexical(builder: Builder, indexed: dict[str, dict[str, EvidenceField]]) -> AskResponse:
    from backend.phase3.retrieval import query_tokens

    query = " ".join(t for t in query_tokens(builder.request.question) if t not in QUESTION_FILLER)
    if not query:
        return builder.abstain("The question does not identify a test ID, recorded outcome, or searchable source-table value.")
    # Only original VALUE matches count, never matches to a column label alone.
    ranked = search(SearchRequest(query=query, match_mode="all_values", limit=6))
    if not ranked.results:
        return builder.abstain("No imported source-table values matched all requested terms. Try a test ID or an exact recorded fuel/outcome.")
    for hit in ranked.results[:builder.request.max_records]:
        candidates = [m.evidence for m in hit.evidence_matches if m.matched_in in ("value", "both")]
        unique = list({f.evidence_id: f for f in candidates}.values())
        if not unique:
            continue
        # Limit source fields per observation to avoid a wall of repeated table cells.
        selected = unique[:3]
        builder.add(f"{hit.record_id}: " + "; ".join(
            f"{f.field_name} = {f.original_value}" for f in selected
        ) + ".", selected)
    if not builder.observations:
        return builder.abstain("No original-value evidence could be cited for the search result.")
    if ranked.total_matches > builder.request.max_records:
        builder.notes.append(f"Displayed {builder.request.max_records} of {ranked.total_matches} matching imported records.")
    builder.notes.append("Lexical matches are not scientific answers about mechanisms, trends, or hazards.")
    return builder.done("lexical_lookup")


def ask(request: AskRequest) -> AskResponse:
    records, sources, _ = load_catalog()  # Checks curated CSV and normalized record consistency.
    builder = Builder(request=request, count=len(records))
    reason = unsupported_reason(request.question)
    if reason:
        return builder.abstain(reason)
    indexed = {
        r.id: {f.field_name: f for f in evidence_fields(r, sources[r.source_id])
               if f.evidence_kind == "transcribed_table_field"}
        for r in records
    }
    found = identify_records(request.question, records)
    # Recognize apparent test identifiers that are not present; do not silently
    # return unrelated search matches or assume the identifier is valid.
    potential_ids = re.findall(r"(?<![a-z0-9])(?:20cal\d+|b\d+)(?![a-z0-9])", request.question, re.I)
    if potential_ids and any(p.lower() not in {r.test_id.lower() for r in found} for p in potential_ids):
        return builder.abstain("One or more requested test identifiers are not present in the imported curated subset.")
    if len(found) > 2:
        return builder.abstain("Select at most two explicit test identifiers for a direct lookup or comparison.")
    if len(found) == 2:
        return _compare(builder, found, indexed)
    if len(found) == 1:
        return _lookup_one(builder, found[0], indexed)
    outcome = _filter_outcomes(builder, records, indexed)
    if outcome is not None:
        return outcome
    # A field name without a record ID is ambiguous for this intentionally small corpus.
    if any(re.search(pat, request.question, re.I) for pat, _ in FIELD_PATTERNS):
        return builder.abstain("Specify an imported test ID to request a particular measurement or field.")
    return _lexical(builder, indexed)


def capabilities() -> dict:
    return {
        "method": METHOD,
        "generative_model_used": False,
        "nasa_network_download": False,
        "supported": [
            "Direct lookup of an imported test's original field",
            "Recorded FLEX extinction/disruption outcome filtering",
            "Descriptive comparison of two within-investigation normalized fields",
            "Literal-value retrieval of imported table cells",
        ],
        "unsupported": [
            "Causation, mechanisms, trends or predictions",
            "Calibrated airflow velocity or flame-spread rates absent from the curated rows",
            "Operational spacecraft fire-safety recommendations or risk rankings",
            "Conclusions from NASA papers not imported into the catalog",
        ],
        "provenance_notice": PROVENANCE_NOTICE,
    }
