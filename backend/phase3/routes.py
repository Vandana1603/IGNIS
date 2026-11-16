"""New /v3 routes; leave all Phase 1 and Phase 2 endpoints intact."""
from fastapi import APIRouter, HTTPException

from backend.phase3.models import EvidenceResponse, IndexStatus, SearchRequest, SearchResponse
from backend.phase3.retrieval import get_evidence, get_index_status, ranking_method, search

router = APIRouter(prefix="/v3", tags=["IGNIS Phase 3 - Research Search"])


@router.get("/index-status", response_model=IndexStatus)
def index_status_endpoint():
    return get_index_status()


@router.get("/ranking-method")
def ranking_method_endpoint():
    return ranking_method()


@router.post("/search", response_model=SearchResponse)
def search_endpoint(request: SearchRequest):
    try:
        return search(request)
    except ValueError as exc:
        if str(exc).startswith("Query has no searchable terms"):
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        raise


@router.get("/evidence/{record_id}", response_model=EvidenceResponse)
def evidence_endpoint(record_id: str):
    result = get_evidence(record_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Imported experiment not found")
    return result
