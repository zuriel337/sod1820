"""Community creation-time labels and ticking, synthetic HTTP only.
Build public-reading artifact first; no product writes or external requests.
"""
import base64,functools,json,threading,time
from datetime import datetime,timezone
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
NOW=datetime(2026,11,4,18,10,tzinfo=timezone.utc)
RECENT='11111111-1111-4111-8111-111111111111'
ARCHIVE='22222222-2222-4222-8222-222222222222'
BOUNDARY='33333333-3333-4333-8333-333333333333'
CHILD='44444444-4444-4444-8444-444444444444'
PHOTO='https://sod1820.co.il/community-avatars/1215acc5cd59c120f52d.jpg'
def row(id,date,**extra):return {'id':id,'parent_id':None,'author_name':'כותב בדיקה','author_user_id':None,'author_contributor_id':None,'body':'בדיקת זמן מקורית','origin':'community_2029','created_at':date,'reactions':{},**extra}
rows=[row(RECENT,'2026-11-04T18:05:00Z',author_user_id=A),row(ARCHIVE,'2026-10-29T21:07:02Z',origin='openweb',edited_at='2026-11-04T18:09:59Z'),row(BOUNDARY,'2026-11-03T18:10:30Z'),row(CHILD,'2026-11-04T16:10:00Z',parent_id=RECENT)]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [390,1440]:
  for signed in [False,True]:
   state={'errors':[],'writes':[]}
   ctx=b.new_context(viewport={'width':width,'height':950});ctx.add_init_script('localStorage.sod_legacy_newsletter_invite_until=Date.now()+86400000')
   session={'access_token':JWT,'refresh_token':'synthetic','expires_at':int(time.time())+86400,'expires_in':86400,'token_type':'bearer','user':{'id':A,'email':'fixture@example.invalid'}}
   if signed:ctx.add_init_script('sessionStorage.setItem("sod-public-reading-account",'+json.dumps(json.dumps(session))+');')
   def route(h):
    req=h.request;u=urlparse(req.url);name=u.path.rsplit('/',1)[-1]
    if u.hostname=='127.0.0.1':h.continue_();return
    if req.url==PHOTO:h.fulfill(content_type='image/png',body=PNG);return
    if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(body='');return
    def reply(data,status=200):h.fulfill(status=status,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
    if u.path=='/auth/v1/user':reply({'id':A,'email':'fixture@example.invalid','email_confirmed_at':'2026-01-01'},200 if signed else 401);return
    if u.path=='/auth/v1/settings':reply({'external':{'email':True}});return
    if u.path=='/rest/v1/users':
     profile={'id':A,'display_name':'תורה תמימה','username':'fixture','role':'user','tier':'member','avatar_url':PHOTO}
     reply(profile if 'vnd.pgrst.object' in req.headers.get('accept','') else [profile]);return
    if name=='user_notifications' and req.method=='HEAD':h.fulfill(headers={'content-range':'*/0','access-control-expose-headers':'content-range'},body='');return
    if name=='community_feed_page':reply([{**r,'total_count':3} for r in rows if not r['parent_id']]);return
    if name=='community_message_context':reply([r for r in rows if r['id']==req.post_data_json['p_id']]);return
    if name=='community_replies_page':
     data=req.post_data_json;children=[r for r in rows if r['parent_id']==data['p_parent']];off=data.get('p_offset',0);lim=data.get('p_limit',20);reply([{**r,'total_count':len(children)} for r in children[off:off+lim]]);return
    if name=='community_thread_updates':reply([{'root_id':c['root_id'],'new_count':0,'first_reply_id':None,'first_path':None} for c in req.post_data_json['p_cursors']]);return
    if name=='community_message_actions_v1':reply([]);return
    if name=='research_state_snapshot_v1':reply({'revision':0,'cart':[],'saved':[],'pinned':[],'history':[],'collections':[],'journeys':[],'context':None});return
    if name in ['fn_list_family','world_group_source_arrivals_v2']:reply([]);return
    if req.method in ['GET','HEAD','OPTIONS']:reply([]);return
    state['writes'].append(u.path);reply({})
   ctx.route('**/*',route);page=ctx.new_page();page.clock.install(time=NOW);page.on('pageerror',lambda e:state['errors'].append(str(e)));page.goto(BASE+'/community/chat',wait_until='domcontentloaded')
   recent=page.locator('#message-'+RECENT+' > .sod29-community-author time');old=page.locator('#message-'+ARCHIVE+' > .sod29-community-author time');edge=page.locator('#message-'+BOUNDARY+' > .sod29-community-author time')
   expect(recent).to_have_text('לפני 5 דקות',timeout=30000);expect(recent).to_have_attribute('datetime','2026-11-04T18:05:00Z');assert '2026' in recent.get_attribute('title');assert recent.get_attribute('title') in recent.get_attribute('aria-label')
   expect(old).to_be_visible();assert 'לפני' not in old.inner_text();assert old.inner_text()==old.get_attribute('title');assert '2026' in old.inner_text();expect(edge).to_have_text('לפני 23 שעות')
   child=page.locator('#message-'+CHILD+' > .sod29-community-author time');expect(child).to_have_text('לפני 2 שעות',timeout=15000)
   photo=page.locator('#message-'+RECENT+' > .sod29-community-author img');expect(photo).to_have_attribute('src',PHOTO)
   page.clock.fast_forward(120000);expect(recent).to_have_text('לפני 7 דקות');expect(edge).not_to_contain_text('לפני');assert edge.inner_text()==edge.get_attribute('title');expect(child).to_have_text('לפני 2 שעות')
   # Hidden tabs stop their clock; the next visibility notification catches up.
   page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'))")
   page.clock.fast_forward(120000)
   # Other pending public reads may rerender while hidden; only assert the
   # visible result after returning, not an artificially frozen hidden DOM.
   page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'))")
   expect(recent).to_have_text('לפני 9 דקות')
   assert not state['errors'],state;assert not state['writes'],state;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
   page.screenshot(path=f'/tmp/community-recent-time-{width}-{signed}.png');report.append({'width':width,'signed':signed,'original_created_at':True,'full_accessible_date':True,'nested_reply_time':True,'minute_update':True,'24h_rollover':True,'hidden_resume':True,'account_photo':True,'errors':state['errors'],'writes':state['writes']});ctx.close()
 b.close()
server.shutdown();Path('/tmp/community-recent-time-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
