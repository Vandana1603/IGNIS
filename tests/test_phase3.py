"""Run after: python -m backend.phase2.ingest --include-flex"""
import json
import math

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.phase2.catalog import get_records
from backend.phase3.models import SearchRequest
from backend.phase3.retrieval import (
    get_index_status, query_tokens, search, verify_derived_values,
)
from backend.phase3.routes import router


@pytest.fixture(scope="module", autouse=True)
def require_phase2_data():
    records = get_records()
    expected = {
        "PSI-25-B1", "PSI-25-B3", "PSI-25-B4",
        "PSI-69-20CAL08", "PSI-69-20CAL10", "PSI-69-20CAL12",
    }
    assert expected.issubset({r.id for r in records}), (
        "Phase 3 needs both curated sources. "
        "Run: python -m backend.phase2.ingest --include-flex"
    )


@pytest.fixture()
def client():
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as test_client:
        yield test_client


def test_status_reports_imported_rows_not_nasa_totals(client):
    response = client.get("/v3/index-status")
    assert response.status_code == 200
    body = response.json()
    assert body["indexed_record_count"] == len(get_records()) == 6
    assert body["investigations"] == ["PSI-25", "PSI-69"]
    assert body["source_method"] == "manual_transcription_official_PSI_table"
    assert set(body["source_file_sha256"]) == {"PSI-25", "PSI-69"}
    assert "not independently certify" in body["provenance_notice"]


def test_research_search_prioritizes_matching_flex_outcomes(client):
    response = client.post("/v3/search", json={"query": "methanol extinction"})
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["query_terms"] == ["methanol", "extinction"]
    assert [r["record_id"] for r in data["results"][:2]] == [
        "PSI-69-20CAL10", "PSI-69-20CAL12"
    ]
    assert data["total_matches"] == 3  # 20CAL08 matches methanol, not extinction.
    assert data["results"][0]["relevance_score"] > data["results"][2]["relevance_score"]
    assert data["answer_status"] == "matching_records_only"


def test_match_all_values_excludes_label_only_matches(client):
    response = client.post("/v3/search", json={"query": "methanol extinction", "match_mode": "all_values"})
    assert response.status_code == 200
    assert {r["record_id"] for r in response.json()["results"]} == {
        "PSI-69-20CAL10", "PSI-69-20CAL12"
    }


def test_all_mode_explicitly_allows_column_label_matches(client):
    data = client.post("/v3/search", json={"query": "methanol extinction", "match_mode": "all"}).json()
    assert "PSI-69-20CAL08" in {r["record_id"] for r in data["results"]}
    # 20CAL08 has "extinction" in a column label, but its Test end is Disruption.
    assert next(r for r in data["results"] if r["record_id"] == "PSI-69-20CAL08")["reported_test_end"] == "Disruption"


def test_outcome_filter_uses_reported_test_end(client):
    data = client.post("/v3/search", json={"query": "methanol", "outcome": "Extinction"}).json()
    assert {r["record_id"] for r in data["results"]} == {"PSI-69-20CAL10", "PSI-69-20CAL12"}


def test_investigation_filter_and_original_material(client):
    response = client.post("/v3/search", json={"query": "pmma", "investigation": "PSI-25"})
    assert response.status_code == 200
    assert {r["record_id"] for r in response.json()["results"]} == {"PSI-25-B1", "PSI-25-B4"}
    assert all(r["source_id"] == "PSI-25" for r in response.json()["results"])


def test_evidence_matches_exact_raw_cells_not_generated_quotes(client):
    data = client.post("/v3/search", json={"query": "methanol extinction", "match_mode": "all_values"}).json()
    record = next(r for r in data["results"] if r["record_id"] == "PSI-69-20CAL10")
    evidence = [m["evidence"] for m in record["evidence_matches"]]
    assert any(e["field_name"] == "Test end" and e["original_value"] == "Extinction" for e in evidence)
    assert any(e["field_name"] == "Fuel" and e["original_value"] == "Methanol" for e in evidence)
    assert all(e["source_url"].startswith("https://psi.nasa.gov/") for e in evidence)
    assert all(e["doi"] == "10.60555/mbq8-0451" for e in evidence)
    assert all(e["evidence_kind"] in {"transcribed_table_field", "curated_source_metadata"} for e in evidence)
    assert record["evidence_passport_url"] == "/v2/evidence-passports/PSI-69-20CAL10"


