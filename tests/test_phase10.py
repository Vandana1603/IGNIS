"""Expanded provenance and RAG contract tests; no remote model needed."""
import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.phase2.catalog import get_records
from backend.phase3.retrieval import field_id
from backend.phase10.rag import ask, remote_enabled
from backend.phase10.routes import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

def test_expanded_catalog_has_source_family_diversity():
    records = get_records()
    assert len(records) == 28
    assert len([r for r in records if r.source_id == 'PSI-25']) == 25
    assert len([r for r in records if r.source_id == 'PSI-69']) == 3
    assert any(r.id == 'PSI-25-F1' and 'Nomex' in r.fuel_material_raw for r in records)

def test_provenance_ledger_identifies_mirror_and_nasa_report():
    p = Path(__file__).resolve().parents[1]/'data/phase10/provenance.json'
    ledger=json.loads(p.read_text())
    assert 'ntrs.nasa.gov' in ledger['NASA_reference']
    assert 'community_mirror' in ledger
    assert 'not downloaded' in ledger['scope_notice']
    assert len(ledger['record_sources']) == 28

def test_bass_negative_co_remains_raw():
    r=next(r for r in get_records() if r.id=='PSI-25-B21')
    assert r.raw_fields['Initial CO (ppm)']=='-1'
    assert 'initial_co_ppm' not in r.metrics

def test_rag_status_is_dynamic_and_optional(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    s=client.get('/v10/rag/status')
    assert s.status_code==200 and s.json()['imported_record_count']==28
    assert not s.json()['ai_available']

def test_extractive_specific_nasa_value_and_citation():
    r=client.post('/v10/rag/ask', json={'question':'What is the burn time of 20CAL10?'})
    assert r.status_code==200, r.text
    p=r.json()
    assert p['mode_used']=='extractive' and p['status']=='answered'
    assert any(c['record_id']=='PSI-69-20CAL10' and c['original_value']=='5' and
        c['field_name']=='Burn time; s' and c['evidence_id']==field_id('PSI-69-20CAL10','raw','Burn time; s')
        for c in p['citations'])

def test_additional_solid_record_is_covered():
    r=client.post('/v10/rag/ask', json={'question':'What was the fan display of B10?'})
    p=r.json()
    assert p['status']=='answered' and any(c['record_id']=='PSI-25-B10' and c['field_name']=='Fan display' for c in p['citations'])
    assert any('not calibrated velocities' in n for n in p['notices'])

def test_causal_and_operational_question_abstains():
    for q in ('Does more oxygen cause higher fire risk?', 'Which material is safest for the Moon?'):
        p=client.post('/v10/rag/ask',json={'question':q}).json()
        assert p['status']=='abstained' and not p['citations']

def test_optional_mode_without_key_falls_back(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    p=client.post('/v10/rag/ask',json={'question':'What is the fuel of F1?', 'mode':'ai_assisted'}).json()
    assert p['status']=='answered' and p['mode_used']=='extractive' and p['citations']
    assert any('unavailable' in n for n in p['notices'])

def test_unknown_returns_abstention():
    p=client.post('/v10/rag/ask',json={'question':'unobtainium_nasa_missing_test'}).json()
    assert p['status']=='abstained'

def test_schema_rejects_invalid_requests():
    assert client.post('/v10/rag/ask',json={'question':'', 'mode':'extractive'}).status_code==422
    assert client.post('/v10/rag/ask',json={'question':'methanol', 'mode':'guess'}).status_code==422
    assert client.post('/v10/rag/ask',json={'question':'methanol', 'max_records':999}).status_code==422

def test_remote_ai_summary_must_contain_supported_numbers(monkeypatch):
    from backend.phase10 import rag
    import io
    import json
    monkeypatch.setenv('IGNIS_ENABLE_REMOTE_RAG','1')
    monkeypatch.setenv('OPENAI_API_KEY','unit-test-placeholder')
    e=rag.ask('What is the burn time of 20CAL10?')['citations'][0]
    class FakeHTTP:
        def __init__(self,payload):self.payload=payload
        def __enter__(self):return io.BytesIO(json.dumps(self.payload).encode('utf-8'))
        def __exit__(self,*args):return False
    def fake_response(summary, citations):
        payload={'output':[{'content':[{'type':'output_text','text':json.dumps({'summary':summary,'citations':citations})}]}]}
        return FakeHTTP(payload)
    monkeypatch.setattr(rag.urllib_request,'urlopen',lambda *args,**kwargs:fake_response('Test 20CAL10 recorded 9999 seconds.',[e['evidence_id']]))
    result=rag.ask('What is the burn time of 20CAL10?',mode='ai_assisted')
    assert result['mode_used']=='extractive'
    assert '9999' not in result['answer']


def test_remote_ai_unresolved_citation_falls_back(monkeypatch):
    from backend.phase10 import rag
    import io
    import json
    monkeypatch.setenv('IGNIS_ENABLE_REMOTE_RAG','1')
    monkeypatch.setenv('OPENAI_API_KEY','unit-test-placeholder')
    reply={'output':[{'content':[{'type':'output_text','text':json.dumps({'summary':'The recorded value is 5.', 'citations':['FAKE-ID']})}]}]}
    class FakeContext:
        def __enter__(self):return io.BytesIO(json.dumps(reply).encode())
        def __exit__(self,*args):return False
    monkeypatch.setattr(rag.urllib_request,'urlopen',lambda *args,**kwargs:FakeContext())
    result=rag.ask('What is the burn time of 20CAL10?',mode='ai_assisted')
    assert result['mode_used']=='extractive'
    assert result['citations']


def test_record_level_provenance_scope_is_explicit():
    response=client.get('/v10/rag/provenance/PSI-25-F1')
    assert response.status_code==200
    assert 'selected_fields_cross_checked' == response.json()['review']['status']
    assert 'ntrs.nasa.gov' in response.json()['NASA_report']
    assert client.get('/v10/rag/provenance/PSI-25-FAKE').status_code==404
