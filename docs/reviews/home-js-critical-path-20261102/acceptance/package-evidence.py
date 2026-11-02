#!/usr/bin/env python3
"""Package only assigned, sanitized browser evidence. No config/header/profile files.
Usage: python3 package-evidence.py RAW_DIR OUTPUT_DIR [PRIVATE_CONFIG ...]
Private configs are used only to reject accidental exact grant inclusion, never
archived or printed. The script emits filenames/hashes, not matching secret text.
"""
import hashlib,json,re,sys,zipfile
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
raw,out=map(Path,sys.argv[1:3]);out.mkdir(parents=True,exist_ok=True)
folders=['baseline-0d4a-replacement','candidate-2570-diagnostic','platform-setup-comparison','code-only-baseline-0d4a-diagnostic','code-only-candidate-2570-diagnostic','paired-code-only','paired-visible','paired-visible-resume','candidate-2570-admission','final-c8-smoke','final-c8-gallery-target','number-chain-diagnostic']
files=[p for name in folders for p in (raw/name).rglob('*') if p.is_file() and p.suffix in ['.json','.png']]+[raw/'visible-interruption.json']
secrets=[]
for name in sys.argv[3:]:
    cfg=json.loads(Path(name).read_text());u=cfg.get('accessUrl','')
    for values in parse_qs(urlsplit(u).query).values():
        secrets += [s.encode() for s in values if len(s)>12]
patterns=[('jwt',rb'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'),('private-key',rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),('github-token',rb'gh[pousr]_[A-Za-z0-9]{25,}'),('supabase-secret',rb'sb_secret_[A-Za-z0-9_-]{20,}'),('openai-secret',rb'sk-(?:proj-)?[A-Za-z0-9_-]{30,}')]
manifest=[];violations=[]
for p in sorted(files):
    body=p.read_bytes();relative=p.relative_to(raw).as_posix()
    if p.suffix=='.json':
        json.loads(body)
        for label,pattern in patterns:
            if re.search(pattern,body):violations.append({'file':relative,'kind':label})
    if any(secret in body for secret in secrets):violations.append({'file':relative,'kind':'exact-private-access-grant'})
    manifest.append({'path':relative,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()})
if violations:raise SystemExit(json.dumps({'scan':'FAIL','findings':violations}))
archive=out/'comparison-0d4a-2570-final-c8-evidence.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in sorted(files):z.write(p,p.relative_to(raw).as_posix())
with zipfile.ZipFile(archive) as z:
    for f in manifest:assert hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256']
receipt={'schema':1,'baselineSHA':'0d4ad83644a74abe5d990f7a628dd955fd0c638a','measuredCandidateSHA':'25709d70b9c9945078e88ae14fd1363ba2e211b3','finalSmokeSHA':'c8e05790fe68c8f548e22a7c02e5094ddc5b8755','archive':archive.name,'archiveBytes':archive.stat().st_size,'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'fileCount':len(manifest),'sanitized':True,'secretScan':{'status':'PASS','findings':0,'rules':[label for label,_ in patterns]+['exact-private-access-grant'],'scope':'all archived JSON pattern scan; all archive bytes checked against supplied private access grants; no raw HTML/JS/browser profiles/headers/private configs included'},'files':manifest}
(out/'comparison-evidence-manifest.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:receipt[k] for k in ['fileCount','archiveBytes','archiveSha256','secretScan']}))
