"""Real shared frame/providers with synthetic source context and blocked external IO.
Actual hosted Post/Topic acceptance is recorded separately at the exact commit.
"""
import json,os,socket,subprocess,time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('SINGLE_BAR_EVIDENCE','/tmp/public-context-labels-2029'));OUT.mkdir(parents=True,exist_ok=True)
HTML='''<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/public-context-labels-2029.jsx"></script></body></html>'''
paths={'post':'/post/test','topic':'/topic/test','world':'/world','books':'/books','community':'/community/chat','number':'/2029/number/73','home':'/2029','heichal':'/heichal','journey':'/2029/journey','els':'/code'}
report={'cases':[],'failures':[],'errors':[],'models':[],'blocked_posts':[]}
s=socket.socket();s.bind(('127.0.0.1',0));port=s.getsockname()[1];s.close();BASE=f'http://127.0.0.1:{port}'
log=(OUT/'vite.log').open('w');proc=subprocess.Popen(['node','node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',str(port),'--strictPort'],cwd=ROOT,stdout=log,stderr=log)
def wire(page, locked=False):
 page.on('pageerror',lambda e:report['errors'].append(e.stack))
 def handle(r):
  req=r.request;u=urlparse(req.url);name=u.path.rsplit('/',1)[-1]
  if u.hostname=='127.0.0.1':
   if req.is_navigation_request():return r.fulfill(content_type='text/html',body=HTML)
   if u.path.startswith('/api/'):return r.fulfill(status=503,json={'state':'unavailable'})
   return r.continue_()
  if name in ['ai-analyze','research-run','raziel-submit']:report['models'].append(name);return r.abort()
  if req.method=='POST':
   if name in ['rd_is_admin','notification_prefs_guest_get_v1','notification_prefs_get_v1','world_group_source_arrivals_v2','fn_method_profile','fn_method_value','fn_zero_scale','gematria_method_trace','fn_number_lookup']:return r.fulfill(json=[])
   report['blocked_posts'].append(name);return r.abort()
  data=[{'key':k,'enabled':locked and k=='lock_number','mode':'all'} for k in ['lock_number','lock_raziel_site','lock_world','lock_books','lock_life_journey','lock_heichal']] if name=='site_flags' else []
  return r.fulfill(json=data,headers={'access-control-allow-origin':'*','content-range':'0-0/0'})
 page.route('**/*',handle)
def close(page):
 page.keyboard.press('Escape');expect(page.locator('.sod29-frame-panel')).to_have_count(0)
try:
 for i in range(120):
  try:
   if urlopen(BASE,timeout=1).status==200:break
  except Exception:time.sleep(.25)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [320,390,1440]:
   for theme in ['light','parchment','dark']:
    for mode in ['match','unresolved','foreign']:
     c=b.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce');c.add_init_script("localStorage.setItem('sod-theme',"+json.dumps(theme)+")")
     page=c.new_page();page.set_default_timeout(10000);wire(page)
     try:
      page.goto(BASE+'/topic/exact?case='+mode)
      expect(page.locator('.sod29-context-strip')).to_contain_text('שיטות וחישובים')
      original=page.evaluate('window.__contextLabelSnapshot')
      for state in ['intro','raziel','here','more']:
       if state=='raziel': page.get_by_role('button',name='פתח שיחת רזיאל',exact=True).click();expect(page.locator('.sod29-raziel-native-hero h3') if page.locator('.sod29-raziel-native-hero h3').count() else page.locator('.sod29-frame-panel h3').first).to_be_visible()
       if state=='here':page.locator('.sod29-dock-here').click()
       if state=='more':page.locator('.is-single-command-bar').get_by_role('button',name=__import__('re').compile('^עוד')).click()
       text=page.locator('body').inner_text()
       assert '00edc0d8' not in text and '10000000-0000' not in text and 'topic-discovery-wall' not in text and 'מבט · topic' not in text,text[-1800:]
       if state=='raziel':
        expected='איתך בחקירת משיח בן דוד' if mode=='match' else 'מה תרצה לחקור?'
        expect(page.locator('.sod29-frame-panel').get_by_text(expected,exact=True)).to_be_visible()
        if theme=='light':page.screenshot(path=str(OUT/f'{width}-{mode}-raziel.png'))
       if state!='intro':close(page)
      assert page.evaluate('window.__contextLabelSnapshot')==original
      assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
      report['cases'].append({'width':width,'theme':theme,'mode':mode})
     except Exception as e:
      report['failures'].append({'width':width,'theme':theme,'mode':mode,'error':str(e)});page.screenshot(path=str(OUT/f'failed-{width}-{theme}-{mode}.png'))
     c.close()
  b.close()
finally:
 proc.terminate();proc.wait(timeout=10);log.close();(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'passed':len(report['cases']),'failures':report['failures'],'errors':report['errors'],'models':report['models'],'blocked_posts':list(set(report['blocked_posts']))},ensure_ascii=False))
if report['failures'] or report['errors'] or report['models']:raise SystemExit(1)
