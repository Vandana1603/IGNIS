"""On-demand checks of official NASA PSI investigation pages.

Only explicitly allowlisted NASA PSI URLs are fetched. Remote content is NOT
injected into the curated scientific dataset. Link discovery is intentionally
conservative: absent links are reported as absent, never invented.
"""
from __future__ import annotations

import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import tempfile
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse, unquote
from urllib.request import HTTPRedirectHandler, Request, build_opener

from backend.phase2.catalog import get_records, get_sources
from backend.phase2.ingest import DATA

SOURCE_URLS = {
    'PSI-25': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-25',
    'PSI-69': 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69',
}
SYNC_DIR = DATA.parent / 'phase8'
STATUS_PATH = SYNC_DIR / 'source_checks.json'
STAGED_DIR = SYNC_DIR / 'staged'
MAX_PAGE_BYTES = 2 * 1024 * 1024
MAX_FILE_BYTES = 20 * 1024 * 1024
ALLOWED_SUFFIXES = {'.csv', '.json', '.tsv', '.txt', '.zip', '.xlsx'}
FETCH_TIMEOUT_SECONDS = 8
USER_AGENT = 'IGNIS-Educational-Research-Sync/1.0 (NASA PSI attribution)'


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def safe_remote_url(url: str) -> bool:
    """Prevent SSRF and cross-domain redirect exfiltration."""
    try:
        parsed = urlparse(url)
        return (parsed.scheme == 'https' and parsed.hostname == 'psi.nasa.gov'
                and parsed.port in (None, 443) and parsed.username is None
                and parsed.password is None and not parsed.fragment)
    except ValueError:
        return False


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not safe_remote_url(newurl):
            raise ValueError('Remote link redirected outside the trusted NASA PSI host')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _fetch_http(url: str, max_bytes: int) -> tuple[bytes, dict[str, str], str]:
    if not safe_remote_url(url):
        raise ValueError('Untrusted remote URL')
    opener = build_opener(SafeRedirect())
    with opener.open(Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'text/html,application/octet-stream'}),
                     timeout=FETCH_TIMEOUT_SECONDS) as response:
        final_url = response.geturl()
        if not safe_remote_url(final_url):
            raise ValueError('Unexpected remote redirect')
        if int(response.headers.get('content-length', '0') or 0) > max_bytes:
            raise ValueError('Remote file exceeds the configured safety limit')
        payload = response.read(max_bytes + 1)
        if len(payload) > max_bytes:
            raise ValueError('Remote file exceeds the configured safety limit')
        metadata = {
            'content_type': response.headers.get('content-type', ''),
            'etag': response.headers.get('etag', ''),
            'last_modified': response.headers.get('last-modified', ''),
        }
        return payload, metadata, final_url


class LinksAndText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links: list[tuple[str, str]] = []
        self.text_parts: list[str] = []
        self.href: str | None = None
        self.link_text: list[str] = []
        self.in_script = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.in_script = True
        if tag == 'a':
            self.href = dict(attrs).get('href')
            self.link_text = []

    def handle_data(self, data):
        if not self.in_script:
            self.text_parts.append(data)
        if self.href is not None:
            self.link_text.append(data)

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.in_script = False
        if tag == 'a':
            if self.href:
                self.links.append((self.href, ' '.join(self.link_text).strip()))
            self.href = None
            self.link_text = []


def discover_html(payload: bytes, base_url: str) -> dict:
    parser = LinksAndText()
    parser.feed(payload.decode('utf-8', errors='replace'))
    visible = ' '.join(' '.join(parser.text_parts).split())
    version_match = re.search(r'\b(?:Selected\s+Version|PSI-\d+\s+Version)\s*:?[ ]*(?:Version\s*)?(\d+)\b', visible, re.I)
    updated_match = re.search(r'\bUpdated Date\s*:\s*(\d{1,2}[-/][A-Za-z0-9]+[-/]\d{4})', visible, re.I)
    files: list[dict] = []
    seen: set[str] = set()
    for href, label in parser.links:
        url = urljoin(base_url, href)
        path = unquote(urlparse(url).path)
        suffix = Path(path).suffix.lower()
        if not safe_remote_url(url) or suffix not in ALLOWED_SUFFIXES or url in seen:
            continue
        seen.add(url)
        filename = Path(path).name
        files.append({
            'artifact_id': hashlib.sha256(url.encode('utf-8')).hexdigest()[:16],
            'name': (label or filename)[:180],
            'filename': filename[:180],
            'url': url,
            'format': suffix.lstrip('.'),
        })
        if len(files) >= 40:
            break
    return {
        'latest_version_visible': version_match.group(1) if version_match else None,
        'updated_date_visible': updated_match.group(1) if updated_match else None,
        'discoverable_files': files,
        'html_visible_text_available': bool(visible.strip()),
    }


