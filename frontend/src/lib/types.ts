/** Mirrors the existing backend/phase2 and backend/phase3 Pydantic schemas. */
export type SourceId = 'PSI-25' | 'PSI-69';
export type MatchMode = 'any' | 'all' | 'all_values';
export type TestOutcome = 'Extinction' | 'Disruption';

export interface SourceInfo {
  source_id: SourceId;
  title: string;
  url: string;
  doi: string;
  table_name: string;
  transcription_method: 'manual_transcription_official_PSI_table';
  checked_date: string;
  notes: string;
}

export interface Metric {
  value: number;
  unit: string;
  original_column: string;
  original_value: string;
}

export interface TestRecord {
  id: string;
  source_id: SourceId;
  test_id: string;
  date: string;
  fuel_material_raw: string;
  experiment_type: 'solid_fuel' | 'liquid_droplet';
  raw_fields: Record<string, string>;
  raw_row_sha256: string;
  metrics: Record<string, Metric>;
  instrument_displays: Record<string, string>;
  reported_test_end: string | null;
  limitations: string[];
}

export interface EvidencePassport {
  record: TestRecord;
  source: SourceInfo;
  source_locator: string;
  evidence_kind: 'NASA_PSI_table_transcription';
  interpretations: string[];
  provenance_notice: string;
}

export interface MetricComparison {
  key: string;
  unit: string;
  left: number;
  right: number;
}

export interface CompareResponse {
  left_id: string;
  right_id: string;
  category: 'within_investigation_descriptive' | 'cross_investigation_only';
  shared_metrics: MetricComparison[];
  warnings: string[];
}

export interface CompareRequest {
  left_id: string;
  right_id: string;
}

export interface IndexStatus {
  indexed_record_count: number;
  investigations: SourceId[];
  source_files: Record<string, string>;
  source_file_sha256: Record<string, string>;
  source_method: string;
  provenance_notice: string;
}

export interface RankingMethod {
  name: string;
  algorithm: string;
  idf_formula: string;
  weights: Record<string, number>;
  label_only_multiplier: number;
  match_modes: MatchMode[];
  match_mode_notes: string;
  tie_break: string;
  no_semantic_inference: boolean;
  no_nasa_download: boolean;
  score_interpretation: string;
  indexed_evidence: string;
}

export interface EvidenceField {
  evidence_id: string;
  record_id: string;
  source_id: SourceId;
  evidence_kind: 'transcribed_table_field' | 'curated_source_metadata';
  field_name: string;
  original_value: string;
  source_locator: string;
  source_url: string;
  doi: string;
  raw_row_sha256: string | null;
}

export interface EvidenceMatch {
  evidence: EvidenceField;
  matched_terms: string[];
  matched_in: 'label' | 'value' | 'both';
}

export interface ScoreContribution {
  term: string;
  idf: number;
  field_weight: number;
  contribution: number;
  evidence_id: string;
  matched_in: 'label' | 'value' | 'both';
}

export interface RankedRecord {
  record_id: string;
  source_id: SourceId;
  test_id: string;
  fuel_material_raw: string;
  reported_test_end: string | null;
  relevance_score: number;
  matched_terms: string[];
  unmatched_terms: string[];
  score_contributions: ScoreContribution[];
  evidence_matches: EvidenceMatch[];
  evidence_passport_url: string;
  limitations: string[];
}

export interface SearchRequest {
  query: string;
  investigation?: SourceId | null;
  match_mode?: MatchMode;
  outcome?: TestOutcome | null;
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  query: string;
  query_terms: string[];
  investigation: string | null;
  match_mode: MatchMode;
  outcome: string | null;
  total_matches: number;
  returned_count: number;
  offset: number;
  results: RankedRecord[];
  ranking_method: string;
  answer_status: 'matching_records_only' | 'no_matching_records' | 'insufficient_evidence_for_inference';
  notices: string[];
}

export interface EvidenceResponse {
  record_id: string;
  source_id: SourceId;
  evidence_fields: EvidenceField[];
  field_count: number;
  evidence_passport_url: string;
  provenance_notice: string;
}
