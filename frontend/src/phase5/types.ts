/** Mirrors /v5 response schemas; deliberately independent of the Phase 2/3 types. */
export interface FieldTrace {
  original_column: string;
  original_value: string;
  evidence_id: string | null;
  source_locator: string;
  indexed_in_phase3: boolean;
  normalized_metric_key: string | null;
  normalized_value: number | null;
  normalized_unit: string | null;
  field_role: 'instrument_display' | 'recorded_context' | 'normalized_measurement' | 'other_raw_field';
}

export interface PassportAudit {
  record_id: string;
  source_id: string;
  test_id: string;
  experiment_type: string;
  source_url: string;
  source_doi: string;
  source_table: string;
  source_locator: string;
  source_checked_date: string;
  transcription_method: string;
  curated_filename: string;
  imported_file_sha256: string;
  current_file_sha256: string;
  imported_row_sha256: string;
  recomputed_row_sha256: string;
  local_consistency: 'passed';
  independent_nasa_verification: 'not_performed';
  fields: FieldTrace[];
  limitations: string[];
  notices: string[];
}

export interface ContextCheck {
  original_column: string;
  role: 'recorded_context' | 'instrument_display';
  left_raw: string | null;
  right_raw: string | null;
  relation: 'same_raw' | 'different_raw' | 'missing';
  left_evidence_id: string | null;
  right_evidence_id: string | null;
  note: string;
}

export interface NumericPair {
  key: string;
  original_column: string;
  unit: string;
  left_value: number;
  right_value: number;
  left_original_value: string;
  right_original_value: string;
  left_evidence_id: string;
  right_evidence_id: string;
  interpretation: 'descriptive_only';
}

export interface ExcludedMetric { key: string; reason: string }

export interface AdvancedCompareResponse {
  left_id: string;
  right_id: string;
  category: 'cross_investigation_blocked' | 'same_record_blocked' |
    'within_investigation_descriptive' | 'no_common_numeric_fields';
  context_status: 'not_applicable' | 'different_recorded_fields' |
    'same_on_checked_fields' | 'missing_recorded_fields';
  numeric_pairs: NumericPair[];
  context_checks: ContextCheck[];
  excluded_metrics: ExcludedMetric[];
  notices: string[];
  local_provenance_checked: boolean;
}
