"""Additive /v5 routes. /v2 and /v3 remain untouched."""
from fastapi import APIRouter, HTTPException
from backend.phase5.audit import build_passport, get_field_trace
from backend.phase5.guard import compare_advanced
from backend.phase5.models import (
    AdvancedCompareRequest, AdvancedCompareResponse, FieldTrace, PassportAudit,
)

router = APIRouter(prefix="/v5", tags=["IGNIS Phase 5 - Evidence Audit"])


@router.get("/passports/{record_id}", response_model=PassportAudit)
def passport_audit(record_id: str):
    result = build_passport(record_id)
    if result is None:
        raise HTTPException(404, detail="Imported experiment not found")
    return result


@router.get("/passports/{record_id}/fields/{evidence_id}", response_model=FieldTrace)
def field_audit(record_id: str, evidence_id: str):
    result = get_field_trace(record_id, evidence_id)
    if result is None:
        raise HTTPException(404, detail="Indexed evidence field not found for record")
    return result


@router.post("/compare", response_model=AdvancedCompareResponse)
def advanced_compare(request: AdvancedCompareRequest):
    result = compare_advanced(request.left_id, request.right_id)
    if result is None:
        raise HTTPException(404, detail="One or both imported experiments not found")
    return result
