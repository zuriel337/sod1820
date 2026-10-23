import json,os
from pathlib import Path
from urllib.parse import urlparse,urlencode
from playwright.sync_api import sync_playwright

port=os.environ.get('CONTRIBUTOR_REVIEW_PORT','5182')
base=f'http://127.0.0.1:{port}/work/contributor-review.html'
out=Path('work/rank-evidence');out.mkdir(parents=True,exist_ok=True)
report={'captures':[],'states':[],'errors':[],'external_requests':[],'live_rank':None}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,1440]:
  for theme in ['light','parchment','dark']:
   context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
   page=context.new_page()
   page.on('pageerror',lambda e:report['errors'].append(str(e)))
   def route(r):
    u=urlparse(r.request.url)
    if u.hostname=='127.0.0.1':r.continue_()
    else:report['external_requests'].append(u.hostname);r.abort()
   page.route('**/*',route)
   page.goto(base+'?'+urlencode({'scenario':'catalog','theme':theme,'rank':'ready'}))
   page.locator('.pc-rank-label').filter(has_text='חוקר היכל').wait_for()
   assert page.locator('.pc-rank-back .pc-rank-number').inner_text()=='5'
   assert page.locator('.pc-rank-front .pc-rank-initial').inner_text()=='צ'
   assert page.locator('.pc-rank-level').inner_text()=='דרגה 5 מתוך 5'
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'overflow {width}/{theme}'
   assert page.locator('[data-catalog-source]').count()==20
   transform=page.locator('.pc-rank-prism').evaluate('(n)=>getComputedStyle(n).transform')
   assert transform.startswith('matrix3d('),transform
   assert page.locator('.pc-rank-prism').evaluate('(n)=>getComputedStyle(n).transformStyle')=='preserve-3d'
   assert page.locator('.pc-rank-prism').evaluate('(n)=>getComputedStyle(n).transitionDuration')=='0s'
   rotate=page.locator('.pc-rank-flip')
   rotate.focus();assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle')!='none'
   assert rotate.bounding_box()['height']>=44
   page.keyboard.press('Enter')
   rotated=page.locator('.pc-rank-prism').evaluate('(n)=>getComputedStyle(n).transform')
   assert rotated!=transform
   assert page.locator('.pc-rank-label').inner_text()=='חוקר היכל'
   # Native details keep the rank explanation accessible without revealing private activity.
   page.locator('.pc-rank-about summary').click()
   assert 'אינה מדד לאמיתות התוכן' in page.locator('.pc-rank-about').inner_text()
   page.locator('.pc-rank-about summary').click()
   # Capture the initial orientation for comparable reference shots.
   page.goto(base+'?'+urlencode({'scenario':'catalog','theme':theme,'rank':'ready'}))
   page.locator('.pc-rank-label').filter(has_text='חוקר היכל').wait_for()
   page.screenshot(path=str(out/f'{width}-{theme}.png'))
   if width==1440:page.locator('.pc-rank').screenshot(path=str(out/f'seal-{theme}.png'))
   snapshot=page.locator('.pc-rank').aria_snapshot()
   assert 'על הכותב' in snapshot
   assert 'חוקר היכל' in snapshot
   assert 'XP' not in snapshot
   assert page.locator('canvas').count()==0
   report['captures'].append({'width':width,'theme':theme,'overflow':False,'keyboard_rotation':True,'true_css_3d':True,'reduced_motion':True,'webgl_contexts':0})
   context.close()
 context=browser.new_context(viewport={'width':320,'height':900},reduced_motion='reduce')
 page=context.new_page()
 for state in ['loading','unlinked','not_found','unavailable']:
  page.goto(base+'?'+urlencode({'scenario':'catalog','rank':state,'theme':'dark'}))
  page.locator(f'.pc-rank[data-rank-state="{state}"]').wait_for()
  assert page.locator('.pc-rank-level').count()==0
  assert page.locator('.pc-rank-back .pc-rank-number').inner_text()=='✦'
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  report['states'].append({'state':state,'no_default_rank':True,'overflow':False})
 context.close()
 # Opt-in live read: only the public rank response is captured, never the account binding.
 if os.environ.get('CONTRIBUTOR_VERIFY_LIVE_RANK')=='1':
  context=browser.new_context()
  page=context.new_page()
  with page.expect_response(lambda r:'/api/public-contributor-rank?' in r.url) as pending:
   page.goto(base+'?scenario=catalog&theme=dark&rank=live')
  response=pending.value;rank=response.json()
  assert response.status==200
  assert set(rank)=={'state','level','label'}
  assert rank['state']=='ready' and 1<=rank['level']<=5
  assert response.headers['cache-control']=='no-store'
  page.locator('.pc-rank-label').filter(has_text=rank['label']).wait_for()
  report['live_rank']=rank
  context.close()
 browser.close()
assert not report['errors'],report['errors']
assert not report['external_requests'],report['external_requests']
(out/'rank-browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'captures':len(report['captures']),'states':len(report['states']),'errors':report['errors'],'live_rank':report['live_rank']},ensure_ascii=False))
