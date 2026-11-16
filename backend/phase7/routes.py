"""Readiness probe: validates local curated data without exposing paths or stack traces."""
from fastapi import APIRouter, HTTPException

from backend.phase3.retrieval import get_index_status, load_catalog

router = APIRouter(prefix="/v7", tags=["IGNIS Phase 7 - Quality Assurance"])


@router.get("/readiness")
def readiness():
    try:
        records, sources, manifest = load_catalog()
        index = get_index_status()
        if not records or index.indexed_record_count != len(records):
            raise ValueError("Empty or inconsistent local catalog")
        if manifest.get("record_count") != len(records):
            raise ValueError("Manifest record count differs")
        if not set(r.source_id for r in records).issubset(sources):
            raise ValueError("Missing source metadata")
    except (ValueError, KeyError, TypeError, OSError, RuntimeError) as exc:
        # Deliberately do not return local file paths or detailed error messages to clients.
        raise HTTPException(
            status_code=503,
            detail="Local catalog validation failed; inspect the server environment.",
        ) from exc
    return {
        "status": "ready",
        "record_count": len(records),
        "investigations": sorted({r.source_id for r in records}),
        "data_scope": "selected manually transcribed NASA PSI table rows",
        "local_integrity": "validated",
        "independent_nasa_verification": "not_performed",
        "scientific_prediction_model": False,
    }
