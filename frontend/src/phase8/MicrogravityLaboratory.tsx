import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import {
  ArrowRight, ArrowUpRight, Camera, ChevronDown, ChevronRight, CirclePause,
  CirclePlay, Database, FlaskConical, Gauge, RotateCcw, Waves,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { EvidenceField, SourceId, TestRecord } from '../lib/types';
import { formatMetric, metricChartRows, metricOptions } from '../lib/science';
import { ScienceChart } from '../components/ScienceChart';
import { ApiError, Loading } from '../components/Ui';
import { useCatalog } from '../context/CatalogContext';
import { laboratorySourceUrl, makeAmbientParticles, qualitativeOutcome, recordScopeLabel } from './labModel';
import './phase8.css';
import './lab-simulator.css';

type Focus = 'sample' | 'environment' | 'imaging';
const FOCUS: { id: Focus; label: string; icon: typeof FlaskConical }[] = [
  { id: 'sample', label: 'Fuel', icon: FlaskConical },
  { id: 'environment', label: 'Ambient conditions', icon: Waves },
  { id: 'imaging', label: 'Observation', icon: Camera },
];

const FIELD_NAMES: Record<SourceId, Record<Focus, string[]>> = {
  'PSI-25': {
    sample: ['Fuel Sample Material', 'Sample #'],
    environment: ['Calibrated initial O2 % by vol', 'Calibrated final O2 % by vol', 'Fan display', 'Air display', 'Flow restrictor'],
    imaging: ['Total Frames Shot', 'Radiometer gain (1000 250 50 10)'],
  },
  'PSI-69': {
    sample: ['Fuel', 'Droplet initial diameter; mm'],
    environment: ['Ambient pressure; mmHg', 'O2 initial ambient composition; mole fraction', 'N2 initial ambient composition; mole fraction'],
    imaging: ['Burn time; s', 'Visible flame extinction diameter; mm', 'Test end', 'Burning rate; mm2/s'],
  },
};

const FOCUS_EXPLANATION: Record<SourceId, Record<Focus, string>> = {
  'PSI-25': {
    sample: 'The sample is a solid strip in a controlled flow duct. Material descriptions are preserved exactly as imported.',
    environment: 'Forced airflow affects solid-fuel combustion. Fan displays are not independently calibrated velocity measurements.',
    imaging: 'NASA used imaging and a radiometer to study flame behavior. This curated catalog does not include the source video.',
  },
  'PSI-69': {
    sample: 'A suspended liquid droplet burns within a surrounding gas. The drawing is not scaled to the recorded diameter.',
    environment: 'The gas surrounding the droplet has recorded pressure and composition fields. The floating dots are illustrative.',
    imaging: 'The table reports burn time and the test ending. The animation does not recreate the original test sequence.',
  },
};

type SceneProps = {
  source: SourceId;
  focus: Focus;
  playing: boolean;
  particlesVisible: boolean;
  progress: number;
  onFocus: (focus: Focus) => void;
};

/** Interactive teaching schematic. CSS movement has no physical scales or scientific calibration. */
function LabScene({ source, focus, playing, particlesVisible, progress, onFocus }: SceneProps) {
  const liquid = source === 'PSI-69';
  const particles = useMemo(() => makeAmbientParticles(72, liquid ? 'liquid' : 'solid'), [liquid]);
  const pick = (which: Focus) => ({
    onClick: () => onFocus(which),
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onFocus(which); }
    },
    tabIndex: 0,
    role: 'button' as const,
    'aria-label': `Inspect ${which === 'environment' ? 'ambient conditions' : which === 'imaging' ? 'observations' : 'fuel sample'}`,
    'aria-pressed': focus === which,
    className: `ignis-lab-hotspot ${focus === which ? 'selected' : ''}`,
  });
  return <div className={`ignis-lab-stage ${playing ? 'is-playing' : ''} ${liquid ? 'is-liquid' : 'is-solid'}`}>
    <svg className="phase8-schematic-svg ignis-lab-scene" viewBox="0 0 780 430" role="img"
      aria-label={liquid ? 'Interactive FLEX liquid fuel laboratory illustration' : 'Interactive BASS-II solid fuel flow duct illustration'}>
      <defs>
        <radialGradient id="lab-fire-halo"><stop offset="0" stopColor="#ffce82" stopOpacity=".42"/><stop offset=".72" stopColor="#e48a4c" stopOpacity=".12"/><stop offset="1" stopColor="#e48a4c" stopOpacity="0"/></radialGradient>
        <radialGradient id="lab-droplet"><stop stopColor="#fff2cf"/><stop offset=".75" stopColor="#e7a764"/><stop offset="1" stopColor="#b76d40"/></radialGradient>
        <linearGradient id="lab-strip"><stop stopColor="#e6c79b"/><stop offset="1" stopColor="#9f8065"/></linearGradient>
        <linearGradient id="lab-chamber" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#13374e"/><stop offset="1" stopColor="#091827"/></linearGradient>
        <pattern id="lab-grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#74b8cb" strokeOpacity=".09" strokeWidth="1"/></pattern>
      </defs>
      <rect width="780" height="430" rx="15" fill="#081b2b"/>
      <rect width="780" height="430" rx="15" fill="url(#lab-grid)"/>
      <text x="31" y="38" className="ignis-lab-scene-tag">{liquid ? 'FLEX · LIQUID COMBUSTION' : 'BASS-II · SOLID COMBUSTION'}</text>
      <text x="750" y="38" textAnchor="end" className="ignis-lab-scene-meta">QUALITATIVE MODEL</text>
      {liquid ? <>
        <rect x="75" y="65" width="625" height="310" rx="48" fill="url(#lab-chamber)" stroke="#3a6b80" strokeWidth="1.7"/>
        <rect x="95" y="84" width="585" height="271" rx="34" fill="none" stroke="#2d566c" strokeDasharray="4 8"/>
        <text x="390" y="393" textAnchor="middle" className="ignis-lab-scene-note">COMBUSTION CHAMBER · ILLUSTRATIVE</text>
      </> : <>
        <rect x="70" y="115" width="640" height="227" rx="14" fill="url(#lab-chamber)" stroke="#386d85" strokeWidth="2"/>
        <path d="M86 132 H696 V324 H86Z" fill="none" stroke="#2e5871" strokeDasharray="6 9"/>
        <text x="392" y="368" textAnchor="middle" className="ignis-lab-scene-note">BASS-II FLOW DUCT · ILLUSTRATIVE DIRECTION</text>
      </>}
      {particlesVisible && <g className="ignis-lab-particles" aria-hidden="true">
        {particles.map(p => {
          // Keep the most central points from occluding the fuel itself.
          if (liquid && Math.abs(p.x - 392) < 84 && Math.abs(p.y - 222) < 83) return null;
          const style = { animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` } as CSSProperties;
          return <circle key={p.id} cx={p.x} cy={p.y} r={p.radius} style={style}
            className={p.tone === 'cyan' ? 'ignis-gas-particle tone-cyan' : 'ignis-gas-particle tone-blue'}/>;
        })}
      </g>}
      {liquid ? <>
        <g {...pick('sample')}>
          <rect x="303" y="113" width="177" height="201" fill="transparent"/>
          <path d="M390 82 V181" stroke="#8cb1c1" strokeWidth="3"/>
          <circle cx="390" cy="236" r="102" fill="url(#lab-fire-halo)" className="ignis-lab-halo"/>
          <circle cx="390" cy="236" r="62" fill="none" stroke="#fbc38c" strokeOpacity=".78" strokeWidth="5" className="ignis-lab-flame-ring"/>
          <circle cx="390" cy="236" r="46" fill="none" stroke="#db8959" strokeOpacity=".53" strokeWidth="2" strokeDasharray="4 8"/>
          <circle cx="390" cy="236" r="24" fill="url(#lab-droplet)" stroke="#fff0c7" strokeWidth="2"/>
          <circle cx="382" cy="227" r="6" fill="#fff6db" opacity=".75"/>
          <text x="390" y="337" textAnchor="middle" className="ignis-lab-label">SUSPENDED FUEL DROPLET</text>
        </g>
        <g {...pick('imaging')}>
          <rect x="114" y="185" width="85" height="75" rx="10" fill="#1b4359" stroke="#75b4cf" strokeWidth="2"/>
          <circle cx="165" cy="222" r="21" fill="#0c2232" stroke="#7fd2df" strokeWidth="2"/>
          <circle cx="165" cy="222" r="9" fill="#2f98b0"/>
          <path d="M187 218L311 230" stroke="#6fc9d8" strokeDasharray="5 7" strokeWidth="1.5"/>
          <text x="161" y="174" textAnchor="middle" className="ignis-lab-label">IMAGING</text>
        </g>
        <g {...pick('environment')}>
          <rect x="581" y="179" width="73" height="76" rx="10" fill="#123c52" stroke="#73b8cd" strokeWidth="2"/>
          <circle cx="606" cy="207" r="8" fill="#71c9d7"/><circle cx="632" cy="207" r="8" fill="#417e9a"/>
          <path d="M597 236 H640" stroke="#a3d5dc" strokeWidth="3" strokeLinecap="round"/>
          <text x="620" y="276" textAnchor="middle" className="ignis-lab-label">AMBIENT GAS</text>
        </g>
      </> : <>
        <g {...pick('environment')}>
          <circle cx="170" cy="227" r="51" fill="#123b51" stroke="#7cb9cf" strokeWidth="2"/>
          <circle cx="170" cy="227" r="11" fill="#9ad2df"/>
          {Array.from({ length: 4 }, (_, i) => <path key={i} d="M170 216 Q192 187 180 177 Q140 200 161 224Z" fill="#4a94ae" transform={`rotate(${i*90} 170 227)`} className="ignis-lab-fan"/>)}
          <path d="M231 198 H330 M321 190l9 8-9 8 M231 249H330 M321 241l9 8-9 8" stroke="#65bed3" strokeWidth="2" fill="none" className="ignis-lab-streamlines"/>
          <text x="170" y="301" textAnchor="middle" className="ignis-lab-label">FORCED FLOW</text>
        </g>
        <g {...pick('sample')}>
          <rect x="343" y="190" width="220" height="105" fill="transparent"/>
          <rect x="371" y="275" width="173" height="11" rx="3" fill="url(#lab-strip)" stroke="#f4dcbb" strokeWidth="1"/>
          <ellipse cx="416" cy="246" rx="62" ry="36" fill="url(#lab-fire-halo)" className="ignis-lab-halo"/>
          <path d="M385 275 Q372 250 394 229 Q403 211 428 215 Q457 220 477 245 Q446 236 429 262 Q416 251 411 275Z" fill="#efa66c" opacity=".91" className="ignis-lab-solid-flame"/>
          <path d="M396 275 Q394 245 414 236 Q423 238 436 249 Q418 248 413 275Z" fill="#ffe0a3"/>
          <text x="452" y="310" textAnchor="middle" className="ignis-lab-label">SOLID FUEL STRIP</text>
        </g>
        <g {...pick('imaging')}>
          <rect x="607" y="187" width="78" height="79" rx="9" fill="#1c4257" stroke="#78b9ca" strokeWidth="2"/>
          <circle cx="643" cy="224" r="22" fill="#071d2c" stroke="#8dccd8" strokeWidth="2"/>
          <circle cx="643" cy="224" r="10" fill="#2c91aa"/>
          <text x="644" y="290" textAnchor="middle" className="ignis-lab-label">IMAGING</text>
        </g>
      </>}
      <text x="31" y="410" className="ignis-lab-scene-meta">CLICK A COMPONENT TO INSPECT ORIGINAL NASA FIELDS</text>
      <text x="747" y="410" textAnchor="end" className="ignis-lab-scene-meta">MODEL VIEW {Math.round(progress)}%</text>
    </svg>
    <div className="ignis-lab-timeline" role="progressbar" aria-label="Illustrative playback progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
      <span style={{ width: `${progress}%` }}/>
    </div>
  </div>;
}

function FieldEvidence({ record, focus, fields }: { record: TestRecord; focus: Focus; fields: EvidenceField[] }) {
  const keys = FIELD_NAMES[record.source_id][focus];
  const selected = keys.map(key => ({ key, value: record.raw_fields[key], citation: fields.find(f => f.field_name === key) }))
    .filter(row => row.value !== undefined && row.value !== '');
  return <div className="ignis-lab-evidence-list">
    {selected.length ? selected.map(row => <div className="ignis-lab-evidence-row" key={row.key}>
      <span>{row.key}</span><strong>{row.value}</strong>
      {row.citation && <details><summary>Trace original field</summary><code>{row.citation.evidence_id}</code></details>}
    </div>) : <p className="ignis-lab-muted">No matching original field in this imported record.</p>}
  </div>;
}

export function MicrogravityLaboratory() {
  const { experiments, sources, loading, error, reload } = useCatalog();
  const [source, setSource] = useState<SourceId>('PSI-69');
  const records = useMemo(() => experiments.filter(r => r.source_id === source), [experiments, source]);
  const [recordId, setRecordId] = useState('');
  const record = records.find(r => r.id === recordId) || records[0];
  const [focus, setFocus] = useState<Focus>('sample');
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [particlesVisible, setParticlesVisible] = useState(true);
  const [evidence, setEvidence] = useState<EvidenceField[]>([]);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [metricId, setMetricId] = useState('');
  const options = useMemo(() => metricOptions(records), [records]);
  const selectedMetric = options.find(o => o.id === metricId) || options[0];
  const chartRows = selectedMetric ? metricChartRows(records, selectedMetric) : [];
  const sourceInfo = sources.find(s => s.source_id === source);
  const apparatusUrl = source === 'PSI-69'
    ? 'https://gipoc.grc.nasa.gov/wp/fcf-cir/flex/'
    : 'https://ntrs.nasa.gov/citations/20210011385';
  const sourceLink = sourceInfo?.url?.startsWith('https://psi.nasa.gov/physci/repo/')
    ? sourceInfo.url : laboratorySourceUrl(source);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setProgress(current => {
        const next = Math.min(100, current + 1.5);
        if (next >= 100) window.clearInterval(timer);
        return next;
      });
    }, 120);
    return () => window.clearInterval(timer);
  }, [playing]);
  useEffect(() => { if (progress >= 100 && playing) setPlaying(false); }, [playing, progress]);
  useEffect(() => {
    if (!record) { setEvidence([]); return; }
    let active = true;
    setEvidence([]); setEvidenceError(null);
    void api.evidence(record.id).then(result => { if (active) setEvidence(result.evidence_fields); })
      .catch(reason => { if (active) setEvidenceError(reason instanceof Error ? reason.message : 'Evidence currently unavailable'); });
    return () => { active = false; };
  }, [record?.id]);

  const chooseSource = (next: SourceId) => {
    setSource(next); setRecordId(''); setFocus('sample'); setProgress(0); setPlaying(false); setMetricId('');
  };
  const chooseRecord = (next: string) => {
    setRecordId(next); setProgress(0); setPlaying(false);
  };

  if (loading) return <Loading label="Loading NASA experiment records…"/>;
  if (error) return <ApiError message={error} onRetry={() => void reload()}/>;
  if (!record) return <div className="page-stack ignis-lab-v2"><h1>Microgravity Laboratory</h1><p>No validated experiment records have been imported.</p><Link to="/sync">Explore NASA sources</Link></div>;

  const highlightKeys = source === 'PSI-69' ? ['initial_droplet_diameter_mm', 'burn_time_s'] : ['calibrated_initial_o2_percent_by_volume', 'calibrated_final_o2_percent_by_volume'];
  const mainMetrics = highlightKeys.flatMap(key => record.metrics[key] ? [{ key, metric: record.metrics[key] }] : []);
  return <main className="page-stack ignis-lab-v2">
    <header className="ignis-lab-intro">
      <div><span className="eyebrow">IGNIS / LABORATORY</span><h1>Interactive Microgravity Laboratory</h1>
        <p>Explore fire in microgravity. Choose a fuel, inspect the apparatus, and trace real NASA evidence.</p></div>
      <Link to="/mission" className="ignis-lab-toplink">Guided mission <ArrowRight size={15}/></Link>
    </header>

    <section className="ignis-lab-controls" aria-label="Choose an experiment">
      <div className="ignis-lab-fuel-switch" aria-label="Choose fuel type">
        <button type="button" aria-label="FLEX • Droplet combustion" aria-pressed={source === 'PSI-69'} className={source === 'PSI-69' ? 'active' : ''} onClick={() => chooseSource('PSI-69')}>
          <span className="ignis-lab-fuel-number">01</span><span><strong>Liquid fuel</strong><small>FLEX · droplet combustion</small></span>
        </button>
        <button type="button" aria-label="BASS-II • Solid fuels" aria-pressed={source === 'PSI-25'} className={source === 'PSI-25' ? 'active' : ''} onClick={() => chooseSource('PSI-25')}>
          <span className="ignis-lab-fuel-number">02</span><span><strong>Solid fuel</strong><small>BASS-II · flow duct</small></span>
        </button>
      </div>
      <div className="ignis-lab-choose-test">
        <label htmlFor="ignis-lab-record">NASA test record</label>
        <select id="ignis-lab-record" value={record.id} onChange={event => chooseRecord(event.target.value)}>
          {records.map(item => <option key={item.id} value={item.id}>{item.test_id} — {item.fuel_material_raw}</option>)}
        </select>
        <span>{recordScopeLabel(records.length)} · <Link to="/sync">Find more source files</Link></span>
      </div>
    </section>

    <section className="ignis-lab-main" aria-label="Interactive microgravity laboratory demonstration">
      <div className="ignis-lab-view">
        <div className="ignis-lab-view-top"><span className="ignis-lab-overline">SCIENTIFIC SETUP VIEW</span><span>Illustrative behavior</span></div>
        <LabScene source={source} focus={focus} playing={playing} particlesVisible={particlesVisible} progress={progress} onFocus={setFocus}/>
        <div className="ignis-lab-player">
          <div className="ignis-lab-player-buttons">
            <button type="button" className="ignis-lab-play" onClick={() => {if (progress === 100) setProgress(0); setPlaying(!playing);}}>
              {playing ? <CirclePause size={18}/> : <CirclePlay size={18}/>}{playing ? 'Pause model' : progress === 100 ? 'Replay model' : 'Play model'}
            </button>
            <button type="button" onClick={() => {setPlaying(false);setProgress(0);}}><RotateCcw size={16}/> Reset</button>
          </div>
          <label className="ignis-lab-particle-toggle"><input type="checkbox" checked={particlesVisible} onChange={event => setParticlesVisible(event.target.checked)}/> Show gas particles</label>
        </div>
        <p className="ignis-lab-quiet-note">Qualitative visualization only · particle positions, flame motion and playback time are illustrative, not NASA measurements.</p>
        <div className="ignis-lab-focus-tabs">{FOCUS.map(({id,label,icon:Icon}) => <button type="button" key={id} className={focus === id ? 'active' : ''} onClick={() => setFocus(id)} aria-pressed={focus===id}><Icon size={15}/>{label}</button>)}</div>
      </div>
      <aside className="ignis-lab-record-panel">
        <div className="ignis-lab-record-head"><span className="eyebrow">RECORDED NASA EVIDENCE</span><strong>{record.test_id}</strong></div>
        <p className="ignis-lab-record-description">{FOCUS_EXPLANATION[source][focus]}</p>
        {mainMetrics.length > 0 && <div className="ignis-lab-mini-metrics">{mainMetrics.map(({key,metric}) => <div key={key}><span>{metric.original_column}</span><strong>{formatMetric(metric)}</strong></div>)}</div>}
        {record.reported_test_end && <p className="ignis-lab-outcome">{qualitativeOutcome(record.reported_test_end)}</p>}
        <div className="ignis-lab-record-fields"><h3>{FOCUS.find(x=>x.id===focus)?.label} · original fields</h3>
          {evidenceError && <p className="ignis-lab-muted">Evidence lookup temporarily unavailable: {evidenceError}</p>}
          <FieldEvidence record={record} focus={focus} fields={evidence}/>
        </div>
        <div className="ignis-lab-source-links"><Link to={`/passport/${encodeURIComponent(record.id)}`} className="button button-primary"><Database size={15}/> Open complete Evidence Passport <ChevronRight size={15}/></Link>
          <a href={sourceLink} target="_blank" rel="noopener noreferrer">Original NASA PSI investigation <ArrowUpRight size={14}/></a>
          <a href={apparatusUrl} target="_blank" rel="noopener noreferrer">NASA apparatus reference <ArrowUpRight size={14}/></a>
          {sourceInfo?.doi && <span>DOI: {sourceInfo.doi}</span>}
        </div>
      </aside>
    </section>

    <div className="ignis-lab-lower">
      <details className="ignis-lab-chart-details">
        <summary><Gauge size={19}/><span><strong>Compare real measurements</strong><small>Recorded values only · same investigation</small></span><ChevronDown size={16}/></summary>
        <div className="ignis-lab-chart-content">
          <label className="field"><span>Measurement</span><select value={selectedMetric?.id || ''} onChange={event => setMetricId(event.target.value)}>{options.map(option => <option value={option.id} key={option.id}>{option.label} ({option.unit})</option>)}</select></label>
          {selectedMetric ? <ScienceChart rows={chartRows} label={selectedMetric.label} unit={selectedMetric.unit}/> : <p>No comparable normalized metric available in these records.</p>}
          <Link to="/compare">Open Comparison Lab <ArrowRight size={15}/></Link>
        </div>
      </details>
      <div className="ignis-lab-value"><span className="eyebrow">WHY THIS MATTERS</span><p><strong>Researchers</strong> inspect experimental conditions and trace values. <strong>Students</strong> explore microgravity behavior visually. <strong>Everyone</strong> can distinguish evidence from illustration.</p></div>
    </div>
    <p className="ignis-lab-footer-note">Three tests per investigation are currently imported, not the complete NASA PSI archive. New validated imports can appear in the selector automatically. This is an explanatory model, not a physical solver, live ISS feed, or fire-safety predictor.</p>
  </main>;
}
