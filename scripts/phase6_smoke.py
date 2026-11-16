"""Local smoke test. Requires imported Phase 2 FLEX data; no HTTP server needed."""
from backend.phase6.engine import ask
from backend.phase6.models import AskRequest


def main():
    examples = [
        ("What was the burn time of FLEX test 20CAL10?", "answered"),
        ("Which imported methanol tests ended in extinction?", "answered"),
        ("Compare burn times of 20CAL10 and 20CAL12", "answered"),
        ("How does airflow influence flame spread?", "abstained"),
        ("Which material is safest for a spacecraft?", "abstained"),
    ]
    for question, expected in examples:
        result = ask(AskRequest(question=question))
        assert result.status == expected, (question, result.status, expected)
        assert all(claim.evidence_ids for claim in result.observations + result.interpretations)
        print(f"{result.status.upper():9} {question}")
        print(f"  cited fields: {len(result.evidence)}; source records: {result.source_record_ids}")
    print("SUCCESS: Phase 6 evidence-grounded SI smoke checks passed")


if __name__ == "__main__":
    main()
