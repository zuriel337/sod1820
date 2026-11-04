"""Synthetic 390/1440 guest/member reading continuation and private replies round trips.
No live requests or writes; build the public-reading artifact first.
"""
import base64,functools,json,threading,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse
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
   ctx=b.new_context(viewport={'width':width,'height':950});ctx.add_init_script('localStorage.sod_legacy_newsletter_invite_until=Date.now()+86400000')
   session={'access_token':JWT,'refresh_token':'synthetic','expires_at':int(time.time())+3600,'expires_in':3600,'token_type':'bearer','user':{'id':A,'email':'fixture@example.invalid'}}
   if signed:ctx.add_init_script('sessionStorage.setItem("sod-public-reading-account",'+json.dumps(json.dumps(session))+');')
   REPLY='44444444-4444-4444-8444-444444444444';DEEP='55555555-5555-4555-8555-555555555555'
   last={'root_id':OLD,'message_id':REPLY,'path':[OLD,REPLY],'created_at':'2026-11-04T12:00:00.123456Z','top':180}
   cache={'version':1,'updatedAt':int(time.time()*1000),'last':last,'threads':[{k:last[k] for k in ['root_id','message_id','created_at']}]}
   cachekey='sod29-community-reading-v1:'+('user:'+A if signed else 'guest')
   ctx.add_init_script('if(!localStorage.getItem('+json.dumps(cachekey)+'))localStorage.setItem('+json.dumps(cachekey)+','+json.dumps(json.dumps(cache))+')')
   state={'errors':[],'unexpected':[],'reads':[],'private':[]}
   rows=[{'id':OLD,'parent_id':None,'body':'שורש שרשור להמשך קריאה '+('מילים נוספות '*30),'origin':'community_2029','author_name':'כותב','created_at':'2026-11-04T07:30:00Z','reactions':{}},{'id':REPLY,'parent_id':OLD,'body':'ההודעה האחרונה שקראתי','origin':'community_2029','author_name':'חבר','created_at':'2026-11-04T12:00:00.123456Z','reactions':{}},{'id':DEEP,'parent_id':REPLY,'body':'תגובה חדשה בתוך השרשור','origin':'community_2029','author_name':'חבר שני','created_at':'2026-11-04T13:00:00Z','reactions':{}}]
   def route(h):
    req=h.request;u=urlparse(req.url);name=u.path.rsplit('/',1)[-1]
    if u.hostname=='127.0.0.1':h.continue_();return
    if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(body='');return
    def reply(data,status=200):h.fulfill(status=status,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
    if u.path=='/auth/v1/user':reply({'id':A,'email':'fixture@example.invalid','email_confirmed_at':'2026-01-01'},200 if signed else 401);return
    if u.path=='/auth/v1/settings':reply({'external':{'email':True}});return
    if name=='users':reply({'id':A,'display_name':'חשבון בדיקה','username':'fixture','role':'user','tier':'member'});return
    if name=='user_notifications' and req.method=='HEAD':h.fulfill(headers={'content-range':'*/0'},body='');return
    if name=='community_feed_page':reply([{**rows[0],'total_count':1}]);return
    if name=='community_message_context':
     target=req.post_data_json['p_id'];ids=[OLD,REPLY,DEEP];reply(rows[:ids.index(target)+1] if target in ids else []);return
    if name=='community_replies_page':
     data=req.post_data_json;found=[r for r in rows if r['parent_id']==data['p_parent']];reply([{**r,'total_count':len(found)} for r in found]);return
    if name=='community_thread_updates':
     cursors=req.post_data_json['p_cursors'];state['reads'].append(cursors);reply([{'root_id':c['root_id'],'new_count':1 if c['message_id']!=DEEP else 0,'first_reply_id':DEEP if c['message_id']!=DEEP else None,'first_path':[OLD,REPLY,DEEP] if c['message_id']!=DEEP else None} for c in cursors]);return
    if name=='community_message_actions_v1':reply([]);return
    if name=='replies_to_me':
     state['private'].append(req.post_data_json);reply([{**rows[2],'target_type':'home','target_id':'community','thread_root_id':OLD,'thread_path':[OLD,REPLY,DEEP],'parent_title':None,'convergence_slug':None}]);return
    if name in ['dm_inbox','notification_prefs','research_state_snapshot_v1','fn_list_family','world_group_source_arrivals_v2']:reply([]);return
    if name=='rd_is_admin':reply(False);return
    if req.method in ['GET','HEAD','OPTIONS']:reply([]);return
    state['unexpected'].append(u.path);reply({},403)
   ctx.route('**/*',route);page=ctx.new_page();page.on('pageerror',lambda e:state['errors'].append(str(e)))
   page.goto(BASE+'/community/chat',wait_until='domcontentloaded')
   resume=page.get_by_role('link',name='להמשיך מאיפה שעצרתי',exact=False);expect(resume).to_be_visible(timeout=30000)
   expect(page.locator('.sod29-community-new-replies a')).to_have_text('תגובה חדשה ←',timeout=15000)
   page.add_style_tag(content='body { padding-bottom: 1200px; }') # Stand in for the loaded legacy widget below the synthetic feed.
   resume.click();target=page.locator('#message-'+REPLY);expect(target).to_have_class(__import__('re').compile('is-focused'),timeout=15000)
   page.wait_for_timeout(600);top=target.evaluate('(e)=>e.getBoundingClientRect().top');assert abs(top-180)<8,(width,signed,top,page.evaluate('({scrollY,dh:document.documentElement.scrollHeight,ih:innerHeight})'))
   page.locator('.sod29-community-new-replies a').click();deep=page.locator('#message-'+DEEP);expect(deep).to_have_class(__import__('re').compile('is-focused'),timeout=15000)
   page.wait_for_timeout(1200)
   stored=json.loads(page.evaluate('(k)=>localStorage.getItem(k)',cachekey));assert stored['last']['root_id']==OLD;assert 'body' not in json.dumps(stored)
   if signed:
    page.get_by_role('link',name='תגובות אליי',exact=True).click();expect(page.locator('[data-reply-id="'+DEEP+'"]')).to_be_visible(timeout=20000)
    assert state['private'] and state['private'][0]=={'p_limit':50,'p_before':None},state['private']
    # The private inbox hands off the canonical public thread with its exact ancestry.
    page.locator('[data-reply-id="'+DEEP+'"]').click();expect(page.locator('#message-'+DEEP)).to_have_class(__import__('re').compile('is-focused'),timeout=15000)
    assert '/community/chat?' in page.url and 'preview=' not in page.url,page.url
    page.get_by_role('link',name='חזרה להודעות שלי',exact=True).click();expect(page.locator('[data-reply-id="'+DEEP+'"]')).to_be_visible(timeout=15000)
   assert not state['errors'],state['errors'];assert not state['unexpected'],state['unexpected'];assert state['reads']
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
   report.append({'width':width,'member':signed,'resume_top':top,'public_reads':len(state['reads']),'private_pages':len(state['private']),'errors':state['errors']});ctx.close()
 b.close()
server.shutdown();Path('/tmp/community-reading-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
