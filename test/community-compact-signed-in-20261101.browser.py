"""Built Community UI with synthetic accounts, notifications and media. No live service writes."""
import base64,functools,json,os,threading,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs,urlencode
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/tmp/community-compact-signed-in-20261101');OUT.mkdir(exist_ok=True)
A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';R='11111111-1111-4111-8111-111111111111';C1='22222222-2222-4222-8222-222222222222';C2='33333333-3333-4333-8333-333333333333';C3='44444444-4444-4444-8444-444444444444';NEW='55555555-5555-4555-8555-555555555555';KEY='sb-linswmnnkjxvweumprav-auth-token'
PHOTO=(ROOT/'public/legacy-dark-bg-post-1280-6ca0167e2dda.webp').read_bytes()
def session(uid):
 def p(v):return base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
 token=p({'alg':'HS256'})+'.'+p({'sub':uid,'role':'authenticated','exp':int(time.time())+3600})+'.synthetic'
 return {'access_token':token,'refresh_token':'synthetic','expires_at':int(time.time())+3600,'expires_in':3600,'token_type':'bearer','user':{'id':uid,'email':'fixture@example.invalid'}}
class Files(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if not Path(self.directory,urlparse(self.path).path.lstrip('/')).is_file():self.path='/2029.html'
  return super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Files,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}'
def row(id,parent,body):return {'id':id,'parent_id':parent,'author_user_id':B,'author_name':'חבר מהקהילה','body':body,'origin':'community_2029','created_at':'2026-10-31T12:00:00Z','reactions':{'likes':3},'status':'approved'}
def install(context,theme='dark',uid=A):
 if uid:context.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session(uid)))+');')
 context.add_init_script('localStorage.setItem("sod-theme",'+json.dumps(theme)+');')
 context.add_init_script("window.__revoked=[];const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=u=>{window.__revoked.push(u);revoke(u)}")
 state={'rows':[row(R,None,'מקום לשתף מחשבה, תמונה ושיחה טובה.'),row(C1,R,'התגובה הראשונה כבר מופיעה כאן.'),row(C2,R,'וגם התגובה השנייה — בלי לפתוח את השרשור.'),row(C3,R,'תגובה שלישית נוספת.')],'count':{A:6,B:2},'count_mode':'ready','held_counts':[],'upload_fail':False,'publish_fail':False,'uploads':[],'posts':[],'reply_reads':[],'writes':[],'errors':[]}
 def route(h):
  req=h.request;u=urlparse(req.url);q=parse_qs(u.query);name=u.path.rsplit('/',1)[-1]
  def reply(data,status=200,headers=None):h.fulfill(status=status,content_type='application/json',body=json.dumps(data,ensure_ascii=False),headers=headers or {})
  parts=req.headers.get('authorization','').removeprefix('Bearer ').split('.');actor=json.loads(base64.urlsafe_b64decode(parts[1]+'='*(-len(parts[1])%4)))['sub'] if len(parts)==3 and parts[2]=='synthetic' else None
  if u.hostname=='127.0.0.1':
   if u.path=='/api/contributor-self':reply({'state':'ready','writer':{'state':'unlinked'},'capabilities':{'avatarUpdate':False}} if actor else {'state':'login_required'},200 if actor else 401);return
   if u.path.startswith('/api/'):reply({'state':'unavailable'},503);return
   h.continue_();return
  if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(status=200,body='');return
  if u.path=='/auth/v1/settings':reply({'external':{'email':True,'google':True,'facebook':True}});return
  if u.path=='/auth/v1/user':reply({'id':actor,'email':'fixture@example.invalid'},200 if actor else 401);return
  if u.path=='/rest/v1/users':
   if q.get('id',[''])[0].startswith('in.'):
    reply([{'id':x,'display_name':'משתמש לדוגמה' if x==A else 'חבר מהקהילה','username':'demo','avatar_url':None,'role':'user'} for x in [A,B] if x in q['id'][0]]);return
   reply({'id':actor,'display_name':'משתמש לדוגמה' if actor==A else 'חבר מהקהילה','username':'demo','avatar_url':None,'role':'user','tier':'member'});return
  if u.path=='/rest/v1/user_notifications':
   if req.method=='HEAD':
    assert actor
    if state['count_mode']=='hold' and actor==A:state['held_counts'].append(h);return
    if state['count_mode']=='error':reply({'message':'synthetic unavailable'},503);return
    h.fulfill(status=200,headers={'content-range':'*/'+str(state['count'][actor]),'access-control-expose-headers':'content-range'},body='');return
   if req.method=='GET':reply([]);return
  if u.path.startswith('/storage/v1/object/public/gallery/community/'):
   h.fulfill(status=200,content_type='image/webp',body=PHOTO);return
  if u.path.startswith('/storage/v1/object/gallery/community/') and req.method=='POST':
   assert actor and '/'+actor+'/' in u.path and req.headers.get('x-upsert')=='false';state['uploads'].append(u.path)
   reply({'message':'synthetic upload failure'},503) if state['upload_fail'] else reply({'Key':u.path.split('/object/',1)[1]});return
  args=req.post_data_json if req.method=='POST' else {}
  if name=='community_feed_page':
   roots=[r for r in state['rows'] if r['parent_id'] is None];reply([{**r,'total_count':len(roots)} for r in roots]);return
  if name=='community_reply_counts':reply([{'parent_id':id,'reply_count':sum(r['parent_id']==id for r in state['rows'])} for id in args['p_ids']]);return
  if name=='community_replies_page':
   state['reply_reads'].append(args);children=[r for r in state['rows'] if r['parent_id']==args['p_parent']];offset=args['p_offset'];reply([{**r,'total_count':len(children)} for r in children[offset:offset+args['p_limit']]]);return
  if name=='community_message_context':reply([r for r in state['rows'] if r['id']==args['p_id']]);return
  if name=='community_message_actions_v1':reply([]);return
  if name=='rd_is_admin':reply(False);return
  if name=='add_contribution':
   assert actor;state['posts'].append(args)
   if state['publish_fail']:reply({'message':'synthetic publication failure'},503);return
   state['rows'].insert(0,{**row(NEW,args['p_parent_id'],args['p_body']),'author_user_id':actor});reply(NEW);return
  if name in ['link_identity','track_visit','ingest_event']:h.abort();return
  if name in ['world_group_source_arrivals_v2','fn_list_family','writer_public_contributions_page_v1','notification_prefs_get_v1','notification_prefs_guest_get_v1','research_level_of']:reply([]);return
  if name in ['fn_get_or_create_my_person','research_state_snapshot_v1','fn_research_path_resume_v1']:reply({},403);return
  if req.method in ['GET','HEAD']:reply([]);return
  state['writes'].append(u.path);reply({},403)
 context.route('**/*',route);return state
