"""Models for evidence-preserving NASA PSI test records (Phase 2)."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SourceInfo(StrictModel):
    source_id: Literal["PSI-25", "PSI-69"]
    title: str
    url: HttpUrl
    doi: str
    table_name: str
    transcription_method: Literal["manual_transcription_official_PSI_table"]
    checked_date: str
    notes: str


class Metric(StrictModel):
    value: float = Field(allow_inf_nan=False)
    unit: str
    original_column: str
    original_value: str


class TestRecord(StrictModel):
    id: str
    source_id: Literal["PSI-25", "PSI-69"]
    test_id: str
    date: str
    fuel_material_raw: str
    experiment_type: Literal["solid_fuel", "liquid_droplet"]
    raw_fields: dict[str, str]
    raw_row_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    metrics: dict[str, Metric]
    instrument_displays: dict[str, str] = Field(default_factory=dict)
    reported_test_end: str | None = None
    limitations: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_identity(self):
        if self.id != f"{self.source_id}-{self.test_id}":
            raise ValueError("Record ID must match source and NASA test ID")
        if not self.test_id.strip() or not self.fuel_material_raw.strip():
            raise ValueError("Source test ID and raw material/fuel cannot be blank")
        if self.source_id == "PSI-25" and self.experiment_type != "solid_fuel":
            raise ValueError("BASS-II must be a solid-fuel record")
        if self.source_id == "PSI-69" and self.experiment_type != "liquid_droplet":
            raise ValueError("FLEX must be a liquid-droplet record")
        return self


class EvidencePassport(StrictModel):
    record: TestRecord
    source: SourceInfo
    source_locator: str
    evidence_kind: Literal["NASA_PSI_table_transcription"] = "NASA_PSI_table_transcription"
    interpretations: list[str] = Field(default_factory=list)
    provenance_notice: str


class CompareRequest(StrictModel):
    left_id: str
    right_id: str


class MetricComparison(StrictModel):
    key: str
    unit: str
    left: float
    right: float


class CompareResponse(StrictModel):
    left_id: str
    right_id: str
    category: Literal["within_investigation_descriptive", "cross_investigation_only"]
    shared_metrics: list[MetricComparison]
    warnings: list[str]


class ImportManifest(StrictModel):
    record_count: int
    source_files: dict[str, str]
    file_sha256: dict[str, str]
    method: Literal["manual_transcription_official_PSI_table"]
    note: str
