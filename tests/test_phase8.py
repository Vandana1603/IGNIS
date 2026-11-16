"""Phase 8 live NASA connector: offline-reproducible tests; no external network calls."""
import hashlib
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.phase8 import sync

client = TestClient(app)

NASA_HTML = b'''<!doctype html><html><body>
<h1>NASA PSI-69 Version 5</h1><p>Updated Date: 06-Jun-2025</p>
<a href="/physci/repo/downloads/flex_public.csv">FLEX experimental table</a>
<a href="https://attacker.example.com/virus.zip">External file</a>
<a href="http://psi.nasa.gov/unsafe.csv">Unencrypted file</a>
<a href="/physci/repo/downloads/flex_public.csv">Duplicate</a>
<a href="/physci/repo/downloads/manual.pdf">PDF (not staged)</a>
</body></html>'''

@pytest.fixture
def isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(sync, 'SYNC_DIR', tmp_path)
    monkeypatch.setattr(sync, 'STATUS_PATH', tmp_path / 'status.json')
    monkeypatch.setattr(sync, 'STAGED_DIR', tmp_path / 'staged')
    return tmp_path


def fake_fetch(url, max_bytes):
    assert sync.safe_remote_url(url)
    if url.endswith('.csv'):
        return b'a,b\n1,2\n', {'content_type': 'text/csv', 'etag': '', 'last_modified': ''}, url
    return NASA_HTML, {'content_type': 'text/html', 'etag': '"a"', 'last_modified': 'Fri, 14 Nov 2025 00:00:00 GMT'}, url


def test_allowlisted_urls_only():
    assert sync.safe_remote_url(sync.SOURCE_URLS['PSI-69'])
    for url in ['http://psi.nasa.gov/abc', 'https://evil.com/data.csv', 'https://psi.nasa.gov.evil.com/a',
                'file:///etc/passwd', 'https://127.0.0.1/', 'https://psi.nasa.gov:8080/data.csv',
                'https://user@psi.nasa.gov/data.csv']:
        assert not sync.safe_remote_url(url), url


def test_discovery_filters_untrusted_links():
    result = sync.discover_html(NASA_HTML, sync.SOURCE_URLS['PSI-69'])
    assert result['latest_version_visible'] == '5'
    assert result['updated_date_visible'] == '06-Jun-2025'
    assert len(result['discoverable_files']) == 1
    assert result['discoverable_files'][0]['filename'] == 'flex_public.csv'


def test_never_guess_a_version_or_files():
    result = sync.discover_html(b'<html><h1>NASA PSI</h1><p>Data coming later</p></html>', sync.SOURCE_URLS['PSI-69'])
    assert result['latest_version_visible'] is None
    assert result['discoverable_files'] == []


def test_status_has_only_local_record_count_until_check(isolated):
    r = client.get('/v8/sync/status')
    assert r.status_code == 200
    body = r.json()
    assert body['catalog_record_count'] == 6
    assert body['imported_from_remote_sync'] == 0
    assert all(s['state'] == 'not_checked' for s in body['sources'])


def test_real_check_pipeline_with_mock_transport(isolated, monkeypatch):
    monkeypatch.setattr(sync, '_fetch_http', fake_fetch)
    r = client.post('/v8/sync/check', json={'source_id': 'PSI-69'})
    assert r.status_code == 200
    body = r.json()
    item = next(s for s in body['sources'] if s['source_id'] == 'PSI-69')
    assert item['state'] == 'online'
    assert item['page_sha256'] == hashlib.sha256(NASA_HTML).hexdigest()
    assert item['changed_since_last_successful_check'] is None
    assert item['latest_version_visible'] == '5'
    assert len(item['discoverable_files']) == 1
    assert next(s for s in body['sources'] if s['source_id'] == 'PSI-25')['state'] == 'not_checked'


def test_repeated_check_detects_html_change_only(isolated, monkeypatch):
    monkeypatch.setattr(sync, '_fetch_http', fake_fetch)
    sync.check_sources('PSI-25')
    second = sync.check_sources('PSI-25')
    item = next(s for s in second['sources'] if s['source_id'] == 'PSI-25')
    assert item['changed_since_last_successful_check'] is False
    monkeypatch.setattr(sync, '_fetch_http', lambda url, max_bytes: (NASA_HTML + b'updated',
        {'content_type': 'text/html', 'etag': '', 'last_modified': ''}, url))
    third = sync.check_sources('PSI-25')
    item = next(s for s in third['sources'] if s['source_id'] == 'PSI-25')
    assert item['changed_since_last_successful_check'] is True
    assert third['imported_from_remote_sync'] == 0


def test_remote_failure_is_not_reported_online(isolated, monkeypatch):
    monkeypatch.setattr(sync, '_fetch_http', lambda *args: (_ for _ in ()).throw(OSError('offline')))
    item = sync.check_sources('PSI-69')['sources'][1]
    assert item['state'] == 'unavailable'
    assert item['page_sha256'] is None
    assert item['error'] and 'offline' not in item['error']


