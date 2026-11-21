from pathlib import Path
exec((Path(__file__).parent/'royal-palace-intro-2029.browser.py').read_text().split('import sys')[0])
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844},service_workers='block');c.add_init_script(INIT.replace('THEME','dark'));pg=c.new_page();guard(pg)
 for route in ['world','heichal','books']:
  pg.goto('http://localhost:4201/'+route);pg.locator('.sod29-page-intro>button').wait_for();pg.wait_for_timeout(500)
  before=pg.evaluate("performance.getEntriesByType('resource').filter(x=>/RoyalIntro|royal-palace|SelectedRoyalItem|InspectProjection/.test(x.name)).map(x=>x.name)");assert not before,before
  pg.locator('.sod29-page-intro>button').click();pg.locator('.r29-palace-disclosure[data-open="true"]').wait_for();assert pg.evaluate("performance.getEntriesByType('resource').some(x=>/RoyalIntro/.test(x.name))")
  pg.keyboard.press('Escape');assert pg.locator('.r29-palace-help>button').evaluate('(e)=>e===document.activeElement');rows.append({'route':route,'initialOptionalRequests':before,'opensOnDemand':True,'escapeFocusRestored':True})
 c.close();b.close()
(ROOT/'docs/reviews/royal-quiet-intro-20261121/help-demand.json').write_text(json.dumps(rows,indent=2));print('3 on-demand help checks passed')
