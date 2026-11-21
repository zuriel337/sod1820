from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
OUT=ROOT/'docs/reviews/royal-quiet-intro-20261121'
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [390,1440]:
  c=b.new_context(viewport={'width':width,'height':844},service_workers='block');pg=c.new_page();guard(pg);pg.goto('http://localhost:4202/world')
  for key in ['node','edge','unit']:
   pg.locator('[data-pick="'+key+'"]').click(timeout=20000);pg.locator('[data-probe-action="card"]').click();card=pg.evaluate('window.__received');assert card['same']
   if key!='node':pg.evaluate('window.__releases[0]()');assert pg.locator('[data-probe-action="card"]').count()==1
   pg.locator('.sod29-dock-here').click();pg.locator('[data-probe-action="here"]').click();here=pg.evaluate('window.__received');assert here['same'] and here['target']==card['target'];rows.append(dict(width=width,key=key,target=here['target'],card=True,here=True))
   pg.keyboard.press('Escape')
  pg.locator('[data-clear]').click();pg.locator('.sod29-selected-royal').wait_for(state='detached')
  pg.locator('[data-pick="unit"]').click();pg.locator('[data-probe-action="card"]').wait_for();pg.locator('[data-route]').click();pg.locator('.sod29-selected-royal').wait_for(state='detached')
  c.close()
 b.close()
(OUT/'selected-item-seam.json').write_text(json.dumps({'fixture':'Real Shell + ResearchProvider; admin identity stub; synthetic validated owner targets and probe renderer; no real save/share/comment operation.','rows':rows,'staleLeaseCannotClearNewTarget':True,'clearAndRouteChangeRemoveSlot':True},ensure_ascii=False,indent=2))
print('6 card/here pairs passed, exact target including unit metadata; cleanup passed')
