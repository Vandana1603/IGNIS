/** Read-only integration smoke test against the user's actual running FastAPI backend. */
import assert from 'node:assert/strict';

const origin = (process.env.IGNIS_API_ORIGIN || 'http://127.0.0.1:8000').replace(/\/$/, '');

async function api(path, body) {
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} — ${await response.text()}`);
  return response.json();
}

function passed(message) { console.log(`PASS  ${message}`); }

try {
  console.log(`IGNIS Phase 4 API integration check → ${origin}`);
  const [sources, records, status, ranking] = await Promise.all([
    api('/v2/sources'), api('/v2/experiments'), api('/v3/index-status'), api('/v3/ranking-method'),
  ]);
  assert.ok(Array.isArray(sources) && sources.length > 0, 'No source records returned');
  assert.ok(Array.isArray(records) && records.length > 0, 'No imported test records returned');
  assert.equal(status.indexed_record_count, records.length, 'Phase 2 / Phase 3 catalog count mismatch');
  assert.equal(ranking.name, 'field_weighted_idf_v1');
  assert.equal(ranking.no_semantic_inference, true);
  passed(`Catalog: ${records.length} imported tests, ${sources.length} source entries`);
  passed('Ranking method is transparent and marked non-semantic');

  const sample = records[0];
  assert.ok(sample.id && sample.test_id && sample.source_id && sample.raw_fields && sample.metrics);
  const source = sources.find((s) => s.source_id === sample.source_id);
  assert.ok(source && new URL(source.url).hostname === 'psi.nasa.gov');
  for (const metric of Object.values(sample.metrics)) {
    assert.equal(sample.raw_fields[metric.original_column], metric.original_value,
      `Metric original value mismatch in ${sample.id}`);
  }
  passed(`Original normalized measurements agree with raw table fields for ${sample.id}`);

  const [passport, evidence] = await Promise.all([
    api(`/v2/evidence-passports/${encodeURIComponent(sample.id)}`),
    api(`/v3/evidence/${encodeURIComponent(sample.id)}`),
  ]);
  assert.equal(passport.record.id, sample.id);
  assert.equal(passport.source.source_id, sample.source_id);
  assert.equal(evidence.record_id, sample.id);
  assert.ok(evidence.evidence_fields.some((f) => f.evidence_kind === 'transcribed_table_field'));
  for (const field of evidence.evidence_fields.filter((f) => f.evidence_kind === 'transcribed_table_field')) {
    assert.equal(field.original_value, sample.raw_fields[field.field_name]);
  }
  passed(`Evidence Passport and ${evidence.field_count} source-linked evidence fields`);

  const search = await api('/v3/search', { query: sample.test_id, match_mode: 'all_values', limit: 50 });
  assert.ok(search.results.some((r) => r.record_id === sample.id), 'Search cannot find original test identifier');
  assert.ok(search.results.every((r) => r.evidence_passport_url.startsWith('/v2/evidence-passports/')));
  passed(`Search locates imported test ${sample.id} with traceable results`);

  const partner = records.find((r) => r.source_id === sample.source_id && r.id !== sample.id);
  if (partner) {
    const comparison = await api('/v2/compare', { left_id: sample.id, right_id: partner.id });
    assert.equal(comparison.category, 'within_investigation_descriptive');
    assert.ok(Array.isArray(comparison.warnings));
    passed(`Comparability Guard checks ${sample.test_id} vs ${partner.test_id}`);
  } else {
    console.log('SKIP  Comparison test (no second test from same investigation)');
  }

  console.log('\nSUCCESS: Read-only frontend API contract checks passed.');
} catch (error) {
  console.error('\nFAIL: Frontend API contract verification did not pass.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
