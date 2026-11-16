import { ArrowRight, ArrowUpRight, BookOpen, Database, FlaskConical, Layers3, Microscope, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, ExternalSource, Loading, Notice, PageHeading, Panel, SourceBadge, StatCard } from '../components/Ui';
import { useCatalog } from '../context/CatalogContext';
import { sourceShortName } from '../lib/science';

export function Overview() {
  const { experiments, sources, index, loading, error, reload } = useCatalog();
  if (loading) return <Loading/>;
  if (error || !index) return <ApiError message={error || 'Missing index status'} onRetry={() => void reload()}/>;

  const availableMetricTypes = new Set(experiments.flatMap((r) => Object.keys(r.metrics))).size;
  const countBySource = sources.map((source) => ({
    ...source, count: experiments.filter((record) => record.source_id === source.source_id).length,
  }));
  const mismatch = index.indexed_record_count !== experiments.length;

  return <div className="page-stack">
    <PageHeading eyebrow="MISSION / RESEARCH INTELLIGENCE" title="Mission Overview"
      description="A traceable window into selected NASA microgravity combustion experiments."/>

    <section className="hero-panel">
      <div className="hero-glow" aria-hidden="true"/>
      <div className="hero-content">
        <div className="hero-eyebrow"><span className="pulse-dot"/> RESEARCH CONSOLE / ACTIVE DATASET</div>
        <h2>Every flame tells a story.<br/><em>Every insight needs evidence.</em></h2>
        <p>Explore original NASA PSI test records, understand their measurements, and follow each finding back to its source.</p>
        <div className="hero-actions">
          <Link to="/research" className="button button-primary">Explore research <ArrowRight size={17}/></Link>
          <Link to="/experiments" className="button button-ghost">View experiments <ArrowUpRight size={17}/></Link>
        </div>
      </div>
      <div className="hero-orbit" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="orbit-core"><span>IGNIS</span><small>PSI DATA</small></div></div>
    </section>

    {mismatch && <Notice tone="warning" title="Index count mismatch">Phase 3 reports {index.indexed_record_count} records, but Phase 2 returned {experiments.length}. Check your backend catalog and reimport manifest before presenting statistics.</Notice>}

    <div className="stats-grid">
      <StatCard label="Indexed test records" value={index.indexed_record_count} note="Imported locally; not NASA's full repository" icon={<Database size={19}/>}/>
      <StatCard label="Investigations represented" value={index.investigations.length} note="From the current imported catalog" icon={<Layers3 size={19}/>}/>
      <StatCard label="Numeric metric types" value={availableMetricTypes} note="Distinct normalized fields in imported tests" icon={<FlaskConical size={19}/>}/>
      <StatCard label="Source catalog entries" value={sources.length} note="Linked investigation-level references" icon={<BookOpen size={19}/>}/>
    </div>

    <div className="two-column">
      <Panel title="Research collections" description="Counts reflect the records actually imported into IGNIS.">
        <div className="collection-list">
          {countBySource.map((source) => <div key={source.source_id} className="collection-row">
            <div className="collection-icon"><Microscope size={22}/></div>
            <div className="collection-info"><SourceBadge sourceId={source.source_id}/><strong>{sourceShortName(source.source_id)}</strong><span>{source.title}</span></div>
            <div className="collection-count"><strong>{source.count}</strong><small>imported tests</small></div>
            <ExternalSource href={source.url}>NASA source</ExternalSource>
          </div>)}
        </div>
      </Panel>
      <Panel title="Evidence-to-insight workflow" description="How IGNIS protects scientific context.">
        <div className="workflow-list">
          <div><span>01</span><strong>Source</strong><p>Selected NASA PSI table rows and DOIs</p></div>
          <div><span>02</span><strong>Validate</strong><p>Original columns, units and local fingerprints</p></div>
          <div><span>03</span><strong>Retrieve</strong><p>Transparent relevance scores and matched fields</p></div>
          <div><span>04</span><strong>Compare</strong><p>Compatible metrics and explicit limitations</p></div>
        </div>
      </Panel>
    </div>
    <Notice title="Scientific scope">IGNIS currently displays curated experimental-table excerpts. It does not predict flame behavior, certify material safety, or claim that missing measurements are zero. <Link to="/methodology">Read the methodology</Link>.</Notice>
    <div className="quick-links">
      <Link to="/research"><span><Microscope size={20}/></span><div><strong>Ask a research question</strong><p>Rank original source-linked evidence</p></div><ArrowRight size={18}/></Link>
      <Link to="/compare"><span><ShieldCheck size={20}/></span><div><strong>Open Comparison Lab</strong><p>Review descriptive differences and warnings</p></div><ArrowRight size={18}/></Link>
    </div>
  </div>;
}
