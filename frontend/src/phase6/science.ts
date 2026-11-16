import type { AskResponse, GroundedClaim } from './types';

/** Client-side defense in depth: never display claims with unresolved citations. */
export function citationsResolve(result: AskResponse): boolean {
  const ids = new Set(result.evidence.map((ref) => ref.evidence_id));
  const records = new Set(result.source_record_ids);
  if (ids.size !== result.evidence.length) return false;
  if (result.evidence.some((ref) => !records.has(ref.record_id))) return false;
  return [...result.observations, ...result.interpretations].every(
    (claim) => claim.evidence_ids.length > 0 && claim.evidence_ids.every((id) => ids.has(id)),
  );
}

export function safeClaims(result: AskResponse): GroundedClaim[] {
  if (result.status !== 'answered' || !citationsResolve(result)) return [];
  return result.observations.filter((claim) => claim.kind === 'observation');
}

export function isAbstention(result: AskResponse): boolean {
  return result.status === 'abstained';
}

export function evidenceFor(result: AskResponse, claim: GroundedClaim) {
  const wanted = new Set(claim.evidence_ids);
  return result.evidence.filter((ref) => wanted.has(ref.evidence_id));
}
