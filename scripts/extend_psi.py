"""Safely preview and optionally import user-verified NASA PSI BASS-II or FLEX CSV exports.

No automatic network imports; never treats a third-party mirror as independently NASA-verified.
"""
from __future__ import annotations
import argparse
import csv
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from backend.phase2.ingest import DATA, RAW, BASS_COLS, FLEX_COLS, import_bass, import_flex, build, sha_bytes

FILES={"PSI-25":("psi25_bass_ii_curated.csv",BASS_COLS,"Test #",import_bass),
       "PSI-69":("psi69_flex_curated.csv",FLEX_COLS,"FLEX Identifier",import_flex)}


def read(path, header):
    with path.open('r',encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f)
        if reader.fieldnames != header:
            raise ValueError('This export does not match IGNIS curated columns. Do not auto-rename ambiguous units: prepare a reviewed CSV using the template in data/phase2/raw.')
        rows=list(reader)
        if not rows or any(None in r for r in rows):
            raise ValueError('No records or malformed CSV')
        return [{key:(row.get(key) or '').strip() for key in header} for row in rows]


def preview(source_id, incoming):
    name,header,key,validate=FILES[source_id]
    existing_path=RAW/name
    existing=read(existing_path,header)
    proposed=read(incoming,header)
    old={r[key]:r for r in existing}
    new={r[key]:r for r in proposed}
    if len(new)!=len(proposed): raise ValueError('Duplicate IDs in supplied CSV')
    changed=[test for test in (old.keys() & new.keys()) if old[test]!=new[test]]
    if changed:
        raise ValueError('Existing curated rows conflict with supplied export: '+', '.join(sorted(changed)[:10]))
    candidates=[r for r in proposed if r[key] not in old]
    # Preserve original row order and source text. Never infer missing test identifiers.
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        f=Path(tmp)/'validated.csv'
        with f.open('w',encoding='utf-8',newline='') as handle:
            writer=csv.DictWriter(handle,fieldnames=header)
            writer.writeheader();writer.writerows(existing+candidates)
        validate(f)
    return {"source_id":source_id,"current":len(old),"new_candidates":len(candidates),
            "result_count":len(old)+len(candidates),"new_ids":[r[key] for r in candidates],
            "input_sha256":sha_bytes(incoming.read_bytes()),"rows":existing+candidates}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-id',choices=FILES,required=True)
    parser.add_argument('--file',type=Path,required=True,help='User-supplied and personally verified official PSI CSV export')
    parser.add_argument('--apply',action='store_true',help='Write only after explicit verification')
    parser.add_argument('--confirm-official-source',action='store_true',help='Confirm that you checked the file against official NASA PSI data, IDs and units')
    args=parser.parse_args()
    if not args.file.is_file():parser.error('Supplied local CSV file not found')
    summary=preview(args.source_id,args.file)
    print(json.dumps({k:v for k,v in summary.items() if k!='rows'},indent=2))
    if not args.apply:
        print('PREVIEW ONLY: no project files changed. Use --apply --confirm-official-source after manual review.')
        return
    if not args.confirm_official_source: parser.error('Refusing import without --confirm-official-source')
    if summary['new_candidates']==0:
        print('No new records. No changes made.');return
    name,header,key,_=FILES[args.source_id]
    target=RAW/name
    backup_dir=DATA/'ingest_history'/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup_dir.mkdir(parents=True)
    files=[target, DATA/'experiments.json',DATA/'import_manifest.json',DATA.parent/'phase10/provenance.json']
    saved=[]
    for f in files:
        if f.exists():
            copy=backup_dir/f.name
            shutil.copy2(f,copy);saved.append((f,copy))
    try:
        with target.open('w',encoding='utf-8',newline='') as out:
            writer=csv.DictWriter(out,fieldnames=header)
            writer.writeheader();writer.writerows(summary['rows'])
        build(RAW/'psi25_bass_ii_curated.csv',RAW/'psi69_flex_curated.csv')
        ledger_file=DATA.parent/'phase10/provenance.json'
        ledger=json.loads(ledger_file.read_text())
        for record_id in summary['new_ids']:
            ledger['record_sources'][f"{args.source_id}-{record_id}"]={
                'original_table':'User-supplied NASA PSI export',
                'status':'user_reviewed_official_source_unindependently_audited',
                'input_sha256':summary['input_sha256'],
            }
        ledger['scope']='Expanded by user-supplied source; total counts derive from imported files'
        ledger_file.write_text(json.dumps(ledger,indent=2)+'\n',encoding='utf-8')
    except Exception:
        for dst,copy in saved:shutil.copy2(copy,dst)
        raise
    print('IMPORTED',summary['new_candidates'],'new records; originals backed up to',backup_dir)

if __name__=='__main__':main()