def _read_status() -> dict:
    if not STATUS_PATH.is_file():
        return {}
    try:
        data = json.loads(STATUS_PATH.read_text(encoding='utf-8'))
        return data if isinstance(data, dict) else {}
    except (ValueError, OSError):
        return {}


def _atomic_json(path: Path, content: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, prefix='.ignis_', suffix='.tmp', delete=False) as tmp:
        json.dump(content, tmp, ensure_ascii=False, indent=2)
        tmp_name = tmp.name
    os.replace(tmp_name, path)


def get_sync_status() -> dict:
    saved = _read_status()
    sources = {s.source_id: s for s in get_sources()}
    imported = get_records()
    items = []
    for source_id, url in SOURCE_URLS.items():
        item = saved.get(source_id, {})
        items.append({
            'source_id': source_id,
            'source_url': url,
            'doi': sources[source_id].doi,
            'local_imported_records': sum(r.source_id == source_id for r in imported),
            'last_checked_utc': item.get('last_checked_utc'),
            'state': item.get('state', 'not_checked'),
            'http_status': item.get('http_status'),
            'page_sha256': item.get('page_sha256'),
            'changed_since_last_successful_check': item.get('changed_since_last_successful_check'),
            'etag': item.get('etag'),
            'last_modified': item.get('last_modified'),
            'latest_version_visible': item.get('latest_version_visible'),
            'updated_date_visible': item.get('updated_date_visible'),
            'discoverable_files': item.get('discoverable_files', []),
            'error': item.get('error'),
        })
    return {
        'sources': items,
        'catalog_record_count': len(imported),
        'mode': 'on_demand_official_NASA_PSI_source_check',
        'imported_from_remote_sync': 0,
        'provenance_notice': (
            'Live HTTP checks inspect official NASA PSI investigation landing pages and their directly linked files. '
            'They are NOT live ISS experiment telemetry. Discoverable data files may be staged explicitly, '
            'but nothing is automatically merged into the curated experiment catalog. '
            'Page changes are not evidence of newly released experimental data.'
        ),
    }


def check_sources(source_id: str | None = None) -> dict:
    if source_id is not None and source_id not in SOURCE_URLS:
        raise ValueError('Unsupported source ID')
    old = _read_status()
    new = dict(old)
    ids = [source_id] if source_id else list(SOURCE_URLS)
    for current in ids:
        url = SOURCE_URLS[current]
        previous = old.get(current, {})
        status = {'last_checked_utc': iso_now(), 'state': 'unavailable', 'http_status': None,
                  'page_sha256': previous.get('page_sha256'),
                  'changed_since_last_successful_check': None,
                  'etag': previous.get('etag'), 'last_modified': previous.get('last_modified'),
                  'latest_version_visible': previous.get('latest_version_visible'),
                  'updated_date_visible': previous.get('updated_date_visible'),
                  'discoverable_files': previous.get('discoverable_files', []),
                  'error': None}
        try:
            body, metadata, final_url = _fetch_http(url, MAX_PAGE_BYTES)
            if 'html' not in metadata['content_type'].lower() and b'<html' not in body[:2000].lower():
                raise ValueError('The remote response was not an HTML investigation page')
            discovered = discover_html(body, final_url)
            digest = hashlib.sha256(body).hexdigest()
            old_digest = previous.get('page_sha256')
            status.update(state='online', http_status=200, page_sha256=digest,
                          changed_since_last_successful_check=(old_digest != digest) if old_digest else None,
                          etag=metadata['etag'] or None, last_modified=metadata['last_modified'] or None,
                          latest_version_visible=discovered['latest_version_visible'],
                          updated_date_visible=discovered['updated_date_visible'],
                          discoverable_files=discovered['discoverable_files'])
        except (HTTPError, URLError, OSError, ValueError, TimeoutError) as exc:
            status['error'] = f'Official NASA PSI page could not be checked ({type(exc).__name__}).'
            if isinstance(exc, HTTPError):
                status['http_status'] = exc.code
        new[current] = status
    _atomic_json(STATUS_PATH, new)
    return get_sync_status()


