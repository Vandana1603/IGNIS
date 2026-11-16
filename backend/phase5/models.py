"""Public schemas for traceable local provenance and conservative comparisons."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FieldTrace(StrictModel):
    original_column: str
    original_value: str
    evidence_id: str | None
    source_locator: str
    indexed_in_phase3: bool
    normalized_metric_key: str | None = None
    normalized_value: float | None = None
    normalized_unit: str | None = None
    field_role: Literal["instrument_display", "recorded_context", "normalized_measurement", "other_raw_field"]


class PassportAudit(StrictModel):
    record_id: str
    source_id: str
    test_id: str
    experiment_type: str
    source_url: str
    source_doi: str
    source_table: str
    source_locator: str
    source_checked_date: str
    transcription_method: str
    curated_filename: str
    imported_file_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    current_file_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    imported_row_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    recomputed_row_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    local_consistency: Literal["passed"]
    independent_nasa_verification: Literal["not_performed"]
    fields: list[FieldTrace]
    limitations: list[str]
    notices: list[str]


class AdvancedCompareRequest(StrictModel):
    left_id: str = Field(min_length=1, max_length=100)
    right_id: str = Field(min_length=1, max_length=100)


class ContextCheck(StrictModel):
    original_column: str
    role: Literal["recorded_context", "instrument_display"]
    left_raw: str | None
    right_raw: str | None
    relation: Literal["same_raw", "different_raw", "missing"]
    left_evidence_id: str | None
    right_evidence_id: str | None
    note: str


class NumericPair(StrictModel):
    key: str
    original_column: str
    unit: str
    left_value: float
    right_value: float
    left_original_value: str
    right_original_value: str
    left_evidence_id: str
    right_evidence_id: str
    interpretation: Literal["descriptive_only"] = "descriptive_only"


class ExcludedMetric(StrictModel):
    key: str
    reason: str


class AdvancedCompareResponse(StrictModel):
    left_id: str
    right_id: str
    category: Literal[
        "cross_investigation_blocked", "same_record_blocked",
        "within_investigation_descriptive", "no_common_numeric_fields"
    ]
    context_status: Literal[
        "not_applicable", "different_recorded_fields", "same_on_checked_fields", "missing_recorded_fields"
    ]
    numeric_pairs: list[NumericPair]
    context_checks: list[ContextCheck]
    excluded_metrics: list[ExcludedMetric]
    notices: list[str]
    local_provenance_checked: bool
