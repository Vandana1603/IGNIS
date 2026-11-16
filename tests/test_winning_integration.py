"""Additional regression checks against existing NASA PSI catalog and evidence API.

Do not change existing data, backend routes, or scientific thresholds.
"""
import hashlib
from pathlib import Path

from fastapi.testclient import TestClient
from backend.main import app

ROOT = Path(__file__).resolve().parents[1]
CLIENT = TestClient(app)


def test_source_catalog_remains_curated():
    rows = CLIENT.get('/v2/experiments')
    assert rows.status_code == 200
    records = rows.json()
    assert any(r['test_id'] == '20CAL10' and r['source_id'] == 'PSI-69' for r in records)
    assert any(r['test_id'] == '20CAL12' and r['source_id'] == 'PSI-69' for r in records)
    assert not any(r.get('is_simulated') for r in records)


def test_featured_finding_rejects_causality_and_uses_exact_evidence_ids():
    res = CLIENT.post('/v5/compare', json={'left_id': 'PSI-69-20CAL10', 'right_id': 'PSI-69-20CAL12'})
    assert res.status_code == 200
    body = res.json()
    assert body['category'] == 'within_investigation_descriptive'
    assert body['local_provenance_checked'] is True
    burn = next(m for m in body['numeric_pairs'] if m['original_column'] == 'Burn time; s')
    assert burn['unit'] == 's'
    assert burn['interpretation'] == 'descriptive_only'
    assert burn['left_original_value'] == '5'
    assert burn['right_original_value'] == '3.2'
    for test_id, evidence_id in [('20CAL10', burn['left_evidence_id']), ('20CAL12', burn['right_evidence_id'])]:
        evidence = CLIENT.get(f'/v3/evidence/PSI-69-{test_id}')
        assert evidence.status_code == 200
        assert evidence_id in [x['evidence_id'] for x in evidence.json()['evidence_fields']]
    conditions = {x['original_column']: x for x in body['context_checks']}
    assert conditions['Ambient pressure; mmHg']['relation'] == 'different_raw'
    assert conditions['Droplet initial diameter; mm']['relation'] == 'different_raw'


def test_unrelated_investigations_remain_blocked():
    res = CLIENT.post('/v5/compare', json={'left_id': 'PSI-25-B1', 'right_id': 'PSI-69-20CAL10'})
    assert res.status_code == 200
    assert res.json()['category'] == 'cross_investigation_blocked'
    assert not res.json()['numeric_pairs']


def test_data_integrity_untouched_by_api_reads():
    files = sorted((ROOT / 'data' / 'phase2').rglob('*.csv'))
    before = {str(f): hashlib.sha256(f.read_bytes()).hexdigest() for f in files}
    assert len(files) >= 2
    assert CLIENT.get('/v3/index-status').status_code == 200
    assert CLIENT.get('/v5/passports/PSI-69-20CAL10').status_code == 200
    after = {str(f): hashlib.sha256(f.read_bytes()).hexdigest() for f in files}
    assert before == after
