"""Run from project root: python -m scripts.phase3_smoke"""
from backend.phase3.models import SearchRequest
from backend.phase3.retrieval import get_index_status, search


def main():
    status = get_index_status()
    print(f"Validated {status.indexed_record_count} imported test records: {', '.join(status.investigations)}")
    result = search(SearchRequest(query="methanol extinction", match_mode="all_values"))
    print(f"Query: {result.query!r} | {result.total_matches} original-value matches")
    for row in result.results:
        print(f"  {row.record_id}: relevance={row.relevance_score}; matched={row.matched_terms}")
        for evidence in row.evidence_matches:
            if "extinction" in evidence.matched_terms:
                f = evidence.evidence
                print(f"    {f.field_name} = {f.original_value!r} | {f.source_locator}")
    print("Retrieval-only; no scientific conclusion or fire-risk score generated.")


if __name__ == "__main__":
    main()
