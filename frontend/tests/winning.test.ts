import { describe, expect, it } from 'vitest';
import type { TestRecord, Metric } from '../src/lib/types';
import type { AdvancedCompareResponse } from '../src/phase5/types';
import { chooseExtinctionPair, supportedBurnTimePair, differentRecordedConditions, importedFamilyCount } from '../src/winning/science';

// These are synthetic TEST FIXTURES only. No frontend production code embeds test values.
const burn: Metric = { value: 7, unit: 's', original_column: 'Burn time; s', original_value: '7' };
function record(testId: string, outcome: string | null, source: 'PSI-69' | 'PSI-25' = 'PSI-69'): TestRecord {
  return {
    id: `${source}-${testId}`, source_id: source, test_id: testId,
    date: '', fuel_material_raw: '', experiment_type: source === 'PSI-69' ? 'liquid_droplet' : 'solid_fuel',
    raw_fields: {}, raw_row_sha256: '', metrics: { burn_time_s: burn }, instrument_displays: {},
    reported_test_end: outcome, limitations: [],
  };
}
const base: AdvancedCompareResponse = {
  left_id: 'PSI-69-20CAL10', right_id: 'PSI-69-20CAL12',
  category: 'within_investigation_descriptive', context_status: 'different_recorded_fields',
  local_provenance_checked: true, notices: [], excluded_metrics: [],
  context_checks: [{
    original_column: 'Ambient pressure; mmHg', role: 'recorded_context',
    left_raw: '762', right_raw: '764.2', relation: 'different_raw',
    left_evidence_id: 'left-citation', right_evidence_id: 'right-citation', note: 'Recorded conditions differ',
  }],
  numeric_pairs: [{
    key: 'burn_time_s', original_column: 'Burn time; s', unit: 's',
    left_value: 5, right_value: 3.2, left_original_value: '5', right_original_value: '3.2',
    left_evidence_id: 'left-citation', right_evidence_id: 'right-citation', interpretation: 'descriptive_only',
  }],
};
describe('judge-ready source-grounded findings', () => {
  it('chooses the two genuine extinction rows, excluding a disruption record', () => {
    const picked = chooseExtinctionPair([record('20CAL08', 'Disruption'), record('20CAL12', 'Extinction'), record('20CAL10', 'Extinction')]);
    expect(picked?.map(r => r.test_id)).toEqual(['20CAL10', '20CAL12']);
  });
  it('does not fabricate a second record when only one is available', () => {
    expect(chooseExtinctionPair([record('20CAL10', 'Extinction')])).toBeNull();
  });
  it('ignores other investigations and unsuitable outcomes', () => {
    expect(chooseExtinctionPair([record('20CAL10', 'Extinction'), record('B3', 'Extinction', 'PSI-25')])).toBeNull();
  });
  it('requires original same-definition evidence IDs and guard approval', () => {
    expect(supportedBurnTimePair(base, base.left_id, base.right_id)?.unit).toBe('s');
    expect(supportedBurnTimePair({ ...base, local_provenance_checked: false }, base.left_id, base.right_id)).toBeNull();
    expect(supportedBurnTimePair({ ...base, category: 'cross_investigation_blocked' }, base.left_id, base.right_id)).toBeNull();
    expect(supportedBurnTimePair(base, base.right_id, base.left_id)).toBeNull();
    expect(supportedBurnTimePair({ ...base, numeric_pairs: [{ ...base.numeric_pairs[0], left_evidence_id: '' }] }, base.left_id, base.right_id)).toBeNull();
    expect(supportedBurnTimePair({ ...base, numeric_pairs: [{ ...base.numeric_pairs[0], unit: 'ms' }] }, base.left_id, base.right_id)).toBeNull();
  });
  it('lists only source-recorded differences and never infers cause', () => {
    expect(differentRecordedConditions(base)).toEqual(['Ambient pressure; mmHg']);
    expect(differentRecordedConditions({ ...base, context_checks: [{ ...base.context_checks[0], relation: 'same_raw' }] })).toEqual([]);
  });
  it('counts only imported tests, not neighboring investigations in the atlas', () => {
    const records = [record('20CAL08', 'Disruption'), record('20CAL10', 'Extinction'), record('B3', null, 'PSI-25')];
    expect(importedFamilyCount(records, 'PSI-69')).toBe(2);
    expect(importedFamilyCount(records, 'PSI-25')).toBe(1);
    expect(importedFamilyCount(records, null)).toBe(0);
  });
});
