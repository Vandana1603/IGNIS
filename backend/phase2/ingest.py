"""Offline PSI-table *transcription* importer. It never downloads from NASA.

Default: BASS-II alone. Add --include-flex to include the verified FLEX sample.
Accepts only curated CSV header schemas; don't pass an uninspected NASA download.
"""
import argparse
import csv
import hashlib
import json
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from backend.phase2.models import Metric, TestRecord

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "phase2"
RAW = DATA / "raw"

BASS_COLS = [
    "PI", "Test #", "Date", "GMT", "Sample #", "Fuel Sample Material",
    "Flow restrictor", "Fan display", "Air display",
    "Radiometer gain (1000 250 50 10)", "Total Frames Shot",
    "Calibrated initial O2 % by vol", "Calibrated final O2 % by vol",
    "Initial CO2 % by vol", "Final CO2 % by vol",
    "Initial CO (ppm)", "Final CO (ppm)",
]

FLEX_COLS = [
    "FLEX Test #", "FLEX Identifier", "Test Date", "Test GMT", "Fuel",
    "Ambient pressure; mmHg", "O2 initial ambient composition; mole fraction",
    "N2 initial ambient composition; mole fraction",
    "CO2 initial ambient composition; mole fraction",
    "He initial ambient composition; mole fraction",
    "Droplet initial diameter; mm", "Visible flame extinction diameter; mm",
    "Burning rate; mm2/s", "Burn time; s", "Test end",
]

# Key -> (exact curated column label, physical unit, min, max).
# BASS instrument display fields are intentionally not converted to physical velocity.
BASS_METRICS = {
    "calibrated_initial_o2_percent_by_volume": ("Calibrated initial O2 % by vol", "% vol", 0, 100),
    "calibrated_final_o2_percent_by_volume": ("Calibrated final O2 % by vol", "% vol", 0, 100),
    "initial_co2_percent_by_volume": ("Initial CO2 % by vol", "% vol", 0, 100),
    "final_co2_percent_by_volume": ("Final CO2 % by vol", "% vol", 0, 100),
}
FLEX_METRICS = {
    "ambient_pressure_mmhg": ("Ambient pressure; mmHg", "mmHg", 0, None),
    "initial_o2_mole_fraction": ("O2 initial ambient composition; mole fraction", "mole fraction", 0, 1),
    "initial_n2_mole_fraction": ("N2 initial ambient composition; mole fraction", "mole fraction", 0, 1),
    "initial_co2_mole_fraction": ("CO2 initial ambient composition; mole fraction", "mole fraction", 0, 1),
    "initial_he_mole_fraction": ("He initial ambient composition; mole fraction", "mole fraction", 0, 1),
    "initial_droplet_diameter_mm": ("Droplet initial diameter; mm", "mm", 0, None),
    "visible_flame_extinction_diameter_mm": ("Visible flame extinction diameter; mm", "mm", 0, None),
    "burning_rate_mm2_per_s": ("Burning rate; mm2/s", "mm^2/s", 0, None),
    "burn_time_s": ("Burn time; s", "s", 0, None),
}
EMPTY = {"", "none", "na", "n/a", "-", "—", "null"}


def sha_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def row_hash(row: dict[str, str]) -> str:
    return sha_bytes(json.dumps(row, sort_keys=True, ensure_ascii=False).encode("utf-8"))


def required(row: dict[str, str], key: str) -> str:
    value = row[key].strip()
    if not value or value.lower() in EMPTY:
        raise ValueError(f"Required field {key!r} is missing")
    return value


def number(row: dict[str, str], label: str, unit: str, lower, upper):
    raw = row[label].strip()
    if raw.lower() in EMPTY:
        return None
    try:
        dec = Decimal(raw)
    except InvalidOperation as e:
        raise ValueError(f"Invalid number {raw!r} in {label}") from e
    if not dec.is_finite():
        raise ValueError(f"Non-finite number in {label}")
    if (lower is not None and dec < lower) or (upper is not None and dec > upper):
        raise ValueError(f"Out-of-range {label}={raw}; expected {lower}..{upper}")
    return Metric(value=float(dec), unit=unit, original_column=label, original_value=raw)


def measurements(row, spec):
    result = {}
    for key, (label, unit, lo, hi) in spec.items():
        parsed = number(row, label, unit, lo, hi)
        if parsed is not None:
            result[key] = parsed
    return result


def read_curated(path: Path, fields: list[str]):
    if not path.is_file():
        raise FileNotFoundError(f"Curated source file missing: {path}")
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != fields:
            raise ValueError(f"Unexpected CSV headers in {path.name}.\nExpected: {fields}\nGot: {reader.fieldnames}")
        rows = []
        for line_number, row in enumerate(reader, start=2):
            if None in row:
                raise ValueError(f"Extra CSV columns at line {line_number} in {path.name}")
            clean = {k: (v or "").strip() for k, v in row.items()}
            if any(v == "" for v in (clean[fields[0]], clean[fields[1]])):
                raise ValueError(f"Missing primary identifier on line {line_number}")
            rows.append(clean)
    if not rows:
        raise ValueError(f"No rows in {path.name}")
    return rows


