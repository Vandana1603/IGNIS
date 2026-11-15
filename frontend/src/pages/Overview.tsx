import { ArrowRight, ArrowUpRight, Atom, BookOpen, Database, GitCompareArrows, Search, ShieldCheck, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, Loading } from '../components/Ui';
import { FlameTransition } from '../components/FlameTransition';
import { useCatalog } from '../context/CatalogContext';
import './mission.css';
import './overview-refined.css';

/** Clean mission overview: navigation, source scope, and an interactive gravity concept. */
export function Overview() {
  const { experiments, sources, index, loading, error, reload } = useCatalog();
  if (loading) return <Loading label="Connecting to the local NASA PSI catalog…"/>;
  if (error || !index) return <ApiError message={error || 'Missing index status'} onRetry={() => void reload()}/>;
  const pathways = [
    {to:'/laboratory',icon:Atom,kicker:'01 · VISUALIZE',title:'Microgravity laboratory',description:'Explore liquid- and solid-fuel setups',featured:true},
    {to:'/experiments',icon:Database,kicker:'02 · EXPLORE',title:'Experiment explorer',description:'Original imported NASA test records'},
    {to:'/compare',icon:GitCompareArrows,kicker:'03 · ANALYZE',title:'Comparison lab',description:'Evaluate experimental differences'},
    {to:'/research',icon:Search,kicker:'04 · DISCOVER',title:'Research intelligence',description:'Source-linked research search'},
    {to:'/insights',icon:BrainCircuit,kicker:'05 · INTERPRET',title:'Scientific insights',description:'Evidence-grounded observations'},
    {to:'/sources',icon:BookOpen,kicker:'06 · REFERENCE',title:'NASA source library',description:'Primary research and mission context'},
  ];
  return <div className="page-stack ignis-home ignis-overview-refined">
    <section className="ignite-hero" aria-labelledby="ignite-hero-title">
      <div className="ignite-hero-copy">
        <div className="ignite-eyebrow"><span className="pulse-dot"/> MICROGRAVITY RESEARCH INTELLIGENCE</div>
        <h1 id="ignite-hero-title">Fire changes.<br/><span>Evidence stays.</span></h1>
        <p>Explore NASA combustion experiments, understand their setup, and trace every recorded observation.</p>
        <Link className="button button-primary" to="/laboratory">Enter laboratory <ArrowRight size={17}/></Link>
        <span className="ignite-hero-disclaimer">Original scientific records · clear research context</span>
      </div>
      <FlameTransition/>
    </section>
    <section className="ignite-facts" aria-label="Current locally imported NASA catalog">
      <div><strong>{index.indexed_record_count}</strong><span>Imported records</span></div>
      <div><strong>{index.investigations.length}</strong><span>Investigations</span></div>
      <div><strong>{sources.length}</strong><span>Linked source entries</span></div>
      <div className="ignite-facts-verified"><ShieldCheck size={18}/><span>{index.indexed_record_count === experiments.length ? 'Catalog loaded' : 'Catalog counts differ'}</span></div>
    </section>
    <div className="ignis-zone-title"><div><span className="eyebrow">RESEARCH WORKSPACE</span><h2>Choose where to begin</h2></div><span>Focused research tools. One evidence-linked workflow.</span></div>
    <section className="ignis-pathways" aria-label="IGNIS research areas">
      {pathways.map(({to,icon:Icon,kicker,title,description,featured}) => <Link key={to} to={to} className={`ignis-pathway ${featured ? 'ignis-pathway-featured' : ''}`}>
        <span className="ignis-pathway-top"><span className="ignis-pathway-icon"><Icon size={23}/></span><ArrowUpRight size={18}/></span>
        <span className="ignis-pathway-kicker">{kicker}</span><strong>{title}</strong><span className="ignis-pathway-desc">{description}</span>
      </Link>)}
    </section>
    <div className="ignis-overview-footnote"><span>NASA PSI · curated experimental records · measurements and source links remain verifiable</span><a href="https://psi.nasa.gov/physci/repo/search?q=combustion" target="_blank" rel="noreferrer">NASA PSI Repository <ArrowUpRight size={14}/></a></div>
  </div>;
}
