"""End-to-end API/scientific QA. Run after the Phase 2 importer and Phase 7 integration.

Read-only with respect to NASA source files. Does not call NASA or any LLM.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.phase2.catalog import get_records, get_sources
from backend.phase2.ingest import DATA, RAW, row_hash, sha_bytes
from backend.phase3.retrieval import field_id


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as instance:
        yield instance


def _post(client, path, payload):
    response = client.post(path, json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def test_readiness_reports_actual_curated_scope(client):
    response = client.get("/v7/readiness")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "ready"
    assert body["record_count"] == len(get_records())
    assert body["record_count"] > 0
    assert body["independent_nasa_verification"] == "not_performed"
    assert body["scientific_prediction_model"] is False


def test_existing_api_routes_remain_available(client):
    for path in ("/health", "/v2/sources", "/v2/experiments", "/v3/index-status",
                 "/v3/ranking-method", "/v5/passports/PSI-25-B1", "/v6/status"):
        response = client.get(path)
        assert response.status_code == 200, f"{path}: {response.text}"


def test_raw_csv_and_normalized_record_hashes_are_consistent():
    records = get_records()
    sources = {source.source_id: source for source in get_sources()}
    assert {r.source_id for r in records}.issubset(sources)
    assert len({r.id for r in records}) == len(records)
    for record in records:
        assert row_hash(record.raw_fields) == record.raw_row_sha256
        for metric in record.metrics.values():
            assert record.raw_fields[metric.original_column] == metric.original_value
        assert record.raw_fields["Test #" if record.source_id == "PSI-25" else "FLEX Identifier"] == record.test_id
    assert (DATA / "import_manifest.json").is_file()
    assert all(p.is_file() for p in RAW.glob("*.csv"))


def test_search_to_evidence_to_field_trace_end_to_end(client):
    result = _post(client, "/v3/search", {
        "query": "methanol extinction", "match_mode": "all_values",
        "outcome": "Extinction", "limit": 10,
    })
    ids = {r["record_id"] for r in result["results"]}
    assert ids == {"PSI-69-20CAL10", "PSI-69-20CAL12"}
    assert "PSI-69-20CAL08" not in ids
    for hit in result["results"]:
        record_id = hit["record_id"]
        evidence = client.get(f"/v3/evidence/{record_id}").json()
        passport = client.get(f"/v5/passports/{record_id}").json()
        raw = client.get(f"/v2/experiments/{record_id}").json()["raw_fields"]
        indexed = {field["evidence_id"]: field for field in evidence["evidence_fields"]}
        audited = {field["evidence_id"]: field for field in passport["fields"] if field["evidence_id"]}
        assert passport["local_consistency"] == "passed"
        assert passport["independent_nasa_verification"] == "not_performed"
        for field_id_value, field in indexed.items():
            if field["evidence_kind"] != "transcribed_table_field":
                continue
            assert field_id_value in audited
            assert field["original_value"] == raw[field["field_name"]]
            trace = client.get(
                f"/v5/passports/{record_id}/fields/{field_id_value}"
            )
            assert trace.status_code == 200, trace.text
            assert trace.json()["original_value"] == field["original_value"]


def test_evidence_ids_resolve_to_exact_original_fields(client):
    result = _post(client, "/v6/ask", {"question": "What was the burn time of FLEX test 20CAL10?"})
    assert result["status"] == "answered"
    records = {r.id: r for r in get_records()}
    ids = {e["evidence_id"] for e in result["evidence"]}
    assert ids
    for evidence in result["evidence"]:
        record = records[evidence["record_id"]]
        assert record.raw_fields[evidence["field_name"]] == evidence["original_value"]
        assert evidence["evidence_id"] == field_id(record.id, "raw", evidence["field_name"])
        assert evidence["raw_row_sha256"] == record.raw_row_sha256
    for claim in result["observations"] + result["interpretations"]:
        assert claim["evidence_ids"] and set(claim["evidence_ids"]).issubset(ids)


def test_cross_investigation_comparison_blocked(client):
    result = _post(client, "/v5/compare", {
        "left_id": "PSI-25-B1", "right_id": "PSI-69-20CAL10",
    })
    assert result["category"] == "cross_investigation_blocked"
    assert result["numeric_pairs"] == []


def test_within_investigation_is_descriptive_not_causal(client):
    result = _post(client, "/v5/compare", {
        "left_id": "PSI-69-20CAL10", "right_id": "PSI-69-20CAL12",
    })
    assert result["category"] == "within_investigation_descriptive"
    assert result["context_status"] == "different_recorded_fields"
    assert result["numeric_pairs"]
    assert all(pair["interpretation"] == "descriptive_only" for pair in result["numeric_pairs"])


@pytest.mark.parametrize("question", [
    "Does a larger droplet cause a longer burn time?",
    "How does airflow influence flame spread?",
    "Which material is safest for spacecraft?",
    "What is the flame spread rate of B1?",
])
def test_unsupported_scientific_questions_abstain(client, question):
    result = _post(client, "/v6/ask", {"question": question})
    assert result["status"] == "abstained"
    assert result["observations"] == []
    assert result["interpretations"] == []
    assert result["evidence"] == []
    assert result["abstention_reason"]


def test_missing_records_return_404_without_tracebacks(client):
    for path in ("/v2/experiments/UNKNOWN", "/v3/evidence/UNKNOWN", "/v5/passports/UNKNOWN"):
        response = client.get(path)
        assert response.status_code == 404
        assert "Traceback" not in response.text
        assert "C:\\" not in response.text


def test_invalid_requests_rejected(client):
    assert client.post("/v3/search", json={"query": " "}).status_code == 422
    assert client.post("/v6/ask", json={"question": " "}).status_code == 422
    assert client.post("/v6/ask", json={"question": "burn time", "max_records": 1000}).status_code == 422
    assert client.post("/v5/compare", json={"left_id": "", "right_id": "B1"}).status_code == 422


def test_api_security_headers_and_no_store(client):
    for path in ("/v2/experiments", "/v3/index-status", "/v5/passports/PSI-25-B1", "/v6/status", "/v7/readiness"):
        response = client.get(path)
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["referrer-policy"] == "no-referrer"
        assert response.headers["x-frame-options"] == "DENY"
        assert response.headers["cache-control"] == "no-store"
        assert response.headers.get("access-control-allow-origin") != "*"


def test_declared_oversized_post_rejected(client):
    response = client.post("/v6/ask", content=b"x" * 65537, headers={"Content-Type": "application/json"})
    assert response.status_code == 413
    assert response.json()["detail"] == "Request body too large"


def test_readiness_failure_is_sanitized(client, monkeypatch):
    import backend.phase7.routes as routes

    def broken():
        raise ValueError("secret/private/file/location")

    monkeypatch.setattr(routes, "load_catalog", broken)
    response = client.get("/v7/readiness")
    assert response.status_code == 503
    assert "secret/private/file/location" not in response.text
    assert "catalog validation failed" in response.text.lower()


def test_read_only_api_calls_do_not_change_curated_data(client):
    paths = [*sorted(RAW.glob("*.csv")), DATA / "experiments.json", DATA / "import_manifest.json"]
    before = {str(p): sha_bytes(p.read_bytes()) for p in paths}
    client.get("/v2/experiments")
    client.get("/v5/passports/PSI-25-B1")
    _post(client, "/v6/ask", {"question": "What was the burn time of 20CAL10?"})
    after = {str(p): sha_bytes(p.read_bytes()) for p in paths}
    assert before == after
