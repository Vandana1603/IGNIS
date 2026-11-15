import { useEffect, useState } from 'react';
import { ArrowUpRight, CloudDownload, Database, ExternalLink, FileArchive, RefreshCw, Satellite, ShieldCheck, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, Loading, Notice, PageHeading, Panel, SourceBadge } from '../components/Ui';
import type { SourceId } from '../lib/types';
import { syncApi } from './client';
import type { StagedArtifact, StagedPreview, SyncStatus } from './client';
import './phase8.css';

const fmtTime = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not checked';

export function ResearchSync() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [staged, setStaged] = useState<StagedArtifact[]>([]);
  const [preview, setPreview] = useState<StagedPreview | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reload = () => {
    setError(null);
    void syncApi.staged().then(result => setStaged(result.files)).catch(() => undefined);
    return syncApi.status().then(setStatus).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not retrieve source check status'));
  };
  useEffect(() => { void reload(); }, []);

  const check = async (source?: SourceId) => {
    setBusyId(source || 'all'); setError(null); setNotice(null);
    try {
      const next = await syncApi.check(source);
      setStatus(next);
      setNotice('NASA PSI source check finished. Unavailable sources are reported separately. No experiment records were imported.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to check NASA PSI');
    } finally { setBusyId(null); }
  };
  const stage = async (source_id: SourceId, artifact_id: string) => {
    setBusyId(artifact_id); setError(null);
    try {
      const result = await syncApi.stage(source_id, artifact_id);
      setStaged(prev => [...prev, result]);
      setNotice('Downloaded to a separate local staging folder. This file was NOT imported into any experiment or comparison.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stage the selected file');
    } finally { setBusyId(null); }
  };

  const inspect = async (filename: string) => {
    setBusyId(filename); setError(null); setPreview(null);
    try { setPreview(await syncApi.preview(filename)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not preview staged source file'); }
    finally { setBusyId(null); }
  };

  if (!status && !error) return <Loading label="Loading NASA source-check information…"/>;
  if (!status) return <ApiError message={error || 'No response'} onRetry={() => void reload()}/>;
  return <div className="page-stack">
    <PageHeading eyebrow="MISSION / OFFICIAL SOURCE CHECKS" title="Live NASA Research Sync"
      description="Check official NASA PSI sources on demand. Review and stage discovered files without touching verified research data."
      actions={<button className="button button-primary" type="button" disabled={busyId !== null} onClick={() => void check()}>
        <RefreshCw size={16}/>{busyId === 'all' ? 'Checking NASA…' : 'Check both NASA sources'}
      </button>}/>
    <div className="phase8-stats">
      <div><Satellite/><small>Remote checks</small><strong>{status.sources.filter(s => s.state === 'online').length} / {status.sources.length}</strong><span>Sources responding in last check</span></div>
      <div><Database/><small>Verified local catalog</small><strong>{status.catalog_record_count}</strong><span>Preserved imported experiment rows</span></div>
      <div><ShieldCheck/><small>Auto-imported records</small><strong>{status.imported_from_remote_sync}</strong><span>External data require validation first</span></div>
    </div>
    <Notice title="What live means here">The check makes an actual HTTP request to NASA's official PSI investigation pages. These pages are historical research archives, not live ISS sensor feeds. A change in page HTML does not prove that new experiment data exist. Network access is required for remote checks.</Notice>
    {error && <div className="phase8-error" role="alert">{error}</div>}
    {notice && <Notice tone="success">{notice}</Notice>}
    <div className="phase8-source-grid">{status.sources.map(source => <Panel key={source.source_id} className="phase8-source" title={source.source_id === 'PSI-25' ? 'BASS-II / Solid Fuels' : 'FLEX / Liquid Droplets'}
      description="Official NASA Physical Sciences Informatics investigation">
      <div className="phase8-source-top"><SourceBadge sourceId={source.source_id}/>
        <span className={`phase8-pill ${source.state}`}>
          {source.state === 'online' ? <ShieldCheck size={13}/> : source.state === 'unavailable' ? <WifiOff size={13}/> : <Satellite size={13}/>} {source.state === 'online' ? 'Repository reached' : source.state === 'unavailable' ? 'Check unavailable' : 'Not checked'}
        </span></div>
      <details className="ignite-sync-details"><summary>Source metadata & integrity <span>View details</span></summary>
      <div className="phase8-source-facts">
        <div><span>Last checked (your timezone)</span><strong>{fmtTime(source.last_checked_utc)}</strong></div>
        <div><span>Official data DOI</span><strong>{source.doi}</strong></div>
        <div><span>NASA version visible in HTML</span><strong>{source.latest_version_visible || 'Not exposed in fetched HTML'}</strong></div>
        <div><span>NASA last-updated field</span><strong>{source.updated_date_visible || source.last_modified || 'Not exposed'}</strong></div>
        <div><span>Page content change</span><strong>{source.changed_since_last_successful_check === null ? 'No baseline / no new observation' : source.changed_since_last_successful_check ? 'HTML changed (data status unknown)' : 'No HTML change observed'}</strong></div>
        <div><span>Local records preserved</span><strong>{source.local_imported_records}</strong></div>
      </div>
      </details>
      {source.error && <p className="phase8-error phase8-minor">{source.error} Last known metadata, if any, may be shown above.</p>}
      <div className="phase8-actions"><button className="button button-secondary" type="button" onClick={() => void check(source.source_id)} disabled={busyId !== null}><RefreshCw size={14}/> {busyId === source.source_id ? 'Checking…' : 'Refresh source'}</button>
      <a className="button button-ghost" href={source.source_url} target="_blank" rel="noopener noreferrer">NASA page <ArrowUpRight size={14}/></a></div>
      <details className="ignite-sync-details"><summary>Discovered downloadable files ({source.discoverable_files.length}) <span>View files</span></summary>
      <div className="phase8-artifacts"><h3><FileArchive size={16}/> Public file links found in fetched HTML ({source.discoverable_files.length})</h3>
        {source.discoverable_files.length ? source.discoverable_files.map(file => <div className="phase8-artifact" key={file.artifact_id}>
          <div><strong>{file.name}</strong><small>{file.format.toUpperCase()} • Discovered from official page • Not yet imported</small></div>
          <button type="button" className="button button-secondary" disabled={busyId !== null} onClick={() => void stage(source.source_id, file.artifact_id)}><CloudDownload size={14}/>{busyId === file.artifact_id ? 'Staging…' : 'Stage file'}</button>
        </div>) : <p className="phase8-empty">No directly downloadable supported files were exposed in the fetched HTML. NASA's JavaScript interface may list additional files; inspect the official source page. IGNIS does not invent download links.</p>}
      </div>
      </details>
    </Panel>)}</div>
    {staged.length > 0 && <Panel title="Files staged during this session" description="Staged files are kept under data/phase8/staged. They are never merged automatically into the curated catalog.">
      <div className="phase8-staged">{staged.map(file => <div key={file.sha256}>
        <strong>{file.filename}</strong><span>{file.size_bytes.toLocaleString()} bytes • SHA-256 {file.sha256}</span>
        <button type="button" className="button button-secondary" disabled={busyId !== null} onClick={() => void inspect(file.filename)}>Preview source-field differences</button>
      </div>)}</div>
    </Panel>}
    {preview && <Panel title="Staged table preview — not imported" description="Original string values only. Results reflect matching test identifiers and columns, not independent scientific verification.">
      <div className="phase8-preview-summary"><strong>{preview.filename}</strong><span>{preview.supported ? `${preview.scanned_rows} rows scanned${preview.truncated ? ' (first 500 only)' : ''}` : preview.reason}</span></div>
      {preview.supported && <div className="table-scroll"><table className="data-table"><thead><tr><th>NASA test ID</th><th>Candidate local comparison</th><th>Original fields with differences</th></tr></thead><tbody>
      {preview.diffs.map((row, index) => <tr key={`${row.test_id}-${index}`}><td>{row.test_id}</td><td>{row.status.replaceAll('_', ' ')}</td>
        <td>{row.changed_fields.map(c => <div key={c.column}>{c.column}: local “{c.local_value}” → staged “{c.remote_table_value}”</div>)}
        {row.missing_local_columns.length ? `${row.missing_local_columns.length} local columns absent from staged table` : ''}</td></tr>)}
      </tbody></table></div>}
      <Notice tone="warning">Staged values are not normalized or trusted until a source-specific scientific ingestion and verification process is completed. No new measurement is added to the dashboard by this preview.</Notice>
    </Panel>}
    <details className="ignite-sync-details ignite-sync-workflow"><summary>How source checks become validated evidence</summary>
    <Panel title="Research-to-evidence workflow" description="How the official archive connects to the data that IGNIS can scientifically demonstrate.">
      <div className="phase8-workflow"><span><Satellite/> Official NASA source</span><span><CloudDownload/> Explicit staging</span><span><ShieldCheck/> Manual validation</span><span><Database/> Curated experiments</span></div>
      <p className="phase8-explain">Staging is a genuine remote-file download when a suitable link exists. Promoting staged files into the scientific catalog would require a separate investigation-specific parser, source validation, deduplication and review. Until then, only the locally curated and imported records are used for charts, comparisons and SI answers.</p>
      <Link to="/laboratory" className="button button-primary">Explore documented laboratory setups <ExternalLink size={15}/></Link>
    </Panel>
    </details>
  </div>;
}
