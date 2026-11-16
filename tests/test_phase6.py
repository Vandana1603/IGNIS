"""Run after: python -m backend.phase2.ingest --include-flex"""
import hashlib

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.phase2.ingest import RAW
from backend.phase3.retrieval import field_id
from backend.phase6.engine import ask, capabilities
from backend.phase6.models import AskRequest, AskResponse
from backend.phase6.routes import router


@pytest.fixture()
def client():
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as c:
        yield c


def query(client, question, **kwargs):
    response = client.post('/v6/ask', json={'question': question, **kwargs})
    assert response.status_code == 200, response.text
    return response.json()


def test_capabilities_no_llm_or_network(client):
    p = client.get('/v6/capabilities').json()
    assert p['generative_model_used'] is False
    assert p['nasa_network_download'] is False
    assert p['method'] == 'deterministic_evidence_rules_v1'


def test_status_uses_existing_catalog(client):
    p = client.get('/v6/status').json()
    assert p['imported_record_count'] == 6
    assert p['investigations'] == ['PSI-25', 'PSI-69']
    assert p['independent_nasa_verification'] == 'not_performed'


def test_burn_time_exact_value_and_citation(client):
    p = query(client, 'What was the burn time of FLEX test 20CAL10?')
    assert p['status'] == 'answered' and p['mode'] == 'record_lookup'
    assert '5 s' in p['answer']
    assert len(p['observations']) == 1
    ev = next(e for e in p['evidence'] if e['field_name'] == 'Burn time; s')
    assert ev['original_value'] == '5'
    assert ev['evidence_id'] == field_id('PSI-69-20CAL10', 'raw', 'Burn time; s')
    assert ev['doi'] == '10.60555/mbq8-0451'
    assert ev['evidence_id'] in p['observations'][0]['evidence_ids']


def test_burning_rate_original_unit(client):
    p = query(client, 'What is the burning rate of 20CAL12?')
    assert p['status'] == 'answered'
    assert '0.58 mm^2/s' in p['answer']
    assert p['evidence'][0]['original_value'] == '0.58'


def test_outcome_filter_uses_test_end_not_column_label(client):
    p = query(client, 'Which imported methanol tests ended in extinction?')
    assert p['mode'] == 'outcome_filter'
    assert set(p['source_record_ids']) == {'PSI-69-20CAL10', 'PSI-69-20CAL12'}
    assert 'PSI-69-20CAL08' not in p['source_record_ids']
    assert all(any(e['field_name'] == 'Test end' and e['record_id'] == record
                   for e in p['evidence']) for record in p['source_record_ids'])


def test_disruption_is_not_extinction(client):
    p = query(client, 'Which FLEX tests ended in disruption?')
    assert p['source_record_ids'] == ['PSI-69-20CAL08']
    assert any(e['original_value'] == 'Disruption' for e in p['evidence'])


def test_ambiguous_two_outcomes_abstains(client):
    p = query(client, 'Which tests ended in extinction or disruption?')
    assert p['status'] == 'abstained'


def test_comparison_descriptive_only(client):
    p = query(client, 'Compare burn times of 20CAL10 and 20CAL12')
    assert p['status'] == 'answered' and p['mode'] == 'record_comparison'
    assert len(p['observations']) == 2
    assert len(p['interpretations']) == 1
    assert {e['original_value'] for e in p['evidence']} == {'5', '3.2'}
    assert 'causal' in p['interpretations'][0]['text'].lower()
    assert any('different_recorded_fields' in text for text in p['limitations'])


def test_cross_investigation_comparison_abstains(client):
    p = query(client, 'Compare burn times of B1 and 20CAL10')
    assert p['status'] == 'abstained'
    assert 'cross_investigation_blocked' in p['abstention_reason']


def test_missing_flame_spread_rate_abstains(client):
    p = query(client, 'What is the flame spread rate of B1?')
    assert p['status'] == 'abstained'
    assert p['evidence'] == []


def test_missing_airflow_velocity_abstains(client):
    p = query(client, 'What is the airflow velocity of B1?')
    assert p['status'] == 'abstained'
    assert 'airflow' in p['abstention_reason']


