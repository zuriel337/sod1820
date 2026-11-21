"""Geometry/keyboard checks for the review-only three-options fixtures."""
from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
OUT=ROOT/'docs/reviews/royal-palace-three-options-20261121'
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for arm,port in [('compact',4191),('strip',4192),('crown',4193)]:
  for width in [320,390,768,1440]:
   c=b.new_context(viewport={'width':width,'height':900},locale='he-IL',reduced_motion='reduce',service_workers='block');c.add_init_script(INIT.replace('THEME','dark'));pg=c.new_page();guard(pg)
   for route in ['world','heichal','books']:
    pg.goto(f'http://localhost:{port}/{route}',wait_until='domcontentloaded');trigger=pg.locator('.r29-palace-help>button');trigger.wait_for();pg.wait_for_timeout(350)
    trigger.focus();pg.keyboard.press('Enter');assert trigger.get_attribute('aria-expanded')=='true';pg.keyboard.press('Escape');assert trigger.get_attribute('aria-expanded')=='false';assert trigger.evaluate('(e)=>e===document.activeElement')
    r=pg.evaluate('''()=>{let i=document.querySelector('.sod29-page-intro'),a=i.querySelector('.sod29-hero-visual').getBoundingClientRect(),b=i.querySelector('button').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,h1:i.querySelectorAll('h1').length,dir:getComputedStyle(i).direction,helpHeight:b.height,overlap:Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top),animation:getComputedStyle(i.querySelector('.sod29-hero-visual')).animationName,links:[...i.querySelectorAll('a')].map(a=>a.getAttribute('href')),icon:i.querySelector('.sod29-hero-symbol svg')?.dataset.iconName,palaceRequests:performance.getEntriesByType('resource').filter(x=>x.name.includes('royal-palace-')).length}}''')
    assert not r['overflow'] and not r['overlap'];assert r['h1']==1 and r['dir']=='rtl' and r['helpHeight']>=44 and r['animation']=='none'
    assert r['palaceRequests']==(0 if arm=='crown' else 1)
    rows.append(dict(arm=arm,width=width,route=route,**r));(OUT/'geometry-keyboard.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
   c.close();print(arm,width,flush=True)
 b.close()
for width in [320,390,768,1440]:
 for route in ['world','heichal','books']:
  group=[x for x in rows if x['width']==width and x['route']==route]
  assert all(x['links']==group[0]['links'] and x['icon']==group[0]['icon'] for x in group)
print(len(rows),'passed; same links and icons across arms')
