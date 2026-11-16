import { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, Database, Fingerprint, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { RankingMethod } from '../lib/types';
import { ApiError, ExternalSource, Loading, Notice, PageHeading, Panel, SourceBadge } from '../components/Ui';
import { useCatalog } from '../context/CatalogContext';

export function Methodology() {
  const { sources, index, loading, error, reload } = useCatalog();
  const [method, setMethod] = useState<RankingMethod | null>(null);
  const [methodError, setMethodError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void api.rankingMethod().then((m) => { if (active) setMethod(m); })
      .catch((cause: unknown) => { if (active) setMethodError(cause instanceof Error ? cause.message : 'Ranking metadata unavailable'); });
    return () => { active = false; };
  }, []);
  if (loading) return <Loading/>;
  if (error || !index) return <ApiError message={error || 'Index metadata unavailable'} onRetry={() => void reload()}/>;

  return <div className="page-stack">
    <PageHeading eyebrow="SYSTEM / TRANSPARENCY" title="Methodology & Limitations"
      description="Every research result must be explainable, auditable, and honest about what the available evidence supports."/>
    <section className="method-hero"><ShieldCheck size={30}/><div><strong>Evidence before interpretation</strong><p>IGNIS organizes selected NASA PSI table records. It does not claim to be a validated combustion model or a flight safety tool.</p></div></section>
    <div className="two-column">
      <Panel title="Indexed data provenance" description="Reported directly by the Phase 3 index-status endpoint.">
        <div className="method-facts"><div><span>Indexed local test records</span><strong>{index.indexed_record_count}</strong></div>
          <div><span>Represented investigations</span><strong>{index.investigations.join(', ')}</strong></div>
          <div><span>Import method</span><strong>{index.source_method.replaceAll('_', ' ')}</strong></div></div>
        <Notice title="Source integrity">{index.provenance_notice}</Notice>
      </Panel>
      <Panel title="Research ranking" description="Algorithm details returned by the actual FastAPI backend.">
        {methodError ? <ApiError message={methodError}/> : method ? <div className="method-facts">
          <div><span>Ranking method</span><strong><code>{method.name}</code></strong></div>
          <div><span>Algorithm</span><strong>{method.algorithm}</strong></div>
          <div><span>Inverse-document-frequency formula</span><strong><code>{method.idf_formula}</code></strong></div>
          <div><span>Label-only multiplier</span><strong>{method.label_only_multiplier}</strong></div>
          <div><span>Semantic inference</span><strong>{method.no_semantic_inference ? 'Not implemented in this phase' : 'See backend methodology'}</strong></div>
        </div> : <div className="loading-line">Loading ranking method…</div>}
      </Panel>
    </div>
    {method && <Panel title="Ranking field weights" description="These values are application-defined retrieval heuristics, not NASA scientific scores.">
      <div className="weight-grid">{Object.entries(method.weights).map(([field, weight]) => <div key={field}><span>{field.replaceAll('_', ' ')}</span><strong>{weight.toFixed(1)}×</strong></div>)}</div>
      <Notice>Search scores describe relevance to the query. They are not flammability, risk, scientific importance, confidence, or probability estimates.</Notice>
    </Panel>}
    <Panel title="NASA investigation sources" description="Each source is linked to its original PSI investigation page.">
      <div className="source-method-list">{sources.map((source) => <div key={source.source_id}><SourceBadge sourceId={source.source_id}/>
        <div><strong>{source.title}</strong><p>DOI: {source.doi} • Transcription metadata: {source.checked_date}</p><p>{source.notes}</p></div>
        <ExternalSource href={source.url}>NASA PSI</ExternalSource></div>)}</div>
    </Panel>
    <Panel title="Local source-file fingerprints" description="SHA-256 checks local file integrity, not independent correctness of transcribed scientific values.">
      <div className="file-fingerprint-list">{Object.entries(index.source_file_sha256).map(([sourceId, hash]) => <div key={sourceId}>
        <Database size={18}/><div><strong>{sourceId} — {index.source_files[sourceId] || 'Curated CSV'}</strong><code>{hash}</code></div><Fingerprint size={16}/>
      </div>)}</div>
    </Panel>
    <Panel title="Scientific and implementation limitations" description="Display these openly during the judge demonstration.">
      <div className="limitations-grid">
        <div><BookOpen size={20}/><strong>Selected excerpts only</strong><p>Imported tests are a small subset of NASA PSI investigations, not complete mission archives.</p></div>
        <div><Database size={20}/><strong>Missing means unknown</strong><p>Unavailable flame-spread rates or airflow velocities must never be replaced with zero or estimated values.</p></div>
        <div><ShieldCheck size={20}/><strong>No causal claims</strong><p>Descriptive differences between tests cannot establish the causes of combustion behavior.</p></div>
        <div><Fingerprint size={20}/><strong>Local provenance</strong><p>Source URLs, original fields and hashes enable auditing; they do not independently validate the original transcription.</p></div>
      </div>
    </Panel>
    <div className="method-footer"><span>Ready to inspect the source-linked records?</span><Link to="/experiments" className="button button-primary">Open Experiment Explorer <ArrowUpRight size={16}/></Link></div>
  </div>;
}
