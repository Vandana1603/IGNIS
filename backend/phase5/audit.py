"""Audit only imported NASA PSI *transcriptions*; never fetch or infer measurements."""
from pathlib import Path

from backend.phase2.ingest import RAW, row_hash, sha_bytes
from backend.phase3.retrieval import evidence_fields, field_id, load_catalog, locator
from backend.phase5.models import FieldTrace, PassportAudit

# These are *column selections* for checking reported context, NOT experimental
# safety thresholds or claims that two tests are controlled replicates.
CONTEXT = {
    "PSI-25": [
        ("Fuel Sample Material", "recorded_context"),
        ("Flow restrictor", "instrument_display"),
        ("Fan display", "instrument_display"),
        ("Air display", "instrument_display"),
        ("Radiometer gain (1000 250 50 10)", "instrument_display"),
        ("Calibrated initial O2 % by vol", "recorded_context"),
        ("Initial CO2 % by vol", "recorded_context"),
    ],
    "PSI-69": [
        ("Fuel", "recorded_context"),
        ("Ambient pressure; mmHg", "recorded_context"),
        ("O2 initial ambient composition; mole fraction", "recorded_context"),
        ("N2 initial ambient composition; mole fraction", "recorded_context"),
        ("CO2 initial ambient composition; mole fraction", "recorded_context"),
        ("He initial ambient composition; mole fraction", "recorded_context"),
        ("Droplet initial diameter; mm", "recorded_context"),
    ],
}


def build_passport(record_id: str) -> PassportAudit | None:
    records, sources, manifest = load_catalog()  # Revalidates original curated CSVs.
    record = next((r for r in records if r.id == record_id), None)
    if record is None:
        return None
    source = sources[record.source_id]
    filename = manifest["source_files"][record.source_id]
    file_path = RAW / filename
    # Guard against path traversal if a local manifest has been tampered with.
    if file_path.resolve().parent != RAW.resolve() or not file_path.is_file():
        raise ValueError("Manifest points outside curated raw-data directory")
    file_hash = sha_bytes(file_path.read_bytes())
    recorded_file_hash = manifest["file_sha256"][record.source_id]
    computed_row_hash = row_hash(record.raw_fields)
    if file_hash != recorded_file_hash or computed_row_hash != record.raw_row_sha256:
        raise ValueError("Local integrity mismatch; rerun the ingestion pipeline")

    indexed = {f.field_name: f.evidence_id for f in evidence_fields(record, source)
               if f.evidence_kind == "transcribed_table_field"}
    metric_by_column = {m.original_column: (key, m) for key, m in record.metrics.items()}
    context_roles = dict(CONTEXT[record.source_id])
    fields = []
    for name, raw in record.raw_fields.items():
        normalized = metric_by_column.get(name)
        role = context_roles.get(name)
        if role is None:
            role = "normalized_measurement" if normalized else "other_raw_field"
        fields.append(FieldTrace(
            original_column=name, original_value=raw,
            evidence_id=indexed.get(name),
            source_locator=f"{locator(record)} > column: {name}",
            indexed_in_phase3=name in indexed,
            normalized_metric_key=normalized[0] if normalized else None,
            normalized_value=normalized[1].value if normalized else None,
            normalized_unit=normalized[1].unit if normalized else None,
            field_role=role,
        ))
    return PassportAudit(
        record_id=record.id, source_id=record.source_id, test_id=record.test_id,
        experiment_type=record.experiment_type, source_url=str(source.url),
        source_doi=source.doi, source_table=source.table_name,
        source_locator=locator(record), source_checked_date=source.checked_date,
        transcription_method=source.transcription_method,
        curated_filename=filename, imported_file_sha256=recorded_file_hash,
        current_file_sha256=file_hash, imported_row_sha256=record.raw_row_sha256,
        recomputed_row_sha256=computed_row_hash, local_consistency="passed",
        independent_nasa_verification="not_performed", fields=fields,
        limitations=record.limitations,
        notices=[
            "Local hashes and original-field checks passed; this is not independent verification against NASA's live repository.",
            "The curated CSV is a manually transcribed subset of the NASA PSI Experimental Table, not a downloaded complete dataset.",
            "Source checked_date is catalog metadata; this endpoint does not revisit the original NASA website.",
        ],
    )


def get_field_trace(record_id: str, evidence_id: str) -> FieldTrace | None:
    passport = build_passport(record_id)
    if passport is None:
        return None
    return next((f for f in passport.fields if f.evidence_id == evidence_id), None)
