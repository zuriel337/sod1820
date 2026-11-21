"""Geometry/keyboard checks for the implemented quiet intro."""
from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
OUT=ROOT/'docs/reviews/royal-connected-20261121'
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for arm,port in [('dark',4201),('light',4201),('parchment',4201)]:
  for width in [320,390,768,1440]:
   c=b.new_context(viewport={'width':width,'height':740 if width==320 else 844 if width==390 else 900},locale='he-IL',reduced_motion='reduce',service_workers='block');c.add_init_script(INIT.replace('THEME',arm));pg=c.new_page();guard(pg)
   for route in ['world','heichal','books','code']:
    pg.goto(f'http://localhost:{port}/{route}',wait_until='domcontentloaded');trigger=pg.locator('.sod29-page-intro>button');trigger.wait_for();pg.wait_for_timeout(350)
    trigger.focus();pg.keyboard.press('Enter');trigger=pg.locator('.r29-palace-help>button');trigger.wait_for();assert trigger.get_attribute('aria-expanded')=='true';pg.keyboard.press('Escape');assert trigger.get_attribute('aria-expanded')=='false';assert trigger.evaluate('(e)=>e===document.activeElement')
    r=pg.evaluate('''()=>{let i=document.querySelector('.sod29-page-intro'),a=i.querySelector('.sod29-hero-visual').getBoundingClientRect(),b=i.querySelector('button').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,h1:i.querySelectorAll('h1').length,dir:getComputedStyle(i).direction,helpHeight:b.height,overlap:Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top),animation:getComputedStyle(i.querySelector('.sod29-hero-visual')).animationName,links:[...i.querySelectorAll('a')].map(a=>a.getAttribute('href')),icon:i.querySelector('.sod29-hero-symbol svg')?.dataset.iconName,palaceRequests:performance.getEntriesByType('resource').filter(x=>x.name.includes('royal-connected-')).length}}''')
    assert not r['overflow'] and not r['overlap'];assert r['h1']==1 and r['dir']=='rtl' and r['helpHeight']>=44 and r['animation']=='none'
    assert pg.locator('.sectionpulse29,.nowpulse29').count()==0
    line=pg.evaluate("""()=>{const h=document.querySelector('.sod29-header'),s=document.querySelector('.sod29-crown-dip'),p=s.querySelector('path'),a=getComputedStyle(h,'::after'),c=getComputedStyle(p),r=h.getBoundingClientRect(),t=s.getBoundingClientRect();return {straight:parseFloat(a.height),curve:parseFloat(c.strokeWidth),stroke:c.stroke,paint:a.backgroundImage,gap:parseFloat(getComputedStyle(h).getPropertyValue('--s29-gap')),arc:t.width,alignment:Math.abs(t.top-(r.bottom-parseFloat(a.height)/2)),vector:c.vectorEffect,animation:getComputedStyle(document.querySelector('.r29-connected-art img')).animationName}}""")
    assert line['straight']==line['curve']==2 and line['gap']==line['arc'] and line['alignment']<0.6 and line['vector']=='non-scaling-stroke' and line['stroke'] in line['paint'] and line['animation']=='none',line
    r['crownLine']=line
    assert r['palaceRequests']==1
    assert pg.locator('.r29-connected-art img').count()==1
    assert pg.locator('.sod29-context-strip [data-context-role=page]').count()==0
    if width in [390,1440]:
     trigger.evaluate('(e)=>e.blur()');pg.screenshot(path=str(OUT/f'{route}-{width}-{arm}-reduced.png'))
    rows.append(dict(arm=arm,width=width,route=route,**r));(OUT/'geometry-keyboard.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
   c.close();print(arm,width,flush=True)
 c=b.new_context(service_workers='block');pg=c.new_page();guard(pg);pg.goto('http://localhost:4201/2029/posts');pg.wait_for_timeout(1200);assert pg.locator('.sod29-page-intro').count()==0;assert not pg.evaluate("performance.getEntriesByType('resource').some(e=>/RoyalIntro|RoyalBackdrop|royal-connected|royal-palace/.test(e.name))");assert pg.locator('.sod29-dock-here').is_disabled();c.close()
 b.close()
for width in [320,390,768,1440]:
 for route in ['world','heichal','books','code']:
  group=[x for x in rows if x['width']==width and x['route']==route]
  assert all(x['links']==group[0]['links'] and x['icon']==group[0]['icon'] for x in group)
print(len(rows),'passed; same links and icons across arms')
