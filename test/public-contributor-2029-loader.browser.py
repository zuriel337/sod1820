import base64,json,time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
import subprocess
fixtures=json.loads(subprocess.check_output(['node','--input-type=module','-e', "import*as m from'./src/components/contributor2029/publicContributor2029Fixtures.js';console.log(JSON.stringify({identity:{...m.fixtureIdentity,public_visibility:'public'},research:m.fixtureFinding,source:m.fixtureSource}))"],text=True))
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for admin in [False,True]:
  context=browser.new_context()
  if admin:
   def part(v):return base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
   token=part({'alg':'HS256'})+'.'+part({'sub':'22222222-2222-4222-8222-222222222222','role':'authenticated','app_metadata':{'role':'admin'},'exp':int(time.time())+3600})+'.synthetic-test-signature'
   session={'access_token':token,'refresh_token':'synthetic-test-refresh','expires_at':int(time.time())+3600,'expires_in':3600,'token_type':'bearer','user':{'id':'22222222-2222-4222-8222-222222222222','app_metadata':{'role':'admin'}}}
   context.add_init_script('localStorage.setItem("sb-linswmnnkjxvweumprav-auth-token",'+json.dumps(json.dumps(session))+')')
  page=context.new_page();calls=[];errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   u=urlparse(r.request.url)
   if u.hostname=='127.0.0.1':return r.continue_()
   assert u.hostname=='linswmnnkjxvweumprav.supabase.co',u.hostname
   assert '/rest/v1/' in u.path,u.path
   table=u.path.rsplit('/',1)[1]
   auth=r.request.headers.get('authorization','').split()[-1]
   claims=json.loads(base64.urlsafe_b64decode(auth.split('.')[1]+'=='))
   assert claims['role']=='anon','session credentials were used for public data'
   calls.append(table)
   data={'contributors':[fixtures['identity']],'world_contributor_research_v1':[fixtures['research'],{**fixtures['research'],'id':'private-test-marker','privacy_scope':'private','statement':'PRIVATE_TEST_MARKER'}],
    'channel_updates':[fixtures['source']],'research_contributions':[],'gematria_words':[],'world_gematria_lexical_lookup_v1':[]}[table]
   r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*','content-range':f'0-{max(0,len(data)-1)}/{len(data)}'},body=json.dumps(data))
  page.route('**/*',route)
  page.goto('http://127.0.0.1:5181/work/contributor-review.html?scenario=loader')
  page.get_by_role('heading',name=fixtures['identity']['display_name'],exact=True).wait_for()
  assert page.locator('.pc-item').count()==2
  assert 'PRIVATE_TEST_MARKER' not in page.locator('body').inner_text()
  assert not errors,errors
  assert 'topic_cards_public' not in calls
  assert len([t for t in calls if t=='contributors'])==2
  results.append({'viewer':'signed-in-admin' if admin else 'anonymous','all_data_requests_anonymous':True,'private_marker_visible':False,'request_count':len(calls),'tables':calls,'canonical':page.locator('link[rel=canonical]').get_attribute('href')})
  context.close()
 browser.close()
Path('work/evidence/loader-browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False))
