import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, FileCheck2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScienceChart } from '../components/ScienceChart';
import { ApiError, Empty, Loading, Notice, PageHeading, Panel, SourceBadge } from '../components/Ui';
import { useCatalog } from '../context/CatalogContext';
import { metricChartRows, metricOptions, sourceShortName } from '../lib/science';
import type { SourceId } from '../lib/types';

export function Explorer() {
  const { experiments, loading, error, reload } = useCatalog();
  const [investigation, setInvestigation] = useState<SourceId | ''>('PSI-69');
  const [filter, setFilter] = useState('');
  const [metricId, setMetricId] = useState('');
  const filtered = useMemo(() => experiments.filter((r) => {
    if (investigation && r.source_id !== investigation) return false;
    const search = `${r.test_id} ${r.fuel_material_raw} ${r.reported_test_end || ''}`.toLowerCase();
    return search.includes(filter.toLowerCase().trim());
  }), [experiments, investigation, filter]);
  const options = useMemo(() => metricOptions(filtered), [filtered]);
  useEffect(() => {
    if (!options.some((option) => option.id === metricId)) setMetricId(options[0]?.id ?? '');
  }, [options, metricId]);
  const selected = options.find((option) => option.id === metricId);
  const rows = selected ? metricChartRows(filtered, selected) : [];

  if (loading) return <Loading/>;
  if (error) return <ApiError message={error} onRetry={() => void reload()}/>;

  return <div className="page-stack">
    <PageHeading eyebrow="RESEARCH / EXPERIMENT CATALOG" title="Experiment Explorer"
      description="Inspect test-level NASA data, preserve original measurement units, and visualize only compatible fields."/>
    <Panel title="Explore imported records" description="All counts and measurements come from your Phase 2 API.">
      <div className="explorer-controls">
        <label className="field"><span>Investigation</span><select value={investigation} onChange={(e) => setInvestigation(e.target.value as SourceId | '')}>
          <option value="PSI-69">FLEX / PSI-69</option><option value="PSI-25">BASS-II / PSI-25</option><option value="">All imported records</option>
        </select></label>
        <label className="field"><span>Filter tests / fuel / ending</span><div className="field-search"><Search size={16}/><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="e.g. Methanol"/></div></label>
        <div className="explorer-count"><strong>{filtered.length}</strong><span>matching imported tests</span></div>
      </div>
      {!investigation && <Notice tone="warning" title="Select an investigation for scientific charts">BASS-II solid-fuel and FLEX liquid-droplet measurements must not be plotted as if they were one compatible experiment series.</Notice>}
      {filtered.length === 0 ? <Empty title="No matching records" description="Change the investigation or search filter. No missing measurements have been substituted."/> :
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Test</th><th>Investigation</th><th>Material / fuel</th><th>Date</th><th>Recorded ending</th><th>Numeric fields</th><th>Source</th></tr></thead>
          <tbody>{filtered.map((r) => <tr key={r.id}><td><strong>{r.test_id}</strong></td><td><SourceBadge sourceId={r.source_id}/></td>
            <td className="table-material">{r.fuel_material_raw}</td><td>{r.date}</td><td>{r.reported_test_end || <span className="missing">Not reported</span>}</td>
            <td>{Object.keys(r.metrics).length}</td><td><Link to={`/passport/${encodeURIComponent(r.id)}`} className="table-link">Evidence <ArrowRight size={14}/></Link></td></tr>)}</tbody>
        </table></div>}
    </Panel>
    <Panel title="Scientific measurement chart" description="Charts are restricted to the same investigation, source column, and physical unit." action={<BarChart3 size={19} className="text-cyan-300"/>}>
      {investigation && options.length > 0 ? <>
        <label className="field metric-selector"><span>Verified metric</span><select value={selected?.id || ''} onChange={(e) => setMetricId(e.target.value)}>
          {options.map((option) => <option key={option.id} value={option.id}>{option.label} ({option.unit}) — {option.count} records</option>)}
        </select></label>
        {selected && <ScienceChart rows={rows} label={selected.label} unit={selected.unit}/>}
      </> : <Empty title="No compatible numeric chart" description="Select a single investigation with at least one available numeric field. Missing measurements are not plotted as zero."/>}
    </Panel>
    <Panel title="Imported investigation coverage" description="An imported subset is not the full NASA investigation.">
      <div className="coverage-grid">{(['PSI-25', 'PSI-69'] as const).map((id) => {
        const records = experiments.filter((r) => r.source_id === id);
        return <div key={id} className="coverage-card"><SourceBadge sourceId={id}/><strong>{records.length} tests</strong><p>{sourceShortName(id)} • locally imported records</p><Link to={`/compare?left=${encodeURIComponent(records[0]?.id || '')}`} className="table-link">Open comparison <ArrowRight size={15}/></Link></div>;
      })}</div>
    </Panel>
    <Notice title="Measurement integrity">BASS-II's “Fan display” and “Air display” are instrument readings, not calibrated airflow velocities. Missing flame-spread rates are not charted. FLEX metrics retain their original units and experimental context.</Notice>
  </div>;
}