def switch(page,uid):
 value=session(uid) if uid else None
 page.evaluate("""s=>{const k='sb-linswmnnkjxvweumprav-auth-token';if(s)localStorage.setItem(k,JSON.stringify(s));else localStorage.removeItem(k);const c=new BroadcastChannel(k);c.postMessage({event:s?'SIGNED_IN':'SIGNED_OUT',session:s});setTimeout(()=>c.close(),100)}""",value)
file={'name':'community-photo.webp','mimeType':'image/webp','buffer':PHOTO};cases=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);expect.set_options(timeout=15000)
 try:
  for width in [320,360,390,1440]:
   for theme in ['light','parchment','dark']:
    context=browser.new_context(viewport={'width':width,'height':1000});state=install(context,theme);page=context.new_page();page.on('pageerror',lambda e:state['errors'].append(str(e)));page.goto(BASE+'/community/chat')
    account=page.locator('.sod29-community-account-row');expect(account).to_contain_text('משתמש לדוגמה');expect(account.locator('.sod29-community-unread-badge')).to_have_text('6')
    expect(page.locator('.sod29-community-registration-note')).to_have_text('כבר הייתם חלק מהשיחה? הירשמו עם המייל שלכם, ונעזור לכם לחבר את הפרופיל מהצ׳אט הישן לחשבון החדש.')
    composer=page.get_by_role('region',name='כתיבת הודעה',exact=True);expect(composer).to_have_attribute('data-compact','true');expect(composer.get_by_role('button',name='פרסום',exact=True)).to_have_count(0)
    assert composer.locator('textarea').bounding_box()['height']<=58;assert composer.bounding_box()['height']<90
    expect(page.locator('#message-'+C1)).to_be_visible();expect(page.locator('#message-'+C2)).to_be_visible();expect(page.locator('#message-'+C3)).to_have_count(0)
    assert [x for x in state['reply_reads'] if x['p_parent']==R][0]['p_limit']==2
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    for control in [account.get_by_role('link',name='ההתראות שלי',exact=False),account.locator('summary'),composer.get_by_role('button',name='צירוף קובץ או סרטון')]:assert control.bounding_box()['height']>=44
    page.screenshot(path=str(OUT/f'compact-{width}-{theme}.png'),full_page=False)
    composer.locator('textarea').fill('מצרף תמונה לשיחה שלנו.');composer.locator('input[type=file]').set_input_files(file);preview=composer.locator('.sod29-community-draft-image img');expect(preview).to_be_visible();assert not state['uploads'] and not state['posts']
    assert preview.bounding_box()['y']>=composer.locator('textarea').bounding_box()['y']+composer.locator('textarea').bounding_box()['height']
    page.screenshot(path=str(OUT/f'image-below-text-{width}-{theme}.png'),full_page=False);assert not state['writes'] and not state['errors'],state
    cases.append({'width':width,'theme':theme,'compact_account_notification6':True,'composer_single_line':True,'two_replies_automatic_third_deferred':True,'image_preview_below_text_no_upload':True,'touch44':True,'no_overflow':True});context.close()
  for width in [390,1440]:
   context=browser.new_context(viewport={'width':width,'height':1000});state=install(context);page=context.new_page();page.on('pageerror',lambda e:state['errors'].append(str(e)));page.goto(BASE+'/community/chat')
   account=page.locator('.sod29-community-account-row');expect(account.locator('.sod29-community-unread-badge')).to_have_text('6');bell=account.get_by_role('link',name='ההתראות שלי',exact=False);assert '/2029/me/notifications?' in bell.get_attribute('href') and 'returnTo=' in bell.get_attribute('href')
   gear=account.locator('summary');gear.focus();page.keyboard.press('Enter');expect(account.get_by_role('link',name='כניסה עם חשבון אחר')).to_be_visible();expect(account.get_by_role('button',name='החשבון שלי מהצ׳אט הישן')).to_be_visible();page.keyboard.press('Escape');expect(gear).to_be_focused();expect(account.locator('details')).not_to_have_attribute('open','')
   page.get_by_role('button',name='עוד תגובות (1)',exact=True).click();expect(page.locator('#message-'+C3)).to_be_visible()
   composer=page.get_by_role('region',name='כתיבת הודעה',exact=True);composer.locator('textarea').fill('התמונה שלי מתחת לטקסט.');composer.locator('input[type=file]').set_input_files(file);preview=composer.locator('.sod29-community-draft-image img');expect(preview).to_be_visible();blob=preview.get_attribute('src')
   state['upload_fail']=True;composer.get_by_role('button',name='פרסום',exact=True).click();expect(composer.get_by_role('status')).to_contain_text('נכשלה');expect(preview).to_be_visible();assert len(state['uploads'])==1 and not state['posts']
   state['upload_fail']=False;state['publish_fail']=True;composer.get_by_role('button',name='פרסום',exact=True).click();expect(composer.get_by_role('status')).to_contain_text('נכשלה');assert len(state['uploads'])==2 and len(state['posts'])==1
   state['publish_fail']=False;composer.get_by_role('button',name='פרסום',exact=True).click();expect(composer.get_by_role('status')).to_have_text('ההודעה פורסמה.');assert len(state['uploads'])==2 and len(state['posts'])==2
   posted=page.locator('#message-'+NEW);image=posted.locator('.sod29-community-attachment-image img');expect(image).to_be_visible();body=posted.locator('.sod29-community-body');assert image.bounding_box()['y']>=body.bounding_box()['y']+body.bounding_box()['height'];expect(composer.locator('textarea')).to_have_value('');expect(composer.get_by_role('button',name='פרסום',exact=True)).to_have_count(0);assert page.evaluate('u=>window.__revoked.includes(u)',blob)
   page.screenshot(path=str(OUT/f'published-image-{width}.png'),full_page=True);assert not state['writes'] and not state['errors'],state;cases.append({'width':width,'failure_retry_upload_reuse':True,'published_image_below_text':True,'compact_after_publish':True,'blob_revoked':True,'gear_keyboard':True});context.close()
  context=browser.new_context(viewport={'width':390,'height':1000});state=install(context);state['count_mode']='error';page=context.new_page();page.goto(BASE+'/community/chat');account=page.locator('.sod29-community-account-row');expect(account).to_have_attribute('data-notification-state','error');expect(account.locator('.sod29-community-unread-badge')).to_have_count(0);state['count_mode']='ready';page.evaluate('window.dispatchEvent(new Event("focus"))');expect(account.locator('.sod29-community-unread-badge')).to_have_text('6');cases.append({'notification_failure_no_fake_badge_retry':True});context.close()
  context=browser.new_context(viewport={'width':390,'height':1000});state=install(context);state['count_mode']='hold';page=context.new_page();page.goto(BASE+'/community/chat');account=page.locator('.sod29-community-account-row');expect(account).to_contain_text('משתמש לדוגמה');composer=page.get_by_role('region',name='כתיבת הודעה',exact=True);composer.locator('textarea').fill('טיוטה של החשבון הראשון');composer.locator('input[type=file]').set_input_files(file);expect(composer.locator('.sod29-community-draft-image img')).to_be_visible();switch(page,B)
  expect(account).to_contain_text('חבר מהקהילה');expect(account.locator('.sod29-community-unread-badge')).to_have_text('2');expect(composer.locator('textarea')).to_have_value('');expect(composer.locator('.sod29-community-draft-image')).to_have_count(0)
  for h in state['held_counts']:h.fulfill(status=200,headers={'content-range':'*/6'},body='')
  expect(account.locator('.sod29-community-unread-badge')).to_have_text('2');switch(page,None);expect(account).to_have_count(0);expect(page.get_by_role('button',name='הצטרפו לשיחה')).to_be_visible();cases.append({'account_switch_ignores_old_count_clears_text_and_photo_logout':True});context.close()
  for width in [390,1440]:
   for destination in ['notifications','profile']:
    context=browser.new_context(viewport={'width':width,'height':1000});state=install(context);page=context.new_page();page.on('pageerror',lambda e:state['errors'].append(str(e)))
    address='/community/chat?'+urlencode({'thread':R,'reply':C2,'path':R+','+C2,'sort':'oldest'})+'#message-'+C2
    page.goto(BASE+address.replace('#','&_vercel_share=synthetic-grant#'));expect(page.locator('#message-'+C2)).to_be_visible()
    link=page.locator('.sod29-community-account-row').get_by_role('link',name='ההתראות שלי',exact=False) if destination=='notifications' else page.locator('.sod29-community-compose-avatar')
    href=link.get_attribute('href');assert parse_qs(urlparse(href).query)['returnTo']==[address];assert '_vercel_share' not in href
    # The account-switch destination uses the same safe exact local return.
    page.locator('.sod29-community-account-menu summary').click();switch_link=page.get_by_role('link',name='כניסה עם חשבון אחר',exact=True);assert parse_qs(urlparse(switch_link.get_attribute('href')).query)['returnTo']==[address];page.keyboard.press('Escape')
    link.click();expect(page).to_have_url(BASE+href);back=page.locator('.wp-head-actions').get_by_role('link',name='חזרה מדויקת',exact=True);expect(back).to_have_attribute('href',address);back.click()
    expect(page).to_have_url(BASE+address);expect(page.locator('#message-'+C2)).to_be_visible();expect(page.locator('#message-'+C2)).to_be_focused();assert not state['posts'] and not state['uploads'] and not state['writes'] and not state['errors'],state
    cases.append({'width':width,'account_destination':destination,'exact_thread_query_hash_return':True,'preview_grant_removed':True,'synthetic_account_only':True});context.close()
 finally:browser.close();server.shutdown()
(OUT/'results.json').write_text(json.dumps({'cases':cases,'data':'synthetic account names, counts and media; no live product writes','real_model_calls':0,'real_product_writes':0},ensure_ascii=False,indent=2));print(json.dumps({'pass':True,'cases':len(cases),'real_product_writes':0}))
