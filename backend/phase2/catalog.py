"""Read and validate the separately generated Phase 2 catalog."""
import json
from pathlib import Path

from backend.phase2.ingest import DATA, RAW, row_hash, sha_bytes
from backend.phase2.models import SourceInfo, TestRecord


def get_sources():
    return [SourceInfo.model_validate(x) for x in json.loads((DATA / "sources.json").read_text(encoding="utf-8"))]


def get_records():
    path = DATA / "experiments.json"
    if not path.exists():
        raise RuntimeError("Phase 2 data not built. Run: python -m backend.phase2.ingest")
    # A modified curated CSV after the last import makes the catalog stale.
    manifest_path = DATA / "import_manifest.json"
    if not manifest_path.is_file():
        raise ValueError("Import manifest missing; run the Phase 2 importer")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for source_id, filename in manifest["source_files"].items():
        curated = RAW / filename
        if not curated.is_file() or sha_bytes(curated.read_bytes()) != manifest["file_sha256"][source_id]:
            raise ValueError(f"Curated CSV changed since import for {source_id}; rerun the importer")
    sources = {src.source_id for src in get_sources()}
    records = [TestRecord.model_validate(x) for x in json.loads(path.read_text(encoding="utf-8"))]
    ids = [record.id for record in records]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate experiment record IDs")
    for record in records:
        if record.source_id not in sources:
            raise ValueError(f"Record {record.id} refers to an unknown source")
        if row_hash(record.raw_fields) != record.raw_row_sha256:
            raise ValueError(f"Raw row fingerprint mismatch: {record.id}")
        for metric in record.metrics.values():
            if record.raw_fields.get(metric.original_column) != metric.original_value:
                raise ValueError(f"Metric/raw provenance mismatch: {record.id}, {metric.original_column}")
    return records


def get_record(record_id: str):
    return next((x for x in get_records() if x.id == record_id), None)
