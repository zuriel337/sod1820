"""Real shared frame/providers with synthetic source context and blocked external IO.
Actual hosted Post/Topic acceptance is recorded separately at the exact commit.
"""
import json,os,socket,subprocess,time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('SINGLE_BAR_EVIDENCE','/tmp/single-command-bar-2029'));OUT.mkdir(parents=True,exist_ok=True)
HTML='''<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/single-command-bar-2029.jsx"></script></body></html>'''
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
  for width in ([390] if os.environ.get('SINGLE_BAR_SMOKE') else [320,390,980,1440]):
   for theme in (['light'] if os.environ.get('SINGLE_BAR_SMOKE') else ['light','parchment','dark']):
    for surface in (['els'] if os.environ.get('SINGLE_BAR_TOOL_ONLY') else ['post','topic','els'] if os.environ.get('SINGLE_BAR_SMOKE') else ['post','topic','world','books','community','number','home','heichal','journey','els']):
     c=b.new_context(viewport={'width':width,'height':900},reduced_motion='reduce');c.add_init_script("localStorage.setItem('sod-theme',"+json.dumps(theme)+")")
     page=c.new_page();page.set_default_timeout(10000);wire(page)
     try:
      page.goto(BASE+paths[surface]);dock=page.locator('.sod29-command-island');expect(dock).to_have_count(1)
      if surface=='els':
       expect(dock).to_have_attribute('data-command-mode','tool');expect(dock.locator('[data-tool-action]')).to_have_count(4)
       dock.locator('[data-tool-action="tool-0"]').click();assert page.evaluate('window.__toolAction')==0
       expect(dock.locator('.sod29-raziel-orb')).to_have_count(1)
       dock.get_by_role('button',name='פעולות המערכת',exact=True).click();expect(dock).to_have_class(__import__('re').compile('is-single-command-bar'))
       dock.get_by_role('button',name=__import__('re').compile('^עוד')).click();page.get_by_role('button',name='חזור לכלי הצופן',exact=True).click();expect(dock).to_have_attribute('data-command-mode','tool')
      else:
       expect(dock).to_have_class(__import__('re').compile('is-single-command-bar'))
       expect(dock.locator(':scope > button')).to_have_count(5)
       boxes=dock.locator(':scope > button').evaluate_all('els=>els.map(e=>{let r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})')
       assert all(r['w']>=44 and r['h']>=44 for r in boxes),boxes
       assert max(r['y'] for r in boxes)-min(r['y'] for r in boxes)<12,boxes
       assert dock.bounding_box()['height']<=90
       for selector in ['.sod29-glass-locator','.sod29-surface-context-mobile-cue','.sod29-feed-chip','.sod29-selection-cue']:
        assert not page.locator(selector+':visible').count(),selector
       here=dock.get_by_role('button',name=__import__('re').compile('^כאן'));here.click()
       expect(page.locator('.sod29-frame-panel')).to_be_visible();expect(page.locator('.sod29-frame-panel').get_by_text('מקורות',exact=True).first).to_be_visible()
       close(page);expect(here).to_be_focused()
       here.click();page.locator('.sod29-frame-panel').get_by_text('מקורות',exact=True).first.click();expect(page.locator('.sod29-frame-panel')).to_have_count(0);expect(page.locator('#second')).to_be_in_viewport()
       more=dock.get_by_role('button',name=__import__('re').compile('^עוד'));more.click()
       panel=page.locator('.sod29-frame-panel');expect(panel.locator('section[aria-label="פעולות על הבחירה"]')).to_be_visible();expect(panel.locator('section[aria-label="כלי מחקר וחיפוש"]')).to_be_visible()
       panel.get_by_role('button',name='חיפוש',exact=True).click();expect(page.locator('.sod29-frame-command input')).to_be_visible();close(page);expect(more).to_be_focused()
       dock.get_by_role('button',name=__import__('re').compile('^עכשיו')).click();expect(page.locator('.sod29-frame-panel .sod29-now button')).to_have_count(3)
       for label in page.locator('.sod29-frame-panel .sod29-now-label').all():
        expect(label).to_be_visible();assert label.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>=14
       page.locator('.sod29-frame-panel .sod29-now').get_by_role('button',name='עכשיו · בשבילי',exact=True).click();expect(page.locator('.sod29-frame-panel')).to_contain_text('המרחב האישי שלי');close(page);expect(dock.get_by_role('button',name=__import__('re').compile('^עכשיו'))).to_be_focused()
       if surface in ['post','topic']:
        dock.get_by_role('button',name='מספר · פתח חלונית מספר').click();expect(page.locator('.sod29-frame-panel')).to_be_visible();close(page)
       page.evaluate('scrollTo(0,1000)');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
       if theme=='light' and surface in ['post','topic']:page.screenshot(path=str(OUT/f'{surface}-{width}.png'))
      report['cases'].append({'width':width,'theme':theme,'surface':surface})
     except Exception as e:
      report['failures'].append({'width':width,'theme':theme,'surface':surface,'error':str(e)});page.screenshot(path=str(OUT/f'failed-{surface}-{width}-{theme}.png'))
     c.close()
  c=b.new_context(viewport={'width':390,'height':900});page=c.new_page();wire(page,locked=True);page.goto(BASE+'/topic/test')
  expect(page.get_by_role('button',name='מספר · נעול כרגע')).to_be_disabled();assert not page.locator('.sod29-frame-panel').count();c.close()
  report['cases'].append({'number_lock':'preserved'})
  b.close()
finally:
 proc.terminate();proc.wait(timeout=10);log.close();(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'passed':len(report['cases']),'failures':report['failures'],'errors':report['errors'],'models':report['models'],'blocked_posts':list(set(report['blocked_posts']))},ensure_ascii=False))
if report['failures'] or report['errors'] or report['models']:raise SystemExit(1)
