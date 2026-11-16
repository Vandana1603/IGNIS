"""Read-only science & route verifier for the IGNIS judging upgrade."""
from fastapi.testclient import TestClient
from backend.main import app


def main() -> None:
    api = TestClient(app)
    rows = api.get('/v2/experiments')
    rows.raise_for_status()
    records = rows.json()
    assert len(records) >= 2, 'Need at least two imported records'
    selection = {r['test_id']: r for r in records if r['source_id'] == 'PSI-69'}
    if not all(t in selection for t in ('20CAL10', '20CAL12')):
        print('SKIP: Featured example not in this catalog; UI will use other validated extinction records or hide the finding.')
        return
    assert all(selection[t]['reported_test_end'] == 'Extinction' for t in ('20CAL10', '20CAL12'))
    result = api.post('/v5/compare', json={
        'left_id': selection['20CAL10']['id'], 'right_id': selection['20CAL12']['id'],
    })
    result.raise_for_status()
    comparison = result.json()
    assert comparison['category'] == 'within_investigation_descriptive'
    burn = next(x for x in comparison['numeric_pairs'] if x['original_column'] == 'Burn time; s')
    assert burn['unit'] == 's' and burn['interpretation'] == 'descriptive_only'
    for record, evidence in [('20CAL10', burn['left_evidence_id']), ('20CAL12', burn['right_evidence_id'])]:
        answer = api.get(f"/v3/evidence/{selection[record]['id']}")
        answer.raise_for_status()
        assert any(x['evidence_id'] == evidence for x in answer.json()['evidence_fields'])
    print('PASS: Original burn-time fields and both exact evidence IDs resolved.')
    print('PASS: Comparability Guard accepts descriptive display only.')
    print('SCOPE: Local curated NASA PSI subset; not independent verification of NASA source transcription.')


if __name__ == '__main__':
    main()
