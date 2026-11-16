import type { AdvancedCompareResponse, ContextCheck, FieldTrace, PassportAudit } from './types';

/** UI checks are defense-in-depth. Backend remains the source of comparison decisions. */
export function auditHashesAgree(p: PassportAudit): boolean {
  return p.local_consistency === 'passed' &&
    p.imported_file_sha256 === p.current_file_sha256 &&
    p.imported_row_sha256 === p.recomputed_row_sha256;
}

export function isIndependentlyVerified(p: PassportAudit): boolean {
  // The API explicitly does not perform an independent NASA source verification.
  return p.independent_nasa_verification !== 'not_performed';
}

export function comparisonBlocked(c: AdvancedCompareResponse): boolean {
  return c.category !== 'within_investigation_descriptive';
}

export function safeNumericPairs(c: AdvancedCompareResponse) {
  return comparisonBlocked(c) ? [] : c.numeric_pairs;
}

export function relationLabel(check: ContextCheck): string {
  if (check.relation === 'missing') return 'Missing';
  return check.relation === 'same_raw' ? 'Same recorded value' : 'Different recorded values';
}

export function fieldDisplay(f: FieldTrace): string {
  return f.normalized_value === null || f.normalized_unit === null
    ? 'Not normalized'
    : `${f.normalized_value} ${f.normalized_unit}`;
}

export function countDifferentContext(c: AdvancedCompareResponse): number {
  return c.context_checks.filter((check) => check.relation === 'different_raw').length;
}
