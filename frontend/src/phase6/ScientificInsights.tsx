import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, BookOpen, Check, ClipboardCopy, ExternalLink, FileCheck2, ShieldAlert, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, Notice, PageHeading, Panel } from '../components/Ui';
import { siApi } from './client';
import { citationsResolve, evidenceFor, safeClaims } from './science';
import type { AskResponse, GroundedClaim, SICapabilities } from './types';
import './phase6.css';
import { RagAssistant } from '../phase10/RagAssistant';

const examples = [
  'What was the burn time of FLEX test 20CAL10?',
  'Which imported methanol tests ended in extinction?',
  'Compare burn times of 20CAL10 and 20CAL12',
  'How does airflow influence flame spread?',
];

function CitationChips({ result, claim }: { result: AskResponse; claim: GroundedClaim }) {
  const [copied, setCopied] = useState<string | null>(null);
  return <div className="p6-citations" aria-label="Exact evidence citations">
    {evidenceFor(result, claim).map((e) => <div className="p6-citation" key={e.evidence_id}>
      <div className="p6-citation-head"><FileCheck2 size={14}/><span>{e.record_id} · {e.field_name}</span></div>
      <strong>{e.original_value}</strong>
      <code title={e.evidence_id}>{e.evidence_id}</code>
      <div className="p6-citation-actions">
        <button type="button" onClick={() => void navigator.clipboard.writeText(e.evidence_id)
          .then(() => setCopied(e.evidence_id)).catch(() => setCopied(null))}>
          {copied === e.evidence_id ? <Check size={13}/> : <ClipboardCopy size={13}/>} Copy ID
        </button>
        <Link to={`/passport/${encodeURIComponent(e.record_id)}`}>Passport</Link>
        <a href={e.source_url} target="_blank" rel="noopener noreferrer">NASA PSI <ExternalLink size={12}/></a>
      </div>
    </div>)}
  </div>;
}

export function ScientificInsights() {
  const [question, setQuestion] = useState(examples[0]);
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [capabilities, setCapabilities] = useState<SICapabilities | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void siApi.capabilities(controller.signal).then(setCapabilities).catch(() => {});
    return () => { controller.abort(); current.current?.abort(); };
  }, []);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!question.trim()) return;
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setLoading(true); setError(null); setAnswer(null);
    try {
      const result = await siApi.ask({ question: question.trim() }, controller.signal);
      if (!controller.signal.aborted) setAnswer(result);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Scientific intelligence request failed');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const integrity = answer ? citationsResolve(answer) : false;
  const showAnswer = answer?.status === 'answered' && integrity;
  return <div className="page-stack">
    <PageHeading eyebrow="SCIENTIFIC INTELLIGENCE / EVIDENCE FIRST" title="Evidence-Grounded SI"
      description="Ask about imported NASA PSI test records. Each supported observation links to its original source-table field and stable evidence ID."/>
    <RagAssistant/>
    <Panel className="p6-query-panel">
      <form onSubmit={(event) => void submit(event)}>
        <label className="field-label" htmlFor="si-question">YOUR RESEARCH QUESTION</label>
        <textarea id="si-question" value={question} maxLength={500} rows={3} required
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask for a recorded test value or an evidence-backed comparison…"/>
        <div className="p6-form-footer"><span>Offline, deterministic • No LLM • No synthetic NASA measurements</span>
          <button className="button button-primary" type="submit" disabled={loading || !question.trim()}>
            {loading ? 'Checking evidence…' : 'Analyze evidence'} <ArrowRight size={16}/>
          </button></div>
      </form>
      <div className="p6-examples"><span>Try:</span>{examples.map((q) => <button key={q} type="button" onClick={() => setQuestion(q)}>{q}</button>)}</div>
    </Panel>
    <Notice title="Research boundary" tone="info">This assistant reports directly observed table values and limited descriptive comparisons. It abstains from causation, prediction, and spacecraft fire-safety recommendations.</Notice>
    {loading && <p className="p6-pending" role="status">Validating the imported catalog and tracing source fields…</p>}
    {error && <ApiError message={error} onRetry={() => void submit()}/>}
    {answer && <div className="page-stack" aria-live="polite">
      <Panel title="Scientific intelligence result" description={`Method: ${answer.method} · Imported records: ${answer.imported_record_count}`}>
        {answer.status === 'abstained' ? <div className="p6-abstain" role="status">
          <ShieldAlert size={25}/><div><strong>Insufficient evidence — answer withheld</strong><p>{answer.abstention_reason}</p></div>
        </div> : !integrity ? <div className="p6-abstain" role="alert"><ShieldAlert size={24}/>
          <strong>Evidence references could not be resolved. Claims are hidden.</strong></div>
          : <><div className="p6-answer-status"><Sparkles size={17}/> Supported source-table observations · {answer.source_record_ids.length} cited records</div>
            <p className="p6-answer">{answer.answer}</p></>}
      </Panel>
      {showAnswer && <Panel title="Direct observations" description="These statements quote values from original imported table columns; citations are machine-checkable.">
        <div className="p6-claim-list">{safeClaims(answer).map((claim, index) => <article className="p6-claim" key={index}>
          <span className="p6-kind">OBSERVATION {index + 1}</span><p>{claim.text}</p>
          <CitationChips result={answer} claim={claim}/>
        </article>)}</div>
      </Panel>}
      {showAnswer && answer.interpretations.length > 0 && <Panel title="Qualified interpretations" description="Only descriptive statements; no causal or safety inference.">
        <div className="p6-claim-list">{answer.interpretations.map((claim, index) => <article className="p6-claim" key={index}>
          <span className="p6-kind p6-interpretation"><BookOpen size={13}/> DESCRIPTIVE INTERPRETATION</span>
          <p>{claim.text}</p><CitationChips result={answer} claim={claim}/>
        </article>)}</div>
      </Panel>}
      <Panel title="Scientific limitations">
        <ul className="p6-limitations">{answer.limitations.map((text, index) => <li key={index}>{text}</li>)}</ul>
        <p className="p6-footnote">Independent NASA live-table verification: <strong>{answer.independent_nasa_verification.replaceAll('_', ' ')}</strong></p>
      </Panel>
    </div>}
    {capabilities && <details className="p6-capabilities"><summary>What this SI engine can and cannot answer</summary>
      <div className="p6-capabilities-grid"><div><h3>Supported</h3><ul>{capabilities.supported.map((s) => <li key={s}>{s}</li>)}</ul></div>
        <div><h3>Not supported</h3><ul>{capabilities.unsupported.map((s) => <li key={s}>{s}</li>)}</ul></div></div>
    </details>}
  </div>;
}
