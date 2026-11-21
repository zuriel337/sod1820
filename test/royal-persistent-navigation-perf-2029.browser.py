"""Soft-navigation useful visibility, separate from document-navigation LCP."""
from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
OUT=ROOT/'docs/reviews/royal-persistent-20261121';rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for run in range(3):
  arms=[('before',4204),('persistent',4203)];arms=arms[run%2:]+arms[:run%2]
  for width in [390,1440]:
   for arm,port in arms:
    c=b.new_context(viewport={'width':width,'height':844 if width==390 else 900},service_workers='block');c.add_init_script(INIT.replace('THEME','dark'));pg=c.new_page();guard(pg);pg.goto(f'http://localhost:{port}/world');pg.locator('.sod29-flight-copy h2').wait_for();pg.wait_for_timeout(700)
    for route,selector in [('books','.sod29-book-grid'),('heichal','input[aria-label="נושא למחקר בהיכל"]'),('world','.sod29-flight-copy h2'),('post','.sod29-reading-hero')]:
     pg.evaluate("""selector=>{window.navStart=performance.now();window.navArt=document.querySelector('.r29-connected-art img');window.navEntries=performance.getEntriesByType('resource').length;window.navVisible=null;function sample(){let e=document.querySelector(selector);if(e){let r=e.getBoundingClientRect(),s=getComputedStyle(e);if(r.width&&r.height&&r.top<innerHeight&&r.bottom>0&&s.visibility==='visible'){requestAnimationFrame(()=>navVisible=performance.now()-navStart);return}}if(performance.now()-navStart<15000)requestAnimationFrame(sample)}requestAnimationFrame(sample)}""",selector)
     if route=='post':pg.get_by_role('button',name='לקריאת פוסט המטוס',exact=False).click();pg.wait_for_url('**/post/**')
     else:pg.locator(f'a[href="/{route}"]').first.evaluate('(e)=>e.click()');pg.wait_for_url('**/'+route)
     pg.locator(selector).wait_for();pg.wait_for_function('navVisible!==null');pg.wait_for_timeout(200)
     d=pg.evaluate("""()=>({useful:navVisible,sameArt:navArt===document.querySelector('.r29-connected-art img'),resources:performance.getEntriesByType('resource').slice(navEntries).filter(e=>/royal-connected|legacy-dark-bg-post|night-(mobile|1280)/.test(e.name)).map(e=>({url:e.name,transfer:e.transferSize,encoded:e.encodedBodySize}))})""");d.update(run=run,width=width,arm=arm,route=route);rows.append(d)
    c.close();print(run,width,arm,flush=True)
 b.close()
(OUT/'navigation-metrics.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print('transitions',len(rows))
