"""Optional source-linked RAG, preserves the working deterministic /v6/ask."""
from typing import Literal
from pathlib import Path
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from backend.phase10.rag import ask, status

router = APIRouter(prefix="/v10/rag", tags=["IGNIS - Optional Evidence RAG"])

class RagRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    mode: Literal["extractive", "ai_assisted"] = "extractive"
    max_records: int = Field(default=8, ge=1, le=12)

@router.get("/status")
def rag_status():
    return status()

@router.post("/ask")
def rag_ask(body: RagRequest):
    try:
        return ask(body.question, body.mode, body.max_records)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

@router.get("/provenance/{record_id}")
def record_provenance(record_id: str):
    ledger_path=Path(__file__).resolve().parents[2]/"data/phase10/provenance.json"
    ledger=json.loads(ledger_path.read_text(encoding="utf-8"))
    item=ledger["record_sources"].get(record_id)
    if item is None:
        raise HTTPException(status_code=404,detail="Record provenance unavailable")
    return {"record_id":record_id,"review":item,"NASA_report":ledger["NASA_reference"],
            "PSI_investigation":ledger["NASA_PSI_BASS"] if record_id.startswith("PSI-25-") else ledger["NASA_PSI_FLEX"],
            "scope_notice":ledger["scope_notice"]}
