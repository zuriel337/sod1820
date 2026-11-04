"""Bounded read-only review of the existing pending205, never a new inventory."""
import concurrent.futures,datetime,hashlib,html,json,re,subprocess,sys,time,urllib.request,urllib.error,urllib.parse
from pathlib import Path
root=Path(__file__).resolve().parents[1]
baseline=subprocess.check_output(['git','show','b80ad895a23b51107fd58d533d4dd93f6d4c431f:docs/reviews/public-url-exceptions-20261103/reconciliation.json'],text=True)
rows=[x for x in json.loads(baseline)['rows'] if x['status']=='pending_decision']
assert len(rows)==205
out=Path(sys.argv[1]) if len(sys.argv)>1 else root/'residual205/evidence/live-http.json'
out.parent.mkdir(parents=True,exist_ok=True)
class Redirects(urllib.request.HTTPRedirectHandler):
 def __init__(self):self.chain=[]
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  self.chain.append({'from':req.full_url,'status':code,'to':newurl})
  u=urllib.parse.urlsplit(newurl)
  if u.scheme not in ('http','https') or u.username or u.password:raise ValueError('unsafe_redirect')
  if len(self.chain)>8:raise ValueError('redirect_limit')
  return super().redirect_request(req,fp,code,msg,headers,newurl)
def probe(row):
 url='https://sod1820.co.il'+row['sourceUrl'];redirects=Redirects();result={'sourceUrl':row['sourceUrl'],'requestedUrl':url,'chain':redirects.chain,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()};start=time.monotonic()
 try:
  opener=urllib.request.build_opener(redirects)
  try:r=opener.open(urllib.request.Request(url,headers={'Range':'bytes=0-65535' if not row['sourceUrl'].startswith('/audio/') else 'bytes=0-2047','User-Agent':'Mozilla/5.0 (compatible; SOD1820-read-only-continuity-review)'}),timeout=20)
  except urllib.error.HTTPError as error:r=error
  with r:
   body=r.read(65536 if not row['sourceUrl'].startswith('/audio/') else 2048)
   result.update(status=r.code,finalUrl=r.geturl(),contentType=r.headers.get('Content-Type',''),contentRange=r.headers.get('Content-Range'),sampleBytes=len(body),sampleSha256=hashlib.sha256(body).hexdigest(),magicHex=body[:16].hex())
   text=body.decode('utf-8',errors='replace');title=re.search(r'<title[^>]*>(.*?)</title>',text,re.S|re.I)
   if title:result['title']=html.unescape(re.sub(r'\s+',' ',title.group(1)))[:220]
   result['htmlDocument']=bool(re.match(br'\s*(?:<!doctype\s+html|<html)',body,re.I))
   result['audioMagic']=bool(body.startswith((b'ID3',b'OggS',b'fLaC')) or body[:4]==b'RIFF' and body[8:12]==b'WAVE' or len(body)>1 and body[0]==255 and body[1]&224==224)
   if row['sourceUrl'].startswith('/audio/'):
    result['initialFinding']='audio_bytes_available' if result['audioMagic'] else 'legacy_returns_html_instead_of_audio' if result['htmlDocument'] else 'legacy_http_missing' if r.code in (404,410) else 'undetermined'
   else:result['initialFinding']='requires_content_identity_or_browser_check'
 except Exception as error:result['error']=str(error)[:240];result['initialFinding']='undetermined_network_or_access'
 result['durationMs']=round((time.monotonic()-start)*1000);return result
report={'kind':'existing-residual205-live-http','baseSha':'b80ad895a23b51107fd58d533d4dd93f6d4c431f','requestedCount':205,'readOnly':True,'liveWrites':0,'rangeGet':True,'rows':[]}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 futures={pool.submit(probe,row):row for row in rows}
 for future in concurrent.futures.as_completed(futures):
  report['rows'].append(future.result());out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
report['rows'].sort(key=lambda x:next(i for i,r in enumerate(rows) if r['sourceUrl']==x['sourceUrl']))
report['completedCount']=len(report['rows']);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
from collections import Counter
print(json.dumps({'completed':len(report['rows']),'findings':dict(Counter(x['initialFinding'] for x in report['rows']))},ensure_ascii=False))
