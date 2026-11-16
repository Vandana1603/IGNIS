"""Strict response schemas for traceable, non-generative research retrieval."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SearchRequest(StrictModel):
    query: str = Field(min_length=1, max_length=300)
    investigation: Literal["PSI-25", "PSI-69"] | None = None
    match_mode: Literal["any", "all", "all_values"] = "any"
    outcome: Literal["Extinction", "Disruption"] | None = None
    limit: int = Field(default=10, ge=1, le=50)
    offset: int = Field(default=0, ge=0, le=10000)

    @field_validator("query")
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Search query cannot be blank")
        return value.strip()


class EvidenceField(StrictModel):
    evidence_id: str
    record_id: str
    source_id: Literal["PSI-25", "PSI-69"]
    evidence_kind: Literal["transcribed_table_field", "curated_source_metadata"]
    field_name: str
    original_value: str
    source_locator: str
    source_url: str
    doi: str
    raw_row_sha256: str | None = None


class EvidenceMatch(StrictModel):
    evidence: EvidenceField
    matched_terms: list[str]
    matched_in: Literal["label", "value", "both"]


class ScoreContribution(StrictModel):
    term: str
    idf: float
    field_weight: float
    contribution: float
    evidence_id: str
    matched_in: Literal["label", "value", "both"]


class RankedRecord(StrictModel):
    record_id: str
    source_id: Literal["PSI-25", "PSI-69"]
    test_id: str
    fuel_material_raw: str
    reported_test_end: str | None = None
    relevance_score: float
    matched_terms: list[str]
    unmatched_terms: list[str]
    score_contributions: list[ScoreContribution]
    evidence_matches: list[EvidenceMatch]
    evidence_passport_url: str
    limitations: list[str]


class SearchResponse(StrictModel):
    query: str
    query_terms: list[str]
    investigation: str | None
    match_mode: Literal["any", "all", "all_values"]
    outcome: str | None
    total_matches: int
    returned_count: int
    offset: int
    results: list[RankedRecord]
    ranking_method: str
    answer_status: Literal[
        "matching_records_only", "no_matching_records", "insufficient_evidence_for_inference"
    ]
    notices: list[str]


class EvidenceResponse(StrictModel):
    record_id: str
    source_id: Literal["PSI-25", "PSI-69"]
    evidence_fields: list[EvidenceField]
    field_count: int
    evidence_passport_url: str
    provenance_notice: str


class IndexStatus(StrictModel):
    indexed_record_count: int
    investigations: list[str]
    source_files: dict[str, str]
    source_file_sha256: dict[str, str]
    source_method: str
    provenance_notice: str
