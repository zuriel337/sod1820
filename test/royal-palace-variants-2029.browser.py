from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
OUT=ROOT/'docs/reviews/royal-palace-compact-full-20261121';OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);checks=[]
 for width in [320,390,768,1440]:
  c=b.new_context(viewport={'width':width,'height':900},service_workers='block');c.add_init_script(INIT.replace('THEME','dark'));pg=c.new_page();guard(pg)
  for route in ['world','heichal','books']:
   pg.goto('http://localhost:4181/'+route);pg.locator('.r29-palace-help>button').wait_for();pg.wait_for_timeout(1000)
   for variant in ['compact','full']:
    pg.locator('.sod29-page-intro').evaluate('(e,v)=>e.dataset.introVariant=v',variant)
    pg.evaluate('scrollTo(0,0)')
    if width in [390,1440]:pg.screenshot(path=str(OUT/f'{route}-{width}-{variant}.png'))
    v=pg.evaluate('''()=>{let e=document.querySelector('.sod29-page-intro'),h=e.querySelector('.r29-palace-help>button').getBoundingClientRect(),m=e.querySelector('.sod29-hero-visual').getBoundingClientRect();return {height:e.getBoundingClientRect().height,overlap:!(h.right<=m.left||h.left>=m.right||h.bottom<=m.top||h.top>=m.bottom),overflow:document.documentElement.scrollWidth>innerWidth}}''');assert not v["overlap"], (route,width,variant,v);assert not v["overflow"];trigger=pg.locator('.r29-palace-help>button');trigger.focus();pg.keyboard.press('Enter');pg.wait_for_timeout(220);assert trigger.get_attribute('aria-expanded')=='true';pg.keyboard.press('Escape');assert trigger.evaluate('(e)=>e===document.activeElement');assert trigger.get_attribute('aria-expanded')=='false';checks.append(dict(route=route,width=width,variant=variant,keyboard=True,**v))
  c.close()
 b.close();(OUT/'geometry.json').write_text(json.dumps(checks,indent=2));print(checks)
