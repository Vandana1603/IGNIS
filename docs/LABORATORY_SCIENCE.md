# IGNIS — Microgravity Laboratory: Scientific Basis & Scope

## Where the evidence comes from

IGNIS reads its test records from the already imported, locally curated subsets of NASA's Physical Sciences Informatics (PSI) repository:

- **Solid fuel:** BASS-II, NASA PSI-25, DOI `10.60555/4qc4-de67`. Original investigation: https://psi.nasa.gov/physci/repo/data/investigations/PSI-25
- **Liquid fuel:** FLEX, NASA PSI-69, DOI `10.60555/mbq8-0451`. Original investigation: https://psi.nasa.gov/physci/repo/data/investigations/PSI-69

The original starter catalog includes BASS-II test IDs B1, B3, B4 and FLEX test IDs 20CAL08, 20CAL10, 20CAL12. There are only three currently *imported* experiments per investigation; this is not a limit on NASA's research or on IGNIS's dynamically generated test selector. The separate repository-sync feature can discover source files for staging. Discovery/staging is not the same thing as scientific verification and import.

The UI obtains records from existing `/v2/experiments`, field trace IDs from `/v3/evidence/{id}`, and sources from `/v2/sources`. It does not modify original NASA data or infer missing values. Future correctly validated/imported records will appear automatically in the test selector.

## Which parts of the lab are scientific and which are illustrative?

**Documented apparatus concepts**

- BASS-II: solid sample in an airflow duct in the ISS Microgravity Science Glovebox. A fan supplies forced flow; imaging helps observe combustion. Different test conditions and configurations are possible.
- FLEX: liquid-droplet flame investigations in the Combustion Integrated Rack's Multi-user Droplet Combustion Apparatus. Low-buoyancy droplet flames can have approximately round symmetry.

**Illustrative visual model, not a predictive simulation**

- Seventy-two deterministic SVG gas-marker positions are available for display; some may be occluded by the droplet or scene labels.
- A round glow for a liquid droplet and a flow-affected flame silhouette for a solid strip are qualitative teaching illustrations, not NASA-recorded flame geometry.
- Particle motion is a CSS animation. Particle locations, densities, path, velocities and apparent temperature/color are *not experimental measurements*.
- Play/Pause/Reset controls animate a **normalized presentation timeline**. The progress bar is not elapsed experiment time and is not calculated from recorded burn time.
- Choosing a different NASA test changes original evidence and recorded values, **not computed flame growth or extinction dynamics**.
- A field labeled `Fan display` cannot be interpreted as an air velocity without a documented calibration; the model never does so.
- Reported FLEX outcome `Disruption` or `Extinction` comes from `Test end` and is displayed as a record, not enacted as an invented visual event.
- More visual gas particles do **not** mean more experimental records, higher concentrations or greater combustion intensity.

## Scientific documentation sources

- NASA PSI BASS-II: https://psi.nasa.gov/physci/repo/data/investigations/PSI-25
- NASA PSI FLEX: https://psi.nasa.gov/physci/repo/data/investigations/PSI-69
- NASA ISS combustion overview: https://www.nasa.gov/missions/station/iss-research/studying-combustion-and-fire-safety/
- NASA BASS-II technical report: https://ntrs.nasa.gov/citations/20210011385
- NASA Glenn FLEX apparatus: https://gipoc.grc.nasa.gov/wp/fcf-cir/flex/

If a team later implements quantitative physics, that would require a separately documented mathematical model, input ranges, calibration, experimental validation, error analysis, and clearly distinguished predictions.

## Why the feature matters to people

- **Researchers:** find tests, inspect original recorded conditions, identify comparability caveats, open a field's evidence ID and direct source. This can reduce friction in early literature/data exploration; no measured user-time improvement is claimed.
- **Students and educators:** see why gravity, surrounding gas, fuel state and forced flow matter conceptually while separating drawings from source measurements.
- **Safety engineers:** navigate relevant primary research and methodological limitations. No material ranking, fire-risk score, design certification, or operational spacecraft recommendation is made.
- **The public:** understand research on the ISS in a source-linked interactive format without requiring access to research data tooling.

The result is a visually intuitive research *explorer*, not a substitute for full scientific datasets, validated models, or safety engineering judgment.
