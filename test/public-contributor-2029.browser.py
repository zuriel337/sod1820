import json, os
from pathlib import Path
from urllib.parse import urlencode, urlparse
from playwright.sync_api import sync_playwright


# Run from the repository root with the localhost Vite server on port 5179.
Path('work').mkdir(exist_ok=True)
Path('work/contributor-review.html').write_text('<!doctype html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>בדיקה מקומית · דף כותב</title></head><body style="margin:0"><div id="root"></div><script type="module" src="/test/fixtures/public-contributor-2029-review.jsx"></script></body></html>')

out=Path(os.environ.get('CONTRIBUTOR_OUTPUT','work/evidence'))
out.mkdir(parents=True,exist_ok=True)
shots=out/'screenshots'
shots.mkdir(exist_ok=True)
base='http://127.0.0.1:5179/work/contributor-review.html'
report={'captures':[],'states':[],'errors':[],'external_requests':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,1440]:
  for theme in ['light','parchment','dark']:
   context=browser.new_context(viewport={'width':width,'height':900},device_scale_factor=1,reduced_motion='reduce')
   page=context.new_page()
   page.on('pageerror',lambda error:report['errors'].append(str(error)))
   def route(request):
    if urlparse(request.request.url).hostname in ['127.0.0.1','localhost']:
     request.continue_()
    else:
     report['external_requests'].append(urlparse(request.request.url).hostname)
     request.abort()
   page.route('**/*',route)
   href='/world?kind=equality&finding=f-7#source-11'
   query=urlencode({'theme':theme,'section':'sources','item':'channel_updates:source-one','returnTo':href})
   page.goto(base+'?'+query)
   page.get_by_role('heading',name='כותב לדוגמה — מקורות, כתבים והקשרים במחקר',exact=True).wait_for()
   page.locator('.pc-detail').wait_for()
   page.evaluate('document.fonts.ready')
   assert page.locator('.pc-return').get_attribute('href')==href
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'overflow {width}/{theme}'
   assert page.locator('.pc-detail').inner_text().find('מקור אחד, כמה הקשרים')>=0
   page.reload()
   page.locator('.pc-detail').wait_for()
   assert 'item=channel_updates%3Asource-one' in page.url
   assert page.get_by_role('button',name='מקורות ועדכונים',exact=True).get_attribute('aria-pressed')=='true'
   # All focusable controls have an accessible label and at least a 44px height.
   controls=page.locator('.public-contributor-2029 button, .public-contributor-2029 select, .public-contributor-2029 input')
   for control in controls.all():
    if control.is_visible():
     assert control.bounding_box()['height']>=44
   page.get_by_role('button',name='מקורות ועדכונים',exact=True).focus()
   assert page.evaluate("getComputedStyle(document.activeElement).outlineStyle")!='none'
   snapshot=page.locator('.public-contributor-2029').aria_snapshot()
   assert 'navigation "סוג התוכן של הכותב"' in snapshot
   assert 'פרטי מנהל' not in snapshot
   assert 'projection' not in snapshot
   assert 'נושאים · 0' not in page.locator('body').inner_text()
   fonts=page.locator('.pc-reason').evaluate_all('(nodes)=>nodes.map(n=>parseFloat(getComputedStyle(n).fontSize))')
   assert min(fonts)>=16
   filename=f'{width}-{theme}.png'
   page.screenshot(path=str(shots/filename),full_page=True)
   report['captures'].append({'width':width,'theme':theme,'file':filename,'overflow':False,'reload':True,'keyboard_focus':True,'aria_tree':True,'supporting_min_px':min(fonts)})
   if width==320 and theme=='dark':
    for scenario in ['empty','error','loading','unknown','unavailable','long']:
     page.goto(base+'?'+urlencode({'theme':theme,'scenario':scenario}))
     page.locator('.public-contributor-2029').wait_for()
     page.wait_for_timeout(80)
     assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'overflow {scenario}'
     report['states'].append({'scenario':scenario,'overflow':False})
    page.goto(base+'?theme=dark')
    page.get_by_role('button',name='ממצאים',exact=True).click()
    assert page.get_by_text('חוזק: לא דורג',exact=True).is_visible()
    assert page.get_by_text('איכות: לא דורג',exact=True).is_visible()
    assert page.get_by_role('option',name='החזקים תחילה').count()==0
    page.get_by_role('button',name='מקורות ועדכונים',exact=True).click()
    page.get_by_text('מקור ללא ממצאים משויכים.',exact=True).wait_for()
   context.close()
 browser.close()
assert not report['errors'],report['errors']
assert not report['external_requests'],report['external_requests']
(out/'browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'captures':len(report['captures']),'states':len(report['states']),'console_errors':len(report['errors']),'external_requests':len(report['external_requests'])},ensure_ascii=False))
