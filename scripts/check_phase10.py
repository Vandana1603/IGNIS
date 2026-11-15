"""Read-only verification of expanded evidence and optional RAG."""
import json
from pathlib import Path
from backend.phase3.retrieval import load_catalog, evidence_fields
from backend.phase10.rag import ask,status

records,sources,manifest=load_catalog()
ledger=json.loads((Path(__file__).resolve().parents[1]/'data/phase10/provenance.json').read_text())
assert len(records)==manifest['record_count']
assert all(r.id in ledger['record_sources'] for r in records)
assert all(len(evidence_fields(r,sources[r.source_id]))>0 for r in records)
answer=ask('What was the burn time of 20CAL10?')
assert answer['status']=='answered' and any(c['original_value']=='5' for c in answer['citations'])
refusal=ask('Which material is safest for spacecraft?')
assert refusal['status']=='abstained'
print(json.dumps({'total_records':len(records),'by_source':{s:sum(r.source_id==s for r in records) for s in sources},
 'evidence_query':'passed','abstention':'passed','remote_AI_available':status()['ai_available'],
 'provenance':'NASA technical-report checks are limited; consult data/phase10/provenance.json'},indent=2))
print('SUCCESS: read-only Phase 10 evidence checks passed')
