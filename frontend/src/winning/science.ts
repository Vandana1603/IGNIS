import type { TestRecord } from '../lib/types';
import type { AdvancedCompareResponse, NumericPair } from '../phase5/types';

/**
 * Choose a transparent, reproducible same-investigation observation.
 * NEVER fabricate a record when it is absent from the local NASA PSI catalog.
 */
export function chooseExtinctionPair(records: TestRecord[]): [TestRecord, TestRecord] | null {
  const candidates = records.filter(record =>
    record.source_id === 'PSI-69' &&
    record.experiment_type === 'liquid_droplet' &&
    record.reported_test_end?.trim().toLowerCase() === 'extinction' &&
    record.metrics.burn_time_s?.original_column === 'Burn time; s' &&
    record.metrics.burn_time_s?.unit === 's' &&
    Number.isFinite(record.metrics.burn_time_s.value),
  );
  const preferred = ['20CAL10', '20CAL12'].map(id => candidates.find(r => r.test_id === id));
  if (preferred[0] && preferred[1] && preferred[0].id !== preferred[1].id) {
    return [preferred[0], preferred[1]];
  }
  const sorted = [...candidates].sort((a, b) => a.test_id.localeCompare(b.test_id));
  return sorted.length >= 2 ? [sorted[0], sorted[1]] : null;
}

/** Only show a numerical research finding if the existing Phase 5 guard accepted
 * the exact original column and unit, and provided original evidence IDs. */
export function supportedBurnTimePair(
  comparison: AdvancedCompareResponse | null,
  leftId: string,
  rightId: string,
): NumericPair | null {
  if (!comparison || comparison.category !== 'within_investigation_descriptive' ||
      !comparison.local_provenance_checked ||
      comparison.left_id !== leftId || comparison.right_id !== rightId) return null;
  const pair = comparison.numeric_pairs.find(p =>
    p.key === 'burn_time_s' && p.original_column === 'Burn time; s' &&
    p.unit === 's' && p.interpretation === 'descriptive_only' &&
    Boolean(p.left_evidence_id) && Boolean(p.right_evidence_id) &&
    Number.isFinite(p.left_value) && Number.isFinite(p.right_value),
  );
  return pair || null;
}

/** These are the conditions actually recorded as different, not causal factors. */
export function differentRecordedConditions(comparison: AdvancedCompareResponse): string[] {
  return comparison.context_checks
    .filter(row => row.relation === 'different_raw')
    .map(row => row.original_column);
}

/** Display only confirmed imported record counts in the atlas. */
export function importedFamilyCount(records: TestRecord[], sourceId: string | null): number {
  return sourceId ? records.filter(record => record.source_id === sourceId).length : 0;
}
