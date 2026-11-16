import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, FileCheck2, Filter, Info, Search as SearchIcon, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { MatchMode, SearchResponse, SourceId, TestOutcome } from '../lib/types';
import { formatNumber } from '../lib/science';
import { ApiError, Empty, ExternalSource, Notice, PageHeading, Panel, SourceBadge } from '../components/Ui';

export function Research() {
  const [query, setQuery] = useState('methanol extinction');
  const [investigation, setInvestigation] = useState<SourceId | ''>('');
  const [mode, setMode] = useState<MatchMode>('all_values');
  const [outcome, setOutcome] = useState<TestOutcome | ''>('');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const response = await api.search({
        query: query.trim(), match_mode: mode,
        investigation: investigation || null, outcome: outcome || null, limit: 30,
      });
      setResult(response);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Research search failed'); }
    finally { setLoading(false); }
  }

  return <div className="page-stack">
    <PageHeading eyebrow="RESEARCH / EVIDENCE RETRIEVAL" title="Research Intelligence"
      description="Find NASA experimental records and inspect exactly why each result matched."/>
    <Panel className="search-panel">
      <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="research-query" className="field-label">RESEARCH QUESTION OR SEARCH TERMS</label>
        <div className="search-input-row"><SearchIcon size={21}/><input id="research-query" value={query} maxLength={300}
          onChange={(event) => setQuery(event.target.value)} placeholder="e.g. methanol extinction" required/>
          <button type="submit" className="button button-primary" disabled={loading || !query.trim()}>{loading ? 'Searching…' : 'Search evidence'}<ArrowRight size={16}/></button>
        </div>
        <div className="filter-grid">
          <label className="field"><span><Filter size={13}/> Investigation</span><select value={investigation} onChange={(e) => setInvestigation(e.target.value as SourceId | '')}>
            <option value="">Both investigations</option><option value="PSI-25">BASS-II / PSI-25</option><option value="PSI-69">FLEX / PSI-69</option>
          </select></label>
          <label className="field"><span>Matching rule</span><select value={mode} onChange={(e) => setMode(e.target.value as MatchMode)}>
            <option value="all_values">All terms in original values</option><option value="all">All terms (labels or values)</option><option value="any">Any matching term</option>
          </select></label>
          <label className="field"><span>Recorded test ending</span><select value={outcome} onChange={(e) => setOutcome(e.target.value as TestOutcome | '')}>
            <option value="">Any / not reported</option><option value="Extinction">Extinction</option><option value="Disruption">Disruption</option>
          </select></label>
        </div>
      </form>
      <div className="search-hints"><span>Try a source-grounded query:</span>
        {['methanol extinction', 'PMMA', 'Disruption', 'Calibrated'].map((hint) =>
          <button type="button" key={hint} onClick={() => { setQuery(hint); setOutcome(''); setInvestigation(''); setMode('any'); }}>{hint}</button>)}
      </div>
    </Panel>

    <Notice title="What SI means at this stage">This phase provides transparent lexical retrieval, not an LLM-generated scientific answer. Scores are application-defined relevance values—not fire risk, scientific importance, or proof of causation.</Notice>
    {error && <ApiError message={error} onRetry={() => void submit()}/>}
    {loading && <div className="loading-line" role="status">Searching indexed NASA table fields…</div>}
    {result && <div className="page-stack">
      <div className="results-header"><div><span className="eyebrow">SEARCH RESULTS</span><h2>{result.total_matches} matching records</h2><p>Ranking method: <code>{result.ranking_method}</code> • Match mode: {result.match_mode}</p></div>
        <span className="subtle-pill">{result.returned_count} displayed</span>
      </div>
      {result.notices.map((notice, i) => <Notice key={i} tone={result.answer_status === 'insufficient_evidence_for_inference' ? 'warning' : 'info'}>{notice}</Notice>)}
      {result.results.length === 0 && <Empty title="No matching imported records" description="Try a different source-grounded term or relax the matching rule. This does not mean NASA has no research on the topic."/>}
      <div className="results-list">
        {result.results.map((record, i) => <article className="result-card" key={record.record_id}>
          <div className="result-card-top"><div className="result-title-row"><span className="result-rank">{String(i + 1).padStart(2, '0')}</span><SourceBadge sourceId={record.source_id}/><h3>{record.test_id}</h3>{record.reported_test_end && <span className="subtle-pill">{record.reported_test_end}</span>}</div>
            <div className="relevance"><strong>{formatNumber(record.relevance_score, 4)}</strong><span>retrieval score</span></div>
          </div>
          <p className="result-material">Original material/fuel: <strong>{record.fuel_material_raw}</strong></p>
          <div className="term-row">{record.matched_terms.map((term) => <span key={term} className="term-chip">{term}</span>)}
            {record.unmatched_terms.map((term) => <span key={term} className="term-chip term-unmatched">Not matched: {term}</span>)}
          </div>
          <div className="evidence-preview"><div className="small-heading"><FileCheck2 size={15}/> MATCHED SOURCE-TABLE EVIDENCE</div>
            {record.evidence_matches.slice(0, 4).map((match) => <div key={match.evidence.evidence_id} className="evidence-preview-row">
              <span>{match.evidence.field_name}</span><strong>{match.evidence.original_value}</strong><small>Matched in {match.matched_in}</small>
            </div>)}
            {record.evidence_matches.length > 4 && <p className="muted-small">+{record.evidence_matches.length - 4} more matching fields in the Evidence Passport</p>}
          </div>
          <details className="score-details"><summary><Info size={15}/> How this result was ranked</summary>
            <div className="score-detail-content">{record.score_contributions.map((item) => <div key={`${item.term}-${item.evidence_id}`}><span>{item.term} • {item.matched_in}</span><strong>+{formatNumber(item.contribution, 6)}</strong></div>)}
              <p>Contributions are weighted token matches, not experimental measurements.</p></div>
          </details>
          <div className="result-actions"><Link to={`/passport/${encodeURIComponent(record.record_id)}`} className="button button-secondary"><FileCheck2 size={16}/> Evidence Passport</Link>
            {record.evidence_matches[0] && <ExternalSource href={record.evidence_matches[0].evidence.source_url}>Original NASA source</ExternalSource>}
          </div>
        </article>)}
      </div>
    </div>}
    {!result && !error && !loading && <div className="research-placeholder"><Sparkles size={24}/><h3>Trace a research question back to evidence</h3><p>Search your imported NASA PSI records to reveal ranked matches, original values, and transparent score contributions.</p></div>}
  </div>;
}
