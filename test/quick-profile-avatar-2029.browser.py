"""Actual App2029: chat -> own public profile -> canonical avatar editor; fixtures only."""
import base64,functools,json,threading,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs,quote
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/tmp/quick-profile-avatar-browser');OUT.mkdir(exist_ok=True)
A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';SA='11111111-1111-4111-8111-111111111111';SB='22222222-2222-4222-8222-222222222222';KEY='sb-linswmnnkjxvweumprav-auth-token'
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=')
def session(uid):
 def p(v):return base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
 t=p({'alg':'HS256'})+'.'+p({'sub':uid,'role':'authenticated','exp':int(time.time())+3600})+'.synthetic'
 return {'access_token':t,'refresh_token':'synthetic','expires_at':int(time.time())+3600,'expires_in':3600,'token_type':'bearer','user':{'id':uid,'email':'fixture@example.invalid'}}
class Files(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  if not Path(self.directory,urlparse(self.path).path.lstrip('/')).is_file():self.path='/2029.html'
  return super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Files,directory=str(ROOT/'preview-deploy'/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}'
def install(context,uid=A,theme='dark',admin=False):
 if uid:context.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session(uid)))+');')
 context.add_init_script('localStorage.setItem("sod-theme",'+json.dumps(theme)+');')
 state={'uploads':[],'saves':[],'self_reads':[],'mode':'ready','held':None,'unexpected':[],'errors':[],'account':{A:None,B:None},'public':{A:None,B:None}}
 def identities():return [{'id':src,'user_id':user,'slug':'own-'+str(i),'code':str(i),'kind':'community','active':True,'display_name':name,'bio':'הקדמה ציבורית','locked':False,'building':False,'public_visibility':'public','visibility':'public','public_avatar':{'enabled':True,'url':state['public'][user]} if state['public'][user] else None,'avatar_url':None,'wa_names':[]} for user,src,name,i in [(A,SA,'אדם א',7),(B,SB,'אדם ב',8)]]
 rows=[{'id':'10000000-0000-4000-8000-00000000000'+str(i),'parent_id':None,'status':'approved','author_name':name,'author_user_id':user,'author_contributor_id':src,'origin':'community_2029','body':'הודעת בדיקה ציבורית','created_at':'2026-10-31T00:00:00Z','reactions':{}} for user,src,name,i in [(A,SA,'אדם א',1),(B,SB,'אדם ב',2)]]
 def route(h):
  req=h.request;u=urlparse(req.url);q=parse_qs(u.query)
  def reply(data,status=200):h.fulfill(status=status,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
  parts=req.headers.get('authorization','').removeprefix('Bearer ').split('.');actor=json.loads(base64.urlsafe_b64decode(parts[1]+'='*(-len(parts[1])%4)))['sub'] if len(parts)==3 and parts[2]=='synthetic' else None
  if u.hostname=='127.0.0.1':
   if u.path=='/api/contributor-self':
    person=identities()[0 if actor==A else 1]
    if req.method=='GET':state['self_reads'].append(actor);reply({'state':'ready','capabilities':{'avatarUpdate':True},'writer':{**person,'state':'ready','href':'/community/researcher/'+person['code']}});return
    body=req.post_data_json;assert actor and set(body)=={'action','url','publish','ack'} and body['action']=='avatar' and body['publish'] is True and body['ack'] is True
    assert '/avatars/'+actor+'-' in body['url'];state['saves'].append(body);state['account'][actor]=body['url']
    if state['mode']=='hold':state['held']=(h,actor,body);return
    if state['mode']=='public-fail':reply({'state':'account_saved'});return
    if state['mode']=='save-fail':reply({'state':'unavailable'},503);return
    state['public'][actor]=body['url'];reply({'state':'saved'});return
   if u.path.startswith('/api/'):
    if req.method!='GET':state['unexpected'].append(u.path)
    reply({'state':'unavailable','owner':False,'message':'unavailable'},503);return
   h.continue_();return
  if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(status=200,body='');return
  if u.path=='/auth/v1/settings':reply({'external':{'email':True}});return
  if u.path=='/auth/v1/user':reply({'id':actor,'email':'fixture@example.invalid'},200 if actor else 401);return
  if u.path=='/rest/v1/users':
   if q.get('id',[''])[0].startswith('in.'):
    reply([{'id':user,'display_name':'אדם א' if user==A else 'אדם ב','username':'fixture','avatar_url':state['account'][user]} for user in [A,B] if user in q['id'][0]]);return
   reply({'id':actor,'username':'fixture','display_name':'חשבון א' if actor==A else 'חשבון ב','role':'admin' if admin else 'user','avatar_url':state['account'].get(actor)});return
  if u.path.startswith('/storage/v1/object/public/gallery/avatars/'):
   h.fulfill(status=200,content_type='image/png',body=PNG);return
  if u.path.startswith('/storage/v1/object/gallery/avatars/') and req.method=='POST':
   assert actor and '/avatars/'+actor+'-' in u.path and req.headers.get('x-upsert')=='false';state['uploads'].append(u.path)
   if state['mode']=='upload-fail':reply({'message':'synthetic upload failure'},503)
   else:reply({'Key':u.path.split('/object/',1)[1]})
   return
  name=u.path.rsplit('/',1)[-1]
  if name=='rd_is_admin':reply(admin);return
  if name=='community_feed_page':reply([{**r,'total_count':2} for r in rows]);return
  if name=='community_reply_counts':reply({});return
  if name in ['community_message_actions_v1','community_replies_page','community_message_context','writer_public_contributions_page_v1','world_group_source_arrivals_v2','fn_list_family']:reply([]);return
  if name in ['fn_get_or_create_my_person','research_state_snapshot_v1','fn_research_path_resume_v1']:reply({},403);return
  if name=='contributors':
   data=identities()
   for key in ['id','user_id','slug','code']:
    if q.get(key,[''])[0].startswith('eq.'):data=[p for p in data if str(p[key])==q[key][0][3:]]
   reply(data[0] if 'vnd.pgrst.object' in req.headers.get('accept','') and data else data);return
  if name=='research_contributions':
   data=rows
   if 'or' in q:data=[r for r in rows if r['author_user_id'] in q['or'][0] or r['author_contributor_id'] in q['or'][0]]
   for key in ['author_user_id','author_contributor_id']:
    if q.get(key,[''])[0].startswith('eq.'):data=[r for r in data if r[key]==q[key][0][3:]]
   reply(data);return
  if req.method in ['GET','HEAD']:reply([]);return
  state['unexpected'].append(u.path);reply({},403)
 context.route('**/*',route);return state

def open_profile(page,actor=A):
 page.goto(BASE+'/community/chat?member='+quote('user:'+actor),wait_until='domcontentloaded');page.locator('.pc-person-seal').wait_for()
def no_overflow(page):assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
file={'name':'portrait.png','mimeType':'image/png','buffer':PNG}
cases=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 try:
  for width in [320,360,390,1440]:
   for theme in ['light','parchment','dark']:
    context=browser.new_context(viewport={'width':width,'height':950},reduced_motion='reduce');state=install(context,theme=theme);page=context.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:state['errors'].append(str(e)))
    open_profile(page);button=page.get_by_role('button',name='החלפת תמונת הפרופיל שלי');button.click();dialog=page.get_by_role('dialog',name='החלפת תמונת הפרופיל');expect(dialog).to_be_visible();expect(dialog.get_by_role('button',name='שמירת התמונה')).to_be_disabled();expect(dialog.get_by_label('אני מאשר/ת להציג את התמונה בפרופיל הציבורי שלי.')).not_to_be_checked()
    no_overflow(page);assert not dialog.evaluate('e=>e.scrollWidth>e.clientWidth+1');assert button.bounding_box()['height']>=44
    picker=dialog.get_by_role('button',name='📷 העלאת תמונה מהמכשיר');assert picker.bounding_box()['height']>=44;picker.focus();page.keyboard.press('Tab');assert page.evaluate('document.activeElement.closest("dialog")!==null')
    page.screenshot(path=str(OUT/f'quick-avatar-{width}-{theme}.png'));page.keyboard.press('Escape');expect(dialog).not_to_be_visible();expect(button).to_be_focused();assert not state['uploads'] and not state['saves'] and not state['unexpected'] and not state['errors'],state
    cases.append({'width':width,'theme':theme,'own_square_quick_entry':True,'consent_required':True,'keyboard':True,'no_overflow':True});context.close()
  for width in [390,1440]:
   context=browser.new_context(viewport={'width':width,'height':1000});state=install(context);page=context.new_page();page.set_default_timeout(15000)
   page.goto(BASE+'/community/chat?sort=liked');page.get_by_role('link',name='פתיחת כרטיס הכותב של אדם א',exact=True).click();button=page.get_by_role('button',name='החלפת תמונת הפרופיל שלי');button.click();dialog=page.get_by_role('dialog',name='החלפת תמונת הפרופיל',exact=True);inp=dialog.locator('input[type=file]');save=dialog.get_by_role('button',name='שמירת התמונה')
   inp.set_input_files({'name':'x.svg','mimeType':'image/svg+xml','buffer':b'<svg/>'});expect(dialog.get_by_role('alert')).to_contain_text('JPG');assert not state['uploads']
   state['mode']='upload-fail';inp.set_input_files(file);expect(dialog.get_by_role('alert')).to_contain_text('synthetic upload failure');assert len(state['uploads'])==1
   state['mode']='public-fail';inp.set_input_files(file);expect(dialog.get_by_role('status')).to_contain_text('התמונה הועלתה');expect(save).to_be_disabled();dialog.get_by_role('checkbox').check();save.click();expect(dialog.get_by_role('alert')).to_contain_text('תמונת החשבון נשמרה');assert len(state['uploads'])==2 and len(state['saves'])==1
   state['mode']='ready';save.click();expect(dialog).not_to_be_visible();expect(page.locator('.sod29-community-card-header img')).to_have_attribute('src',state['public'][A]);assert len(state['uploads'])==2 and len(state['saves'])==2
   page.get_by_role('button',name='כל ההודעות בקהילה ←',exact=True).click();expect(page.locator('.pc-person-portrait')).to_have_attribute('src',state['public'][A])
   page.reload();expect(page.locator('.pc-person-portrait')).to_have_attribute('src',state['public'][A]);no_overflow(page);assert not state['unexpected'];cases.append({'width':width,'chat_to_own_profile':True,'unsafe_type_denied':True,'upload_failure_retry':True,'partial_public_failure_explicit':True,'retry_reuses_upload':True,'confirmed_public_image_after_refresh':True});context.close()
  for kind,uid,target,admin in [('guest',None,A,False),('other-admin',A,B,True),('visitor-preview',A,A,False)]:
   context=browser.new_context(viewport={'width':390,'height':950});state=install(context,uid=uid,admin=admin);page=context.new_page();page.set_default_timeout(15000);open_profile(page,target)
   if kind=='visitor-preview':page.goto(page.url+'&view=public');page.locator('.pc-person-seal').wait_for()
   expect(page.get_by_role('button',name='החלפת תמונת הפרופיל שלי')).to_have_count(0);assert not state['uploads'] and not state['saves'];cases.append({'case':kind,'avatar_edit_hidden':True});context.close()
  context=browser.new_context(viewport={'width':390,'height':950});state=install(context);page=context.new_page();page.set_default_timeout(15000);open_profile(page);page.get_by_role('button',name='החלפת תמונת הפרופיל שלי').click();dialog=page.get_by_role('dialog');dialog.locator('input[type=file]').set_input_files(file);expect(dialog.get_by_role('status')).to_contain_text('התמונה הועלתה');dialog.get_by_role('checkbox').check();state['mode']='hold';dialog.get_by_role('button',name='שמירת התמונה').click()
  for _ in range(100):
   if state['held']:break
   page.wait_for_timeout(20)
  assert state['held'];page.evaluate("""s=>{const k='sb-linswmnnkjxvweumprav-auth-token';localStorage.setItem(k,JSON.stringify(s));const c=new BroadcastChannel(k);c.postMessage({event:'SIGNED_IN',session:s});setTimeout(()=>c.close(),100)}""",session(B));page.wait_for_timeout(250)
  h,actor,body=state['held'];h.fulfill(status=200,content_type='application/json',body='{"state":"saved"}');expect(page.get_by_role('dialog')).to_have_count(0);expect(page.get_by_role('button',name='החלפת תמונת הפרופיל שלי')).to_have_count(0);assert state['account'][B] is None;assert not state['unexpected'];cases.append({'case':'pending_save_account_switch','old_result_ignored':True});context.close()
 finally:browser.close();server.shutdown()
(OUT/'results.json').write_text(json.dumps({'cases':cases,'real_uploads':0,'real_profile_writes':0,'model_calls':0},ensure_ascii=False,indent=2));print(json.dumps({'cases':len(cases),'pass':True,'real_profile_writes':0}))
