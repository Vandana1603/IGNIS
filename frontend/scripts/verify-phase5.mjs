/** Node 20+ read-only contract smoke checks; run while FastAPI is on port 8000. */
const ROOT = (process.env.IGNIS_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
async function get(path) {
  const response = await fetch(`${ROOT}${path}`);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
async function post(path, body) {
  const response = await fetch(`${ROOT}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
function check(ok, description) {
  if (!ok) throw new Error(`FAIL: ${description}`);
  console.log(`PASS: ${description}`);
}
try {
  const p = await get('/v5/passports/PSI-25-B1');
  check(p.record_id === 'PSI-25-B1', 'BASS-II passport loads');
  check(p.local_consistency === 'passed' && p.independent_nasa_verification === 'not_performed',
    'local integrity is not misrepresented as independent NASA verification');
  check(p.fields.some((f) => f.original_column === 'Air display' && f.original_value === '5'),
    'original instrument readout preserved');
  const cross = await post('/v5/compare', { left_id: 'PSI-25-B1', right_id: 'PSI-69-20CAL10' });
  check(cross.category === 'cross_investigation_blocked' && cross.numeric_pairs.length === 0,
    'cross-investigation numeric comparison blocked');
  const within = await post('/v5/compare', { left_id: 'PSI-69-20CAL10', right_id: 'PSI-69-20CAL12' });
  check(within.category === 'within_investigation_descriptive' &&
    within.context_checks.some((c) => c.original_column === 'Droplet initial diameter; mm' && c.relation === 'different_raw'),
    'FLEX differences explicitly flagged');
  console.log('SUCCESS: Phase 5 frontend/backend contract checks passed');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
