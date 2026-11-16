/** Read-only live API E2E contract. Node 20+. Does not fetch NASA or modify data. */
const root = (process.env.IGNIS_API_ROOT || 'http://127.0.0.1:8000').replace(/\/$/, '');
const expected = ['PSI-25-B1', 'PSI-25-B3', 'PSI-25-B4', 'PSI-69-20CAL08', 'PSI-69-20CAL10', 'PSI-69-20CAL12'];
let passed = 0;
function check(ok, label) {
  if (!ok) throw new Error(`FAILED: ${label}`);
  passed += 1;
  console.log(`PASS ${String(passed).padStart(2, '0')}: ${label}`);
}
async function request(path, data) {
  const response = await fetch(root + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: data === undefined ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(15000),
  });
  const json = await response.json().catch(() => null);
  return { response, json };
}
async function ok(path, data) {
  const { response, json } = await request(path, data);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}: ${JSON.stringify(json)}`);
  return { response, json };
}

try {
  const readiness = await ok('/v7/readiness');
  check(readiness.json.status === 'ready' && readiness.json.independent_nasa_verification === 'not_performed', 'Readiness and provenance are explicit');
  check(readiness.response.headers.get('x-content-type-options') === 'nosniff', 'API nosniff header is present');
  check(readiness.response.headers.get('cache-control') === 'no-store', 'API no-store cache header is present');
  const { json: records } = await ok('/v2/experiments');
  const byId = new Map(records.map(r => [r.id, r]));
  check(expected.every(id => byId.has(id)), 'Six starter record IDs are present in the actual imported catalog');
  check(readiness.json.record_count === records.length, 'Readiness count equals catalog length');
  const { json: index } = await ok('/v3/index-status');
  check(index.indexed_record_count === records.length, 'Research index matches imported catalog');
  const { json: search } = await ok('/v3/search', { query: 'methanol extinction', match_mode: 'all_values', outcome: 'Extinction', limit: 10 });
  check(search.results.length === 2 && search.results.every(r => ['PSI-69-20CAL10', 'PSI-69-20CAL12'].includes(r.record_id)), 'Strict original-value search excludes disruption test');
  const { json: evidence } = await ok('/v3/evidence/PSI-69-20CAL10');
  const original = evidence.evidence_fields.find(f => f.field_name === 'Burn time; s' && f.evidence_kind === 'transcribed_table_field');
  check(original && original.original_value === byId.get('PSI-69-20CAL10').raw_fields['Burn time; s'], 'Search evidence equals raw imported source field');
  const { json: passport } = await ok('/v5/passports/PSI-69-20CAL10');
  check(passport.local_consistency === 'passed' && passport.independent_nasa_verification === 'not_performed', 'Passport distinguishes local hashes from independent NASA verification');
  const { json: trace } = await ok(`/v5/passports/PSI-69-20CAL10/fields/${encodeURIComponent(original.evidence_id)}`);
  check(trace.evidence_id === original.evidence_id && trace.original_value === original.original_value, 'Exact evidence ID resolves through field-level audit');
  const { json: blocked } = await ok('/v5/compare', { left_id: 'PSI-25-B1', right_id: 'PSI-69-20CAL10' });
  check(blocked.category === 'cross_investigation_blocked' && blocked.numeric_pairs.length === 0, 'Cross-investigation numeric comparison is blocked');
  const { json: comparison } = await ok('/v5/compare', { left_id: 'PSI-69-20CAL10', right_id: 'PSI-69-20CAL12' });
  check(comparison.category === 'within_investigation_descriptive' && comparison.numeric_pairs.every(p => p.interpretation === 'descriptive_only'), 'Same-investigation comparison is descriptive only');
  const { json: answer } = await ok('/v6/ask', { question: 'What was the burn time of FLEX test 20CAL10?' });
  check(answer.status === 'answered' && answer.evidence.some(e => e.evidence_id === original.evidence_id && e.original_value === original.original_value), 'SI answer cites the same exact original evidence ID');
  const cited = new Set(answer.evidence.map(e => e.evidence_id));
  check([...answer.observations, ...answer.interpretations].every(c => c.evidence_ids.length && c.evidence_ids.every(id => cited.has(id))), 'All SI claims resolve to returned evidence');
  const { json: abstention } = await ok('/v6/ask', { question: 'Which material is safest for spacecraft?' });
  check(abstention.status === 'abstained' && abstention.evidence.length === 0 && abstention.observations.length === 0, 'Safety recommendation request abstains without fabricated citations');
  const missing = await request('/v5/passports/NOT-A-REAL-RECORD');
  check(missing.response.status === 404, 'Unknown evidence passport returns 404');
  const invalid = await request('/v6/ask', { question: '  ' });
  check(invalid.response.status === 422, 'Invalid scientific question returns 422');
  console.log(`SUCCESS: ${passed} live API end-to-end checks passed; no NASA data were modified.`);
} catch (error) {
  console.error(`FAILURE after ${passed} checks:`, error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