def stage_artifact(source_id: str, artifact_id: str) -> dict:
    if source_id not in SOURCE_URLS:
        raise ValueError('Unknown source')
    entry = next((a for a in _read_status().get(source_id, {}).get('discoverable_files', [])
                  if a.get('artifact_id') == artifact_id), None)
    if not entry or not safe_remote_url(entry.get('url', '')):
        raise ValueError('Artifact was not discovered on a checked NASA PSI page')
    path = Path(unquote(urlparse(entry['url']).path))
    if path.suffix.lower() not in ALLOWED_SUFFIXES:
        raise ValueError('Unsupported download format')
    content, metadata, final_url = _fetch_http(entry['url'], MAX_FILE_BYTES)
    if 'html' in metadata['content_type'].lower() or content.lstrip()[:20].lower().startswith(b'<!doctype html'):
        raise ValueError('Remote link returned HTML rather than a data file')
    sha = hashlib.sha256(content).hexdigest()
    name = f'{source_id}_{artifact_id}_{sha[:12]}{path.suffix.lower()}'
    STAGED_DIR.mkdir(parents=True, exist_ok=True)
    target = STAGED_DIR / name
    if not target.exists():
        with tempfile.NamedTemporaryFile('wb', dir=STAGED_DIR, delete=False) as tmp:
            tmp.write(content)
            tmp_name = tmp.name
        os.replace(tmp_name, target)
    manifest = STAGED_DIR / 'staged_manifest.json'
    old = {}
    if manifest.is_file():
        try:
            old = json.loads(manifest.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            pass
    old[name] = {'source_id': source_id, 'artifact_id': artifact_id, 'source_url': final_url,
                 'retrieved_at_utc': iso_now(), 'sha256': sha, 'size_bytes': len(content),
                 'filename': name, 'state': 'staged_not_imported'}
    _atomic_json(manifest, old)
    return old[name]


def list_staged() -> list[dict]:
    """Return stage manifests, not filesystem paths or imported measurement claims."""
    path = STAGED_DIR / 'staged_manifest.json'
    if not path.is_file():
        return []
    try:
        values = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return []
    return [item for name, item in sorted(values.items())
            if isinstance(item, dict) and Path(name).name == name and (STAGED_DIR / name).is_file()]


def preview_staged(filename: str) -> dict:
    """Safely compare original NASA CSV fields with the curated local table, WITHOUT importing.

    This is a potential record-level diff, not scientific comparability or source certification.
    """
    import csv
    import io

    manifest = next((item for item in list_staged() if item['filename'] == filename), None)
    if manifest is None:
        raise ValueError('Selected stage file not found in the validated staging manifest')
    source_id = manifest['source_id']
    if source_id not in SOURCE_URLS:
        raise ValueError('Unsupported investigation in staging manifest')
    raw = (STAGED_DIR / filename).read_bytes()
    if hashlib.sha256(raw).hexdigest() != manifest['sha256']:
        raise ValueError('The staged file no longer matches its original downloaded SHA-256')
    suffix = Path(filename).suffix.lower()
    expected_id = 'Test #' if source_id == 'PSI-25' else 'FLEX Identifier'
    if suffix not in ('.csv', '.tsv'):
        return {'filename':filename,'supported':False,'reason':'Only CSV and TSV tabular files can be previewed; archives are not automatically extracted.',
                'expected_test_id_column':expected_id,'columns':[],'scanned_rows':0,'truncated':False,'diffs':[]}
    text = raw.decode('utf-8-sig', errors='replace')
    reader = csv.DictReader(io.StringIO(text), delimiter='\t' if suffix == '.tsv' else ',')
    columns = list(reader.fieldnames or [])
    if expected_id not in columns:
        return {'filename':filename,'supported':False,'reason':f'The table lacks the required original identifier column: {expected_id}',
                'expected_test_id_column':expected_id,'columns':columns[:70],'scanned_rows':0,'truncated':False,'diffs':[]}
    local = {r.test_id:r for r in get_records() if r.source_id == source_id}
    results = []
    scanned = 0
    truncated = False
    for row in reader:
        if scanned >= 500:
            truncated = True
            break
        scanned += 1
        test_id = (row.get(expected_id) or '').strip()
        if not test_id:
            continue
        existing = local.get(test_id)
        if existing is None:
            results.append({'test_id':test_id,'status':'candidate_new_test_id','changed_fields':[],
                            'missing_local_columns':[], 'notice':'Discovered row is not imported or validated.'})
            continue
        changed = []
        missing = []
        for original_column, original_value in existing.raw_fields.items():
            if original_column not in row:
                missing.append(original_column)
            elif (row[original_column] or '').strip() != original_value.strip():
                changed.append({'column':original_column,'local_value':original_value,
                                'remote_table_value':(row[original_column] or '').strip()})
        status = 'different_raw_values' if changed else 'matching_shared_fields' if not missing else 'partial_column_overlap'
        results.append({'test_id':test_id,'status':status,'changed_fields':changed,
                        'missing_local_columns':missing,
                        'notice':'Candidate source comparison only; confirm NASA table identity and transcription context before any import.'})
    return {'filename': filename,'supported':True,'reason':None,
            'expected_test_id_column':expected_id,'columns':columns[:70],
            'scanned_rows':scanned,'truncated':truncated,'diffs':results}
