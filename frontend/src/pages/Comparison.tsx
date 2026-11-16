import { useEffect, useMemo, useState } from 'react';
import { GitCompareArrows, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { ComparisonAuditPanel } from '../phase5/ComparisonAuditPanel';
import type { CompareResponse } from '../lib/types';
import { formatNumber } from '../lib/science';
import { ScienceChart } from '../components/ScienceChart';
import { ApiError, Empty, Loading, Notice, PageHeading, Panel, SourceBadge } from '../components/Ui';
import { useCatalog } from '../context/CatalogContext';

export function Comparison() {
  const { experiments, loading, error, reload } = useCatalog();
  const [params] = useSearchParams();
  const [left, setLeft] = useState(params.get('left') || '');
  const [right, setRight] = useState(params.get('right') || '');
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [metricKey, setMetricKey] = useState('');

  useEffect(() => {
    if (!experiments.length) return;
    const first = experiments[0];
    const second = experiments.find((r) => r.id !== first.id && r.source_id === first.source_id) || experiments[1];
    if (!left || !experiments.some((r) => r.id === left)) setLeft(first.id);
    if (!right || !experiments.some((r) => r.id === right)) setRight(second?.id || first.id);
  }, [experiments, left, right]);

  useEffect(() => {
    if (!left || !right || left === right) { setResult(null); return; }
    let active = true;
    setBusy(true); setRequestError(null); setResult(null);
    void api.compare({ left_id: left, right_id: right })
      .then((response) => { if (active) setResult(response); })
      .catch((cause: unknown) => { if (active) setRequestError(cause instanceof Error ? cause.message : 'Comparison failed'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [left, right]);

  const leftRecord = experiments.find((r) => r.id === left);
  const rightRecord = experiments.find((r) => r.id === right);
  const selectedMetric = result?.shared_metrics.find((m) => m.key === metricKey) || result?.shared_metrics[0];
  const chartRows = useMemo(() => {
    if (!result || !selectedMetric || result.category !== 'within_investigation_descriptive') return [];
    return [
      { id: left, test_id: leftRecord?.test_id || left, value: selectedMetric.left },
      { id: right, test_id: rightRecord?.test_id || right, value: selectedMetric.right },
    ];
  }, [result, selectedMetric, left, right, leftRecord, rightRecord]);

  if (loading) return <Loading/>;
  if (error) return <ApiError message={error} onRetry={() => void reload()}/>;
  return <div className="page-stack">
    <PageHeading eyebrow="RESEARCH / SCIENTIFIC COMPARISON" title="Comparison Lab"
      description="Compare original NASA test measurements while retaining scientific context and limitations."/>
    <Panel title="Select two imported experiments" description="Comparability is evaluated by the existing Phase 2 FastAPI backend.">
      <div className="compare-selectors">
        <label className="field"><span>Experiment A</span><select value={left} onChange={(e) => setLeft(e.target.value)}>
          {experiments.map((r) => <option key={r.id} value={r.id}>{r.id} • {r.fuel_material_raw}</option>)}
        </select></label>
        <div className="compare-swap"><GitCompareArrows size={21}/></div>
        <label className="field"><span>Experiment B</span><select value={right} onChange={(e) => setRight(e.target.value)}>
          {experiments.map((r) => <option key={r.id} value={r.id}>{r.id} • {r.fuel_material_raw}</option>)}
        </select></label>
      </div>
      {left === right && <Notice tone="warning">Select two different experiment records.</Notice>}
      <div className="compare-records">{[leftRecord, rightRecord].map((record, i) => <div key={i} className="compare-record">
        <span className="eyebrow">EXPERIMENT {i === 0 ? 'A' : 'B'}</span>
        {record ? <><div className="compare-record-title"><h3>{record.test_id}</h3><SourceBadge sourceId={record.source_id}/></div>
          <p>{record.fuel_material_raw}</p><small>{record.date} • {record.reported_test_end || 'Test ending not reported'}</small>
          <Link to={`/passport/${encodeURIComponent(record.id)}`} className="table-link">View Evidence Passport</Link></> : <p>Select a record</p>}
      </div>)}</div>
    </Panel>
    <ComparisonAuditPanel leftId={left} rightId={right}/>
    {busy && <div className="loading-line" role="status">Checking measurement compatibility…</div>}
    {requestError && <ApiError message={requestError}/>}
    {result && <>
      <Panel title="Comparability Guard" description="Application-defined descriptive checks, not a NASA safety certification.">
        <div className={`guard-status ${result.category === 'cross_investigation_only' ? 'guard-warning' : 'guard-ok'}`}>
          {result.category === 'cross_investigation_only' ? <ShieldAlert size={28}/> : <ShieldCheck size={28}/>}
          <div><strong>{result.category === 'cross_investigation_only' ? 'Cross-investigation: descriptive context only' : 'Within-investigation descriptive comparison'}</strong>
            <p>{result.category === 'cross_investigation_only' ? 'These test designs cannot be combined into a joint numeric comparison.' : 'Matching units and original column labels permit side-by-side description, not causal conclusions.'}</p></div>
        </div>
        {result.warnings.map((warning, i) => <Notice key={i} tone="warning">{warning}</Notice>)}
      </Panel>
      <Panel title="Shared source measurements" description="Only original fields with matching names and units are returned by the backend.">
        {result.shared_metrics.length === 0 ? <Empty title="No shared numeric comparison" description="This is the correct scientific outcome for incompatible test designs or missing common measurements."/> : <>
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Original measurement</th><th>{leftRecord?.test_id || 'A'}</th><th>{rightRecord?.test_id || 'B'}</th><th>Unit</th></tr></thead><tbody>
            {result.shared_metrics.map((m) => <tr key={m.key}><td>{leftRecord?.metrics[m.key]?.original_column || m.key}</td><td>{formatNumber(m.left, 6)}</td><td>{formatNumber(m.right, 6)}</td><td>{m.unit}</td></tr>)}
          </tbody></table></div>
          <label className="field metric-selector"><span>Chart a single shared measurement</span><select value={selectedMetric?.key || ''} onChange={(e) => setMetricKey(e.target.value)}>
            {result.shared_metrics.map((m) => <option key={m.key} value={m.key}>{leftRecord?.metrics[m.key]?.original_column || m.key} ({m.unit})</option>)}
          </select></label>
          {selectedMetric && <ScienceChart rows={chartRows} label={leftRecord?.metrics[selectedMetric.key]?.original_column || selectedMetric.key} unit={selectedMetric.unit}/>}
        </>}
      </Panel>
    </>}
  </div>;
}
