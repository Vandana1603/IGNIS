
from fastapi.testclient import TestClient

from backend.main import app
from backend.repository import validate_catalog


def test_catalog():
    validate_catalog()


def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_sources():
    with TestClient(app) as client:
        response = client.get("/sources")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_initial_experiments_empty():
    with TestClient(app) as client:
        response = client.get("/experiments")
    assert response.status_code == 200
    assert response.json() == []


def test_missing_experiment():
    with TestClient(app) as client:
        response = client.get("/experiments/UNKNOWN")
    assert response.status_code == 404


def test_initial_search_empty():
    with TestClient(app) as client:
        response = client.post(
            "/search",
            json={"query": "methanol"}
        )
    assert response.status_code == 200
    assert response.json()["total"] == 0

