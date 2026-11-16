"""Read-only smoke test for Phase 8. Requires installed backend Python dependencies.

Run from IGNIS root: python -m scripts.phase8_smoke
Optional --live triggers an actual NASA source check and may report unavailable.
"""
import sys
from fastapi.testclient import TestClient
from backend.main import app


def main():
    with TestClient(app) as client:
        for path in ['/v2/status','/v3/index-status','/v5/passports/PSI-69-20CAL10',
                     '/v7/readiness','/v8/sync/status','/v8/sync/staged']:
            result = client.get(path)
            assert result.status_code == 200, f'{path} -> {result.status_code}: {result.text[:160]}'
            print(f'PASS {path}')
        status = client.get('/v8/sync/status').json()
        assert status['imported_from_remote_sync'] == 0
        print('PASS No remote data silently inserted into the scientific catalog')
        if '--live' in sys.argv:
            result = client.post('/v8/sync/check', json={'source_id':'PSI-69'})
            assert result.status_code == 200, result.text
            source = next(s for s in result.json()['sources'] if s['source_id'] == 'PSI-69')
            print(f"NASA PSI-69 live check: {source['state']} at {source['last_checked_utc']}")
            if source['error']:
                print('NASA source check failed gracefully:', source['error'])
    print('SUCCESS: Phase 8 local integration checks passed.')


if __name__ == '__main__':
    main()
