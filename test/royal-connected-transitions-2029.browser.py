"""Real route transitions and same-origin image cache; public reads only."""
from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
OUT=ROOT/'docs/reviews/royal-persistent-20261121';rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844},service_workers='block');c.add_init_script(INIT.replace('THEME','dark'));pg=c.new_page();guard(pg)
 for route in ['world','books','heichal','code']:
  pg.goto('http://localhost:4203/'+route);pg.locator('.r29-connected-art img').wait_for(state='attached');pg.wait_for_function("document.querySelector('.r29-connected-art img').complete && document.querySelector('.r29-connected-art img').naturalWidth>0")
  art=pg.locator('.r29-connected-art img').evaluate('(e)=>({url:e.currentSrc,w:e.naturalWidth,h:e.naturalHeight})');resources=pg.evaluate("performance.getEntriesByType('resource').filter(e=>e.name.includes('royal-connected')).map(e=>({url:e.name,transfer:e.transferSize,encoded:e.encodedBodySize}))")
  assert len(resources)==1 and art['url'].endswith('.avif')
  if route!='world':assert resources[0]['transfer']==0,resources
  rows.append({'route':route,'art':art,'resources':resources})
 # Exercise WebP selection in this browser without altering production logic.
 pg.locator('.r29-connected-art source[type="image/avif"]').evaluate_all('(els)=>els.forEach(e=>e.remove())');pg.wait_for_function("document.querySelector('.r29-connected-art img').currentSrc.endsWith('.webp') && document.querySelector('.r29-connected-art img').complete");assert pg.locator('.r29-connected-art img').evaluate('(e)=>e.naturalWidth')==500
 rows.append({'webpFallbackDecodes':True})
 # Real public post transition: keep its canonical route and the shared background.
 pg.goto('http://localhost:4203/world');pg.get_by_role('button',name='לקריאת פוסט המטוס',exact=False).click();pg.wait_for_url('**/post/**');pg.wait_for_timeout(1500)
 assert pg.locator('.r29-connected-art').count()==1 and pg.locator('.sod29-page-intro').count()==0
 rows.append({'postRoute':pg.url,'palaceShared':True})
 c.close()
 for route in ['2029/posts','2029/calculator','code?library=public']:
  c=b.new_context(service_workers='block');pg=c.new_page();guard(pg);pg.goto('http://localhost:4203/'+route);pg.wait_for_timeout(1400)
  assert pg.locator('.sod29-page-intro').count()==0
  assert pg.locator(".r29-connected-art img").count()==1
  rows.append({'route':route,'introCount':pg.locator('.sod29-page-intro').count()});c.close()
 b.close()
(OUT/'transitions-cache.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print('cache, fallback, post and none routes passed')
