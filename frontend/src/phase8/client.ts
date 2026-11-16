import type { SourceId } from '../lib/types';

const ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export interface DiscoveredArtifact {
  artifact_id: string;
  filename: string;
  name: string;
  url: string;
  format: string;
}
export interface SourceCheck {
  source_id: SourceId;
  source_url: string;
  doi: string;
  local_imported_records: number;
  last_checked_utc: string | null;
  state: 'not_checked' | 'online' | 'unavailable';
  http_status: number | null;
  page_sha256: string | null;
  changed_since_last_successful_check: boolean | null;
  etag: string | null;
  last_modified: string | null;
  latest_version_visible: string | null;
  updated_date_visible: string | null;
  discoverable_files: DiscoveredArtifact[];
  error: string | null;
}
export interface SyncStatus {
  sources: SourceCheck[];
  catalog_record_count: number;
  mode: string;
  imported_from_remote_sync: number;
  provenance_notice: string;
}
export interface PreviewDiff {
  test_id: string;
  status: 'candidate_new_test_id' | 'different_raw_values' | 'matching_shared_fields' | 'partial_column_overlap';
  changed_fields: { column: string; local_value: string; remote_table_value: string }[];
  missing_local_columns: string[];
  notice: string;
}
export interface StagedPreview {
  filename: string;
  supported: boolean;
  reason: string | null;
  expected_test_id_column: string;
  columns: string[];
  scanned_rows: number;
  truncated: boolean;
  diffs: PreviewDiff[];
}
export interface StagedArtifact {
  source_id: SourceId;
  artifact_id: string;
  source_url: string;
  retrieved_at_utc: string;
  sha256: string;
  size_bytes: number;
  filename: string;
  state: 'staged_not_imported';
}

async function transport<T>(path: string, payload?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 40000);
  try {
    const response = await fetch(`${ROOT}${path}`, {
      method: payload === undefined ? 'GET' : 'POST',
      headers: { 'Accept': 'application/json', ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: controller.signal,
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data && typeof data === 'object' && 'detail' in data
        ? String((data as { detail: unknown }).detail) : `HTTP ${response.status}`;
      throw new Error(detail);
    }
    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('NASA check timed out at the application gateway.');
    throw err;
  } finally { window.clearTimeout(timer); }
}
export const syncApi = {
  status: () => transport<SyncStatus>('/v8/sync/status'),
  check: (source_id?: SourceId) => transport<SyncStatus>('/v8/sync/check', { source_id: source_id || null }),
  stage: (source_id: SourceId, artifact_id: string) => transport<StagedArtifact>('/v8/sync/stage', { source_id, artifact_id }),
  staged: () => transport<{ files: StagedArtifact[] }>('/v8/sync/staged'),
  preview: (filename: string) => transport<StagedPreview>(`/v8/sync/preview/${encodeURIComponent(filename)}`),
};
