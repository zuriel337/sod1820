"""Interleaved fresh-context/revisit measurements; no real data writes or CPU/network throttle."""
from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
OUT=ROOT/'docs/reviews/royal-persistent-20261121'
SELECTORS={'world':'.sod29-flight-copy h2','heichal':'input[aria-label="נושא למחקר בהיכל"]','books':'.sod29-book-grid'}
OBS=(Path(__file__).parent/'royal-connected-repeat-2029.browser.py').read_text().split("OBS='''",1)[1].split("'''",1)[0]
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 c=b.new_context(service_workers='block');pg=c.new_page();guard(pg)
 for route,selector in SELECTORS.items():pg.goto('http://localhost:4203/'+route);pg.locator(selector).wait_for();pg.wait_for_timeout(300)
 pg.goto('http://localhost:4203/world');pg.get_by_role('button',name='לקריאת פוסט המטוס',exact=False).click();pg.wait_for_url('**/post/**');pg.locator('.sod29-reading-post').wait_for();post=urllib.parse.urlparse(pg.url).path.lstrip('/');SELECTORS[post]='.sod29-reading-source';c.close()
 for run in range(3):
  arms=[('main',4200),('before',4204),('persistent',4203)];arms=arms[run:]+arms[:run]
  for width in [390,1440]:
   for route,selector in SELECTORS.items():
    for arm,port in arms:
     c=b.new_context(viewport={'width':width,'height':844 if width==390 else 900},service_workers='block');c.add_init_script(INIT.replace('THEME','dark'));c.add_init_script(OBS.replace('SELECTOR',json.dumps(selector)));pg=c.new_page();guard(pg)
     for warm in [False,True]:
      pg.goto(f'http://localhost:{port}/{route}',wait_until='domcontentloaded');pg.locator(selector).wait_for(timeout=30000);pg.wait_for_timeout(1200)
      d=pg.evaluate("""()=>({...__royal,overflow:document.documentElement.scrollWidth>innerWidth,resources:performance.getEntriesByType('resource').filter(e=>new URL(e.name).origin===location.origin).map(e=>({url:e.name.split('/').pop(),transfer:e.transferSize,encoded:e.encodedBodySize,start:e.startTime,end:e.responseEnd})),introHeight:document.querySelector('.sod29-page-intro')?.getBoundingClientRect().height??0})""")
      d.update(run=run,width=width,route='post' if route==post else route,arm=arm,warm=warm);rows.append(d);(OUT/'metrics.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
     c.close()
    print(run,width,route,flush=True)
 b.close()
(OUT/'perf-network-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2));print('observations',len(rows))
