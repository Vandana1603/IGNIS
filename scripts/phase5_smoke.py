"""Read-only smoke checks of a running FastAPI /v5 server.

Run: python -m scripts.phase5_smoke
"""
import httpx

ROOT = "http://127.0.0.1:8000"


def main():
    with httpx.Client(base_url=ROOT, timeout=15.0) as client:
        passport = client.get("/v5/passports/PSI-25-B1")
        passport.raise_for_status()
        p = passport.json()
        assert p["record_id"] == "PSI-25-B1"
        assert p["local_consistency"] == "passed"
        assert p["independent_nasa_verification"] == "not_performed"
        assert p["imported_file_sha256"] == p["current_file_sha256"]
        assert p["imported_row_sha256"] == p["recomputed_row_sha256"]
        print(f"PASS: BASS-II passport with {len(p['fields'])} original fields")

        cross = client.post("/v5/compare", json={
            "left_id": "PSI-25-B1", "right_id": "PSI-69-20CAL10",
        })
        cross.raise_for_status()
        assert cross.json()["category"] == "cross_investigation_blocked"
        assert cross.json()["numeric_pairs"] == []
        print("PASS: Cross-investigation numeric comparison blocked")

        within = client.post("/v5/compare", json={
            "left_id": "PSI-69-20CAL10", "right_id": "PSI-69-20CAL12",
        })
        within.raise_for_status()
        assert within.json()["category"] == "within_investigation_descriptive"
        assert within.json()["context_status"] == "different_recorded_fields"
        print("PASS: FLEX within-investigation differences explicitly flagged")

    print("SUCCESS: Phase 5 read-only smoke checks passed")


if __name__ == "__main__":
    main()
