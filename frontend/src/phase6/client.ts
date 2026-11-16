import type { AskRequest, AskResponse, SICapabilities } from './types';

// Same Vite proxy as Phase 4/5; does not send NASA data to any external AI service.
const ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${ROOT}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? { Accept: 'application/json' } : {
      Accept: 'application/json', 'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data
      ? (data as { detail: unknown }).detail : `HTTP ${response.status}`;
    throw new Error(`SI API ${response.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
  return data as T;
}

export const siApi = {
  ask: (request: AskRequest, signal?: AbortSignal) => call<AskResponse>('/v6/ask', request, signal),
  capabilities: (signal?: AbortSignal) => call<SICapabilities>('/v6/capabilities', undefined, signal),
};
