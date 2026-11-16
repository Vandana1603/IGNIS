# IGNIS — Judge's Edition: 150-second walkthrough

Use two terminals with FastAPI (`python -m uvicorn backend.main:app --reload`) and React (`npm run dev`) running. Keep an alternative recorded demonstration in case NASA's public website is unavailable.

**0:00–0:20 — Research problem.** Open `/` and say: “NASA has rich combustion experiments, but a researcher must check the original conditions before treating two measurements as comparable.” Point to the **same ending / different starting conditions** featured finding. Do not claim automated scientific discoveries.

**0:20–0:50 — Show the actual data.** In the homepage finding, open both Evidence Passports. Highlight `20CAL10`, `20CAL12`, recorded burn times, units, the source DOI, and original field evidence IDs. Explain that both reported extinction, but their starting conditions differed.

**0:50–1:15 — Visualize the apparatus.** Open `/laboratory`, choose FLEX, interact with the qualitative setup, and show a source-linked field. Switch to BASS-II to explain why one cannot combine liquid-droplet and solid-fuel measures indiscriminately. Explicitly label animations illustrative.

**1:15–1:40 — Scientific comparison.** Open Comparison Lab for the two FLEX records and show the exact context differences. State: “IGNIS allows a descriptive side-by-side observation, but does not attribute burn time to a single variable.”

**1:40–2:00 — Broader research connections.** Open `/mission`, expand “Discover related NASA investigations”, select Droplets, Flow duct, and Smoke & dust. Point out which records are actually imported and which are research context only.

**2:00–2:20 — Why the research matters.** Choose mission step 4, show the Moon research-gap panel, and say: “We can help people navigate existing microgravity evidence, but this imported catalog doesn't contain lunar partial-gravity tests. IGNIS does not predict lunar fire behavior.”

**2:20–2:30 — End with scientific credibility.** Run the existing SI abstention: “Which material is safest for a spacecraft?” It refuses unsupported operational advice. Close: **“IGNIS makes evidence accessible without hiding the limits of what it proves.”**

## Honest answers to expected judging questions

**Are these real NASA data?** The values are from a small manually curated subset of official NASA PSI investigation tables. The software checks local row and file integrity; independent re-verification of NASA originals has not been performed.

**Is the lab a physically accurate simulator?** No. It is a qualitative apparatus illustration, intentionally separate from experimental measurements.

**Does Live Research Sync stream ISS sensors?** No. It checks public NASA source pages on demand and stages discoverable files for review. It is not live ISS telemetry.

**Why only six test records?** The current validated importer was scoped to three BASS-II and three FLEX tests. The interface supports additional properly validated imports, but we do not mislabel unimported investigations as experimental evidence.

**What is the contribution?** A single reproducible workflow connecting source-linked search, apparatus context, original evidence, experimental comparability, and explicit abstention.
