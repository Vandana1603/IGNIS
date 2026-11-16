import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Atom, Check, FileCheck2, GitCompareArrows, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, Loading } from '../components/Ui';
import { useCatalog } from '../context/CatalogContext';
import { formatMetric } from '../lib/science';
import { InvestigationAtlas } from '../winning/InvestigationAtlas';
import { ExplorationGap } from '../winning/ExplorationGap';
import { differentRecordedConditions, supportedBurnTimePair } from '../winning/science';
import { phase5 } from '../phase5/client';
import type { AdvancedCompareResponse } from '../phase5/types';
import { siApi } from '../phase6/client';
import type { AskResponse } from '../phase6/types';
import './mission.css';

const STEPS = [
  { title: 'Explore', short: 'Apparatus', icon: Atom },
  { title: 'Observe', short: 'Measurements', icon: FileCheck2 },
  { title: 'Compare', short: 'Context', icon: GitCompareArrows },
  { title: 'Question', short: 'Scientific limits', icon: Lightbulb },
];
export function MissionExperience() {
  const { experiments, loading, error, reload } = useCatalog();
  const [step, setStep] = useState(0);
  const flex = useMemo(() => experiments.filter(r => r.source_id === 'PSI-69'), [experiments]);
  const a = flex.find(r => r.test_id === '20CAL10') || flex[0];
  const b = flex.find(r => r.test_id === '20CAL12') || flex.find(r => r.id !== a?.id);
  const [comparison, setComparison] = useState<AdvancedCompareResponse | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const featuredBurn = comparison && a && b && a.reported_test_end === 'Extinction' && b.reported_test_end === 'Extinction'
    ? supportedBurnTimePair(comparison, a.id, b.id) : null;

  useEffect(() => {
    if (step !== 2 || !a || !b) return;
    let active = true;
    setComparison(null); setCompareError(null);
    void phase5.compare(a.id, b.id).then(x => {if (active) setComparison(x);}).catch(e => { if (active) setCompareError(e instanceof Error ? e.message : 'Comparison request failed'); });
    return () => { active = false; };
  }, [step, a?.id, b?.id]);
  async function demonstrateAbstention() {
    setAsking(true); setAnswer(null); setAnswerError(null);
    try { setAnswer(await siApi.ask({ question: 'Which material is safest for a spacecraft?' })); }
    catch (e) { setAnswerError(e instanceof Error ? e.message : 'Scientific Intelligence is unavailable'); }
    finally { setAsking(false); }
  }
  if (loading) return <Loading label="Preparing the source-grounded research walkthrough…"/>;
  if (error) return <ApiError message={error} onRetry={() => void reload()}/>;
  return <div className="ignite-mission">
    <header className="ignite-mission-title"><span className="ignite-eyebrow">LIVE APPLICATION WALKTHROUGH · ORIGINAL NASA PSI FIELDS</span><h1>Follow the evidence.</h1><p>One research story. Four simple steps. Every measurement comes from the existing backend.</p></header>
    <nav className="ignite-stepper" aria-label="Guided research steps">{STEPS.map((s, i) => <button type="button" key={s.title} className={`${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`} aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}><span>{i < step ? <Check size={14}/> : String(i + 1).padStart(2, '0')}</span><strong>{s.title}</strong><small>{s.short}</small></button>)}</nav>
    <section className="ignite-step-content" aria-live="polite">
      {step === 0 && <><div className="ignite-step-tag"><Atom size={16}/> STEP 01 / EXPERIMENTAL SETUP</div><h2>Two experiments. Different physics.</h2><p>NASA's combustion investigations use different apparatus and fuel types. Explore each documented setup before interpreting its data.</p>
        <div className="ignite-two-labs"><Link to="/laboratory" className="ignite-lab-choice"><span>01 / SOLID FUEL</span><strong>BASS-II</strong><p>Sample strips and recorded flow-duct settings.</p><ArrowRight size={19}/></Link><Link to="/laboratory" className="ignite-lab-choice"><span>02 / LIQUID DROPLETS</span><strong>FLEX</strong><p>Droplet combustion, recorded pressure and outcomes.</p><ArrowRight size={19}/></Link></div>
        <small className="ignite-scope">Laboratory schematics are illustrative, not live NASA camera footage.</small>
        <details className="winning-atlas-disclosure"><summary><Atom size={16}/> Discover related NASA investigations <small>Shared hardware & context</small></summary><InvestigationAtlas records={experiments}/></details></>}
      {step === 1 && <><div className="ignite-step-tag"><FileCheck2 size={16}/> STEP 02 / RECORDED OBSERVATION</div><h2>A measurement you can trace.</h2><p>Read the original values from the imported FLEX records—not a generated simulation.</p>
        {a ? <div className="ignite-measurement"><span className="ignite-measurement-id">NASA PSI-69 · {a.test_id}</span><strong>{Object.values(a.metrics).find(m => m.original_column.toLowerCase().startsWith('burn time')) ? formatMetric(Object.values(a.metrics).find(m => m.original_column.toLowerCase().startsWith('burn time'))!) : 'Burn time not present'}</strong><span>Recorded burn time</span><div className="ignite-measurement-foot">Recorded ending: {a.reported_test_end || 'Not reported'} <Link to={`/passport/${encodeURIComponent(a.id)}`}>Trace evidence <ArrowRight size={15}/></Link></div></div> : <p>No FLEX records currently available.</p>}
        <small className="ignite-scope">Historical curated table transcription. Original NASA row and field trace provided in the Evidence Passport.</small></>}
      {step === 2 && <><div className="ignite-step-tag"><GitCompareArrows size={16}/> STEP 03 / SCIENTIFIC GUARDRAIL</div><h2>Differences need context.</h2><p>IGNIS compares recorded values and checks the experimental context before allowing interpretations.</p>
        <div className="ignite-comparison-mini"><div><span>TEST A</span><strong>{a?.test_id || 'Unavailable'}</strong><small>{a?.fuel_material_raw}</small></div><GitCompareArrows size={21}/><div><span>TEST B</span><strong>{b?.test_id || 'Unavailable'}</strong><small>{b?.fuel_material_raw}</small></div></div>
        {compareError && <p role="alert" className="ignite-compare-error">{compareError}</p>}
        {!comparison && !compareError && <span className="ignite-muted">Checking the Comparability Guard…</span>}
        {comparison && <div className="ignite-guard-result"><FileCheck2 size={19}/><div><strong>{comparison.category.replaceAll('_', ' ')}</strong><p>{differentRecordedConditions(comparison).length} recorded context fields differ. The displayed comparison is descriptive—not causal.</p></div></div>}
        {featuredBurn && a && b && <div className="winning-mission-observation"><strong>Recorded finding:</strong> {a.test_id}: {featuredBurn.left_original_value} {featuredBurn.unit} · {b.test_id}: {featuredBurn.right_original_value} {featuredBurn.unit}. Both reported endings: Extinction. <details><summary>Original burn-time evidence IDs</summary><code>{featuredBurn.left_evidence_id}</code><code>{featuredBurn.right_evidence_id}</code></details></div>}
        <Link className="ignite-inline-link" to={`/compare?left=${encodeURIComponent(a?.id || '')}&right=${encodeURIComponent(b?.id || '')}`}>Open full comparison <ArrowRight size={16}/></Link></>}
      {step === 3 && <><div className="ignite-step-tag"><Lightbulb size={16}/> STEP 04 / RESPONSIBLE SCIENCE</div><h2>Knowing when not to answer.</h2><p>A credible research assistant must refuse claims that the imported evidence cannot establish.</p>
        <div className="ignite-question"><span>ASK IGNIS</span><strong>“Which material is safest for a spacecraft?”</strong><button type="button" className="button button-primary" disabled={asking} onClick={() => void demonstrateAbstention()}>{asking ? 'Checking source evidence…' : 'Ask Scientific Intelligence'} <ArrowRight size={16}/></button></div>
        {answerError && <p role="alert" className="ignite-compare-error">{answerError}</p>}
        {answer && <div className="ignite-answer"><Lightbulb size={19}/><div><strong>{answer.status === 'abstained' ? 'Insufficient evidence · abstention' : `SI response: ${answer.status}`}</strong><p>{answer.abstention_reason || answer.answer}</p><small>Method: {answer.method.replaceAll('_', ' ')} · Independent NASA verification not performed</small></div></div>}
        <Link className="ignite-inline-link" to="/insights">Explore Scientific Intelligence <ArrowRight size={16}/></Link>
        <ExplorationGap/></>}
    </section>
    <footer className="ignite-step-footer"><button type="button" className="button button-ghost" disabled={step === 0} onClick={() => setStep(n => n - 1)}><ArrowLeft size={16}/> Previous</button><span>STEP {step + 1} OF {STEPS.length}</span>{step < 3 ? <button type="button" className="button button-primary" onClick={() => setStep(n => n + 1)}>Continue <ArrowRight size={16}/></button> : <Link className="button button-primary" to="/">Finish mission <Check size={16}/></Link>}</footer>
  </div>;
}
