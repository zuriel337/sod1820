"""One App-owned image survives real route transitions; public-read fixtures only."""
from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
OUT=ROOT/'docs/reviews/royal-persistent-20261121';OUT.mkdir(exist_ok=True)
rows=[]
OLD=r'legacy-dark-bg-post|dimension-five-night|sod-hashmal-night|mah-kore-habora-night|home-cosmos'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for theme in ['dark','light','parchment']:
  for width in [320,390,768,1440]:
   c=b.new_context(viewport={'width':width,'height':844 if width<768 else 900},service_workers='block');c.add_init_script(INIT.replace('THEME',theme));pg=c.new_page();guard(pg)
   pg.goto('http://localhost:4203/world');pg.locator('.sod29-flight-copy h2').wait_for();pg.wait_for_function("document.querySelector('.r29-connected-art img')?.naturalWidth>0")
   pg.evaluate("window.originalRoyal=document.querySelector('.r29-connected-art img');window.documentStart=performance.timeOrigin;window.royalMutations=0;new MutationObserver(ms=>{for(const m of ms)for(const n of [...m.addedNodes,...m.removedNodes])if(n.nodeType===1&&(n.matches?.('.r29-site-backdrop,.r29-connected-art')||n.contains?.(originalRoyal)))royalMutations++}).observe(document.body,{childList:true,subtree:true})")
   for route,selector in [('world','.sod29-flight-copy h2'),('books','.sod29-book-grid'),('heichal','input[aria-label="נושא למחקר בהיכל"]'),('world','.sod29-flight-copy h2'),('post','.sod29-reading-post')]:
    if route=='post':pg.get_by_role('button',name='לקריאת פוסט המטוס',exact=False).click();pg.wait_for_url('**/post/**')
    elif not pg.url.endswith('/'+route):pg.locator(f'a[href="/{route}"]').first.evaluate('(e)=>e.click()');pg.wait_for_url('**/'+route)
    pg.locator(selector).wait_for(timeout=30000);pg.wait_for_timeout(200)
    v=pg.evaluate("""()=>({same:originalRoyal===document.querySelector('.r29-connected-art img'),documentSame:documentStart===performance.timeOrigin,mutations:royalMutations,images:document.querySelectorAll('.r29-connected-art img').length,requests:performance.getEntriesByType('resource').filter(x=>x.name.includes('royal-connected-')).map(x=>({url:x.name,transfer:x.transferSize})),overflow:document.documentElement.scrollWidth>innerWidth,rootBackground:getComputedStyle(document.querySelector('.sod29-root')).backgroundColor,intros:document.querySelectorAll('.sod29-page-intro').length,oldBackgrounds:[...document.querySelectorAll('.sod29-reading-post,.h29-home-cosmos,.sod29-community--artwork')].map(e=>getComputedStyle(e,'::before').backgroundImage)})""")
    assert v['same'] and v['documentSame'] and v['mutations']==0 and v['images']==1 and len(v['requests'])==1 and not v['overflow'],v
    assert v['rootBackground']=='rgba(0, 0, 0, 0)',v
    if route=='post':assert v['intros']==0 and all(x=='none' for x in v['oldBackgrounds']),v
    if width in [390,1440]:pg.screenshot(path=str(OUT/f'{route}-{width}-{theme}.png'))
    rows.append(dict(theme=theme,width=width,route=route,url=pg.url,**v))
   # Back/forward keeps the same image too, no extra fetch or remount.
   pg.go_back();pg.locator('.sod29-flight-copy h2').wait_for();pg.go_forward();pg.locator('.sod29-reading-post').wait_for();assert pg.evaluate('originalRoyal===document.querySelector(".r29-connected-art img") && royalMutations===0')
   # None still controls the intro, independently of the site-wide backdrop.
   for route in ['2029/posts','code?library=public','2029/calculator']:
    pg.goto('http://localhost:4203/'+route);pg.locator('.sod29-root').wait_for();pg.wait_for_timeout(500);assert pg.locator('.sod29-page-intro').count()==0;assert pg.locator('.r29-connected-art img').count()==1
   c.close();print(theme,width,'passed',flush=True)
 b.close()
(OUT/'persistence.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(OUT/'network-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2));print(len(rows),'route observations passed')
