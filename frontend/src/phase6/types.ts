export type AnswerStatus = 'answered' | 'abstained';
export type AnswerMode = 'record_lookup' | 'record_comparison' | 'outcome_filter' | 'lexical_lookup' | 'abstention';

export interface AskRequest {
  question: string;
  max_records?: number;
}

export interface EvidenceReference {
  evidence_id: string;
  record_id: string;
  source_id: 'PSI-25' | 'PSI-69';
  field_name: string;
  original_value: string;
  source_locator: string;
  source_url: string;
  doi: string;
  raw_row_sha256: string | null;
}

export interface GroundedClaim {
  kind: 'observation' | 'interpretation';
  text: string;
  evidence_ids: string[];
}

export interface AskResponse {
  question: string;
  status: AnswerStatus;
  mode: AnswerMode;
  answer: string;
  observations: GroundedClaim[];
  interpretations: GroundedClaim[];
  evidence: EvidenceReference[];
  source_record_ids: string[];
  limitations: string[];
  abstention_reason: string | null;
  method: 'deterministic_evidence_rules_v1';
  imported_record_count: number;
  independent_nasa_verification: 'not_performed';
}

export interface SICapabilities {
  method: string;
  generative_model_used: boolean;
  nasa_network_download: boolean;
  supported: string[];
  unsupported: string[];
  provenance_notice: string;
}
