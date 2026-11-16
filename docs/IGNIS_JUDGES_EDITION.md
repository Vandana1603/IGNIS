# IGNIS — Judge-focused research upgrade

**Scope:** An additive UI/research-story enhancement for the existing IGNIS 2.2 codebase. No backend implementation, source CSV, import manifest, live sync behavior, algorithm, or laboratory simulator is changed.

## What a researcher can accomplish

- **Find a concrete observation quickly.** The homepage demonstrates two archived FLEX extinction tests, displaying the recorded burn-time values from `/v5/compare` after the Comparability Guard confirms matching original column names, units, and evidence IDs.
- **Investigate data provenance.** A click opens the existing Evidence Passport; the disclosure shows the two exact evidence IDs from the guard. Local integrity checks are not independent verification of the transcribed NASA source tables.
- **Understand relationships between investigations.** The Atlas in the guided mission groups related hardware and research themes. Each family is labelled with an actual count of locally imported records or "source context only". Shared apparatus does not establish equivalent physical conditions or enable cross-investigation numeric comparisons.
- **Identify research gaps responsibly.** The lunar context card explains that the current imported dataset does not contain partial-gravity experiments. It does not claim to model habitats, material ignition, or oxygen thresholds.

## How the finding is grounded

The original subset contains FLEX PSI-69 20CAL10 and 20CAL12, both with recorded test ending `Extinction`. The authoritative `/v5/compare` endpoint returns:

- Original column `Burn time; s` with `5` and `3.2`, in `s`.
- Different recorded ambient pressures and initial droplet diameters.
- Exact evidence IDs for both original table cells.
- `within_investigation_descriptive` plus limits on causal inference.

**The app computes no predictive fire-risk scores, correlations, causal effects, or operational recommendations.** If the required records or compatible measurements are missing or the guard cannot respond, the featured numbers are not shown.

## Hardware and research context (not additional imported evidence)

Based on the user-provided challenge considerations:

| Context family | Investigations | Shared context | Imported in IGNIS |
|---|---|---|---|
| Liquid droplets | FLEX, FLEX-2, CFI | Multi-user Droplet Combustion Apparatus in Combustion Integrated Rack | FLEX PSI-69 curated subset only |
| Flow duct (solid and gaseous fuels) | BASS, BASS-II, SPICE, SLICE | Microgravity Science Glovebox fan-driven duct | BASS-II PSI-25 curated subset only |
| Gaseous-flame research | ACME, BRE, CFI-G, E-FIELD Flames | ACME modular hardware in Combustion Integrated Rack | None |
| Aerosol/detection research | SAME, SAME-R, DAFT, DAFT-2 | Related smoke/dust measurement questions | None |

These groups are **research discovery context**, not results from those unimported experiments. The app points to the NASA PSI combustion search for further sources: https://psi.nasa.gov/physci/repo/search?q=combustion

Other official context:
- NASA Combustion Science: https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/
- NASA Researcher's Guide: https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/
- NASA PSI-25 BASS-II: https://psi.nasa.gov/physci/repo/data/investigations/PSI-25
- NASA PSI-69 FLEX: https://psi.nasa.gov/physci/repo/data/investigations/PSI-69

## How the design meets judging criteria

- **Impact** — A single scientific finding and its source context are directly inspectable; no unmeasured time-savings claims.
- **Creativity** — The existing interactive laboratory connects to the Atlas of related apparatus and investigations.
- **Validity** — No featured numerical result appears before the existing guard accepts it; each measurement has exact original-field evidence IDs.
- **Relevance** — Microgravity combustion evidence is connected to NASA's investigation families and the open research questions of future lunar exploration.
- **Presentation** — The homepage retains one main action and a prominent two-record comparison; the Atlas and Moon context remain inside the existing four-step mission rather than creating an overcrowded new page.

## Boundaries

1. All NASA records are a manually curated local subset. The source transcription has not been independently verified in this upgrade.
2. The Atlas records are contextual relationships, not automatically retrieved experiments.
3. The moon/partial-gravity gap means **absent from the imported IGNIS catalog**, not proof that no NASA research on partial gravity exists.
4. The existing laboratory is a **qualitative illustration**, not a validated combustion simulator.
5. No guarantee of judging outcome is asserted.
