/** Read-only contract checks against the running FastAPI /v6 API. */
const root = process.env.IGNIS_API_ROOT || 'http://127.0.0.1:8000';

async function get(path) {
  const response = await fetch(root + path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
async function ask(question) {
  const response = await fetch(root + '/v6/ask', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) throw new Error(`Ask HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}
function check(condition, message) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  console.log('PASS:', message);
}

const status = await get('/v6/status');
check(status.imported_record_count === 6, 'Six existing curated test records are indexed');
check(status.generative_model_used === false, 'No generative model used');
const cap = await get('/v6/capabilities');
check(cap.nasa_network_download === false, 'No NASA download is performed by SI');
const direct = await ask('What was the burn time of FLEX test 20CAL10?');
check(direct.status === 'answered', 'Direct source field lookup works');
check(direct.evidence.some(e => e.field_name === 'Burn time; s' && e.original_value === '5'), 'Original burn-time value preserved');
check(direct.observations.every(c => c.evidence_ids.every(id => direct.evidence.some(e => e.evidence_id === id))), 'Every observation has valid evidence IDs');
const outcome = await ask('Which imported methanol tests ended in extinction?');
check(outcome.status === 'answered' && outcome.source_record_ids.length === 2, 'Exact extinction outcomes returned');
check(!outcome.source_record_ids.includes('PSI-69-20CAL08'), 'Disruption record excluded');
const compared = await ask('Compare burn times of 20CAL10 and 20CAL12');
check(compared.status === 'answered' && compared.interpretations.length === 1, 'Descriptive comparison with qualified interpretation');
const refuse = await ask('Does a larger droplet cause a longer burn time?');
check(refuse.status === 'abstained' && refuse.evidence.length === 0, 'Causal question abstains');
console.log('SUCCESS: Phase 6 read-only API contract checks passed.');
