import type {
  CompareRequest, CompareResponse, EvidencePassport, EvidenceResponse,
  IndexStatus, RankingMethod, SearchRequest, SearchResponse, SourceInfo, TestRecord,
} from './types';

/** Dev: Vite proxies /api to http://127.0.0.1:8000. Production: set VITE_API_BASE_URL. */
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

function detailMessage(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: unknown) => {
      if (typeof d === 'object' && d !== null && 'msg' in d) return String(d.msg);
      return String(d);
    }).join('; ');
  }
  return 'Unexpected API response';
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? { Accept: 'application/json' } : {
        Accept: 'application/json', 'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail: unknown }).detail : `HTTP ${response.status}`;
      throw new Error(`API ${response.status}: ${detailMessage(detail)}`);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('API request timed out. Check whether FastAPI is running.');
    }
    if (error instanceof TypeError) {
      throw new Error('Cannot reach FastAPI. Start the backend on port 8000 and check the Vite proxy.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  sources: () => request<SourceInfo[]>('/v2/sources'),
  experiments: () => request<TestRecord[]>('/v2/experiments'),
  indexStatus: () => request<IndexStatus>('/v3/index-status'),
  rankingMethod: () => request<RankingMethod>('/v3/ranking-method'),
  search: (params: SearchRequest) => request<SearchResponse>('/v3/search', params),
  compare: (params: CompareRequest) => request<CompareResponse>('/v2/compare', params),
  passport: (id: string) => request<EvidencePassport>(`/v2/evidence-passports/${encodeURIComponent(id)}`),
  evidence: (id: string) => request<EvidenceResponse>(`/v3/evidence/${encodeURIComponent(id)}`),
};
