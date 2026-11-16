"""Reversible, strict-fingerprint installer for IGNIS 2.4: only from known IGNIS 2.3 source."""
import argparse, hashlib, json, shutil, sys
from datetime import datetime,timezone
from pathlib import Path

HERE=Path(__file__).resolve().parent

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def run(root,dry_run):
    manifest=json.loads((HERE/'MANIFEST.json').read_text(encoding='utf-8'))
    changes=manifest['changed_files']
    operations=[]
    conflict=[]
    for info in changes:
        relative=Path(info['path'])
        if relative.is_absolute() or '..' in relative.parts:raise ValueError('Unexpected destination in manifest')
        original=root/relative
        payload=HERE/'payload'/relative
        if not payload.is_file() or sha(payload)!=info['after_sha256']:
            raise ValueError('Upgrade package file fingerprint mismatch: '+str(relative))
        if original.exists():
            current=sha(original)
            if current==info['after_sha256']:
                operations.append(('SKIP',relative));continue
            if current!=info['before_sha256']:
                conflict.append(str(relative));continue
        elif info['before_sha256'] is not None:
            conflict.append(str(relative)+' (missing existing file)');continue
        operations.append(('WRITE',relative))
    for action,path in operations:print(action,path)
    if conflict:
        print('CONFLICT: existing files differ from the supplied IGNIS 2.3 source. No files changed.',file=sys.stderr)
        for name in conflict:print('  '+name,file=sys.stderr)
        return 2
    if dry_run:
        print('DRY RUN PASSED; '+str(sum(x=='WRITE' for x,_ in operations))+' files ready; nothing changed.')
        return 0
    backup=root/'.ignis_phase10_backup'/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    changes_applied=[]
    try:
        for action,path in operations:
            if action=='SKIP':continue
            original=root/path
            if original.is_file():
                backup_copy=backup/path;backup_copy.parent.mkdir(parents=True,exist_ok=True)
                shutil.copy2(original,backup_copy)
            else:backup_copy=None
            original.parent.mkdir(parents=True,exist_ok=True)
            temp=original.with_name(original.name+'.phase10-tmp')
            shutil.copy2(HERE/'payload'/path,temp)
            temp.replace(original)
            changes_applied.append((original,backup_copy))
    except Exception:
        for original,saved in reversed(changes_applied):
            if saved is None: original.unlink(missing_ok=True)
            else:shutil.copy2(saved,original)
        raise
    print('INSTALL COMPLETE; '+str(len(changes_applied))+' files changed; backups:',backup)
    return 0

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',required=True,type=Path)
    p.add_argument('--dry-run',action='store_true')
    args=p.parse_args()
    sys.exit(run(args.root,args.dry_run))
