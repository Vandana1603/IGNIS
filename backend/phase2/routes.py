"""Non-breaking /v2 routes; existing Phase 1 endpoints are unchanged."""
from fastapi import APIRouter, HTTPException, Query
from backend.phase2.catalog import get_record, get_records, get_sources
from backend.phase2.comparability import compare
from backend.phase2.models import (
    CompareRequest, CompareResponse, EvidencePassport, TestRecord, SourceInfo
)

router = APIRouter(prefix="/v2", tags=["IGNIS Phase 2"])


@router.get("/status")
def status():
    records = get_records()
    return {
        "status": "ok",
        "imported_record_count": len(records),
        "investigations": sorted({r.source_id for r in records}),
        "source_status": "manually transcribed selected NASA PSI table rows; not full NASA download",
    }


@router.get("/sources", response_model=list[SourceInfo])
def sources():
    return get_sources()


@router.get("/experiments", response_model=list[TestRecord])
def experiments(investigation: str | None = Query(default=None)):
    records = get_records()
    if investigation:
        records = [r for r in records if r.source_id == investigation]
    return records


@router.get("/experiments/{record_id}", response_model=TestRecord)
def experiment(record_id: str):
    record = get_record(record_id)
    if record is None:
        raise HTTPException(404, detail="Phase 2 experiment not found")
    return record


@router.get("/evidence-passports/{record_id}", response_model=EvidencePassport)
def passport(record_id: str):
    record = get_record(record_id)
    if record is None:
        raise HTTPException(404, detail="Phase 2 experiment not found")
    source = next(s for s in get_sources() if s.source_id == record.source_id)
    return EvidencePassport(
        record=record,
        source=source,
        source_locator=f"Experimental Table > {('Test #' if record.source_id == 'PSI-25' else 'FLEX Identifier')} = {record.test_id}",
        provenance_notice=(
            "Selected NASA PSI table row manually transcribed into a curated CSV and normalized locally. "
            "Raw fields are retained. Fingerprints detect subsequent changes, not independent truth. "
            "No scientific interpretation has been generated."
        ),
    )


@router.post("/compare", response_model=CompareResponse)
def compare_endpoint(request: CompareRequest):
    left, right = get_record(request.left_id), get_record(request.right_id)
    if left is None or right is None:
        raise HTTPException(404, detail="One or both Phase 2 experiment IDs not found")
    return compare(left, right)
