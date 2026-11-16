import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { ApiError, Notice, Panel } from '../components/Ui';
import { phase5 } from './client';
import { comparisonBlocked, countDifferentContext, relationLabel, safeNumericPairs } from './science';
import type { AdvancedCompareResponse } from './types';
import './phase5.css';

export function ComparisonAuditPanel({ leftId, rightId }: { leftId: string; rightId: string }) {
  const [data, setData] = useState<AdvancedCompareResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leftId || !rightId) { setData(null); return; }
    const controller = new AbortController();
    setBusy(true); setData(null); setError(null);
    void phase5.compare(leftId, rightId, controller.signal)
      .then(setData)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Advanced comparison failed');
      })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [leftId, rightId]);

  return <Panel title="Advanced Comparability Guard" description="Checks exact source fields and recorded context; no numerical tolerance or safety threshold is assumed.">
    {busy && <p role="status" className="p5-muted">Checking both source rows and their recorded experimental context…</p>}
    {error && <ApiError message={error}/>}
    {data && <div className="p5-stack">
      <div className={`p5-status ${comparisonBlocked(data) ? 'p5-warn' : 'p5-ok'}`}>
        {comparisonBlocked(data) ? <ShieldAlert size={20}/> : <ShieldCheck size={20}/>}
        <div><strong>{data.category.replaceAll('_', ' ')}</strong>
          <p>{comparisonBlocked(data) ? 'Joint numeric comparison blocked.' :
            `${countDifferentContext(data)} recorded context fields differ. Numeric fields remain descriptive only.`}</p></div>
      </div>
      {data.context_checks.length > 0 && <>
        <h3 className="p5-subtitle">Recorded context checks</h3>
        <div className="p5-table-scroll"><table className="p5-table"><thead><tr><th>Original column</th><th>{data.left_id}</th><th>{data.right_id}</th><th>Check</th></tr></thead><tbody>
          {data.context_checks.map((check) => <tr key={check.original_column}>
            <td>{check.original_column}<small>{check.role.replaceAll('_', ' ')}</small></td>
            <td className="p5-mono">{check.left_raw ?? 'Not reported'}</td>
            <td className="p5-mono">{check.right_raw ?? 'Not reported'}</td>
            <td><strong>{relationLabel(check)}</strong><small>{check.note}</small></td>
          </tr>)}
        </tbody></table></div>
      </>}
      {safeNumericPairs(data).length > 0 && <>
        <h3 className="p5-subtitle">Same-definition numeric fields (descriptive only)</h3>
        <div className="p5-table-scroll"><table className="p5-table"><thead><tr><th>Original column</th><th>{data.left_id}</th><th>{data.right_id}</th><th>Unit / evidence IDs</th></tr></thead><tbody>
          {safeNumericPairs(data).map((m) => <tr key={m.key}>
            <td>{m.original_column}</td>
            <td className="p5-mono">{m.left_original_value}</td>
            <td className="p5-mono">{m.right_original_value}</td>
            <td>{m.unit}<small className="p5-mono">A: {m.left_evidence_id}</small><small className="p5-mono">B: {m.right_evidence_id}</small></td>
          </tr>)}
        </tbody></table></div>
      </>}
      {data.excluded_metrics.length > 0 && <Notice tone="warning">
        {data.excluded_metrics.map((m) => <div key={m.key}>{m.key}: {m.reason}</div>)}
      </Notice>}
      {data.notices.map((notice, i) => <Notice key={i} tone="warning">{notice}</Notice>)}
    </div>}
  </Panel>;
}
