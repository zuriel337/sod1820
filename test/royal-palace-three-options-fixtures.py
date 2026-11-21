"""Review-only compiled fixtures. Never deploy these output directories.
Build the unchanged branch first (npm run build). No source/default changes.
The crown option keeps the existing complete global crown/lockup and area icon.
"""
from pathlib import Path
import shutil,re,json,hashlib,sys
root=Path(__file__).resolve().parents[1]
base=Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/scratch/royal-three-options')
css='''
/* Review fixture: same Royal tokens, controls and content; lower geometry. */
.native-frame .sod29-page-intro[data-intro-variant] {padding-block:10px;gap:6px}
.native-frame .sod29-page-intro[data-intro-variant] h1 {font-size:24px}
.native-frame .sod29-page-intro[data-intro-variant] p {margin-top:4px}
.native-frame .sod29-page-intro[data-intro-variant] .sod29-context-strip {margin-top:4px;padding-top:4px}
'''
manifest={'sourceHead':__import__('subprocess').check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'fixtures':{}}
for arm in ['compact','strip','crown']:
 dest=base/arm
 shutil.rmtree(dest,ignore_errors=True);shutil.copytree(root/'dist',dest)
 changed={}
 if arm!='compact':
  candidates=[p for p in (dest/'assets').glob('*.css') if 'Structural geometry' in p.read_text() or '.sod29-page-intro[data-intro-variant]' in p.read_text() and 'flex-direction:column' in p.read_text()]
  # Eager structural stylesheet, not lazy decorative CSS: reserve geometry before paint.
  candidates=[p for p in candidates if not p.name.startswith('RoyalIntro')]
  assert len(candidates)==1,[p.name for p in candidates]
  p=candidates[0];p.write_text(p.read_text()+css);changed[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
  if arm=='strip':
   p=next((dest/'assets').glob('RoyalIntro*.css'))
   p.write_text(p.read_text()+'\n.r29-palace-art {bottom:auto;height:72px}\n.r29-palace-art img {object-fit:cover;object-position:center 20%}\n')
   changed[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
  else:
   p=next((dest/'assets').glob('RoyalIntro*.js'));s=p.read_text()
   pattern=r'\(0,\w+\.jsxs\)\(`picture`,\{className:`r29-palace-art`.*?fetchPriority:`low`\}\)\]\}\)'
   s,n=re.subn(pattern,'null',s);assert n==1,'Compiled picture shape changed; inspect before updating fixture.'
   p.write_text(s);changed[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
 manifest['fixtures'][arm]={'directory':str(dest),'modifiedFiles':changed}
(base/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
