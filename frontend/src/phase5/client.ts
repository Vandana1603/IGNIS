import type { AdvancedCompareResponse, PassportAudit } from './types';

/** Uses the same Vite /api proxy or VITE_API_BASE_URL as Phase 4. */
const ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function call<T>(path: string, payload?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${ROOT}${path}`, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: { Accept: 'application/json', ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal,
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = result && typeof result === 'object' && 'detail' in result
      ? (result as { detail: unknown }).detail : `HTTP ${response.status}`;
    throw new Error(`IGNIS /v5 request failed: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
  return result as T;
}

export const phase5 = {
  passport: (id: string, signal?: AbortSignal) =>
    call<PassportAudit>(`/v5/passports/${encodeURIComponent(id)}`, undefined, signal),
  compare: (left_id: string, right_id: string, signal?: AbortSignal) =>
    call<AdvancedCompareResponse>('/v5/compare', { left_id, right_id }, signal),
};
