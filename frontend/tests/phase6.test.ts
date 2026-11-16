import { describe, expect, it } from 'vitest';
import { citationsResolve, evidenceFor, isAbstention, safeClaims } from '../src/phase6/science';
import type { AskResponse } from '../src/phase6/types';

const sample: AskResponse = {
  question: 'What was the burn time of 20CAL10?', status: 'answered', mode: 'record_lookup',
  answer: 'Recorded burn time is 5 s.', observations: [{ kind: 'observation', text: 'Recorded burn time is 5 s.', evidence_ids: ['ev1'] }],
  interpretations: [], evidence: [{ evidence_id: 'ev1', record_id: 'PSI-69-20CAL10', source_id: 'PSI-69',
    field_name: 'Burn time; s', original_value: '5', source_locator: 'Experimental Table > FLEX Identifier = 20CAL10 > column: Burn time; s',
    source_url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69', doi: '10.60555/mbq8-0451', raw_row_sha256: 'a'.repeat(64) }],
  source_record_ids: ['PSI-69-20CAL10'], limitations: [], abstention_reason: null,
  method: 'deterministic_evidence_rules_v1', imported_record_count: 6, independent_nasa_verification: 'not_performed',
};

describe('Phase 6 evidence presentation', () => {
  it('resolves exact cited evidence', () => expect(citationsResolve(sample)).toBe(true));
  it('shows grounded observations', () => expect(safeClaims(sample)).toHaveLength(1));
  it('hides unresolvable citations', () => expect(safeClaims({ ...sample, observations: [{ kind: 'observation', text: 'x', evidence_ids: ['unknown'] }] })).toHaveLength(0));
  it('rejects evidence from an unlisted record', () => expect(citationsResolve({ ...sample, source_record_ids: [] })).toBe(false));
  it('rejects duplicate evidence IDs', () => expect(citationsResolve({ ...sample, evidence: [sample.evidence[0], sample.evidence[0]] })).toBe(false));
  it('preserves exact raw source value', () => expect(evidenceFor(sample, sample.observations[0])[0].original_value).toBe('5'));
  it('abstains instead of showing claims', () => {
    const refusal: AskResponse = { ...sample, status: 'abstained', mode: 'abstention',
      observations: [], interpretations: [], evidence: [], source_record_ids: [], abstention_reason: 'Insufficient evidence' };
    expect(isAbstention(refusal)).toBe(true);
    expect(safeClaims(refusal)).toHaveLength(0);
  });
});
