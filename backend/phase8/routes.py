"""Separate /v8 endpoints leave all existing NASA experiment APIs unchanged."""
from typing import Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from backend.phase8.sync import check_sources, get_sync_status, stage_artifact

router = APIRouter(prefix='/v8', tags=['IGNIS Phase 8 - Live NASA Source Sync'])

class StrictRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

class SourceCheckRequest(StrictRequest):
    source_id: Literal['PSI-25', 'PSI-69'] | None = None

class StageRequest(StrictRequest):
    source_id: Literal['PSI-25', 'PSI-69']
    artifact_id: str = Field(min_length=16, max_length=16, pattern=r'^[0-9a-f]{16}$')

@router.get('/sync/status')
def status():
    return get_sync_status()

@router.post('/sync/check')
def check(request: SourceCheckRequest):
    return check_sources(request.source_id)

@router.post('/sync/stage')
def stage(request: StageRequest):
    try:
        return stage_artifact(request.source_id, request.artifact_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except (OSError, TimeoutError) as exc:
        raise HTTPException(status_code=502, detail='Could not retrieve the selected official NASA PSI file') from exc

@router.get('/sync/staged')
def staged_files():
    from backend.phase8.sync import list_staged
    return {'files': list_staged(), 'notice': 'Downloaded files are staged, not imported into any scientific dataset.'}

@router.get('/sync/preview/{filename}')
def preview_file(filename: str):
    from backend.phase8.sync import preview_staged
    try:
        return preview_staged(filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
