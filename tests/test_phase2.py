import csv
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.phase2.ingest import DATA, RAW, BASS_COLS, assert_unique_ids, import_bass, row_hash
from backend.phase2.catalog import get_records, get_sources
from backend.phase2.comparability import compare
from backend.phase2.routes import router


@pytest.fixture(scope="module", autouse=True)
def ensure_catalog():
    if not (DATA / "experiments.json").exists():
        raise AssertionError("Run python -m backend.phase2.ingest before testing")


@pytest.fixture()
def client():
    mini_app = FastAPI()
    mini_app.include_router(router)
    with TestClient(mini_app) as c:
        yield c


def test_sources_are_real_nasa_catalogs():
    sources = get_sources()
    assert {s.source_id for s in sources} == {"PSI-25", "PSI-69"}
    assert all(s.url.host == "psi.nasa.gov" for s in sources)


def test_expected_curated_subset_for_current_stage():
    records = get_records()
    ids = {r.id for r in records}
    assert {"PSI-25-B1", "PSI-25-B3", "PSI-25-B4"}.issubset(ids)
    assert len(records) in (3, 6)
    if len(records) == 6:
        assert {"PSI-69-20CAL08", "PSI-69-20CAL10", "PSI-69-20CAL12"}.issubset(ids)


def test_bass_b1_preserves_calibrated_label_not_ambient():
    r = next(x for x in get_records() if x.id == "PSI-25-B1")
    value = r.metrics["calibrated_initial_o2_percent_by_volume"]
    assert value.value == 22.2
    assert value.original_column == "Calibrated initial O2 % by vol"
    assert "airflow_cm_s" not in r.metrics
    assert r.instrument_displays["Air display"] == "5"
    assert r.raw_fields["Initial CO (ppm)"] == "0"


def test_bass_b4_negative_co_preserved_not_normalized():
    r = next(x for x in get_records() if x.id == "PSI-25-B4")
    assert r.raw_fields["Initial CO (ppm)"] == "-1"
    assert "initial_co_ppm" not in r.metrics
    assert any("negative CO" in note for note in r.limitations)


def test_flex_values_and_units():
    r = next((x for x in get_records() if x.id == "PSI-69-20CAL10"), None)
    if r is None:
        pytest.skip("FLEX not imported yet: use --include-flex")
    assert r.metrics["initial_droplet_diameter_mm"].value == 1.86
    assert r.metrics["burn_time_s"].value == 5.0
    assert r.metrics["burning_rate_mm2_per_s"].unit == "mm^2/s"
    assert r.reported_test_end == "Extinction"


def test_raw_provenance_hash_detects_changes():
    r = next(x for x in get_records() if x.id == "PSI-25-B1")
    altered = r.model_copy(deep=True)
    altered.raw_fields["Fan display"] = "999"
    assert row_hash(altered.raw_fields) != altered.raw_row_sha256


def test_validation_rejects_oxygen_over_100(tmp_path):
    source = RAW / "psi25_bass_ii_curated.csv"
    with source.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    rows[0]["Calibrated initial O2 % by vol"] = "120"
    forged = tmp_path / "bad.csv"
    with forged.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=BASS_COLS)
        w.writeheader()
        w.writerows(rows)
    with pytest.raises(ValueError, match="Out-of-range"):
        import_bass(forged)


def test_duplicate_test_ids_rejected(tmp_path):
    source = RAW / "psi25_bass_ii_curated.csv"
    with source.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    rows[1]["Test #"] = rows[0]["Test #"]
    forged = tmp_path / "duplicates.csv"
    with forged.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=BASS_COLS)
        w.writeheader()
        w.writerows(rows)
    with pytest.raises(ValueError, match="Duplicate experiment IDs"):
        assert_unique_ids(import_bass(forged))


def test_phase2_endpoints(client):
    status = client.get("/v2/status")
    assert status.status_code == 200
    assert status.json()["imported_record_count"] == len(get_records())
    r = client.get("/v2/experiments", params={"investigation": "PSI-25"})
    assert r.status_code == 200 and len(r.json()) == 3
    missing = client.get("/v2/experiments/not-a-test")
    assert missing.status_code == 404


def test_evidence_passport(client):
    r = client.get("/v2/evidence-passports/PSI-25-B1")
    assert r.status_code == 200
    p = r.json()
    assert p["source"]["doi"] == "10.60555/4qc4-de67"
    assert p["record"]["raw_fields"]["Test #"] == "B1"
    assert p["interpretations"] == []
    assert "manual" in p["provenance_notice"].lower()


def test_compare_within_flex(client):
    if not any(x.source_id == "PSI-69" for x in get_records()):
        pytest.skip("FLEX not imported yet")
    r = client.post("/v2/compare", json={"left_id": "PSI-69-20CAL10", "right_id": "PSI-69-20CAL12"})
    assert r.status_code == 200
    body = r.json()
    assert body["category"] == "within_investigation_descriptive"
    keys = {x["key"] for x in body["shared_metrics"]}
    assert "burn_time_s" in keys
    assert any("causation" in x for x in body["warnings"])


def test_compare_cross_investigation_blocks_metrics(client):
    if not any(x.source_id == "PSI-69" for x in get_records()):
        pytest.skip("FLEX not imported yet")
    r = client.post("/v2/compare", json={"left_id": "PSI-25-B1", "right_id": "PSI-69-20CAL10"})
    assert r.status_code == 200
    body = r.json()
    assert body["category"] == "cross_investigation_only"
    assert body["shared_metrics"] == []
