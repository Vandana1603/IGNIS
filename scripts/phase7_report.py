"""Generate an evidence-based IGNIS QA report from commands actually executed.

Run from project root, for example:
  python scripts/phase7_report.py --frontend --live --browser

Never edits data/. Never claims live NASA verification, a production security audit,
or a completed browser test unless the corresponding command really passed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "phase2"
REPORTS = ROOT / "reports"


def fingerprint() -> dict[str, str]:
    if not DATA.is_dir():
        raise FileNotFoundError("Existing data/phase2 folder missing; do not recreate it")
    files = sorted(p for p in DATA.rglob("*") if p.is_file())
    if not files:
        raise ValueError("data/phase2 contains no files")
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}


def run_step(name: str, command: list[str], cwd: Path, timeout: int = 240) -> dict:
    print(f"\n=== {name} ===", flush=True)
    print("Command:", " ".join(command), flush=True)
    try:
        result = subprocess.run(command, cwd=cwd, capture_output=True, text=True,
                                encoding="utf-8", errors="replace", timeout=timeout, check=False)
        output = (result.stdout or "") + (result.stderr or "")
        status = "passed" if result.returncode == 0 else "failed"
        print(output[-1800:], flush=True)
        return {
            "name": name, "status": status, "exit_code": result.returncode,
            "command": command, "working_directory": cwd.relative_to(ROOT).as_posix() if cwd != ROOT else ".",
            "output_tail": output[-3000:],
        }
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        message = f"{type(exc).__name__}: {exc}"
        print(message, flush=True)
        return {"name": name, "status": "failed", "exit_code": None,
                "command": command, "working_directory": str(cwd), "output_tail": message}


def not_run(name: str, reason: str) -> dict:
    return {"name": name, "status": "not_run", "reason": reason}


def md_report(report: dict) -> str:
    lines = [
        "# IGNIS — Phase 7 Evidence-Based QA Report", "",
        f"- Generated (UTC): {report['generated_at_utc']}",
        f"- Automated status: **{report['automated_status']}**",
        "- Dataset: existing local curated NASA PSI table excerpts only",
        "- Independent NASA row-by-row verification: **NOT PERFORMED**",
        "- Production deployment/security certification: **NOT PERFORMED**", "",
        "## Commands and observed results", "",
        "| Check | Result | Evidence |", "|---|---|---|",
    ]
    for step in report["checks"]:
        tail = step.get("output_tail", step.get("reason", ""))
        tail = tail.strip().splitlines()[-1] if tail.strip() else "—"
        tail = tail.replace("|", "\\|")[:180]
        lines.append(f"| {step['name']} | {step['status']} | {tail} |")
    lines += [
        "", "## Scientific data preservation", "",
        f"- Files hashed before checks: {len(report['input_sha256_before'])}",
        f"- Input files unchanged after checks: **{report['input_files_unchanged']}**",
        "- SHA-256 values are in `phase7_qa.json` for reproducibility.",
        "- Hash consistency does not independently validate a manual transcription against NASA's live tables.",
        "", "## Mandatory manual sign-off (not automatically passed)", "",
        "- [ ] Compare the curated CSV cells with NASA's official PSI-25 and PSI-69 Experimental Tables.",
        "- [ ] Visually inspect research, explorer, comparison, passport, and SI pages on phone and desktop.",
        "- [ ] Verify real deployed URL, HTTPS, correct API origin/proxy, and no leaked secrets.",
        "- [ ] Review accessibility, dependency advisories, licenses, and hosting security controls.",
        "- [ ] Rehearse the demo offline/failure mode and check all citations before submission.",
        "", "## Interpretation", "",
        "A passing automated report means only the listed checks ran and returned success in this environment. "
        "It does not certify scientific correctness, production security, accessibility, or NASA endorsement.", "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frontend", action="store_true", help="Run npm typecheck, unit tests, and production build")
    parser.add_argument("--dependencies", action="store_true", help="Run pip check in the selected Python environment")
    parser.add_argument("--live", action="store_true", help="Check running FastAPI at 127.0.0.1:8000 using Node")
    parser.add_argument("--browser", action="store_true", help="Run installed Playwright against running Vite and FastAPI")
    args = parser.parse_args()
    before = fingerprint()
    checks = [run_step("Complete Python test suite", [sys.executable, "-m", "pytest", "-q", "tests"], ROOT, 240)]
    if args.dependencies:
        checks.append(run_step("Python dependency consistency", [sys.executable, "-m", "pip", "check"], ROOT, 90))
    else:
        checks.append(not_run("Python dependency consistency", "Use --dependencies to run pip check"))
    frontend = ROOT / "frontend"
    npm = "npm.cmd" if platform.system() == "Windows" else "npm"
    node = "node.exe" if platform.system() == "Windows" else "node"
    if args.frontend:
        for name, command in (
            ("Frontend TypeScript", [npm, "run", "typecheck"]),
            ("Frontend unit tests", [npm, "run", "test"]),
            ("Frontend production build", [npm, "run", "build"]),
        ):
            checks.append(run_step(name, command, frontend, 240))
    else:
        checks.extend(not_run(name, "Use --frontend to run") for name in (
            "Frontend TypeScript", "Frontend unit tests", "Frontend production build"))
    if args.live:
        checks.append(run_step("Live API E2E contract", [node, "scripts/verify-phase7.mjs"], frontend, 120))
    else:
        checks.append(not_run("Live API E2E contract", "Start FastAPI and use --live"))
    if args.browser:
        executable = frontend / "node_modules" / ".bin" / ("playwright.cmd" if platform.system() == "Windows" else "playwright")
        if not executable.exists():
            checks.append({"name": "Chromium browser E2E", "status": "failed", "exit_code": None,
                           "output_tail": "Playwright not installed; run npm install -D @playwright/test then npx playwright install chromium"})
        else:
            checks.append(run_step("Chromium browser E2E", [str(executable), "test", "--config=playwright.config.ts"], frontend, 240))
    else:
        checks.append(not_run("Chromium browser E2E", "Start FastAPI and Vite; use --browser"))
    after = fingerprint()
    unchanged = before == after
    checks.append({"name": "NASA input files unchanged", "status": "passed" if unchanged else "failed",
                   "output_tail": "SHA-256 fingerprints identical" if unchanged else "Source files changed during QA"})
    failed = any(item["status"] == "failed" for item in checks)
    skipped = any(item["status"] == "not_run" for item in checks)
    status = "failed" if failed else "incomplete_optional_checks_not_run" if skipped else "automated_checks_passed_manual_review_pending"
    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "automated_status": status,
        "environment": {"python": sys.version.split()[0], "os": platform.platform()},
        "checks": checks,
        "input_files_unchanged": unchanged,
        "input_sha256_before": before,
        "input_sha256_after": after,
        "independent_nasa_verification": "not_performed",
        "public_deployment_verified": False,
        "manual_review_completed": False,
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    json_path = REPORTS / "phase7_qa.json"
    md_path = REPORTS / "phase7_qa.md"
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    md_path.write_text(md_report(report), encoding="utf-8")
    print(f"\nQA report: {json_path}\nHuman-readable report: {md_path}\nStatus: {status}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
