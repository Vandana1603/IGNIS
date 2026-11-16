# IGNIS Phase 7 — Manual End-to-End Acceptance Checklist

**Use actual imported NASA PSI data. Do not insert placeholder scientific measurements to satisfy a visual test.**

## Scientific workflow

- [ ] Mission Overview shows the actual record and investigation counts from FastAPI, not hardcoded values.
- [ ] `methanol extinction` in original-value search mode returns FLEX `20CAL10` and `20CAL12`, not disruption test `20CAL08`.
- [ ] `PMMA` returns BASS-II B1 and B4, not B3 whose raw material field does not explicitly say PMMA.
- [ ] A search result opens the correct Evidence Passport with the original NASA table column, raw value, source URL, DOI, and exact evidence ID.
- [ ] The Evidence Passport explicitly says independent NASA verification was not performed.
- [ ] Cross-investigation BASS-II vs FLEX numeric comparison is blocked.
- [ ] FLEX `20CAL10` vs `20CAL12` shows context differences and only descriptive comparisons.
- [ ] SI answers `What was the burn time of FLEX test 20CAL10?` with original value `5 s` and source citation.
- [ ] SI abstains from `Which material is safest for spacecraft?` without creating an evidence citation.
- [ ] SI abstains from airflow/flame-spread causal claims unavailable in the imported subset.

## Browser and accessibility

- [ ] 390×844 mobile: open and close navigation, research search, SI form, evidence tables horizontally scroll within their own containers if needed.
- [ ] 768×1024 tablet: cards, controls, and sidebar do not obscure content.
- [ ] 1440×900 desktop: charts and comparison panels are readable.
- [ ] No document-level horizontal scrolling on the above viewports.
- [ ] Keyboard-only: Tab through search, filters, links, evidence controls, and navigation; visible focus states.
- [ ] Form labels are announced by a screen reader; alerts are accessible; source links identify destinations.
- [ ] Reduced-motion OS setting disables decorative animations.

## Failure handling

- [ ] Stop FastAPI while Vite is running: the frontend displays a visible API error, never fabricated data.
- [ ] Request a missing Evidence Passport: API returns 404, not a Python traceback.
- [ ] Submit an empty SI question: client prevents it or API returns 422.
- [ ] If the curated CSV is modified without reimport, the backend refuses to claim a valid catalog; restore the original file from version control before continuing.
- [ ] Restart FastAPI and verify recovery without clearing source data.

## Deployment and presentation

- [ ] Record a real, unedited demo of the working application and state the curated-subset scope.
- [ ] Include original PSI investigation URLs and DOIs in README and UI.
- [ ] Explain that ranking scores are application relevance heuristics, not physical risk measurements.
- [ ] Explain that deterministic SI is not a trained NASA scientific model.
- [ ] Verify deployed HTTPS URL and API proxy from another device before sharing.
- [ ] Capture a final `reports/phase7_qa.md` generated on your own machine.
