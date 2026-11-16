import { describe, expect, it } from 'vitest';
import {
  auditHashesAgree, comparisonBlocked, countDifferentContext, fieldDisplay,
  isIndependentlyVerified, relationLabel, safeNumericPairs,
} from '../src/phase5/science';
import type { AdvancedCompareResponse, FieldTrace, PassportAudit } from '../src/phase5/types';

const audit = {
  local_consistency: 'passed', independent_nasa_verification: 'not_performed',
  imported_file_sha256: 'a'.repeat(64), current_file_sha256: 'a'.repeat(64),
  imported_row_sha256: 'b'.repeat(64), recomputed_row_sha256: 'b'.repeat(64),
} as PassportAudit;

const comparison = {
  category: 'within_investigation_descriptive',
  numeric_pairs: [{ key: 'burn_time_s', original_column: 'Burn time; s', unit: 's',
    left_value: 5, right_value: 3.2, left_original_value: '5', right_original_value: '3.2',
    left_evidence_id: 'e1', right_evidence_id: 'e2', interpretation: 'descriptive_only' }],
  context_checks: [{ original_column: 'Droplet initial diameter; mm', role: 'recorded_context',
    left_raw: '1.86', right_raw: '1.61', relation: 'different_raw',
    left_evidence_id: 'e1', right_evidence_id: 'e2', note: 'Reported values differ' }],
} as AdvancedCompareResponse;

const raw = { original_value: '-1', normalized_value: null, normalized_unit: null } as FieldTrace;

describe('Phase 5 scientific presentation safeguards', () => {
  it('accepts identical local fingerprints', () => expect(auditHashesAgree(audit)).toBe(true));
  it('rejects modified source fingerprint', () => expect(auditHashesAgree({ ...audit, current_file_sha256: 'c'.repeat(64) })).toBe(false));
  it('never claims independent NASA verification', () => expect(isIndependentlyVerified(audit)).toBe(false));
  it('allows descriptive pairs only for allowed comparison category', () => expect(safeNumericPairs(comparison)).toHaveLength(1));
  it('hides pairs for blocked comparison even if API payload is inconsistent', () =>
    expect(safeNumericPairs({ ...comparison, category: 'cross_investigation_blocked' })).toHaveLength(0));
  it('blocks comparison for no common numeric fields', () =>
    expect(comparisonBlocked({ ...comparison, category: 'no_common_numeric_fields' })).toBe(true));
  it('counts changed context without inferring causes', () => expect(countDifferentContext(comparison)).toBe(1));
  it('preserves negative raw instrument value without fake normalization', () => expect(fieldDisplay(raw)).toBe('Not normalized'));
  it('labels missing context as missing, not matching', () =>
    expect(relationLabel({ ...comparison.context_checks[0], relation: 'missing' })).toBe('Missing'));
});
