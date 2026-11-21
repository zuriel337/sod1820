# Local compiled-app acceptance. Run servers on 4180 (base) and 4181 (branch).
# Public reads only; the Heichal capability response is a browser-local fixture.
import json,base64,urllib.request,urllib.parse,time,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('SOD_PALACE_EVIDENCE', str(ROOT/'docs/reviews/royal-palace-shared-intro-20261121')));OUT.mkdir(parents=True,exist_ok=True)
allowed={r['proname'] for r in json.loads((ROOT/'docs/reviews/public-foundation-20261101/evidence/rpc-read-inventory.json').read_text())['functions']};allowed.update(['convergence_meter','is_number_indexable','is_phrase_indexable'])
cache={};audit={'blocked':[], 'fixture':'Heichal lock disabled in browser responses only; every other response is a cached public read.'}
def guard(page):
 cdp=page.context.new_cdp_session(page);cdp.send('Network.enable');cdp.send('Fetch.enable',{'patterns':[{'urlPattern':'*supabase.co/*','requestStage':'Request'}]})
 def send(method, params):
  try:return cdp.send(method,params)
  except Exception as ex:
   if 'Invalid InterceptionId' not in str(ex) and 'closed' not in str(ex):raise
 def paused(e):
  req=e['request'];u=urllib.parse.urlparse(req['url']);method=req['method'];rpc=u.path.split('/rpc/')[-1] if '/rpc/' in u.path else None
  if method=='OPTIONS':
   send('Fetch.fulfillRequest',{'requestId':e['requestId'],'responseCode':204,'responseHeaders':[{'name':'Access-Control-Allow-Origin','value':'*'},{'name':'Access-Control-Allow-Methods','value':'GET,POST,HEAD,OPTIONS'},{'name':'Access-Control-Allow-Headers','value':req['headers'].get('Access-Control-Request-Headers','*')}]});return
  if not ((method in ['GET','HEAD'] and (u.path.startswith('/rest/v1/') or u.path.startswith('/storage/v1/object/public/'))) or (method=='POST' and rpc in allowed)):
   audit['blocked'].append({'path':u.path,'method':method});send('Fetch.failRequest',{'requestId':e['requestId'],'errorReason':'BlockedByClient'});return
  key=req['url']+req.get('postData','')
  if key not in cache:
   url=req['url']
   if method=='POST':
    data=json.loads(req.get('postData','{}'));q={k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else str(v) for k,v in data.items() if v is not None};url+='?'+urllib.parse.urlencode(q)
   headers={k:v for k,v in req['headers'].items() if k.lower() in ['apikey','authorization','accept','range','prefer']}
   try:
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=15) as r: body=r.read();status=r.status;typ=r.headers.get('Content-Type','application/json')
   except Exception as ex:
    status=getattr(ex,'code',503);body=ex.read() if hasattr(ex,'read') else b'{}';typ='application/json'
   if u.path=='/rest/v1/site_flags' and status==200:
    rows=json.loads(body)
    for row in rows:
     if row.get('key')=='lock_heichal':row['enabled']=False
    body=json.dumps(rows).encode()
   cache[key]=(status,body,typ)
  status,body,typ=cache[key];send('Fetch.fulfillRequest',{'requestId':e['requestId'],'responseCode':status,'responseHeaders':[{'name':'Content-Type','value':typ},{'name':'Access-Control-Allow-Origin','value':'*'}],'body':base64.b64encode(body).decode()})
 cdp.on('Fetch.requestPaused',paused);return cdp
INIT='''localStorage.setItem('sod_legacy_newsletter_invite_until',String(Date.now()+86400000));localStorage.setItem('sod2029:theme-preset','THEME');window.__perf={lcp:0,cls:0};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__perf.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__perf.cls+=e.value}).observe({type:'layout-shift',buffered:true});'''

