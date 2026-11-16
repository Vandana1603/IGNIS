"""Requires existing Phase 2 data: python -m backend.phase2.ingest --include-flex."""
import hashlib
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.phase2.catalog import get_records
from backend.phase2.ingest import RAW, row_hash
from backend.phase3.retrieval import field_id
from backend.phase5.audit import build_passport
from backend.phase5.guard import compare_advanced
from backend.phase5.routes import router


@pytest.fixture(scope="module", autouse=True)
def existing_data():
    ids = {r.id for r in get_records()}
    expected = {
        "PSI-25-B1", "PSI-25-B3", "PSI-25-B4",
        "PSI-69-20CAL08", "PSI-69-20CAL10", "PSI-69-20CAL12",
    }
    assert expected.issubset(ids), "Run python -m backend.phase2.ingest --include-flex first"


@pytest.fixture()
def client():
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as c:
        yield c


def test_passport_b1_original_fields_and_trace(client):
    r = client.get("/v5/passports/PSI-25-B1")
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["record_id"] == "PSI-25-B1"
    assert p["source_doi"] == "10.60555/4qc4-de67"
    assert p["source_locator"] == "Experimental Table > Test # = B1"
    assert p["independent_nasa_verification"] == "not_performed"
    assert p["local_consistency"] == "passed"
    assert len(p["fields"]) == 17
    o2 = next(f for f in p["fields"] if f["original_column"] == "Calibrated initial O2 % by vol")
    assert o2["original_value"] == "22.2"
    assert o2["normalized_value"] == 22.2
    assert o2["normalized_unit"] == "% vol"
    assert o2["evidence_id"] == field_id("PSI-25-B1", "raw", o2["original_column"])


def test_passport_file_hash_matches_actual_curated_bytes(client):
    p = client.get("/v5/passports/PSI-69-20CAL10").json()
    file_path = RAW / p["curated_filename"]
    expected = hashlib.sha256(file_path.read_bytes()).hexdigest()
    assert p["current_file_sha256"] == expected == p["imported_file_sha256"]
    assert p["imported_row_sha256"] == p["recomputed_row_sha256"]


def test_passport_preserves_negative_co_as_raw_not_metric(client):
    p = client.get("/v5/passports/PSI-25-B4").json()
    co = next(f for f in p["fields"] if f["original_column"] == "Initial CO (ppm)")
    assert co["original_value"] == "-1"
    assert co["normalized_value"] is None


def test_passport_does_not_guess_material(client):
    p = client.get("/v5/passports/PSI-25-B3").json()
    material = next(f for f in p["fields"] if f["original_column"] == "Fuel Sample Material")
    assert material["original_value"] == "100 micron film 2 cm wide"
    assert "PMMA" not in material["original_value"]


def test_direct_field_trace_lookup(client):
    eid = field_id("PSI-25-B1", "raw", "Air display")
    result = client.get(f"/v5/passports/PSI-25-B1/fields/{eid}")
    assert result.status_code == 200
    f = result.json()
    assert f["original_value"] == "5"
    assert f["field_role"] == "instrument_display"
    assert f["normalized_unit"] is None


def test_field_trace_not_found(client):
    assert client.get("/v5/passports/PSI-25-B1/fields/unknown").status_code == 404


def test_passport_not_found(client):
    assert client.get("/v5/passports/PSI-25-UNKNOWN").status_code == 404


def test_same_record_blocked(client):
    r = client.post("/v5/compare", json={"left_id": "PSI-25-B1", "right_id": "PSI-25-B1"})
    assert r.status_code == 200
    p = r.json()
    assert p["category"] == "same_record_blocked"
    assert p["numeric_pairs"] == []


def test_cross_investigation_blocked(client):
    r = client.post("/v5/compare", json={"left_id": "PSI-25-B1", "right_id": "PSI-69-20CAL10"})
    assert r.status_code == 200
    p = r.json()
    assert p["category"] == "cross_investigation_blocked"
    assert p["numeric_pairs"] == []
    assert p["context_checks"] == []


def test_bass_descriptive_comparison_flags_instrument_differences(client):
    r = client.post("/v5/compare", json={"left_id": "PSI-25-B1", "right_id": "PSI-25-B4"})
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["category"] == "within_investigation_descriptive"
    assert p["context_status"] == "different_recorded_fields"
    air = next(c for c in p["context_checks"] if c["original_column"] == "Air display")
    assert air["relation"] == "same_raw"
    assert "not a calibrated airflow velocity" in air["note"]
    fan = next(c for c in p["context_checks"] if c["original_column"] == "Fan display")
    assert (fan["left_raw"], fan["right_raw"]) == ("62", "61")
    assert fan["relation"] == "different_raw"
    o2 = next(m for m in p["numeric_pairs"] if m["key"] == "calibrated_initial_o2_percent_by_volume")
    assert o2["left_original_value"] == o2["right_original_value"] == "22.2"
    assert o2["unit"] == "% vol"
    assert o2["interpretation"] == "descriptive_only"
    assert o2["left_evidence_id"] == field_id("PSI-25-B1", "raw", o2["original_column"])


def test_flex_comparison_reports_different_initial_diameter(client):
    p = client.post("/v5/compare", json={"left_id": "PSI-69-20CAL10", "right_id": "PSI-69-20CAL12"}).json()
    assert p["category"] == "within_investigation_descriptive"
    diameter = next(c for c in p["context_checks"] if c["original_column"] == "Droplet initial diameter; mm")
    assert diameter["left_raw"] == "1.86" and diameter["right_raw"] == "1.61"
    assert diameter["relation"] == "different_raw"
    assert any(m["key"] == "burn_time_s" for m in p["numeric_pairs"])
    assert any("causation" in n for n in p["notices"])


def test_validation_rejects_empty_id(client):
    assert client.post("/v5/compare", json={"left_id": "", "right_id": "PSI-25-B1"}).status_code == 422


def test_unknown_record_returns_404(client):
    assert client.post("/v5/compare", json={"left_id": "UNKNOWN", "right_id": "PSI-25-B1"}).status_code == 404


def test_no_source_data_written_by_audit(client):
    before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in RAW.glob("*.csv")}
    assert client.get("/v5/passports/PSI-25-B1").status_code == 200
    assert client.post("/v5/compare", json={"left_id": "PSI-69-20CAL08", "right_id": "PSI-69-20CAL12"}).status_code == 200
    after = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in RAW.glob("*.csv")}
    assert before == after


def test_audit_uses_exact_existing_catalog():
    p = build_passport("PSI-25-B1")
    record = next(r for r in get_records() if r.id == "PSI-25-B1")
    assert p is not None
    assert p.recomputed_row_sha256 == row_hash(record.raw_fields)
    assert [f.original_column for f in p.fields] == list(record.raw_fields)


def test_direct_python_guard_consistent_with_api():
    result = compare_advanced("PSI-69-20CAL10", "PSI-69-20CAL12")
    assert result is not None
    assert result.category == "within_investigation_descriptive"
    assert result.local_provenance_checked is True
