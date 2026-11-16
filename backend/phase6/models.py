"""Public API contract for non-generative, source-grounded SI answers."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AskRequest(StrictModel):
    question: str = Field(min_length=1, max_length=500)
    max_records: int = Field(default=6, ge=1, le=6)

    @field_validator("question")
    @classmethod
    def meaningful_question(cls, value: str) -> str:
        if not value.strip() or not any(ch.isalnum() for ch in value):
            raise ValueError("Provide a question with searchable words or a test ID")
        return value.strip()


class EvidenceReference(StrictModel):
    evidence_id: str
    record_id: str
    source_id: Literal["PSI-25", "PSI-69"]
    field_name: str
    original_value: str
    source_locator: str
    source_url: str
    doi: str
    raw_row_sha256: str | None


class GroundedClaim(StrictModel):
    kind: Literal["observation", "interpretation"]
    text: str
    evidence_ids: list[str] = Field(min_length=1)


class AskResponse(StrictModel):
    question: str
    status: Literal["answered", "abstained"]
    mode: Literal[
        "record_lookup", "record_comparison", "outcome_filter",
        "lexical_lookup", "abstention",
    ]
    answer: str
    observations: list[GroundedClaim]
    interpretations: list[GroundedClaim]
    evidence: list[EvidenceReference]
    source_record_ids: list[str]
    limitations: list[str]
    abstention_reason: str | None
    method: Literal["deterministic_evidence_rules_v1"] = "deterministic_evidence_rules_v1"
    imported_record_count: int
    independent_nasa_verification: Literal["not_performed"] = "not_performed"

    @model_validator(mode="after")
    def verify_citations(self):
        refs = {e.evidence_id for e in self.evidence}
        if len(refs) != len(self.evidence):
            raise ValueError("Duplicate evidence IDs")
        if any(e.record_id not in self.source_record_ids for e in self.evidence):
            raise ValueError("Evidence record not listed in response")
        for claim in self.observations + self.interpretations:
            if not set(claim.evidence_ids).issubset(refs):
                raise ValueError("Claim cites an evidence ID not present in response")
        if any(c.kind != "observation" for c in self.observations):
            raise ValueError("Observation has incorrect kind")
        if any(c.kind != "interpretation" for c in self.interpretations):
            raise ValueError("Interpretation has incorrect kind")
        if self.status == "abstained":
            if self.observations or self.interpretations or self.evidence or self.source_record_ids:
                raise ValueError("Abstention must not include unsupported claims")
            if not self.abstention_reason:
                raise ValueError("Abstention reason required")
        elif not self.observations or self.abstention_reason is not None:
            raise ValueError("Answered response requires observations and no abstention reason")
        return self
