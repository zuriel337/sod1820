"""Built integrated UI with intercepted services. Never claims a real profile."""
import base64,functools,json,threading,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/community-legacy-claim-browser');OUT.mkdir(exist_ok=True)
A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';EM='e7581ab5-8c15-4832-b602-f361e41ff373';ES='99bcfb38-85be-4f38-89f0-7886f2f179e6';KEY='sb-linswmnnkjxvweumprav-auth-token'
def session(uid):
 def part(v):return base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
 user={'id':uid,'email':'fixture@example.invalid','email_confirmed_at':'2026-10-31T00:00:00Z'}
 token=part({'alg':'HS256'})+'.'+part({'sub':uid,'role':'authenticated','exp':int(time.time())+3600})+'.synthetic'
 return {'access_token':token,'refresh_token':'synthetic','expires_at':int(time.time())+3600,'expires_in':3600,'token_type':'bearer','user':user}
class Files(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  if not Path(self.directory,urlparse(self.path).path.lstrip('/')).is_file():self.path='/2029.html'
  return super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Files,directory=str(ROOT/'preview-deploy'/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}'
def install(context,uid=None,preset='dark'):
 if uid:context.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session(uid)))+');')
 context.add_init_script('localStorage.setItem("sod-theme",'+json.dumps(preset)+');')
 state={'claims':[],'mode':'denied','held':None,'confirmed':True,'unexpected':[],'errors':[]}
 def route(h):
  r=h.request;u=urlparse(r.url)
  if u.hostname=='127.0.0.1':h.continue_();return
  if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(status=200,body='');return
  def reply(data,status=200):h.fulfill(status=status,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
  parts=r.headers.get('authorization','').removeprefix('Bearer ').split('.');actor=None
  if len(parts)==3 and parts[2]=='synthetic':actor=json.loads(base64.urlsafe_b64decode(parts[1]+'='*(-len(parts[1])%4)))['sub']
  if u.path=='/auth/v1/settings':reply({'external':{'google':True,'facebook':True,'email':True}});return
  if u.path=='/auth/v1/user':reply({'id':actor,'email':'fixture@example.invalid','email_confirmed_at':'2026-10-31T00:00:00Z' if state['confirmed'] else None},200 if actor else 401);return
  if u.path=='/rest/v1/users':reply({'id':actor,'display_name':'משתמש בדיקה','username':'fixture','role':'user','tier':'member'});return
  name=u.path.rsplit('/',1)[-1];body=r.post_data_json if r.method=='POST' else {}
  if name=='community_feed_page':reply([]);return
  if name=='contributors_claim_legacy':
   assert actor and set(body)=={'p_contributor_id'} and body['p_contributor_id'] in [EM,ES]
   state['claims'].append({'actor':actor,**body})
   if state['mode']=='hold':state['held']=(h,actor,body['p_contributor_id']);return
   if state['mode']=='success':reply({'claimed':True,'contributor_id':body['p_contributor_id'],'user_id':actor})
   else:reply({'message':'legacy_claim_not_eligible','code':'P0001'},400)
   return
  if name=='rd_is_admin':reply(False);return
  if name in ['world_group_source_arrivals_v2','community_message_actions_v1','community_reply_counts','fn_list_family']:reply([]);return
  if r.method=='GET':reply([]);return
  if name in ['fn_get_or_create_my_person','research_state_snapshot_v1','fn_research_path_resume_v1']:reply({},403);return
  state['unexpected'].append(u.path);reply({},403)
 context.route('**/*',route);return state
cases=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 try:
  for width in [320,360,390,1440]:
   for preset in ['light','parchment','dark']:
    context=browser.new_context(viewport={'width':width,'height':900});state=install(context,preset=preset);page=context.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:state['errors'].append(str(e)))
    page.goto(BASE+'/community/chat?sort=liked&sourceSort=oldest');entry=page.get_by_role('button',name='החשבון שלי מהצ׳אט הישן',exact=True);entry.click();modal=page.get_by_role('dialog',name='חיבור החשבון מהצ׳אט הישן');expect(modal).to_be_visible()
    modal.get_by_label('הפרופיל הישן שלי',exact=True).select_option(EM);expect(modal.get_by_label('כתובת מייל',exact=True)).to_be_visible();expect(modal.get_by_role('button',name='אימות וחיבור החשבון הישן')).to_have_count(0)
    assert modal.get_by_label('הפרופיל הישן שלי',exact=True).locator('option').all_text_contents()==['בחירת פרופיל…','אמילי','Esther26']
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1');assert not modal.evaluate('e=>e.scrollWidth>e.clientWidth+1')
    buttons=modal.locator('button:visible');assert buttons.evaluate_all('es=>es.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44})')
    page.keyboard.press('Tab');assert page.evaluate('document.activeElement.closest("dialog")!==null')
    page.screenshot(path=str(OUT/f'claim-{width}-{preset}.png'));page.keyboard.press('Escape');expect(modal).not_to_be_visible();expect(entry).to_be_focused();assert 'sourceSort=oldest' in page.url
    assert not state['claims'] and not state['unexpected'] and not state['errors'],state;cases.append({'width':width,'preset':preset,'guest_no_claim':True,'keyboard_focus':True,'no_overflow':True});context.close()
  for width in [390,1440]:
   context=browser.new_context(viewport={'width':width,'height':950});state=install(context,A);page=context.new_page();page.set_default_timeout(15000);page.goto(BASE+'/community/chat?sort=oldest');page.get_by_role('button',name='החשבון שלי מהצ׳אט הישן',exact=True).click();modal=page.get_by_role('dialog');modal.get_by_label('הפרופיל הישן שלי').select_option(EM)
   action=modal.get_by_role('button',name='אימות וחיבור החשבון הישן',exact=True);expect(action).to_be_visible();action.click();expect(modal.get_by_role('alert')).to_contain_text('לא ניתן לחבר');assert len(state['claims'])==1
   state['confirmed']=False;action.click();expect(modal.get_by_role('alert')).to_contain_text('יש לאמת את כתובת המייל');assert len(state['claims'])==1
   state['confirmed']=True;state['mode']='success';action.click();expect(modal.get_by_text('החשבון הישן קושר בהצלחה',exact=True)).to_be_visible();assert state['claims'][-1]['actor']==A
   href=modal.get_by_role('link',name='האזור האישי שלי',exact=False).get_attribute('href');assert 'returnTo=' in href and 'sort%3Doldest' in href
   page.keyboard.press('Escape');page.get_by_role('button',name='החשבון שלי מהצ׳אט הישן',exact=True).click();modal.get_by_label('הפרופיל הישן שלי').select_option(ES);state['mode']='hold';modal.get_by_role('button',name='אימות וחיבור החשבון הישן',exact=True).click()
   for _ in range(100):
    if state['held']:break
    page.wait_for_timeout(20)
   assert state['held']
   page.evaluate("""s=>{const k='sb-linswmnnkjxvweumprav-auth-token';localStorage.setItem(k,JSON.stringify(s));const c=new BroadcastChannel(k);c.postMessage({event:'SIGNED_IN',session:s});setTimeout(()=>c.close(),100)}""",session(B));page.wait_for_timeout(200)
   h,actor,target=state['held'];h.fulfill(status=200,content_type='application/json',body=json.dumps({'claimed':True,'contributor_id':target,'user_id':actor}))
   expect(page.get_by_text('החשבון הישן קושר בהצלחה',exact=True)).to_have_count(0)
   if not modal.is_visible():
    page.get_by_role('button',name='החשבון שלי מהצ׳אט הישן',exact=True).click();modal.get_by_label('הפרופיל הישן שלי').select_option(ES)
   expect(modal.get_by_role('button',name='אימות וחיבור החשבון הישן',exact=True)).to_be_enabled()
   page.keyboard.press('Escape');page.goto(BASE+'/community/chat?claim='+EM);expect(page.get_by_role('heading',name='אימות החשבון הישן',exact=True)).to_be_visible();expect(page.get_by_role('link',name='→ חזרה לקהילה')).to_have_attribute('href','/community/chat')
   assert not state['unexpected'],state['unexpected'];cases.append({'width':width,'denial_retry':True,'unconfirmed_no_rpc':True,'verified_success_fixture':True,'stale_account_result_ignored':True,'direct_claim_return':True});context.close()
 finally:browser.close();server.shutdown()
Path(OUT/'results.json').write_text(json.dumps({'cases':cases,'real_claims':0,'real_auth':False,'model_calls':0},ensure_ascii=False,indent=2));print(json.dumps({'cases':len(cases),'pass':True,'real_claims':0}))
