"""Idempotent, dry-run-first, additive Phase 7 integration. Never writes to data/."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / ".phase7_backup"


def build_edits() -> dict[Path, str]:
    main = ROOT / "backend/main.py"
    app = ROOT / "frontend/src/App.tsx"
    if not main.is_file() or not app.is_file():
        raise FileNotFoundError("Existing backend/main.py or frontend/src/App.tsx missing")
    edits: dict[Path, str] = {}
    old = main.read_text(encoding="utf-8")
    if "app.include_router(phase6_router)" not in old:
        raise ValueError("Expected Phase 6 router missing; do not overwrite existing backend")
    if "app.include_router(phase7_router)" not in old:
        old = old.rstrip() + (
            "\n\nfrom backend.phase7.routes import router as phase7_router\n"
            "app.include_router(phase7_router)\n"
        )
    if "install_security(app)" not in old:
        old = old.rstrip() + (
            "\n\nfrom backend.phase7.security import install_security\n"
            "install_security(app)\n"
        )
    edits[main] = old

    old = app.read_text(encoding="utf-8")
    anchor_import = "import { Sidebar } from './components/Sidebar';"
    if anchor_import not in old:
        raise ValueError("React Sidebar import anchor missing; manual integration required")
    if "import { UiErrorBoundary }" not in old:
        old = old.replace(anchor_import, anchor_import + "\nimport { UiErrorBoundary } from './phase7/UiErrorBoundary';", 1)
    anchor_outlet = '<main className="main-content" id="main-content"><Outlet/></main>'
    wrapped_outlet = '<main className="main-content" id="main-content"><UiErrorBoundary key={location.pathname}><Outlet/></UiErrorBoundary></main>'
    if wrapped_outlet not in old:
        if old.count(anchor_outlet) != 1:
            raise ValueError("React Outlet anchor changed; stop and integrate manually")
        old = old.replace(anchor_outlet, wrapped_outlet, 1)
    edits[app] = old
    return edits


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    edits = build_edits()  # Validate all changes before writing any file.
    for path, updated in edits.items():
        relative = path.relative_to(ROOT)
        original = path.read_text(encoding="utf-8")
        if original == updated:
            print(f"UNCHANGED {relative}")
        elif args.dry_run:
            print(f"WOULD UPDATE {relative}")
        else:
            backup = BACKUP / relative
            backup.parent.mkdir(parents=True, exist_ok=True)
            if not backup.exists():
                shutil.copy2(path, backup)
            path.write_text(updated, encoding="utf-8")
            print(f"UPDATED {relative} (backup: {backup.relative_to(ROOT)})")
    print("SUCCESS: Phase 7 integration validated" if args.dry_run else "SUCCESS: Phase 7 integration complete")


if __name__ == "__main__":
    main()
