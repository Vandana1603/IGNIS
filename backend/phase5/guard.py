"""Exact-field, exact-unit, no-threshold, non-causal comparison guard."""
from backend.phase3.retrieval import field_id, load_catalog
from backend.phase5.audit import CONTEXT
from backend.phase5.models import (
    AdvancedCompareResponse, ContextCheck, ExcludedMetric, NumericPair,
)

BASE_NOTICES = [
    "Values are descriptive records, not evidence of causation or spacecraft safety.",
    "Equal raw settings do not establish equivalent or controlled experimental conditions.",
    "No fire-risk threshold, normalized hazard score, or inferred calibration is used.",
]


def compare_advanced(left_id: str, right_id: str) -> AdvancedCompareResponse | None:
    records, _, _ = load_catalog()
    by_id = {r.id: r for r in records}
    left, right = by_id.get(left_id), by_id.get(right_id)
    if left is None or right is None:
        return None

    common = dict(left_id=left.id, right_id=right.id, numeric_pairs=[],
                  context_checks=[], excluded_metrics=[],
                  local_provenance_checked=True)
    if left.id == right.id:
        return AdvancedCompareResponse(
            **common, category="same_record_blocked", context_status="not_applicable",
            notices=BASE_NOTICES + ["Choose two different source test records."],
        )
    if left.source_id != right.source_id or left.experiment_type != right.experiment_type:
        return AdvancedCompareResponse(
            **common, category="cross_investigation_blocked", context_status="not_applicable",
            notices=BASE_NOTICES + [
                "Different investigations and fuel configurations: no joint numeric comparison is displayed."
            ],
        )

    checks = []
    for column, role in CONTEXT[left.source_id]:
        a, b = left.raw_fields.get(column), right.raw_fields.get(column)
        missing = a is None or b is None or not a.strip() or not b.strip()
        relation = "missing" if missing else "same_raw" if a == b else "different_raw"
        note = (
            "Missing recorded field; context cannot be checked."
            if missing else "Literal source values match; not proof of controlled conditions."
            if relation == "same_raw" else
            "Recorded values differ; do not attribute other differences to a single variable."
        )
        if role == "instrument_display":
            note += " Instrument setting/readout; not a calibrated airflow velocity."
        checks.append(ContextCheck(
            original_column=column, role=role,
            left_raw=a if a is not None and a.strip() else None,
            right_raw=b if b is not None and b.strip() else None,
            relation=relation, note=note,
            left_evidence_id=field_id(left.id, "raw", column) if a and a.strip() else None,
            right_evidence_id=field_id(right.id, "raw", column) if b and b.strip() else None,
        ))
    if any(c.relation == "missing" for c in checks):
        context_status = "missing_recorded_fields"
    elif any(c.relation == "different_raw" for c in checks):
        context_status = "different_recorded_fields"
    else:
        context_status = "same_on_checked_fields"

    pairs = []
    excluded = []
    for key in sorted(set(left.metrics) | set(right.metrics)):
        a, b = left.metrics.get(key), right.metrics.get(key)
        if a is None or b is None:
            excluded.append(ExcludedMetric(key=key, reason="Metric absent in one source record"))
            continue
        if a.original_column != b.original_column or a.unit != b.unit:
            excluded.append(ExcludedMetric(key=key, reason="Original column name or physical unit differs"))
            continue
        pairs.append(NumericPair(
            key=key, original_column=a.original_column, unit=a.unit,
            left_value=a.value, right_value=b.value,
            left_original_value=a.original_value, right_original_value=b.original_value,
            left_evidence_id=field_id(left.id, "raw", a.original_column),
            right_evidence_id=field_id(right.id, "raw", b.original_column),
        ))

    notes = BASE_NOTICES + [
        "Matching source labels, units, and keys allow descriptive side-by-side display only.",
    ]
    if context_status == "different_recorded_fields":
        notes.append("At least one recorded context field differs; no single-variable causal inference is supported.")
    if context_status == "missing_recorded_fields":
        notes.append("At least one context field is missing; absence must not be treated as equality.")
    if left.source_id == "PSI-25":
        notes.append("Fan display and Air display are instrument readouts, not measured velocity units.")
    if not pairs:
        notes.append("No common numeric fields with identical source labels and units were found.")
    return AdvancedCompareResponse(
        **(common | {"numeric_pairs": pairs, "context_checks": checks, "excluded_metrics": excluded}),
        category="within_investigation_descriptive" if pairs else "no_common_numeric_fields",
        context_status=context_status, notices=notes,
    )
