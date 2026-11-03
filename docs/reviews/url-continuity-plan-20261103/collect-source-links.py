"""Read-only literal link and public sitemap census; not a runtime link resolver."""
import json,re,html,urllib.request,urllib.parse,xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parents[3]
out=Path(__file__).parent
rows=[]
for p in sorted((root/'src').rglob('*')):
 if p.suffix not in ('.js','.jsx','.ts','.tsx') or '.test.' in p.name:continue
 s=p.read_text()
 for m in re.finditer(r'''(?:href|to)\s*[:=]\s*\{?\s*(["'])(/[^"'\n]*|https?://(?:www\.)?sod1820\.co\.il[^"'\n]*)\1''',s):
  raw=html.unescape(m[2]);u=urllib.parse.urlsplit(raw)
  if raw.startswith('//') or any(x in raw.lower() for x in ['token=','signature=','email=','code=','access_token']):continue
  rows.append({'url':raw,'source':str(p.relative_to(root)),'line':s[:m.start()].count('\n')+1,'kind':'source-literal-not-proof-of-public-content'})
(out/'source-links.json').write_text(json.dumps({'scope':'src JS/JSX/TS/TSX literal href/to only; dynamic builders and content HTML separate; no tests/docs/node_modules','links':rows},ensure_ascii=False,indent=2)+'\n')
result={'origin':'https://sod1820.co.il','kind':'public-live-XML-read-only','requests':[],'urls':[]}
for endpoint in ['/sitemap.xml','/robots.txt']:
 try:
  with urllib.request.urlopen('https://sod1820.co.il'+endpoint,timeout=40) as r:
   b=r.read(16*1024*1024);result['requests'].append({'path':endpoint,'http':r.status,'bytes':len(b),'contentType':r.headers.get('content-type')})
  if endpoint.endswith('.xml'):
   tree=ET.fromstring(b);result['sitemapType']=tree.tag
   for n in tree.findall('.//{*}url/{*}loc'):
    if n.text:result['urls'].append(n.text)
   result['childSitemaps']=[n.text for n in tree.findall('.//{*}sitemap/{*}loc')]
  else:result['robots']=b.decode('utf-8')[:16000]
 except Exception as e:result['requests'].append({'path':endpoint,'error':str(e)[:300]})
(out/'live-sitemap.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sourceLiteralLinks':len(rows),'unique':len({r['url'] for r in rows}),'sitemapUrls':len(result['urls']),'requests':result['requests'],'childSitemaps':result.get('childSitemaps')},ensure_ascii=False))
