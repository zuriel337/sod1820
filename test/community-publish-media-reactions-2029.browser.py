"""Real built UI, synthetic Auth/storage/messages/reactions. No live writes."""
import base64,functools,json,os,threading,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/community-publish-media-browser');OUT.mkdir(exist_ok=True)
ADMIN='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';OTHER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
OLD='10000000-0000-4000-8000-000000000001';NEW='10000000-0000-4000-8000-000000000002'
KEY='sb-linswmnnkjxvweumprav-auth-token'
def session(actor):
 def part(v):return base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
 token=part({'alg':'HS256'})+'.'+part({'sub':actor,'role':'authenticated','exp':int(time.time())+3600})+'.synthetic'
 return {'access_token':token,'refresh_token':'synthetic','expires_at':int(time.time())+3600,'expires_in':3600,'token_type':'bearer','user':{'id':actor,'email':'fixture@example.invalid'}}
class Files(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  if not Path(self.directory,urlparse(self.path).path.lstrip('/')).is_file():self.path='/2029.html'
  return super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Files,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}'

def install(context):
 state={'upload_fail':False,'publish_fail':False,'like_fail':False,'hold_like':False,'held_like':None,'uploads':[],'posts':[],'likes':[],'feed_sorts':[],'errors':[],'unexpected':[],
 'rows':[{'id':OLD,'parent_id':None,'author_name':'חבר קהילה','author_user_id':None,'author_contributor_id':None,'title':None,'body':'הודעת בדיקה עם לייקים ודיסלייקים מהארכיון','origin':'openweb','created_at':'2026-10-01T00:00:00Z','reactions':{'likes':7,'dislikes':3,'👍':[]},'edited_at':None,'is_deleted':False}]}
 def route(h):
  req=h.request;u=urlparse(req.url)
  if u.hostname=='127.0.0.1':h.continue_();return
  if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(status=200,body='');return
  def reply(data,status=200):h.fulfill(status=status,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
  token=req.headers.get('authorization','').removeprefix('Bearer ').split('.')
  actor=json.loads(base64.urlsafe_b64decode(token[1]+'='*(-len(token[1])%4)))['sub'] if len(token)==3 and token[2]=='synthetic' else None
  if u.path=='/auth/v1/settings':reply({'external':{'google':True,'facebook':True,'email':True}});return
  if u.path=='/auth/v1/user':reply({'id':actor,'email':'fixture@example.invalid'},200 if actor else 401);return
  if u.path.startswith('/storage/v1/object/public/gallery/community/'):
   h.fulfill(status=200,content_type='video/mp4',body=(OUT/'clip.mp4').read_bytes());return
  if u.path.startswith('/storage/v1/object/gallery/community/') and req.method=='POST':
   assert '/'+actor+'/' in u.path;assert req.headers.get('x-upsert')=='false'
   assert 'multipart/form-data' in req.headers.get('content-type','')
   assert b'video/mp4' in req.post_data_buffer
   state['uploads'].append(u.path)
   if state['upload_fail']:reply({'error':'upload_failed','message':'synthetic failure'},500)
   else:reply({'Key':u.path.split('/object/',1)[1]})
   return
  body=req.post_data_json if req.method=='POST' else {}
  if u.path=='/rest/v1/users':reply({'id':actor,'display_name':'חשבון בדיקה','username':'fixture','role':'admin' if actor==ADMIN else 'user','tier':'member'});return
  name=u.path.rsplit('/',1)[-1]
  if name=='community_feed_page':
   state['feed_sorts'].append(body.get('p_sort'))
   roots=[r for r in state['rows'] if r['parent_id'] is None]
   if body.get('p_sort')=='oldest':roots=list(reversed(roots))
   rows=roots[body.get('p_offset',0):body.get('p_offset',0)+body.get('p_limit',50)]
   reply([{**r,'total_count':len(roots)} for r in rows]);return
  if name=='community_message_actions_v1':reply([]);return
  if name=='community_reply_counts':reply({});return
  if name in ('community_replies_page','world_group_source_arrivals_v2','fn_list_family'):reply([]);return
  if name=='rd_is_admin':reply(actor==ADMIN);return
  if name=='add_contribution':
   assert actor;assert body['p_origin']=='community_2029' and body['p_intent']=='תגובה';assert body['p_target_id']=='community'
   state['posts'].append(body)
   if state['publish_fail']:reply({'message':'synthetic publish failure'},503);return
   state['rows'].insert(0,{'id':NEW,'parent_id':body['p_parent_id'],'author_name':'חשבון בדיקה','author_user_id':actor,'author_contributor_id':None,'title':None,'body':body['p_body'],'origin':'community_2029','created_at':'2026-10-31T10:00:00Z','reactions':{},'edited_at':None,'is_deleted':False})
   reply(NEW);return
  if name=='toggle_contribution_reaction':
   assert actor and body['p_visitor'] is None and body['p_emoji']=='👍';state['likes'].append(actor)
   if state['hold_like']:state['held_like']=(h,actor);return
   if state['like_fail']:reply({'message':'synthetic reaction failure'},403);return
   rx=state['rows'][-1]['reactions'];v=rx['👍']
   if actor in v:v.remove(actor)
   else:v.append(actor)
   reply(rx);return
  if req.method=='GET':reply([]);return
  if name in ('research_state_snapshot_v1','fn_research_path_resume_v1','fn_get_or_create_my_person'):reply({},403);return
  state['unexpected'].append(u.path);reply({},403)
 context.route('**/*',route);return state

cases=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 try:
  for width in [390,1440]:
   context=browser.new_context(viewport={'width':width,'height':1000});context.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session(ADMIN)))+');')
   state=install(context);page=context.new_page();page.set_default_timeout(20000);page.on('pageerror',lambda e:state['errors'].append(str(e)))
   page.goto(BASE+'/community/chat',wait_until='domcontentloaded');row=page.locator('#message-'+OLD);row.wait_for()
   expect(row.get_by_label('3 לא אהבו')).to_be_visible()
   like=row.get_by_role('button',name='אהבתי',exact=True);like.click();expect(row.get_by_role('button',name='בטל לייק')).to_have_attribute('aria-pressed','true')
   assert state['rows'][-1]['reactions']['likes']==7 and state['rows'][-1]['reactions']['dislikes']==3
   state['like_fail']=True;row.get_by_role('button',name='בטל לייק').click();expect(row.get_by_role('alert')).to_contain_text('לא נשמרה')
   expect(row.get_by_role('button',name='בטל לייק')).to_have_attribute('aria-pressed','true');state['like_fail']=False
   row.get_by_role('button',name='בטל לייק').click();expect(row.get_by_role('button',name='אהבתי',exact=True)).to_have_attribute('aria-pressed','false')
   page.locator('textarea').fill('סרטון חדש מהטלפון לשיחה')
   page.locator('input[type=file]').set_input_files(str(OUT/'clip.mp4'))
   state['upload_fail']=True;page.get_by_role('button',name='פרסום',exact=True).click();expect(page.get_by_text('השליחה או העלאת הקובץ נכשלה.',exact=False)).to_be_visible()
   assert page.locator('textarea').input_value()=='סרטון חדש מהטלפון לשיחה';assert not state['posts']
   state['upload_fail']=False;state['publish_fail']=True;page.get_by_role('button',name='פרסום',exact=True).click();expect(page.get_by_text('השליחה או העלאת הקובץ נכשלה.',exact=False)).to_be_visible()
   assert len(state['uploads'])==2 and len(state['posts'])==1
   state['publish_fail']=False;page.get_by_role('button',name='פרסום',exact=True).click();expect(page.get_by_text('ההודעה פורסמה.',exact=True)).to_be_visible()
   assert len(state['uploads'])==2 and len(state['posts'])==2,'retry must reuse an uploaded file'
   video=page.locator('#message-'+NEW+' video');video.wait_for();assert video.get_attribute('controls') is not None;assert video.get_attribute('autoplay') is None
   assert '/community/'+ADMIN+'/' in video.get_attribute('src');assert page.locator('textarea').input_value()==''
   # A pending old-account response cannot select the new account's vote.
   state['hold_like']=True;row.get_by_role('button',name='אהבתי',exact=True).click()
   for _ in range(50):
    if state['held_like']:break
    page.wait_for_timeout(30)
   assert state['held_like']
   page.evaluate("""s=>{const key='sb-linswmnnkjxvweumprav-auth-token';localStorage.setItem(key,JSON.stringify(s));const c=new BroadcastChannel(key);c.postMessage({event:'SIGNED_IN',session:s});setTimeout(()=>c.close(),100)}""",session(OTHER))
   page.wait_for_timeout(250)
   h,old_actor=state['held_like'];rx=state['rows'][-1]['reactions'];rx['👍'].append(old_actor);h.fulfill(status=200,content_type='application/json',body=json.dumps(rx));state['hold_like']=False
   expect(row.get_by_role('button',name='אהבתי',exact=True)).to_have_attribute('aria-pressed','false')
   expect(row.get_by_label('3 לא אהבו')).to_be_visible()
   assert not state['unexpected'],state['unexpected'];assert not state['errors'],state['errors']
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   page.screenshot(path=str(OUT/f'published-{width}.png'),full_page=True)
   cases.append({'width':width,'like_toggle':True,'like_failure_rollback':True,'legacy_dislikes_preserved':3,'video_upload_failure_retry':True,'publish_failure_reuses_upload':True,'native_video_controls':True,'account_switch_pending_like':True,'no_overflow':True});context.close()
  # Reproduce the reported success + empty search for a differently shared URL
  # of the same video, including an older loaded window retained by liked sort.
  for width in [390,1440]:
   for suffix,sort in [('', 'newest'),('?sort=oldest','oldest'),('?sort=liked&sourceSort=oldest','liked')]:
    context=browser.new_context(viewport={'width':width,'height':1000});context.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session(ADMIN)))+');')
    state=install(context);page=context.new_page();page.set_default_timeout(20000);page.on('pageerror',lambda e:state['errors'].append(str(e)))
    page.goto(BASE+'/community/chat'+suffix,wait_until='domcontentloaded');page.locator('#message-'+OLD).wait_for()
    search=page.get_by_placeholder('חיפוש בשיחות שבדף');previous='https://youtu.be/DAT6Soq3jf8?si=old-share';published='https://youtu.be/DAT6Soq3jf8?si=new-share'
    search.fill(previous);expect(page.get_by_text('לא נמצאו התאמות לחיפוש',exact=True)).to_be_visible()
    page.get_by_role('button',name='ניקוי החיפוש',exact=True).click();expect(search).to_have_value('');expect(page.locator('#message-'+OLD)).to_be_visible();search.fill(previous)
    page.locator('textarea').fill(published);state['publish_fail']=True;page.get_by_role('button',name='פרסום',exact=True).click()
    expect(page.get_by_text('לא הצלחנו לפרסם את ההודעה. הטיוטה נשמרה לניסיון חוזר.',exact=True)).to_be_visible()
    expect(search).to_have_value(previous);expect(page.locator('select')).to_have_value(sort);expect(page.locator('textarea')).to_have_value(published)
    state['publish_fail']=False;page.get_by_role('button',name='פרסום',exact=True).click();expect(page.get_by_text('ההודעה פורסמה.',exact=True)).to_be_visible()
    expect(search).to_have_value('');expect(page.locator('select')).to_have_value('newest');expect(page.locator('#message-'+NEW)).to_be_visible()
    expect(page.get_by_text('לא נמצאו התאמות לחיפוש',exact=True)).to_have_count(0)
    assert 'sort=' not in page.url and 'sourceSort=' not in page.url;assert state['feed_sorts'][-1]=='newest'
    page.reload();expect(page.locator('#message-'+NEW)).to_be_visible();expect(page.get_by_placeholder('חיפוש בשיחות שבדף')).to_have_value('')
    assert not state['errors'] and not state['unexpected'],state
    cases.append({'width':width,'successful_publish_visible_after':sort,'stale_search_cleared':True,'failed_publish_retains_context':True,'reload_visible':True});context.close()
  for width in [390,1440]:
   context=browser.new_context(viewport={'width':width,'height':1000});context.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session(ADMIN)))+');')
   state=install(context);page=context.new_page();page.goto(BASE+'/community/chat?sort=oldest',wait_until='domcontentloaded');row=page.locator('#message-'+OLD);row.wait_for()
   search=page.get_by_placeholder('חיפוש בשיחות שבדף');search.fill('הודעת בדיקה');row.get_by_role('button',name='השב',exact=True).click()
   page.locator('textarea').fill('תשובה בתוך השיחה הקיימת');page.get_by_role('button',name='פרסום',exact=True).click();expect(page.get_by_text('ההודעה פורסמה.',exact=True)).to_be_visible()
   expect(search).to_have_value('הודעת בדיקה');expect(page.locator('select')).to_have_value('oldest');assert state['posts'][0]['p_parent_id']==OLD
   expect(row).to_be_visible();assert state['feed_sorts'][-1]=='oldest';assert not state['unexpected'],state['unexpected']
   cases.append({'width':width,'reply_preserves_existing_search_sort_and_parent':True});context.close()
  context=browser.new_context(viewport={'width':390,'height':1000});state=install(context);page=context.new_page();page.goto(BASE+'/community/chat',wait_until='domcontentloaded');row=page.locator('#message-'+OLD)
  expect(row.get_by_role('button',name='יש להתחבר כדי לסמן אהבתי')).to_be_disabled()
  page.locator('textarea').fill('טיוטה של אורח');expect(page.get_by_role('button',name='פרסום',exact=True)).to_be_disabled()
  page.get_by_role('button',name='הצטרפו לשיחה').click();expect(page.get_by_role('button',name='המשך עם Google')).to_be_disabled();expect(page.get_by_role('button',name='המשך עם Facebook')).to_be_disabled();expect(page.get_by_label('כתובת מייל',exact=True)).to_be_visible()
  assert not state['likes'] and not state['posts'] and not state['uploads'];cases.append({'guest':'methods-share-one-entry-and-disabled-writes'});context.close()
 finally:browser.close();server.shutdown()
json.dump({'cases':cases,'real_auth':False,'real_message_writes':0,'real_uploads':0,'model_calls':0},open(OUT/'results.json','w'),ensure_ascii=False,indent=2)
print(json.dumps({'cases':len(cases),'pass':True,'real_message_writes':0,'real_uploads':0}))
