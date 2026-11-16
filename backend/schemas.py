
from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class Source(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    short_name: str
    organization: str
    doi: str
    url: HttpUrl
    research_area: str


class Measurement(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: float | str | None
    unit: str | None = None
    original_column: str


class Experiment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    investigation_id: str
    test_id: str
    measurements: dict[str, Measurement] = Field(
        default_factory=dict
    )
    source_locator: str


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    limit: int = Field(default=10, ge=1, le=50)
