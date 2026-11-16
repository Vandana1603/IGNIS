import { useEffect, useState } from 'react';
import { Check, ClipboardCopy, Fingerprint, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ApiError, ExternalSource, Notice, Panel } from '../components/Ui';
import { phase5 } from './client';
import { auditHashesAgree, fieldDisplay } from './science';
import type { PassportAudit } from './types';
import './phase5.css';

export function PassportAuditPanel({ recordId }: { recordId: string }) {
  const [data, setData] = useState<PassportAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(null); setData(null); setExpanded(null);
    void phase5.passport(recordId, controller.signal)
      .then(setData)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Evidence audit failed');
      })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [recordId]);

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(value); }
    catch { setCopied(null); }
  }

  return <Panel title="Advanced Evidence Audit" description="Original cells → normalized metrics → stable evidence IDs → source locators. Local integrity only.">
    {busy && <p className="p5-muted" role="status">Validating the curated NASA PSI transcription against the local import manifest…</p>}
    {error && <ApiError message={error}/>}
    {data && <div className="p5-stack">
      <div className={`p5-status ${auditHashesAgree(data) ? 'p5-ok' : 'p5-warn'}`}>
        {auditHashesAgree(data) ? <ShieldCheck size={20}/> : <ShieldAlert size={20}/>}
        <div><strong>{auditHashesAgree(data) ? 'Local consistency checks passed' : 'Integrity mismatch — do not rely on this record'}</strong>
          <p>Independent verification against NASA's live table: <strong>not performed</strong></p></div>
      </div>
      <div className="p5-meta-grid">
        <div><span>Original table locator</span><strong>{data.source_locator}</strong></div>
        <div><span>Curated source file</span><strong>{data.curated_filename}</strong></div>
        <div><span>NASA source DOI</span><ExternalSource href={`https://doi.org/${data.source_doi}`}>{data.source_doi}</ExternalSource></div>
        <div><span>NASA investigation</span><ExternalSource href={data.source_url}>Open original PSI page</ExternalSource></div>
      </div>
      <details className="p5-details"><summary>Show SHA-256 fingerprints and transcription metadata</summary>
        <div className="p5-hashes">
          <span>Imported CSV SHA-256</span><code>{data.imported_file_sha256}</code>
          <span>Current CSV SHA-256</span><code>{data.current_file_sha256}</code>
          <span>Imported row SHA-256</span><code>{data.imported_row_sha256}</code>
          <span>Recomputed row SHA-256</span><code>{data.recomputed_row_sha256}</code>
          <span>Transcription metadata</span><strong>{data.transcription_method} • checked_date: {data.source_checked_date}</strong>
        </div>
      </details>
      <div className="p5-table-scroll"><table className="p5-table"><thead><tr><th>Original NASA PSI column</th><th>Raw value</th><th>Normalized (if available)</th><th>Trace</th></tr></thead><tbody>
        {data.fields.map((field) => {
          const key = field.original_column;
          return <tr key={key}>
            <td>{key}<small>{field.field_role.replaceAll('_', ' ')}</small></td>
            <td className="p5-mono">{field.original_value || '— (empty in transcription)'}</td>
            <td>{fieldDisplay(field)}</td>
            <td><button type="button" className="p5-action" aria-expanded={expanded === key}
              onClick={() => setExpanded(expanded === key ? null : key)}>
              <Fingerprint size={14}/> {expanded === key ? 'Hide' : 'Trace'}
            </button>
            {expanded === key && <div className="p5-trace"><span>{field.source_locator}</span>
              {field.evidence_id ? <><code>{field.evidence_id}</code>
                <button type="button" className="p5-action" onClick={() => void copy(field.evidence_id!)}>
                  {copied === field.evidence_id ? <Check size={13}/> : <ClipboardCopy size={13}/>} Copy ID
                </button></> : <span>Empty field: not indexed in Phase 3 search</span>}
            </div>}</td>
          </tr>;
        })}
      </tbody></table></div>
      {data.notices.map((note, i) => <Notice key={i} tone="warning">{note}</Notice>)}
    </div>}
  </Panel>;
}
