"""Local four-arm comparison: main:4180, PR V1:4182, compact:4181.
Public-read guard and browser-only Heichal flag fixture from original acceptance.
No production writes. Full screenshots use a presentation-only DOM override.
"""
from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
OUT=ROOT/'docs/reviews/royal-palace-compact-full-20261121';OUT.mkdir(exist_ok=True)
SELECTORS={'world':'.sod29-flight-copy h2','heichal':'input[aria-label="נושא למחקר בהיכל"]','books':'.sod29-book-grid'}
OBS='''window.__royal={lcp:0,cls:0,events:[],usefulDom:null,usefulPaint:null};new PerformanceObserver(l=>{for(const e of l.getEntries()){__royal.lcp=e.startTime;__royal.events.push({kind:'lcp',at:e.startTime,url:e.url,size:e.size,tag:e.element?.tagName})}}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)__royal.cls+=e.value}).observe({type:'layout-shift',buffered:true});let seen=new Set;function sample(){let e=document.querySelector(SELECTOR);if(e){let r=e.getBoundingClientRect(),s=getComputedStyle(e);if(r.height&&r.width&&s.visibility==='visible'&&s.opacity!=='0'){if(!__royal.usefulDom)__royal.usefulDom=performance.now();if(r.top<innerHeight&&r.bottom>0&&!__royal.usefulPaint)requestAnimationFrame(()=>{__royal.usefulPaint=performance.now()})}}for(let q of ['.sod29-page-intro','.r29-palace-art img'])if(!seen.has(q)&&document.querySelector(q)){seen.add(q);__royal.events.push({kind:q,at:performance.now()})}if(performance.now()<7000)requestAnimationFrame(sample)}requestAnimationFrame(sample);'''
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 # Prime identical public response fixtures before timing any arm.
 ctx=b.new_context(service_workers='block');pg=ctx.new_page();guard(pg)
 for route in SELECTORS:
  pg.goto('http://localhost:4181/'+route);pg.locator(SELECTORS[route]).wait_for(timeout=30000);pg.wait_for_timeout(500)
 ctx.close()
 for run in range(3):
  arms=[('main',4180),('v1',4182),('compact',4181),('full',4181)];arms=arms[run:]+arms[:run]
  for width in [390,1440]:
   for route,selector in SELECTORS.items():
    for arm,port in arms:
     c=b.new_context(viewport={'width':width,'height':900},service_workers='block',locale='he-IL');c.add_init_script(INIT.replace('THEME','dark'));c.add_init_script(OBS.replace('SELECTOR',json.dumps(selector)));
     if arm=='full':c.add_init_script("new MutationObserver(()=>{let e=document.querySelector('.sod29-page-intro');if(e)e.dataset.introVariant='full'}).observe(document,{subtree:true,childList:true})")
     pg=c.new_page();guard(pg)
     for warm in [False,True]:
      pg.goto(f'http://localhost:{port}/{route}',wait_until='domcontentloaded');pg.locator(selector).wait_for(timeout=30000);pg.wait_for_timeout(1200)
      row=pg.evaluate('''()=>({...__royal,introHeight:document.querySelector('.sod29-page-intro').getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth,resources:performance.getEntriesByType('resource').filter(e=>new URL(e.name).origin===location.origin).map(e=>({url:e.name.split('/').pop(),transfer:e.transferSize,encoded:e.encodedBodySize,start:e.startTime,end:e.responseEnd}))})''');totals={}
      for resource in row['resources']:
       kind=resource['url'].split('.')[-1];t=totals.setdefault(kind,{'files':0,'transfer':0,'encoded':0});t['files']+=1;t['transfer']+=resource['transfer'];t['encoded']+=resource['encoded']
      row['weights']=totals;row['resources']=[x for x in row['resources'] if 'royal-palace' in x['url'] or 'RoyalIntro' in x['url']]
      row.update(run=run,width=width,route=route,arm=arm,warm=warm);rows.append(row);(OUT/'repeated-metrics.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
     c.close()
    print(run,width,route,flush=True)
 b.close()
print('observations',len(rows),flush=True)