def test_stage_is_explicit_only_and_never_imports(isolated, monkeypatch):
    monkeypatch.setattr(sync, '_fetch_http', fake_fetch)
    checks = sync.check_sources('PSI-69')
    artifact = checks['sources'][1]['discoverable_files'][0]
    r = client.post('/v8/sync/stage', json={'source_id':'PSI-69','artifact_id':artifact['artifact_id']})
    assert r.status_code == 200
    result = r.json()
    assert result['state'] == 'staged_not_imported'
    staged_file = sync.STAGED_DIR / result['filename']
    assert staged_file.read_bytes() == b'a,b\n1,2\n'
    assert result['sha256'] == hashlib.sha256(staged_file.read_bytes()).hexdigest()
    assert client.get('/v2/status').json()['imported_record_count'] == 6


def test_stage_rejects_unknown_or_invalid_artifact(isolated, monkeypatch):
    monkeypatch.setattr(sync, '_fetch_http', fake_fetch)
    sync.check_sources('PSI-69')
    response = client.post('/v8/sync/stage', json={'source_id':'PSI-69','artifact_id':'0000000000000000'})
    assert response.status_code == 422
    response = client.post('/v8/sync/stage', json={'source_id':'PSI-69','artifact_id':'../../etc/passwd'})
    assert response.status_code == 422


def test_stage_rejects_html_disguised_as_csv(isolated, monkeypatch):
    monkeypatch.setattr(sync, '_fetch_http', fake_fetch)
    artifact = sync.check_sources('PSI-69')['sources'][1]['discoverable_files'][0]
    def fake_html(url, max_bytes):
        if url.endswith('.csv'):
            return b'<!doctype html><html>Login required</html>', {'content_type': 'text/html'}, url
        return fake_fetch(url, max_bytes)
    monkeypatch.setattr(sync, '_fetch_http', fake_html)
    response = client.post('/v8/sync/stage', json={'source_id':'PSI-69','artifact_id':artifact['artifact_id']})
    assert response.status_code == 422
    assert not sync.STAGED_DIR.exists()


def test_strict_request_rejects_unexpected_fields(isolated):
    response = client.post('/v8/sync/check', json={'source_id':'PSI-69','url':'https://example.com'})
    assert response.status_code == 422


def test_phase8_does_not_change_existing_research_apis(isolated):
    assert client.get('/v2/status').status_code == 200
    assert client.get('/v3/evidence/PSI-69-20CAL10').status_code == 200
    assert client.get('/v5/passports/PSI-25-B1').status_code == 200
    assert client.post('/v6/ask', json={'question':'What was the burn time of FLEX test 20CAL10?'}).status_code == 200
    assert client.get('/v7/readiness').status_code == 200


def test_security_headers_applied_to_new_endpoint(isolated):
    response = client.get('/v8/sync/status')
    assert response.headers['cache-control'] == 'no-store'
    assert response.headers['x-content-type-options'] == 'nosniff'


def test_invalid_source_id_blocked(isolated):
    assert client.post('/v8/sync/check', json={'source_id':'PSI-999'}).status_code == 422


def test_refuses_unknown_manifest_values(isolated):
    assert sync._read_status() == {}
    sync.STATUS_PATH.write_text('not json', encoding='utf-8')
    assert sync._read_status() == {}



def test_staged_csv_preview_matches_and_detects_differences(isolated):
    local_record = next(r for r in sync.get_records() if r.id == 'PSI-69-20CAL10')
    from io import StringIO
    import csv
    data = StringIO()
    writer = csv.DictWriter(data, fieldnames=list(local_record.raw_fields))
    writer.writeheader()
    writer.writerow(local_record.raw_fields)
    mutated = dict(local_record.raw_fields)
    mutated['Burn time; s'] = '999'
    writer.writerow(mutated)
    mutated['FLEX Identifier'] = 'UNKNOWN_CANDIDATE'
    writer.writerow(mutated)
    content = data.getvalue().encode('utf-8')
    target = sync.STAGED_DIR / 'PSI-69_aaaaaaaaaaaaaaaa_bbbbbbbbbbbb.csv'
    sync.STAGED_DIR.mkdir(parents=True)
    target.write_bytes(content)
    sync._atomic_json(sync.STAGED_DIR / 'staged_manifest.json', {
        target.name:{'source_id':'PSI-69','filename':target.name,'sha256':hashlib.sha256(content).hexdigest()}
    })
    preview = client.get('/v8/sync/preview/' + target.name)
    assert preview.status_code == 200
    results = preview.json()
    assert results['supported'] is True
    assert results['diffs'][0]['status'] == 'matching_shared_fields'
    assert results['diffs'][1]['status'] == 'different_raw_values'
    assert results['diffs'][1]['changed_fields'][0]['column'] == 'Burn time; s'
    assert results['diffs'][2]['status'] == 'candidate_new_test_id'
    assert client.get('/v2/status').json()['imported_record_count'] == 6


def test_untrusted_preview_filename_rejected(isolated):
    assert client.get('/v8/sync/preview/not_existing.csv').status_code == 422


def test_preview_refuses_modified_staged_content(isolated):
    target = sync.STAGED_DIR / 'test.csv'
    sync.STAGED_DIR.mkdir(parents=True)
    target.write_bytes(b'FLEX Identifier\n20CAL10\n')
    sync._atomic_json(sync.STAGED_DIR / 'staged_manifest.json', {
        target.name:{'source_id':'PSI-69','filename':target.name,'sha256':'0'*64}
    })
    assert client.get('/v8/sync/preview/' + target.name).status_code == 422
