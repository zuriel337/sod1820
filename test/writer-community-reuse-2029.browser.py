"""Existing built writer -> shared community activity/reactions -> existing author page.
All external requests intercepted; no real reaction, message or identity writes.
"""
import base64, functools, json, subprocess, threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'work/evidence/writer-community-reuse';OUT.mkdir(parents=True,exist_ok=True)
HTML=(ROOT/'dist/2029.html').read_text()
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import*as c from'./src/components/contributor2029/publicSourceCatalog2029Fixtures.js';console.log(JSON.stringify({identity:c.catalogFixtureIdentity,sources:c.catalogFixtureSources()}))"],cwd=ROOT,text=True))
UID='22222222-2222-4222-8222-222222222222'
class Files(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Files,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE='http://127.0.0.1:'+str(server.server_port)
report={'captures':[],'flows':[],'errors':[],'live_writes':0}
def install(page):
 state={'calls':[],'fail_like':True,'fail_read':False,'reactions':{'likes':12,'👍':['one','two']}}
 page.on('pageerror',lambda error:report['errors'].append(str(error)))
 def route(r):
  req=r.request;u=urlparse(req.url);q=parse_qs(u.query);name=u.path.rsplit('/',1)[-1]
  if u.hostname=='127.0.0.1':
   if req.is_navigation_request():return r.fulfill(content_type='text/html',body=HTML)
   if u.path.startswith('/api/'):
    return r.fulfill(json={'state':'ready','level':5,'label':'חוקר היכל','owner':False,'message':'login_required','studio':{'available':True,'items':[],'hasMore':False,'page':0}})
   if u.path=='/test/fixtures/public-contributor-catalog.svg':return r.fulfill(content_type='image/svg+xml',body=(ROOT/u.path.lstrip('/')).read_text())
   return r.continue_()
  if u.hostname!='linswmnnkjxvweumprav.supabase.co':return r.abort()
  select=q.get('select',[''])[0]
  state['calls'].append({'name':name,'method':req.method,'select':select,'query':q})
  if name in ['contributors','research_contributions']:
   token=req.headers.get('authorization','').split()[-1]
   claims=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))
   assert claims['role']=='anon','community content used account/session credentials'
  identity={**fixture['identity'],'user_id':UID,'public_visibility':'public','visibility':'public'}
  data=[];total=30
  if name=='contributors':data=[identity]
  elif name=='channel_updates':data=fixture['sources'] if q.get('contributor_id')!=['is.null'] else []
  elif name=='research_contributions' and 'reactions' in select:
   if state['fail_read']:return r.fulfill(status=503,json={'message':'synthetic read failure'})
   if select=='created_at,reactions':data=[{'created_at':'2020-01-01T00:00:00Z','reactions':{}}]
   else:
    offset=int(q.get('offset',['0'])[0]);limit=int(q.get('limit',['20'])[0])
    data=[{'id':f'40000000-0000-4000-8000-{n+1:012d}','author_contributor_id':identity['id'],'author_user_id':None,
           'author_name':identity['display_name'],'body':'הודעה ציבורית '+str(n+1),'created_at':'2026-10-22T10:00:00Z',
           'origin':'community_2029','reactions':state['reactions'] if n==0 else {},'contributor':identity} for n in range(offset,min(30,offset+limit))]
  elif name=='toggle_contribution_reaction':
   if state['fail_like']:return r.fulfill(status=503,json={'message':'synthetic unconfirmed reaction'})
   body=req.post_data_json;assert body['p_id']=='40000000-0000-4000-8000-000000000001';assert body['p_emoji']=='👍'
   state['reactions']={'likes':12,'👍':['one','two','v:'+body['p_visitor']]};data=state['reactions']
  elif name=='notification_prefs_guest_get_v1':data={'topics':[],'channels':[]}
  return r.fulfill(content_type='application/json',headers={'access-control-allow-origin':'*','access-control-expose-headers':'content-range','content-range':f'0-{max(0,len(data)-1)}/{total}'},body=json.dumps(data))
 page.route('**/*',route)
 return state
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [320,390,1440]:
   for theme in ['light','parchment','dark']:
    context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
    context.add_init_script("localStorage.setItem('sod-theme',"+json.dumps(theme)+")")
    page=context.new_page();state=install(page)
    page.goto(BASE+'/community/researcher/tzvi-opoc')
    page.locator('[data-catalog-source]').first.wait_for()
    assert page.locator('[data-catalog-source]').count()==20
    assert not any(c['name']=='research_contributions' and 'reactions' in c['select'] for c in state['calls'])
    page.get_by_role('button',name='כתיבה בקהילה',exact=True).click()
    page.locator('.sod29-community-thread').first.wait_for()
    assert page.locator('.sod29-community-thread').count()==20
    assert page.locator('[data-catalog-source]').count()==0
    first=page.locator('.sod29-community-thread').first
    expect(first.get_by_role('button')).to_have_text('👍14')
    full=page.get_by_role('link',name='לעמוד הכותב המלא בקהילה ←')
    assert parse_qs(urlparse(full.get_attribute('href')).query)['member']==[fixture['identity']['id']]
    assert 'ספירת לייקים ותגובות אינה זמינה' not in page.locator('body').inner_text()
    assert page.locator('.sod29-root.surface-community').count()==1
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(width,theme)
    page.screenshot(path=str(OUT/f'{width}-{theme}.png'))
    report['captures'].append({'width':width,'theme':theme,'same_community_rows':True,'historical_plus_modern_likes':14,'overflow':False})
    if width==390 and theme=='dark':
     first.get_by_role('button').click()
     first.get_by_role('alert').filter(has_text='לא נשמרה התגובה').wait_for()
     expect(first.get_by_role('button')).to_have_text('👍14')
     state['fail_like']=False
     first.get_by_role('button').click()
     expect(first.get_by_role('button')).to_have_text('👍15')
     expect(first.get_by_role('button')).to_have_attribute('aria-pressed','true')
     page.get_by_role('button',name='עוד הודעות',exact=True).click()
     expect(page.locator('.sod29-community-thread')).to_have_count(30)
     assert len([c for c in state['calls'] if c['name']=='toggle_contribution_reaction'])==2
     target=full.get_attribute('href');full.click();page.wait_for_url(BASE+target)
     page.locator('.sod29-community-profile-hero').wait_for()
     assert page.locator('.sod29-root.surface-community').count()==1
     page.locator('.sod29-community-profile .sod29-community-thread').first.wait_for()
     page.go_back();page.locator('.sod29-community-thread').first.wait_for()
     report['flows']+=['existing ReactionBar rollback and confirmed retry','20 to 30 community activity pagination','existing full author profile and back; one frame']
    context.close()
  # Failure is retryable and never mislabeled as an author with no messages.
  context=browser.new_context();page=context.new_page();state=install(page);state['fail_read']=True
  page.goto(BASE+'/community/researcher/tzvi-opoc?section=community')
  page.get_by_role('alert').filter(has_text='לא הצלחנו לטעון את פעילות').wait_for()
  assert 'אין הודעות ציבוריות משויכות' not in page.locator('body').inner_text()
  state['fail_read']=False
  page.get_by_role('button',name='ניסיון נוסף',exact=True).last.click()
  page.locator('.sod29-community-thread').first.wait_for();context.close()
  assert not report['errors'],report['errors']
  report['flows'].append('failed author read -> honest error -> retry')
  (OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False));browser.close()
finally:server.shutdown();server.server_close()
