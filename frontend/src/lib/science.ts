import type { Metric, SourceId, TestRecord } from './types';

export interface MetricOption {
  id: string;
  key: string;
  label: string;
  unit: string;
  count: number;
}

export interface ChartRow {
  id: string;
  test_id: string;
  value: number;
}

/** Prevent cross-investigation charts even when field labels happen to look similar. */
export function metricOptions(records: TestRecord[]): MetricOption[] {
  if (new Set(records.map((r) => r.source_id)).size !== 1) return [];
  const found = new Map<string, MetricOption>();
  for (const record of records) {
    for (const [key, metric] of Object.entries(record.metrics)) {
      if (!Number.isFinite(metric.value)) continue;
      const id = JSON.stringify([key, metric.unit, metric.original_column]);
      const existing = found.get(id);
      if (existing) existing.count += 1;
      else found.set(id, {
        id, key, label: metric.original_column, unit: metric.unit, count: 1,
      });
    }
  }
  return [...found.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function metricChartRows(records: TestRecord[], option: MetricOption): ChartRow[] {
  if (new Set(records.map((r) => r.source_id)).size !== 1) return [];
  return records.flatMap((record) => {
    const metric = record.metrics[option.key];
    if (!metric || metric.unit !== option.unit || metric.original_column !== option.label ||
        !Number.isFinite(metric.value)) return [];
    return [{ id: record.id, test_id: record.test_id, value: metric.value }];
  });
}

export function formatNumber(value: number, digits = 4): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

export function formatMetric(metric: Metric): string {
  return `${formatNumber(metric.value, 6)} ${metric.unit}`.trim();
}

export function sourceShortName(id: SourceId): string {
  return id === 'PSI-25' ? 'BASS-II' : 'FLEX';
}

export function isOfficialNasaPsiUrl(url: string): boolean {
  try { return new URL(url).hostname === 'psi.nasa.gov' && new URL(url).protocol === 'https:'; }
  catch { return false; }
}
