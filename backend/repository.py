
import json
from pathlib import Path

from backend.schemas import Source, Experiment


ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def read_json(filename):
    with (DATA / filename).open(
        encoding="utf-8"
    ) as file:
        return json.load(file)


def get_sources():
    return [
        Source.model_validate(item)
        for item in read_json("sources.json")
    ]


def get_experiments():
    return [
        Experiment.model_validate(item)
        for item in read_json("experiments.json")
    ]


def validate_catalog():
    sources = get_sources()
    experiments = get_experiments()

    source_ids = [s.id for s in sources]
    experiment_ids = [e.id for e in experiments]

    if len(source_ids) != len(set(source_ids)):
        raise ValueError("Duplicate source IDs")

    if len(experiment_ids) != len(set(experiment_ids)):
        raise ValueError("Duplicate experiment IDs")

    for experiment in experiments:
        if experiment.investigation_id not in source_ids:
            raise ValueError(
                f"Unknown investigation: "
                f"{experiment.investigation_id}"
            )

        if not experiment.source_locator.strip():
            raise ValueError(
                "Experiment is missing source locator"
            )