def test_evidence_endpoint_returns_original_bass_instrument_display(client):
    response = client.get("/v3/evidence/PSI-25-B1")
    assert response.status_code == 200
    fields = response.json()["evidence_fields"]
    assert any(f["field_name"] == "Air display" and f["original_value"] == "5" for f in fields)
    assert any(f["field_name"] == "Calibrated initial O2 % by vol" and f["original_value"] == "22.2" for f in fields)
    assert not any(f["field_name"] == "airflow_cm_s" for f in fields)
    assert all(f["raw_row_sha256"] is not None for f in fields if f["evidence_kind"] == "transcribed_table_field")


def test_source_title_is_marked_metadata_not_table_cell(client):
    fields = client.get("/v3/evidence/PSI-69-20CAL10").json()["evidence_fields"]
    titles = [f for f in fields if f["field_name"] == "Investigation title"]
    assert len(titles) == 1
    assert titles[0]["evidence_kind"] == "curated_source_metadata"
    assert titles[0]["raw_row_sha256"] is None


def test_causal_airflow_question_abstains_and_discloses_missing_metrics(client):
    data = client.post("/v3/search", json={"query": "How does airflow influence flame spread?"}).json()
    assert data["answer_status"] in {"insufficient_evidence_for_inference", "no_matching_records"}
    notices = " ".join(data["notices"]).lower()
    assert "flame-spread-rate" in notices
    assert "airflow velocity" in notices
    assert "causal" in notices


def test_no_results_are_not_claimed_as_absence_of_nasa_research(client):
    data = client.post("/v3/search", json={"query": "unfindablexyz"}).json()
    assert data["total_matches"] == 0
    assert data["results"] == []
    assert data["answer_status"] == "no_matching_records"
    assert "not evidence that NASA has no research" in " ".join(data["notices"])


def test_blank_and_stopword_only_queries_rejected(client):
    assert client.post("/v3/search", json={"query": "  "}).status_code == 422
    assert client.post("/v3/search", json={"query": "the and of"}).status_code == 422
    assert client.post("/v3/search", json={"query": ""}).status_code == 422


def test_invalid_filters_and_limits_rejected(client):
    assert client.post("/v3/search", json={"query": "methanol", "investigation": "PSI-999"}).status_code == 422
    assert client.post("/v3/search", json={"query": "methanol", "limit": 0}).status_code == 422
    assert client.post("/v3/search", json={"query": "methanol", "match_mode": "maybe"}).status_code == 422


def test_pagination_and_stable_ranking(client):
    payload = {"query": "methanol", "limit": 1, "offset": 1}
    first = client.post("/v3/search", json=payload).json()
    second = client.post("/v3/search", json=payload).json()
    assert first == second
    assert first["total_matches"] == 3
    assert first["returned_count"] == 1
    assert first["offset"] == 1


def test_score_is_explained_and_not_fire_risk(client):
    data = client.post("/v3/search", json={"query": "methanol extinction"}).json()
    record = data["results"][0]
    total = sum(x["contribution"] for x in record["score_contributions"])
    assert math.isclose(total, record["relevance_score"], abs_tol=0.00001)
    assert "risk" in " ".join(data["notices"])
    method = client.get("/v3/ranking-method").json()
    assert method["name"] == "field_weighted_idf_v1"
    assert method["no_semantic_inference"] is True
    assert method["no_nasa_download"] is True


def test_evidence_not_found(client):
    assert client.get("/v3/evidence/PSI-25-DOES-NOT-EXIST").status_code == 404


def test_tampered_normalized_metric_is_rejected():
    record = next(r for r in get_records() if r.id == "PSI-69-20CAL10").model_copy(deep=True)
    record.metrics["burn_time_s"].value = 999.0
    with pytest.raises(ValueError, match="Normalized metric differs"):
        verify_derived_values(record)


def test_tokenizer_preserves_numerical_units_without_synonym_invention():
    assert query_tokens("O2 and 1.86 mm methanol") == ["o2", "1.86", "mm", "methanol"]
    assert "airflow" not in query_tokens("Air display")