def test_causal_question_abstains(client):
    p = query(client, 'Does a larger droplet cause a longer burn time?')
    assert p['status'] == 'abstained'
    assert p['observations'] == [] and p['interpretations'] == []


def test_safety_question_abstains(client):
    p = query(client, 'Which material is safest for spacecraft?')
    assert p['status'] == 'abstained'
    assert p['source_record_ids'] == []


def test_bass_fan_display_is_not_velocity(client):
    p = query(client, 'What was the fan display of B1?')
    assert p['status'] == 'answered'
    assert '62' in p['answer']
    assert any('not calibrated airflow velocities' in text for text in p['limitations'])


def test_b3_does_not_infer_pmma(client):
    p = query(client, 'What material was B3?')
    assert p['status'] == 'answered'
    assert '100 micron film 2 cm wide' in p['answer']
    assert 'PMMA' not in p['answer']


def test_bass_initial_oxygen_correct_original_label(client):
    p = query(client, 'What was the initial oxygen of B1?')
    assert p['status'] == 'answered'
    assert '22.2 % vol' in p['answer']
    assert p['evidence'][0]['field_name'] == 'Calibrated initial O2 % by vol'


def test_flex_initial_oxygen_mole_fraction(client):
    p = query(client, 'What was the initial oxygen of 20CAL10?')
    assert p['status'] == 'answered'
    assert '0.21 mole fraction' in p['answer']


def test_oxygen_without_initial_final_abstains(client):
    p = query(client, 'What is oxygen for B1?')
    assert p['status'] == 'abstained'


def test_unknown_record_id_abstains(client):
    p = query(client, 'What was the burn time of 20CAL99?')
    assert p['status'] == 'abstained'


def test_lexical_search_pmma_only_explicit_raw_values(client):
    p = query(client, 'Find PMMA records')
    assert p['mode'] == 'lexical_lookup'
    assert set(p['source_record_ids']) == {'PSI-25-B1', 'PSI-25-B4'}
    assert 'PSI-25-B3' not in p['source_record_ids']


def test_empty_search_abstains(client):
    p = query(client, 'Find unobtainium records')
    assert p['status'] == 'abstained'


def test_api_rejects_empty_question(client):
    assert client.post('/v6/ask', json={'question': '  '}).status_code == 422


def test_api_rejects_bad_max_records(client):
    assert client.post('/v6/ask', json={'question': 'methanol', 'max_records': 100}).status_code == 422


def test_all_answered_claims_have_valid_exact_ids(client):
    for question in ('What is the burn time of 20CAL10?', 'methanol extinction',
                     'Compare burn times of 20CAL10 and 20CAL12', 'Find PMMA records'):
        p = query(client, question)
        assert p['status'] == 'answered'
        ids = {e['evidence_id'] for e in p['evidence']}
        assert ids
        for claim in p['observations'] + p['interpretations']:
            assert claim['evidence_ids'] and set(claim['evidence_ids']) <= ids
        assert all(e['source_url'].startswith('https://psi.nasa.gov/') for e in p['evidence'])


def test_model_rejects_fabricated_citation():
    p = ask(AskRequest(question='What was the burn time of 20CAL10?'))
    payload = p.model_dump()
    payload['observations'][0]['evidence_ids'] = ['invented-id']
    with pytest.raises(ValueError):
        AskResponse.model_validate(payload)


def test_no_source_files_modified_by_si(client):
    before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in RAW.glob('*.csv')}
    query(client, 'Compare burn times of 20CAL10 and 20CAL12')
    query(client, 'Which FLEX tests ended in extinction?')
    after = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in RAW.glob('*.csv')}
    assert before == after


def test_limit_records(client):
    p = query(client, 'methanol', max_records=1)
    assert p['status'] == 'answered'
    assert len(p['source_record_ids']) == 1


def test_provenance_not_live_verified(client):
    p = query(client, 'What is the burn time of 20CAL10?')
    assert p['independent_nasa_verification'] == 'not_performed'
    assert any('local traceability' in s for s in p['limitations'])
