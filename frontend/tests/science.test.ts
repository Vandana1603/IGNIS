import { describe, expect, it } from 'vitest';
import {
  formatMetric,
  isOfficialNasaPsiUrl,
  metricChartRows,
  metricOptions,
} from '../src/lib/science';

import type {
  Metric,
  SourceId,
  TestRecord,
} from '../src/lib/types';

// Test-only fixtures, not application data.
// Numeric values below are retained from the original tests.
// Placeholder metadata must not be treated as NASA evidence.

function makeTestRecord(
  id: string,
  sourceId: SourceId,
  testId: string,
  metrics: Record<string, Metric>,
): TestRecord {
  return {
    id,
    source_id: sourceId,
    test_id: testId,

    date: '',
    fuel_material_raw: '',
    experiment_type:
      sourceId === 'PSI-25' ? 'solid_fuel' : 'liquid_droplet',

    raw_fields: {},
    raw_row_sha256: '',
    metrics,
    instrument_displays: {},
    reported_test_end: null,
    limitations: ['Test fixture only; not a complete NASA record.'],
  };
}

const b1 = makeTestRecord(
  'PSI-25-B1',
  'PSI-25',
  'B1',
  {
    calibrated_initial_o2_percent_by_volume: {
      value: 22.2,
      unit: '% vol',
      original_column: 'Calibrated initial O2 % by vol',
      original_value: '22.2',
    },
  },
);

const b4 = makeTestRecord(
  'PSI-25-B4',
  'PSI-25',
  'B4',
  {
    calibrated_initial_o2_percent_by_volume: {
      value: 22.2,
      unit: '% vol',
      original_column: 'Calibrated initial O2 % by vol',
      original_value: '22.2',
    },
  },
);

const flex = makeTestRecord(
  'PSI-69-20CAL10',
  'PSI-69',
  '20CAL10',
  {
    burn_time_s: {
      value: 5.0,
      unit: 's',
      original_column: 'Burn time; s',
      original_value: '5.0',
    },
  },
);

describe('scientific chart safeguards', () => {
  it('does not chart BASS-II and FLEX as one investigation', () => {
    expect(metricOptions([b1, flex])).toEqual([]);
  });

  it('builds a metric option from identical original column and unit', () => {
    const options = metricOptions([b1, b4]);

    expect(options).toHaveLength(1);
    expect(options[0].count).toBe(2);
    expect(options[0].unit).toBe('% vol');
  });

  it('returns original BASS-II values for compatible chart rows', () => {
    const option = metricOptions([b1, b4])[0];

    expect(metricChartRows([b1, b4], option)).toEqual([
      { id: 'PSI-25-B1', test_id: 'B1', value: 22.2 },
      { id: 'PSI-25-B4', test_id: 'B4', value: 22.2 },
    ]);
  });

  it('does not plot a missing original column as zero', () => {
    const option = metricOptions([b1])[0];

    expect(metricChartRows([flex], option)).toEqual([]);
  });

  it('keeps the scientific unit on display', () => {
    expect(formatMetric(flex.metrics.burn_time_s)).toBe('5 s');
  });

  it('requires an HTTPS NASA PSI hostname for source recognition', () => {
    expect(
      isOfficialNasaPsiUrl(
        'https://psi.nasa.gov/physci/repo/data/investigations/PSI-25',
      ),
    ).toBe(true);

    expect(
      isOfficialNasaPsiUrl(
        'https://psi.nasa.gov.evil.example/PSI-25',
      ),
    ).toBe(false);
  });
});