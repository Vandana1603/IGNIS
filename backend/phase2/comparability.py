"""Descriptive research comparisons; not causal or flight-safety judgments."""
from backend.phase2.models import CompareResponse, MetricComparison, TestRecord


def compare(left: TestRecord, right: TestRecord) -> CompareResponse:
    warnings = [
        "The displayed differences are descriptive. They do not establish causation, material safety, or risk.",
    ]
    if left.source_id != right.source_id:
        return CompareResponse(
            left_id=left.id, right_id=right.id,
            category="cross_investigation_only", shared_metrics=[],
            warnings=warnings + [
                "BASS-II solid-fuel film and FLEX liquid-droplet tests have different designs; no joint numeric comparison is produced."
            ]
        )
    matched = []
    for key in sorted(set(left.metrics) & set(right.metrics)):
        a, b = left.metrics[key], right.metrics[key]
        if a.unit == b.unit and a.original_column == b.original_column:
            matched.append(MetricComparison(key=key, unit=a.unit, left=a.value, right=b.value))
    if not matched:
        warnings.append("No directly matching numeric fields are present in these records.")
    warnings.append("Matching units and field names permit descriptive comparison only; check all other test conditions before interpreting differences.")
    return CompareResponse(
        left_id=left.id, right_id=right.id,
        category="within_investigation_descriptive", shared_metrics=matched, warnings=warnings,
    )
