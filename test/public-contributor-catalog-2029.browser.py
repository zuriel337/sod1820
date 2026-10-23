import os
import base64,json,subprocess,time
from pathlib import Path
from urllib.parse import urlencode,urlparse,parse_qs
from playwright.sync_api import sync_playwright

base='http://127.0.0.1:'+os.environ.get('CONTRIBUTOR_REVIEW_PORT','5181')+'/work/contributor-review.html'
output=Path('work/evidence/catalog');output.mkdir(parents=True,exist_ok=True)
report={'captures':[],'loader':[],'external_requests':[],'errors':[]}
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import*as m from'./src/components/contributor2029/publicSourceCatalog2029Fixtures.js';console.log(JSON.stringify({identity:{...m.catalogFixtureIdentity,public_visibility:'public'},sources:m.catalogFixtureSources()}))"],text=True))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,1440]:
  for theme in ['light','parchment','dark']:
   context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
   page=context.new_page()
   page.on('pageerror',lambda e:report['errors'].append(str(e)))
   def local_only(r):
    if urlparse(r.request.url).hostname=='127.0.0.1':r.continue_()
    else:report['external_requests'].append(urlparse(r.request.url).hostname);r.abort()
   page.route('**/*',local_only)
   href='/post/5107?section=source#paragraph-22'
   page.goto(base+'?'+urlencode({'scenario':'catalog','theme':theme,'returnTo':href}))
   page.get_by_role('heading',name='צבי · נתוני בדיקה',exact=True).wait_for()
   assert page.locator('[data-catalog-source]').count()==20
   assert page.locator('.pc-return').get_attribute('href')==href
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
   assert page.locator('.pc-catalog-media').count()==1
   nav=page.get_by_role('navigation',name='כניסות לדף הכתב')
   nav.get_by_role('button',name='כתבים אחרונים',exact=True).focus()
   assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle')!='none'
   assert 'heading "כתיבה בקהילה"' in page.locator('.public-contributor-2029').aria_snapshot()
   page.screenshot(path=str(output/f'{width}-{theme}.png'))
   nav.get_by_role('button',name='כל הכתבים',exact=True).click()
   page.get_by_role('button',name='הבא',exact=True).wait_for()
   assert page.locator('[data-catalog-source]').count()==20
   page.get_by_role('button',name='הבא',exact=True).click()
   page.wait_for_url('**page=2')
   page.reload();page.get_by_role('heading',name='צבי · נתוני בדיקה',exact=True).wait_for()
   assert page.locator('[data-catalog-source]').count()==4
   nav=page.get_by_role('navigation',name='כניסות לדף הכתב')
   nav.get_by_role('button',name='תמונות וגלריה',exact=True).click()
   page.get_by_text('תמונה וטקסט בפרסום אחד · הופעות המקור נשמרות.',exact=True).wait_for()
   assert page.locator('[data-catalog-source]').count()==1
   target=page.get_by_role('link',name='להופעה המדויקת בעולם ↗').get_attribute('href')
   assert 'sourceRef=channel_updates%3A' in target and '#source-occurrence-' in target
   nav.get_by_role('button',name='כתיבה בקהילה',exact=True).click()
   page.get_by_text('הודעה לדוגמה בקהילה',exact=True).wait_for()
   assert page.locator('[data-catalog-source]').count()==0
   assert 'ספירת לייקים ותגובות אינה זמינה' in page.locator('body').inner_text()
   report['captures'].append({'width':width,'theme':theme,'initial_cards':20,'catalogue_reachable':24,'paired_cards':1,'overflow':False,'reload_page_preserved':True,'community_separate':True})
   context.close()
 for admin in [False,True]:
  context=browser.new_context()
  if admin:
   def part(v):return base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
   token=part({'alg':'HS256'})+'.'+part({'sub':'22222222-2222-4222-8222-222222222222','role':'authenticated','app_metadata':{'role':'admin'},'exp':int(time.time())+3600})+'.synthetic-signature'
   session={'access_token':token,'refresh_token':'synthetic-refresh','expires_at':int(time.time())+3600,'expires_in':3600,'token_type':'bearer','user':{'id':'22222222-2222-4222-8222-222222222222'}}
   context.add_init_script('localStorage.setItem("sb-linswmnnkjxvweumprav-auth-token",'+json.dumps(json.dumps(session))+')')
  page=context.new_page();calls=[]
  def public_api(r):
   u=urlparse(r.request.url)
   if u.hostname=='127.0.0.1' and u.path=='/api/public-contributor-rank':return r.fulfill(status=503,content_type='application/json',body='{"state":"unavailable"}')
   if u.hostname=='127.0.0.1':return r.continue_()
   assert u.hostname=='linswmnnkjxvweumprav.supabase.co'
   table=u.path.rsplit('/',1)[1]
   assert table in ['contributors','channel_updates','research_contributions'],f'Unexpected full research request: {table}'
   token=r.request.headers['authorization'].split()[-1]
   assert json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))['role']=='anon'
   calls.append(table)
   q=parse_qs(u.query)
   data=[fixture['identity']] if table=='contributors' else fixture['sources'] if table=='channel_updates' and q.get('contributor_id')!=['is.null'] else []
   r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*','content-range':f'0-{max(0,len(data)-1)}/{len(data)}'},body=json.dumps(data))
  page.route('**/*',public_api)
  start=time.perf_counter();page.goto(base+'?scenario=loader-tzvi')
  page.get_by_role('heading',name='צבי · נתוני בדיקה',exact=True).wait_for()
  assert page.locator('[data-catalog-source]').count()==20
  report['loader'].append({'viewer':'admin' if admin else 'anonymous','request_count':len(calls),'tables':calls,'research_requests':0,'anonymous_only':True,'fixture_render_ms':round((time.perf_counter()-start)*1000)})
  context.close()
 browser.close()
assert not report['errors'],report['errors']
assert not report['external_requests'],report['external_requests']
(output/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'captures':len(report['captures']),'loaders':report['loader'],'errors':len(report['errors'])},ensure_ascii=False))
