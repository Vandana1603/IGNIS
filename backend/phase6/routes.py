"""Additive /v6 routes; leave /v2, /v3, and /v5 intact."""
from fastapi import APIRouter

from backend.phase3.retrieval import get_index_status
from backend.phase6.engine import ask, capabilities
from backend.phase6.models import AskRequest, AskResponse

router = APIRouter(prefix="/v6", tags=["IGNIS Phase 6 - Scientific Intelligence"])


@router.get("/capabilities")
def get_capabilities():
    return capabilities()


@router.get("/status")
def status():
    index = get_index_status()
    return {
        "status": "ready",
        "method": "deterministic_evidence_rules_v1",
        "imported_record_count": index.indexed_record_count,
        "investigations": index.investigations,
        "generative_model_used": False,
        "independent_nasa_verification": "not_performed",
    }


@router.post("/ask", response_model=AskResponse)
def ask_endpoint(request: AskRequest):
    return ask(request)
