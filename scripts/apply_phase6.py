"""Idempotent, additive integration into the existing IGNIS backend + frontend.

Run from project root: python scripts/apply_phase6.py --dry-run
Then: python scripts/apply_phase6.py

This script never modifies NASA CSV/JSON data, Phase 2/3/5 code, or package.json.
"""
from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / ".phase6_backup"


def patches() -> dict[Path, str]:
    main = ROOT / "backend" / "main.py"
    app = ROOT / "frontend" / "src" / "App.tsx"
    sidebar = ROOT / "frontend" / "src" / "components" / "Sidebar.tsx"
    for path in (main, app, sidebar):
        if not path.is_file():
            raise FileNotFoundError(f"Required existing Phase 4/5 file missing: {path}")

    out: dict[Path, str] = {}
    body = main.read_text(encoding="utf-8")
    if not re.search(r"\bapp\s*=\s*FastAPI\s*\(", body):
        raise ValueError("backend/main.py: expected existing app = FastAPI(...)")
    if "app.include_router(phase6_router)" not in body:
        body = body.rstrip() + ("\n\nfrom backend.phase6.routes import router as phase6_router\n"
                               "app.include_router(phase6_router)\n")
    out[main] = body

    body = app.read_text(encoding="utf-8")
    if "<Route path=\"research\"" not in body:
        raise ValueError("frontend/src/App.tsx: existing Research route not found; manual integration required")
    if "from './phase6/ScientificInsights'" not in body:
        marker = "import { Research } from './pages/Research';"
        if marker not in body:
            raise ValueError("frontend/src/App.tsx: Research import anchor not found")
        body = body.replace(marker, marker + "\nimport { ScientificInsights } from './phase6/ScientificInsights';", 1)
    if 'path="insights"' not in body:
        marker = '<Route path="research" element={<Research/>}/>'
        if marker not in body:
            raise ValueError("frontend/src/App.tsx: Research route anchor not found")
        body = body.replace(marker, marker + '\n      <Route path="insights" element={<ScientificInsights/>}/>', 1)
    out[app] = body

    body = sidebar.read_text(encoding="utf-8")
    match = re.search(r"import\s*\{(?P<icons>[^}]+)\}\s*from\s*'lucide-react';", body, re.S)
    if match is None:
        raise ValueError("frontend/src/components/Sidebar.tsx: lucide-react import not found")
    icon_list = [icon.strip() for icon in match.group("icons").split(",") if icon.strip()]
    for icon in ("BrainCircuit", "Database"):
        if icon not in icon_list:
            icon_list.append(icon)
    replacement = "import {\n  " + ", ".join(icon_list) + ",\n} from 'lucide-react';"
    body = body[:match.start()] + replacement + body[match.end():]
    if "to: '/insights'" not in body:
        marker = "{ to: '/research', label: 'Research Intelligence', icon: Search },"
        if marker not in body:
            raise ValueError("frontend/src/components/Sidebar.tsx: Research nav anchor not found")
        body = body.replace(marker, marker + "\n  { to: '/insights', label: 'Scientific Insights', icon: BrainCircuit },", 1)
    out[sidebar] = body
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Validate integration anchors without writing")
    args = parser.parse_args()
    edits = patches()  # Validate all anchors before touching any file.
    for path, updated in edits.items():
        old = path.read_text(encoding="utf-8")
        relative = path.relative_to(ROOT)
        if old == updated:
            print(f"UNCHANGED {relative} (already integrated)")
            continue
        if args.dry_run:
            print(f"WOULD UPDATE {relative}")
            continue
        backup = BACKUP / relative
        backup.parent.mkdir(parents=True, exist_ok=True)
        if not backup.exists():
            shutil.copy2(path, backup)
        path.write_text(updated, encoding="utf-8")
        print(f"UPDATED {relative} (backup: {backup.relative_to(ROOT)})")
    print("SUCCESS: integration validation complete" if args.dry_run else "SUCCESS: additive Phase 6 integration complete")


if __name__ == "__main__":
    main()
