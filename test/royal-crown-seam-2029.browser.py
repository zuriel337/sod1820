from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
OUT=ROOT/'docs/reviews/royal-connected-20261121';rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for theme in ['dark','light','parchment']:
  for width in [390,1440]:
   c=b.new_context(viewport={'width':width,'height':900},device_scale_factor=2,service_workers='block',reduced_motion='reduce');c.add_init_script(INIT.replace('THEME',theme));pg=c.new_page();guard(pg);pg.goto('http://localhost:4203/code');pg.locator('.r29-connected-art img').wait_for(state='attached');pg.wait_for_timeout(500)
   r=pg.evaluate("""()=>{let h=document.querySelector('.sod29-header'),a=getComputedStyle(h,'::after'),s=document.querySelector('.sod29-crown-dip'),p=getComputedStyle(s.querySelector('path'));return {straight:a.height,curve:p.strokeWidth,color:p.stroke,paint:a.backgroundImage,gap:parseFloat(getComputedStyle(h).getPropertyValue('--s29-gap')),arc:s.getBoundingClientRect().width,center:Math.abs(s.getBoundingClientRect().left+s.getBoundingClientRect().width/2-(h.getBoundingClientRect().left+h.getBoundingClientRect().width/2)),blur:getComputedStyle(h,'::before').backdropFilter}}""")
   assert r['straight']==r['curve']=='2px' and r['color'] in r['paint'] and r['gap']==r['arc'] and r['center']<1 and r['blur']=='none',r
   pg.screenshot(path=str(OUT/f'crown-{theme}-{width}-2x.png'),clip={'x':0,'y':0,'width':width,'height':140})
   pg.evaluate('window.scrollTo(0,500)');pg.wait_for_timeout(400)
   folded=pg.evaluate("""()=>({gap:getComputedStyle(document.querySelector('.sod29-header')).getPropertyValue('--s29-gap'),opacity:getComputedStyle(document.querySelector('.sod29-crown-dip')).opacity})""");assert folded['gap']=='0px' and folded['opacity']=='0',folded
   pg.screenshot(path=str(OUT/f'crown-{theme}-{width}-scrolled-2x.png'),clip={'x':0,'y':0,'width':width,'height':90})
   rows.append(dict(theme=theme,width=width,**r,folded=folded));c.close()
 b.close()
(OUT/'crown-seam.json').write_text(json.dumps(rows,indent=2));print('6 DPR2 crown joins and scrolled states passed')
