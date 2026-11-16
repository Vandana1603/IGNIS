"""Idempotent, additive integration for the original IGNIS Phase 4 files.

Run from IGNIS project root: python scripts/apply_phase5.py
Backups are written to .phase5_backup before any original is modified.
This script NEVER edits data/, Phase 2, or Phase 3.
"""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / ".phase5_backup"


def integrate(original: str, anchor: str, replacement: str, marker: str) -> tuple[Path, str] | None:
    path = ROOT / original
    if not path.is_file():
        raise FileNotFoundError(f"Expected existing Phase 4 file not found: {path}")
    content = path.read_text(encoding="utf-8")
    if marker in content:
        print(f"Already integrated: {original}")
        return None
    if content.count(anchor) != 1:
        raise ValueError(f"Expected integration anchor missing or repeated in {original}; do not overwrite manually edited code")
    return path, content.replace(anchor, replacement, 1)


def main():
    main_path = ROOT / "backend" / "main.py"
    if not main_path.is_file():
        raise FileNotFoundError("Run from the existing IGNIS root with backend/main.py")
    main_code = main_path.read_text(encoding="utf-8")
    if "app.include_router(phase2_router)" not in main_code or "app.include_router(phase3_router)" not in main_code:
        raise ValueError("Phase 2 and Phase 3 routers must already be integrated in backend/main.py")

    edits: list[tuple[Path, str]] = []
    if "app.include_router(phase5_router)" not in main_code:
        edits.append((main_path, main_code.rstrip() + "\n\nfrom backend.phase5.routes import router as phase5_router\napp.include_router(phase5_router)\n"))
    else:
        print("Already integrated: backend/main.py")

    passport = "frontend/src/pages/Passport.tsx"
    compare = "frontend/src/pages/Comparison.tsx"
    tasks = [
        (passport,
         "import { api } from '../lib/api';",
         "import { api } from '../lib/api';\nimport { PassportAuditPanel } from '../phase5/PassportAuditPanel';",
         "import { PassportAuditPanel }"),
        (passport,
         '    <div className="passport-meta">',
         '    <PassportAuditPanel recordId={record.id}/>\n    <div className="passport-meta">',
         '<PassportAuditPanel recordId='),
        (compare,
         "import { api } from '../lib/api';",
         "import { api } from '../lib/api';\nimport { ComparisonAuditPanel } from '../phase5/ComparisonAuditPanel';",
         "import { ComparisonAuditPanel }"),
        (compare,
         '    {busy && <div className="loading-line"',
         '    <ComparisonAuditPanel leftId={left} rightId={right}/>\n    {busy && <div className="loading-line"',
         '<ComparisonAuditPanel leftId='),
    ]
    # Merge edits per file in memory, validate all anchors before touching disk.
    staged: dict[Path, str] = {path: content for path, content in edits}
    for original, anchor, replacement, marker in tasks:
        path = ROOT / original
        if not path.is_file():
            raise FileNotFoundError(f"Missing original Phase 4 file: {original}")
        content = staged.get(path, path.read_text(encoding="utf-8"))
        if marker in content:
            print(f"Already integrated: {original} ({marker})")
            continue
        if content.count(anchor) != 1:
            raise ValueError(f"Unexpected Phase 4 file structure in {original}; expected anchor: {anchor!r}")
        staged[path] = content.replace(anchor, replacement, 1)

    for path, new_text in staged.items():
        old_text = path.read_text(encoding="utf-8")
        if old_text == new_text:
            continue
        relative = path.relative_to(ROOT)
        backup_path = BACKUP / relative
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        if not backup_path.exists():
            shutil.copy2(path, backup_path)
        path.write_text(new_text, encoding="utf-8")
        print(f"Patched: {relative} (original backed up to {backup_path.relative_to(ROOT)})")
    print("Phase 5 integration complete. Original NASA data and Phase 2/3 modules untouched.")


if __name__ == "__main__":
    main()
