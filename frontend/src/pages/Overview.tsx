import { ArrowRight, ArrowUpRight, Atom, BookOpen, Database, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, Loading, Notice } from '../components/Ui';
import { useCatalog } from '../context/CatalogContext';
import { FeaturedFinding } from '../winning/FeaturedFinding';
import './mission.css';

/** The mission overview intentionally surfaces just three actions and one real-data preview. */
export function Overview() {
  const { experiments, sources, index, loading, error, reload } = useCatalog();
  if (loading) return <Loading label="Connecting to the local NASA PSI catalog…" />;
  if (error || !index) return <ApiError message={error || 'Missing index status'} onRetry={() => void reload()} />;

  const mismatched = index.indexed_record_count !== experiments.length;

  return <div className="page-stack ignis-home">
    <section className="ignite-hero" aria-labelledby="ignite-hero-title">
      <div className="ignite-hero-copy">
        <div className="ignite-eyebrow"><span className="pulse-dot"/> MICROGRAVITY FIRE INTELLIGENCE</div>
        <h1 id="ignite-hero-title">See beyond<br/><span>the flame.</span></h1>
        <p>From NASA combustion experiments to evidence you can explore, trace, and compare.</p>
        <div className="ignite-hero-actions">
          <Link className="button button-primary" to="/mission"><Sparkles size={16}/> Start research mission <ArrowRight size={17}/></Link>
          <Link className="button button-ghost" to="/laboratory"><Atom size={16}/> Explore laboratory</Link>
        </div>
        <span className="ignite-hero-disclaimer">CURATED NASA PSI RESEARCH · NOT LIVE ISS TELEMETRY</span>
      </div>
      <div className="ignite-art" role="img" aria-label="Original abstract flame and concentric scientific orbit illustration; not NASA experiment footage">
        <div className="ignite-aura"/>
        <div className="ignite-ring ignite-ring-one"/><div className="ignite-ring ignite-ring-two"/><div className="ignite-ring ignite-ring-three"/>
        <svg viewBox="0 0 270 330" width="100%" height="100%" aria-hidden="true">
          <defs><linearGradient id="igniteFlame" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#D95837"/><stop offset=".5" stopColor="#F6A354"/><stop offset="1" stopColor="#FCE0A0"/></linearGradient></defs>
          <path d="M129 38 C170 93 139 116 172 142 C195 102 189 80 185 65 C255 134 247 190 216 245 C190 286 145 297 119 286 C45 271 27 200 61 141 C63 181 87 176 93 145 C102 109 88 87 129 38Z" fill="url(#igniteFlame)" opacity=".88"/>
          <path d="M139 131 C149 174 131 183 156 207 C170 184 176 169 173 162 C204 214 175 269 138 271 C97 272 90 232 107 202 C105 233 128 219 122 194 C119 176 129 151 139 131Z" fill="#FFE6AC"/>
        </svg>
        <span className="ignite-art-label">ORIGINAL VISUAL · SCHEMATIC ONLY</span>
      </div>
    </section>

    {mismatched && <Notice tone="warning" title="Index mismatch">The search index reports {index.indexed_record_count} records but the experiments API returned {experiments.length}. Verify your catalog before demonstrating counts.</Notice>}
    <div className="ignite-facts" aria-label="Current verified local catalog">
      <div><strong>{index.indexed_record_count}</strong><span>Imported records</span></div>
      <div><strong>{index.investigations.length}</strong><span>Investigations</span></div>
      <div><strong>{sources.length}</strong><span>Linked NASA sources</span></div>
      <div className="ignite-facts-verified"><ShieldCheck size={19}/><span>Evidence-first<br/>interpretation</span></div>
    </div>

    <section className="ignite-feature-grid" aria-label="Featured research interactions">
      <FeaturedFinding records={experiments}/>
      <div className="ignite-action-stack">
        <Link to="/laboratory" className="ignite-action">
          <span className="ignite-action-icon"><Atom size={23}/></span><span><small>EXPLORE THE SETUP</small><strong>Interactive laboratory</strong><em>BASS-II + FLEX apparatus schematics</em></span><ArrowUpRight size={19}/>
        </Link>
        <Link to="/sync" className="ignite-action">
          <span className="ignite-action-icon"><Radio size={23}/></span><span><small>CHECK THE SOURCE</small><strong>NASA research sync</strong><em>On-demand official repository checks</em></span><ArrowUpRight size={19}/>
        </Link>
        <Link to="/sources" className="ignite-action ignite-action-light">
          <span className="ignite-action-icon"><BookOpen size={23}/></span><span><small>LEARN THE CONTEXT</small><strong>NASA source library</strong><em>Official research, history and applications</em></span><ArrowUpRight size={19}/>
        </Link>
      </div>
    </section>
    <div className="ignite-bottom"><div><Database size={16}/><span>NASA PSI · manually curated excerpts · original source DOI and field traceability preserved</span></div><Link to="/methodology">Method and limits <ArrowRight size={15}/></Link></div>
  </div>;
}
