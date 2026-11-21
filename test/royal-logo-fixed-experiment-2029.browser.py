"""Browser-only fixed-crown experiment, never imported into the product."""
from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
OUT=ROOT/'docs/reviews/royal-persistent-20261121'
CSS='''html .sod29-root.closed-shell.native-frame{--s29-gap:var(--s29-dip-w)!important}html .sod29-root.closed-shell.native-frame .sod29-header-crown img,html .sod29-root.closed-shell.native-frame .sod29-crown-dip,html .sod29-root.closed-shell.native-frame .sod29-header-crown::after{transform:translateX(-50%)!important;opacity:1!important;transition:none!important;animation:none!important}.sod29-header::after,.sod29-crown-dip .dip-line{transition:none!important}'''
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [390,1440]:
  c=b.new_context(viewport={'width':width,'height':844 if width==390 else 900},service_workers='block');c.add_init_script(INIT.replace('THEME','dark'));pg=c.new_page();guard(pg);pg.goto('http://localhost:4203/world');pg.locator('.sod29-flight-copy h2').wait_for();pg.wait_for_timeout(1000);pg.reload();pg.locator('.sod29-flight-copy h2').wait_for();pg.wait_for_timeout(1000)
  cdp=c.new_cdp_session(pg);cdp.send('Performance.enable');style=None
  for run in range(5):
   for fixed in ([False,True] if run%2==0 else [True,False]):
    if style:style.evaluate('(e)=>e.remove()');style=None
    if fixed:style=pg.add_style_tag(content=CSS)
    pg.evaluate('window.scrollTo(0,0)');pg.wait_for_timeout(400)
    before={x['name']:x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
    d=pg.evaluate("""async()=>{const img=document.querySelector('.sod29-header-crown img'),rect=()=>{let r=img.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};let first=rect(),last=performance.now(),gaps=[],start=last;while(performance.now()-start<1600){let t=performance.now()-start;scrollTo(0,Math.floor(t/200)%2?240:0);await new Promise(requestAnimationFrame);let now=performance.now();gaps.push(now-last);last=now}scrollTo(0,240);await new Promise(r=>setTimeout(r,350));return {first,last:rect(),gaps,resources:performance.getEntriesByType('resource').filter(x=>x.name.includes('canonical-lockup')).map(x=>({url:x.name,transfer:x.transferSize,encoded:x.encodedBodySize}))}}""")
    after={x['name']:x['value'] for x in cdp.send('Performance.getMetrics')['metrics']};d['costMs']={k:1000*(after[k]-before[k]) for k in ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration']};d.update(width=width,run=run,fixed=fixed);rows.append(d)
    if fixed:assert abs(d['first']['width']-d['last']['width'])<.1,d
    else:assert d['last']['width']<d['first']['width'],d
    if run==0:pg.screenshot(path=str(OUT/(f'logo-{width}-'+('fixed' if fixed else 'current')+'.png')))
    (OUT/'logo-experiment.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
   print(width,run,flush=True)
  c.close()
 # Separately measure initial/revisit LCP with the same browser-only CSS applied before rendering.
 initial=[]
 obs=(Path(__file__).parent/'royal-connected-repeat-2029.browser.py').read_text().split("OBS=\'\'\'",1)[1].split("\'\'\'",1)[0].replace('SELECTOR',json.dumps('.sod29-flight-copy h2'))
 for run in range(3):
  for width in [390,1440]:
   for fixed in ([False,True] if run%2==0 else [True,False]):
    c=b.new_context(viewport={'width':width,'height':844 if width==390 else 900},service_workers='block');c.add_init_script(INIT.replace('THEME','dark'));c.add_init_script(obs)
    if fixed:c.add_init_script('document.addEventListener("DOMContentLoaded",()=>{const s=document.createElement("style");s.textContent='+json.dumps(CSS)+';document.head.appendChild(s)},{once:true})')
    pg=c.new_page();guard(pg)
    for warm in [False,True]:
     pg.goto('http://localhost:4203/world',wait_until='domcontentloaded');pg.locator('.sod29-flight-copy h2').wait_for();pg.wait_for_timeout(1200)
     d=pg.evaluate('()=>({...__royal})');d.update(run=run,width=width,fixed=fixed,warm=warm);initial.append(d)
    c.close();(OUT/'logo-initial-metrics.json').write_text(json.dumps(initial,ensure_ascii=False,indent=2))
 b.close()
print('logo observations',len(rows))
