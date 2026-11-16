"""Read-only checks that primary NASA data remain untouched by IGNIS 2.1 UI changes."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = ROOT / 'docs' / 'phase9_data_hashes.json'

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main() -> None:
    expected = json.loads(EXPECTED.read_text('utf-8'))
    for name, digest in expected.items():
        path = ROOT / name
        if not path.is_file():
            raise SystemExit(f'MISSING: {name}')
        if sha(path) != digest:
            raise SystemExit(f'CHANGED: {name} (review source changes before using the old QA evidence)')
        print('UNCHANGED:', name)
    for name in ['frontend/src/pages/MissionExperience.tsx', 'frontend/src/pages/SourceLibrary.tsx', 'frontend/src/pages/mission.css']:
        if not (ROOT / name).is_file():
            raise SystemExit(f'MISSING FRONTEND: {name}')
    print(f'SUCCESS: {len(expected)} original NASA/catalog files unchanged; new source-grounded UI files present.')

if __name__ == '__main__':
    main()