def iso_date(value: str):
    return datetime.strptime(value, "%m/%d/%Y").date().isoformat()


def import_bass(path: Path):
    records = []
    for row in read_curated(path, BASS_COLS):
        test_id = required(row, "Test #")
        limitations = [
            "Calibrated O2 % by vol is reproduced as named by NASA PSI; do not silently equate it with actual ambient O2.",
            "Fan display and Air display are preserved as instrument readouts, not interpreted as calibrated airflow velocity.",
            "No flame-spread rate or extinction time is reported in this curated PSI table excerpt.",
        ]
        if any(row[k].strip().startswith("-") for k in ("Initial CO (ppm)", "Final CO (ppm)")):
            limitations.append("A negative CO instrument reading is retained verbatim in raw_fields, not normalized as a physical concentration.")
        records.append(TestRecord(
            id=f"PSI-25-{test_id}", source_id="PSI-25", test_id=test_id,
            date=iso_date(required(row, "Date")),
            fuel_material_raw=required(row, "Fuel Sample Material"),
            experiment_type="solid_fuel", raw_fields=row,
            raw_row_sha256=row_hash(row), metrics=measurements(row, BASS_METRICS),
            instrument_displays={key: row[key] for key in ("Fan display", "Air display", "Flow restrictor", "GMT")},
            limitations=limitations,
        ))
    return records


def import_flex(path: Path):
    records = []
    for row in read_curated(path, FLEX_COLS):
        test_id = required(row, "FLEX Identifier")
        records.append(TestRecord(
            id=f"PSI-69-{test_id}", source_id="PSI-69", test_id=test_id,
            date=iso_date(required(row, "Test Date")),
            fuel_material_raw=required(row, "Fuel"),
            experiment_type="liquid_droplet", raw_fields=row,
            raw_row_sha256=row_hash(row), metrics=measurements(row, FLEX_METRICS),
            reported_test_end=required(row, "Test end"),
            limitations=[
                "The NASA PSI table alone does not establish causation between initial diameter and burn time.",
                "BASS-II solid-fuel and FLEX droplet metrics must not be combined into one flammability index.",
            ],
        ))
    return records


def assert_unique_ids(records: list[TestRecord]) -> None:
    ids = [r.id for r in records]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate experiment IDs; inspect CSV sources")


def build(bass_csv: Path, flex_csv: Path | None = None, output: Path | None = None):
    # Import fingerprints resolve against data/phase2/raw/, so keep input files there.
    for supplied in (bass_csv, flex_csv):
        if supplied is not None and supplied.resolve().parent != RAW.resolve():
            raise ValueError("Put curated CSV files in data/phase2/raw before importing")
    source_path = DATA / "sources.json"
    sources = json.loads(source_path.read_text(encoding="utf-8"))
    for item in sources:
        if not item["url"].startswith("https://psi.nasa.gov/") or not item["doi"].startswith("10.60555/"):
            raise ValueError("NASA PSI source URL or DOI missing/invalid")
    if {x["source_id"] for x in sources} != {"PSI-25", "PSI-69"}:
        raise ValueError("Expected official source catalog entries for PSI-25 and PSI-69")
    records = import_bass(bass_csv)
    used = {"PSI-25": bass_csv}
    if flex_csv:
        records += import_flex(flex_csv)
        used["PSI-69"] = flex_csv
    assert_unique_ids(records)
    records.sort(key=lambda rec: (rec.source_id, rec.test_id))
    if output is None:
        output = DATA / "experiments.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = [r.model_dump(mode="json") for r in records]
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    manifest = {
        "record_count": len(records),
        "source_files": {key: p.name for key, p in used.items()},
        "file_sha256": {key: sha_bytes(p.read_bytes()) for key, p in used.items()},
        "method": "manual_transcription_official_PSI_table",
        "note": "Integrity fingerprints of bundled curated CSVs; NOT proof of a direct NASA download or independent scientific verification.",
    }
    (output.parent / "import_manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return records, output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--include-flex", action="store_true", help="Also ingest manually curated PSI-69 FLEX rows")
    parser.add_argument("--bass-csv", type=Path, default=RAW / "psi25_bass_ii_curated.csv")
    parser.add_argument("--flex-csv", type=Path, default=RAW / "psi69_flex_curated.csv")
    args = parser.parse_args()
    rows, output = build(args.bass_csv, args.flex_csv if args.include_flex else None)
    print(f"Imported {len(rows)} curated rows: {output}")
    for row in rows:
        print(f"  {row.id} ({row.date})")


if __name__ == "__main__":
    main()
