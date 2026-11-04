"""Synthetic guest/member composer persistence and canonical notification ack at390/1440.
Build public-reading artifact first. Every network operation is intercepted; no live writes.
"""
import base64,functools,json,threading,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'public-reading-deploy/dist';HTML=(ROOT/'public-reading-deploy/.generated/2029.html').read_text()
A='11111111-1111-4111-8111-111111111111';OLD='22222222-2222-4222-8222-222222222222';NEW='33333333-3333-4333-8333-333333333333'
def part(x):return base64.urlsafe_b64encode(json.dumps(x).encode()).decode().rstrip('=')
JWT=part({'alg':'HS256'})+'.'+part({'sub':A,'role':'authenticated','exp':int(time.time())+3600})+'.synthetic'
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG0kAAAAASUVORK5CYII=')
class Files(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  path=urlparse(self.path).path
  if path.startswith('/api/'):
   self.send_response(403);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{}');return
  if not Path(self.directory,path.lstrip('/')).is_file():
   self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(HTML.encode());return
  return super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Files,directory=str(DIST)));threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}'
report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [390,1440]:
  for signed in [False,True]:
   B='66666666-6666-4666-8666-666666666666';NOTE='77777777-7777-4777-8777-777777777777'
   state={'user':A,'errors':[],'unexpected':[],'posts':[],'fail_post':True,'hidden':False,'notify_reads':[],'read_acks':[],'read':False,'fail_count':False}
   ctx=b.new_context(viewport={'width':width,'height':950});ctx.add_init_script('localStorage.sod_legacy_newsletter_invite_until=Date.now()+86400000')
   def session(uid):
    jwt=part({'alg':'HS256'})+'.'+part({'sub':uid,'role':'authenticated','exp':int(time.time())+3600})+'.synthetic'
    return {'access_token':jwt,'refresh_token':'synthetic','expires_at':int(time.time())+3600,'expires_in':3600,'token_type':'bearer','user':{'id':uid,'email':'fixture@example.invalid'}}
   if signed:ctx.add_init_script('if(!sessionStorage.getItem("sod-public-reading-account"))sessionStorage.setItem("sod-public-reading-account",'+json.dumps(json.dumps(session(A)))+');')
   original={'id':OLD,'parent_id':None,'body':'הודעת השורש הציבורית','origin':'community_2029','author_name':'חבר','created_at':'2026-11-04T07:30:00.123456Z','reactions':{}}
   notes=[{'id':NOTE,'kind':'reply','title':'תגובה חדשה לבדיקה','body':'[sod:v1]\n[b]תשובה חדשה[/b]','link':'/community/chat?thread='+OLD,'read_at':None,'created_at':'2026-11-04T12:00:00Z','source_topic':'thread:'+OLD}]
   def route(h):
    req=h.request;u=urlparse(req.url);name=u.path.rsplit('/',1)[-1];query=parse_qs(u.query)
    if u.hostname=='127.0.0.1':h.continue_();return
    if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(body='');return
    def reply(data,status=200):h.fulfill(status=status,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
    if u.path=='/auth/v1/user':reply({'id':state['user'],'email':'fixture@example.invalid','email_confirmed_at':'2026-01-01'},200 if signed else 401);return
    if u.path=='/auth/v1/settings':reply({'external':{'email':True}});return
    if name=='users':reply({'id':state['user'],'display_name':'חשבון בדיקה','username':'fixture','role':'user','tier':'member'});return
    if name=='user_notifications':
     if req.method=='HEAD':
      state['notify_reads'].append(query)
      if state['fail_count']:reply({'message':'count offline'},400);return
      count=0 if state['read'] or state['user']==B else 1
      h.fulfill(headers={'content-range':'*/'+str(count),'access-control-expose-headers':'content-range'},body='');return
     if req.method=='PATCH':
      data=req.post_data_json;state['read_acks'].append(data);state['read']=True;reply([{'id':NOTE,'read_at':data['read_at']}]);return
     reply([{**n,'read_at':'2026-11-04T13:00:00Z' if state['read'] else None} for n in notes]);return
    if name=='notification_prefs':reply({'topics':[],'channels':[]});return
    if name=='community_feed_page':reply([{**original,'total_count':1}]);return
    if name=='community_message_context':reply([] if state['hidden'] else [original]);return
    if name=='community_replies_page':reply([]);return
    if name=='community_thread_updates':reply([{'root_id':c['root_id'],'new_count':0,'first_reply_id':None,'first_path':None} for c in req.post_data_json['p_cursors']]);return
    if name=='community_message_actions_v1':reply([]);return
    if name=='add_contribution':
     assert signed;data=req.post_data_json;state['posts'].append(data)
     if state['fail_post']:reply({'message':'synthetic rejection'},400);return
     reply(NEW);return
    if name=='rd_is_admin':reply(False);return
    if name in ['fn_list_family','world_group_source_arrivals_v2','research_state_snapshot_v1','wa_account_links']:reply([]);return
    if req.method in ['GET','HEAD','OPTIONS']:reply([]);return
    state['unexpected'].append(u.path);reply({},403)
   ctx.route('**/*',route);page=ctx.new_page();page.on('pageerror',lambda e:state['errors'].append(str(e)))
   def open_chat():
    page.goto(BASE+'/community/chat',wait_until='domcontentloaded');expect(page.locator('#community-live-draft')).to_be_visible(timeout=30000)
   open_chat();editor=page.locator('#community-live-draft');editor.fill('הטיוטה שלי נשמרת')
   editor.evaluate('(e)=>{e.focus();const r=document.createRange();r.selectNodeContents(e);const s=getSelection();s.removeAllRanges();s.addRange(r);e.dispatchEvent(new MouseEvent("mouseup",{bubbles:true}));}')
   page.locator('.sod29-community-composer [aria-label="עיצוב הטקסט"]').get_by_role('button',name='הדגשה',exact=True).click()
   expect(page.get_by_text('טיוטה נשמרה במכשיר הזה',exact=True)).to_be_visible()
   key='sod29-community-draft-v1:'+('user:'+A if signed else 'guest')
   cache=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',key);assert '[b]' in cache['body']
   page.reload(wait_until='domcontentloaded');expect(editor.locator('strong,b')).to_have_text('הטיוטה שלי נשמרת',timeout=20000)
   expect(page.get_by_text('הטיוטה שוחזרה מהמכשיר הזה',exact=True)).to_be_visible()
   if signed:
    bell=page.locator('.sod29-community-reply-bell');expect(bell).to_have_attribute('aria-label','ההתראות שלי — תגובה חדשה אחת',timeout=15000);expect(bell.get_by_text('התראות',exact=True)).to_be_visible()
    assert any(q.get('kind')==['eq.reply'] and q.get('user_id')==['eq.'+A] for q in state['notify_reads'])
    # Existing canonical center, ack and notification link; opening it never publishes the draft.
    bell.click();expect(page.get_by_role('heading',name='העדכונים שלי',exact=True)).to_be_visible(timeout=15000)
    expect(page.get_by_role('heading',name='תגובה חדשה לבדיקה',exact=True)).to_be_visible(timeout=15000)
    page.locator('.fc-open').first.click();expect(page.locator('#message-'+OLD)).to_have_class(__import__('re').compile('is-focused'),timeout=15000)
    assert len(state['read_acks'])==1
    expect(page.locator('.sod29-community-reply-bell .sod29-community-unread-badge')).to_have_count(0,timeout=15000)
    expect(editor).to_have_text('הטיוטה שלי נשמרת')
    # Reply target is revalidated on reload. Failure never silently turns a reply into a root post.
    page.locator('#message-'+OLD).get_by_role('button',name='השב',exact=True).click()
    page.locator('input[type=file]').set_input_files({'name':'draft.png','mimeType':'image/png','buffer':PNG})
    page.reload(wait_until='domcontentloaded');expect(page.get_by_text('טיוטת הטקסט שוחזרה. יש לצרף קבצים מחדש.',exact=True)).to_be_visible(timeout=15000);expect(page.locator('.sod29-community-reply-target')).to_contain_text('חבר',timeout=15000)
    state['hidden']=True;page.reload(wait_until='domcontentloaded')
    expect(page.get_by_text('לא ניתן לפתוח את ההודעה שאליה עונים.',exact=False)).to_be_visible(timeout=15000)
    expect(page.get_by_role('button',name='פרסום',exact=True)).to_be_disabled()
    assert not state['posts']
    state['hidden']=False;page.get_by_role('button',name='ניסיון נוסף',exact=True).click();expect(page.locator('.sod29-community-reply-target')).to_contain_text('חבר',timeout=15000)
    page.get_by_role('button',name='פרסום',exact=True).click();expect(page.get_by_text('לא הצלחנו לפרסם את ההודעה.',exact=False)).to_be_visible(timeout=15000)
    assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).body',key)==cache['body']
    page.reload(wait_until='domcontentloaded');expect(editor).to_have_text('הטיוטה שלי נשמרת',timeout=15000)
    state['fail_post']=False;page.get_by_role('button',name='פרסום',exact=True).click();expect(page.get_by_text('ההודעה פורסמה.',exact=True)).to_be_visible(timeout=15000)
    assert state['posts'][-1]['p_parent_id']==OLD;assert page.evaluate('(k)=>localStorage.getItem(k)',key) is None
    page.reload(wait_until='domcontentloaded');expect(editor).to_have_attribute('data-empty','true',timeout=15000)
    editor.fill('סוד פרטי בחשבון הראשון')
    state['user']=B;page.evaluate('(s)=>sessionStorage.setItem("sod-public-reading-account",s)',json.dumps(session(B)));page.reload(wait_until='domcontentloaded');expect(editor).to_have_attribute('data-empty','true',timeout=15000)
    editor.fill('טיוטה בחשבון השני');state['user']=A;page.evaluate('(s)=>sessionStorage.setItem("sod-public-reading-account",s)',json.dumps(session(A)));page.reload(wait_until='domcontentloaded');expect(editor).to_have_text('סוד פרטי בחשבון הראשון',timeout=15000)
    state['fail_count']=True;page.evaluate('dispatchEvent(new Event("focus"))');expect(page.get_by_text('לא ניתן לעדכן התראות כרגע',exact=True)).to_be_visible(timeout=15000)
    expect(page.locator('.sod29-community-reply-bell')).to_have_attribute('aria-label','ההתראות שלי — מספר התגובות אינו זמין')
   else:
    expect(page.locator('.sod29-community-reply-bell')).to_have_count(0);assert not state['notify_reads'];assert not state['posts']
   page.get_by_role('button',name='מחיקת טיוטה',exact=True).click();expect(editor).to_have_attribute('data-empty','true');page.reload(wait_until='domcontentloaded');expect(editor).to_have_attribute('data-empty','true',timeout=15000)
   assert not state['errors'],state['errors'];assert not state['unexpected'],state['unexpected'];assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
   page.screenshot(path=f'/tmp/community-draft-{width}-{signed}.png')
   report.append({'width':width,'signed':signed,'formatted_reload':True,'private_account_isolation':signed,'failed_then_success_post':signed,'reply_target_revalidated':signed,'canonical_bell_ack_and_count':signed,'count_outage_honest':signed,'real_writes':0,'errors':state['errors']});ctx.close()
 b.close()
server.shutdown();Path('/tmp/community-draft-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
