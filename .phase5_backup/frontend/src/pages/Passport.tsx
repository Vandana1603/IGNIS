import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, Fingerprint, FileCheck2, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { EvidencePassport, EvidenceResponse } from '../lib/types';
import { formatMetric } from '../lib/science';
import { ApiError, ExternalSource, Loading, Notice, PageHeading, Panel, SourceBadge } from '../components/Ui';

export function Passport() {
  const { recordId } = useParams<{ recordId: string }>();
  const [passport, setPassport] = useState<EvidencePassport | null>(null);
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!recordId) { setError('Missing experiment identifier'); setLoading(false); return; }
    let active = true;
    setLoading(true); setError(null); setPassport(null); setEvidence(null);
    void Promise.all([api.passport(recordId), api.evidence(recordId)])
      .then(([p, e]) => { if (active) { setPassport(p); setEvidence(e); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Passport request failed'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [recordId]);

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(value); }
    catch { setCopied(null); }
  }

  if (loading) return <Loading label="Retrieving NASA source provenance…"/>;
  if (error || !passport || !evidence) return <ApiError message={error || 'Evidence Passport not found'}/>;
  const { record, source } = passport;
  return <div className="page-stack">
    <Link to="/experiments" className="back-link"><ArrowLeft size={16}/> Back to Experiment Explorer</Link>
    <PageHeading eyebrow="EVIDENCE / SOURCE PASSPORT" title={`Evidence Passport — ${record.test_id}`}
      description="An auditable record of the imported NASA table row, normalized metrics, and original source fields."
      actions={<ExternalSource href={source.url}>Open original NASA investigation</ExternalSource>}/>
    <div className="passport-banner"><div className="passport-banner-icon"><FileCheck2 size={27}/></div><div><span className="eyebrow">SOURCE-LINKED RECORD</span>
      <h2>{record.id}</h2><p>{record.fuel_material_raw}</p></div><SourceBadge sourceId={record.source_id}/></div>
    <div className="passport-meta">
      <div><span>Investigation</span><strong>{source.title}</strong></div>
      <div><span>NASA Test ID</span><strong>{record.test_id}</strong></div>
      <div><span>Recorded date</span><strong>{record.date}</strong></div>
      <div><span>Test ending</span><strong>{record.reported_test_end || 'Not reported'}</strong></div>
      <div><span>Source DOI</span><strong><ExternalSource href={`https://doi.org/${source.doi}`}>{source.doi}</ExternalSource></strong></div>
      <div><span>Source locator</span><strong>{passport.source_locator}</strong></div>
    </div>
    <div className="two-column">
      <Panel title="Normalized numeric measurements" description="Every metric retains its original NASA column name and unit.">
        {Object.entries(record.metrics).length === 0 ? <p className="muted-small">No normalized numeric measurements available.</p> :
          <div className="measurement-list">{Object.entries(record.metrics).map(([key, m]) => <div key={key}>
            <span>{m.original_column}</span><strong>{formatMetric(m)}</strong><small>Original table value: {m.original_value}</small>
          </div>)}</div>}
      </Panel>
      <Panel title="Provenance and integrity" description="Local fingerprints detect changes, not independent NASA certification.">
        <div className="provenance-list"><div><span>Data method</span><strong>{source.transcription_method.replaceAll('_', ' ')}</strong></div>
          <div><span>Source verification metadata</span><strong>{source.checked_date}</strong></div>
          <div><span>Original table</span><strong>{source.table_name}</strong></div>
          <div><span>Raw row SHA-256</span><code className="hash">{record.raw_row_sha256}</code>
            <button type="button" className="copy-button" onClick={() => void copy(record.raw_row_sha256)}>
              {copied === record.raw_row_sha256 ? <Check size={14}/> : <Copy size={14}/>} {copied === record.raw_row_sha256 ? 'Copied' : 'Copy hash'}</button></div>
        </div>
        <Notice title="Provenance limitation">{passport.provenance_notice}</Notice>
      </Panel>
    </div>
    <Panel title="Original NASA PSI table fields" description="Source transcription: original field names and raw values. No inferred measurements are added.">
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Original column</th><th>Original value</th><th>Evidence ID</th></tr></thead>
        <tbody>{evidence.evidence_fields.filter((f) => f.evidence_kind === 'transcribed_table_field').map((f) => <tr key={f.evidence_id}>
          <td>{f.field_name}</td><td className="table-material">{f.original_value}</td><td><button type="button" className="evidence-id-button" title="Copy evidence ID" onClick={() => void copy(f.evidence_id)}>
            <Fingerprint size={13}/>{f.evidence_id.split('::').pop()} {copied === f.evidence_id ? <Check size={12}/> : <Copy size={12}/>}</button></td>
        </tr>)}</tbody></table></div>
    </Panel>
    <Panel title="Instrument displays and scientific limitations" description="Not all recorded fields are calibrated physical quantities.">
      {Object.keys(record.instrument_displays).length > 0 && <div className="instrument-list">{Object.entries(record.instrument_displays).map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}</div>}
      {record.limitations.map((limitation, i) => <Notice key={i} tone="warning">{limitation}</Notice>)}
      <div className="evidence-footer"><ShieldCheck size={18}/> {evidence.provenance_notice}</div>
    </Panel>
  </div>;
}
