# IGNIS — Phase 7 Evidence-Based QA Report

- Generated (UTC): 2026-11-14T10:39:31.812121+00:00
- Automated status: **failed**
- Dataset: existing local curated NASA PSI table excerpts only
- Independent NASA row-by-row verification: **NOT PERFORMED**
- Production deployment/security certification: **NOT PERFORMED**

## Commands and observed results

| Check | Result | Evidence |
|---|---|---|
| Complete Python test suite | passed | 97 passed, 1 warning in 2.14s |
| Python dependency consistency | passed | No broken requirements found. |
| Frontend TypeScript | passed | > tsc -b |
| Frontend unit tests | failed | [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m |
| Frontend production build | passed | - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m |
| Live API E2E contract | passed | SUCCESS: 17 live API end-to-end checks passed; no NASA data were modified. |
| Chromium browser E2E | failed | Playwright not installed; run npm install -D @playwright/test then npx playwright install chromium |
| NASA input files unchanged | passed | SHA-256 fingerprints identical |

## Scientific data preservation

- Files hashed before checks: 5
- Input files unchanged after checks: **True**
- SHA-256 values are in `phase7_qa.json` for reproducibility.
- Hash consistency does not independently validate a manual transcription against NASA's live tables.

## Mandatory manual sign-off (not automatically passed)

- [ ] Compare the curated CSV cells with NASA's official PSI-25 and PSI-69 Experimental Tables.
- [ ] Visually inspect research, explorer, comparison, passport, and SI pages on phone and desktop.
- [ ] Verify real deployed URL, HTTPS, correct API origin/proxy, and no leaked secrets.
- [ ] Review accessibility, dependency advisories, licenses, and hosting security controls.
- [ ] Rehearse the demo offline/failure mode and check all citations before submission.

## Interpretation

A passing automated report means only the listed checks ran and returned success in this environment. It does not certify scientific correctness, production security, accessibility, or NASA endorsement.
