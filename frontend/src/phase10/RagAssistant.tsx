import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpenCheck, ExternalLink, MessageSquareText, SearchCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import './rag.css';

type Citation = {
  evidence_id: string; record_id: string; source_id: string;
  field_name: string; original_value: string; source_locator: string;
  source_url: string; doi: string;
};
type RagResponse = {
  status: 'answered' | 'abstained'; question: string; answer: string;
  citations: Citation[]; mode_requested: string; mode_used: string;
  reason: string | null; ai_model: string | null; notices: string[];
};
type Status = { imported_record_count: number; ai_available: boolean; };
const ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export function RagAssistant() {
  const [question, setQuestion] = useState('What was the fan display of B10?');
  const [mode, setMode] = useState<'extractive' | 'ai_assisted'>('extractive');
  const [status, setStatus] = useState<Status | null>(null);
  const [result, setResult] = useState<RagResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${ROOT}/v10/rag/status`, {signal: controller.signal})
      .then(r => { if (!r.ok) throw Error('Not available'); return r.json() as Promise<Status>; })
      .then(setStatus).catch(() => {});
    return () => controller.abort();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(`${ROOT}/v10/rag/ask`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({question:question.trim(), mode, max_records:8}), signal:controller.signal,
        });
        if (!res.ok) throw Error(`Evidence service returned HTTP ${res.status}`);
        const payload = await res.json() as RagResponse;
        if (!['answered','abstained'].includes(payload.status) || !Array.isArray(payload.citations))
          throw Error('Unexpected evidence response');
        setResult(payload);
      } finally {window.clearTimeout(timer);}
    } catch (cause) {setError(cause instanceof Error ? cause.message : 'Evidence retrieval failed');}
    finally {setBusy(false);}
  }
  return <details className="rag-compact">
    <summary className="rag-summary"><span className="rag-summary-icon"><BookOpenCheck size={19}/></span>
      <span><strong>Extended evidence retrieval</strong><small>Search the expanded NASA PSI catalog · Optional AI-assisted wording</small></span>
      <span className="rag-counter">{status ? `${status.imported_record_count} records` : 'Evidence-first'}</span>
    </summary>
    <div className="rag-body">
      <form onSubmit={e => void submit(e)} className="rag-form">
        <label htmlFor="rag-question">Research question</label>
        <div className="rag-question-row">
          <input id="rag-question" value={question} maxLength={500} onChange={e => setQuestion(e.target.value)}
            placeholder="Ask about a test, material, or recorded condition"/>
          <button type="submit" disabled={busy || !question.trim()}><SearchCheck size={16}/>{busy ? 'Retrieving…' : 'Retrieve'}</button>
        </div>
        <fieldset className="rag-mode" aria-label="Answer mode">
          <label><input type="radio" name="rag-mode" checked={mode==='extractive'} onChange={() => setMode('extractive')}/> Original evidence</label>
          <label><input type="radio" name="rag-mode" checked={mode==='ai_assisted'} onChange={() => setMode('ai_assisted')}/> AI-assisted wording {status && !status.ai_available && <em>(server not configured)</em>}</label>
        </fieldset>
      </form>
      {error && <p role="alert" className="rag-feedback">{error}</p>}
      {result && <div className="rag-result" aria-live="polite">
        <div className="rag-result-head"><MessageSquareText size={16}/><strong>{result.status==='answered'?'Source-linked observation':'Insufficient evidence'}</strong>
          <span>{result.mode_used.replaceAll('_',' ')}</span></div>
        {result.status === 'answered' ? <p className="rag-answer">{result.answer}</p> : <p>{result.reason}</p>}
        {result.citations.length > 0 && <div className="rag-citation-list">
          {result.citations.map(c => <div key={c.evidence_id} className="rag-citation">
            <div><strong>{c.record_id}</strong><span>{c.field_name}</span></div>
            <code>{c.original_value}</code>
            <div className="rag-actions"><Link to={`/passport/${encodeURIComponent(c.record_id)}`}>Evidence Passport</Link>
              <a href={c.source_url} target="_blank" rel="noopener noreferrer">NASA PSI <ExternalLink size={12}/></a></div>
          </div>)}
        </div>}
        <p className="rag-disclaimer">{result.notices.join(' ')}</p>
      </div>}
      <p className="rag-boundary">Historical NASA PSI table excerpts. No live ISS telemetry or validated fire-safety predictions. Model-generated wording, when enabled, requires human review.</p>
    </div>
  </details>;
}
