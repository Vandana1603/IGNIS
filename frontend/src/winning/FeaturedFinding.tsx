import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, FileCheck2, GitCompareArrows } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TestRecord } from '../lib/types';
import { phase5 } from '../phase5/client';
import type { AdvancedCompareResponse } from '../phase5/types';
import { chooseExtinctionPair, differentRecordedConditions, supportedBurnTimePair } from './science';
import './winning.css';

export function FeaturedFinding({ records }: { records: TestRecord[] }) {
  const chosen = useMemo(() => chooseExtinctionPair(records), [records]);
  const left = chosen?.[0];
  const right = chosen?.[1];
  const [comparison, setComparison] = useState<AdvancedCompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setComparison(null);
    setError(null);
    if (!left || !right) return;
    const controller = new AbortController();
    void phase5.compare(left.id, right.id, controller.signal)
      .then(setComparison)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Evidence check unavailable');
      });
    return () => controller.abort();
  }, [left?.id, right?.id]);

  const burn = left && right ? supportedBurnTimePair(comparison, left.id, right.id) : null;
  const conditions = comparison ? differentRecordedConditions(comparison) : [];
  const max = burn ? Math.max(burn.left_value, burn.right_value, 0) : 0;

  return <article className="ignite-feature winning-finding" aria-labelledby="winning-finding-heading">
    <div className="ignite-feature-head">
      <span className="ignite-kicker"><FileCheck2 size={15}/> RESEARCH FINDING · NASA PSI-69</span>
      <Link to="/mission" aria-label="Open guided research mission"><ArrowUpRight size={18}/></Link>
    </div>
    <h2 id="winning-finding-heading">Same ending. Different starting conditions.</h2>
    <p className="ignite-muted">A source-linked look at two imported FLEX extinction records.</p>
    {!chosen && <p className="winning-subtle">At least two compatible, imported extinction records are needed for this finding. Browse the Experiment Explorer for available data.</p>}
    {chosen && !comparison && !error && <p role="status" className="winning-subtle">Checking original fields and scientific comparability…</p>}
    {error && <p role="status" className="winning-subtle">Evidence check unavailable: {error}. The finding is hidden until the guard can validate it.</p>}
    {comparison && !burn && <p role="status" className="winning-subtle">These records do not pass the same-definition evidence check for a burn-time comparison.</p>}
    {burn && left && right && <>
      <div className="winning-measure-grid" aria-label="Recorded burn times, descriptive comparison only">
        {[
          { record: left, value: burn.left_value, original: burn.left_original_value, id: burn.left_evidence_id },
          { record: right, value: burn.right_value, original: burn.right_original_value, id: burn.right_evidence_id },
        ].map(item => <div className="winning-measure" key={item.record.id}>
          <span>{item.record.test_id} <small>· EXTINCTION</small></span>
          <strong>{item.original} <small>{burn.unit}</small></strong>
          <div className="winning-meter" aria-hidden="true"><div style={{ width: `${max > 0 ? Math.max(item.value / max * 100, 1) : 0}%` }}/></div>
          <Link to={`/passport/${encodeURIComponent(item.record.id)}`}><FileCheck2 size={13}/> Evidence Passport <ArrowUpRight size={13}/></Link>
        </div>)}
      </div>
      <p className="winning-observation">Both tests report <strong>Extinction</strong>. {conditions.length ? `Their recorded conditions differ (${conditions.join('; ')}).` : 'The available context fields do not establish controlled experimental conditions.'} No causal conclusion follows from the burn-time difference.</p>
      <details className="winning-evidence-details"><summary>Show original evidence IDs</summary><div><code>{burn.left_evidence_id}</code><code>{burn.right_evidence_id}</code></div></details>
    </>}
    <div className="winning-finding-footer">
      <span>Curated NASA PSI-69 table · descriptive only</span>
      <Link to={left && right ? `/compare?left=${encodeURIComponent(left.id)}&right=${encodeURIComponent(right.id)}` : '/experiments'}><GitCompareArrows size={15}/> {left && right ? 'Inspect comparison' : 'Browse records'} <ArrowRight size={14}/></Link>
    </div>
  </article>;
}