import sys
if "--interactions" in sys.argv:
 checks=[]
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for theme in ['light','parchment','dark']:
   for width in [320,390,768,1440]:
    ctx=b.new_context(viewport={'width':width,'height':900},locale='he-IL',reduced_motion='reduce',service_workers='block');ctx.add_init_script(INIT.replace('THEME',theme));pg=ctx.new_page();guard(pg)
    for route in ['/world','/heichal','/books']:
     pg.goto('http://localhost:4181'+route,wait_until='domcontentloaded');pg.locator('.r29-palace-help button').first.wait_for(timeout=30000);pg.wait_for_timeout(300)
     trigger=pg.locator('.r29-palace-help>button');trigger.focus();pg.keyboard.press('Enter');pg.wait_for_timeout(250)
     close=pg.get_by_role('button',name='סגירת ההסבר');close.scroll_into_view_if_needed();close.click();assert trigger.get_attribute('aria-expanded')=='false'
     metrics=pg.evaluate('''()=>{const intro=document.querySelector('.sod29-page-intro'),medal=intro.querySelector('.sod29-hero-visual');return {overflow:document.documentElement.scrollWidth>innerWidth,dir:getComputedStyle(intro).direction,animation:getComputedStyle(medal).animationName,helpHeight:intro.querySelector('button').getBoundingClientRect().height,links:[...intro.querySelectorAll('a')].filter(x=>!x.closest('[inert]')).map(x=>x.getAttribute('href')),h1:intro.querySelectorAll('h1').length}}''');assert not metrics['overflow'];assert metrics['animation']=='none';assert metrics['dir']=='rtl';assert metrics['helpHeight']>=44;assert metrics['h1']==1;checks.append(dict(theme=theme,width=width,route=route,**metrics));(OUT/'interaction-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
     if width in [390,1440]:pg.screenshot(path=str(OUT/f'{route[1:]}-{width}-{theme}-reduced.png'))
    ctx.close();print(theme,width,flush=True)
  # Learning uses the existing exact-return mechanism, then the intro returns to the same URL.
  ctx=b.new_context(viewport={'width':390,'height':900},service_workers='block');pg=ctx.new_page();guard(pg);pg.goto('http://localhost:4181/world?view=updates#royal-return',wait_until='domcontentloaded');trigger=pg.locator('.r29-palace-help>button');trigger.wait_for();pg.wait_for_timeout(2000);before=pg.evaluate('sessionStorage.getItem("sod_research_context_v2:guest")');trigger.click();pg.keyboard.press('Escape');assert before==pg.evaluate('sessionStorage.getItem("sod_research_context_v2:guest")');trigger.click();pg.get_by_role('link',name='לימוד שיטות בבית המדרש').click();pg.wait_for_url('**/beit-midrash?section=methods');pg.wait_for_timeout(600);stored=pg.evaluate('sessionStorage.getItem("sod_research_context_v2:guest")');assert 'royal-return' in stored
  pg.go_back();pg.locator('.r29-palace-help>button').wait_for();assert 'royal-return' in pg.url
  # Existing none decisions do not request the art.
  pg.goto('http://localhost:4181/2029/posts');pg.wait_for_timeout(600);assert pg.locator('.sod29-page-intro').count()==0;assert not pg.evaluate("performance.getEntriesByType('resource').some(e=>e.name.includes('royal-palace-'))")
  checks.append({'learningExactOrigin':True,'helpPreservesContext':True,'noneOmitsImage':True})
  b.close()
 (OUT/'interaction-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
else:
 results=[]
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for version,port in [('before',4180),('after',4181)]:
   for width in [320,390,768,1440]:
    for route in ['/world','/heichal','/books']:
     ctx=b.new_context(viewport={'width':width,'height':900},locale='he-IL',service_workers='block');ctx.add_init_script(INIT.replace('THEME','dark'));pg=ctx.new_page();cdp=guard(pg)
     for warm in [False,True]:
      start=time.time();pg.goto(f'http://localhost:{port}'+route,wait_until='domcontentloaded');pg.locator('.sod29-page-intro').wait_for(timeout=25000);pg.wait_for_timeout(1500)
      if version=='after':pg.locator('.r29-palace-art img').wait_for()
      row=pg.evaluate('''()=>({...window.__perf,overflow:document.documentElement.scrollWidth>innerWidth,intros:document.querySelectorAll('.sod29-page-intro').length,h1:document.querySelectorAll('h1').length,icon:document.querySelector('.sod29-hero-symbol svg')?.dataset.iconName,images:performance.getEntriesByType('resource').filter(x=>x.name.includes('royal-palace')).map(x=>({url:x.name.split('/').pop(),transfer:x.transferSize,encoded:x.encodedBodySize,ms:x.duration})),resources:performance.getEntriesByType('resource').filter(x=>new URL(x.name).origin===location.origin).map(x=>({url:x.name.split('/').pop(),transfer:x.transferSize,encoded:x.encodedBodySize})),introHeight:document.querySelector('.sod29-page-intro').getBoundingClientRect().height})''');row.update(version=version,width=width,route=route,warm=warm,observedMs=round((time.time()-start)*1000));results.append(row);(OUT/'browser-metrics-partial.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
      if version=='after' and not warm:
       name=route.strip('/')
       if width in [390,1440]:pg.screenshot(path=str(OUT/f'{name}-{width}-night.png'))
       button=pg.locator('.r29-palace-help>button');button.click();pg.wait_for_timeout(220);assert button.get_attribute('aria-expanded')=='true';assert pg.locator('.r29-palace-explanation').is_visible();pg.keyboard.press('Escape');assert button.get_attribute('aria-expanded')=='false';assert button.evaluate('(el)=>el===document.activeElement')
     ctx.close();print(version,width,route,flush=True)
  b.close()
 (OUT/'browser-metrics.json').write_text(json.dumps({'method':'Compiled default builds; local HTTP server, Chromium, no CPU/network throttle, 1500 ms post-intro observation; cold context followed by warm same-context navigation. Public reads cached identically; Heichal uses browser-only flag fixture. Not field Web Vitals.','rows':results,'audit':audit},ensure_ascii=False,indent=2))
