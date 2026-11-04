"""Legacy OpenWeb image preview and failure fallback, synthetic HTTP only.
Build public-reading artifact first; no product writes or external requests.
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
  for broken in [False,True]:
   original='https://images.spot.im/v1/lgckojucbf0se4mwhbfk';state={'errors':[],'writes':[],'image_requests':0}
   ctx=b.new_context(viewport={'width':width,'height':950});ctx.add_init_script('localStorage.sod_legacy_newsletter_invite_until=Date.now()+86400000')
   def route(h):
    req=h.request;u=urlparse(req.url);name=u.path.rsplit('/',1)[-1]
    if u.hostname=='127.0.0.1':h.continue_();return
    if req.url==original:
     state['image_requests']+=1;assert req.headers.get('referer') is None
     h.fulfill(status=404 if broken else 200,content_type='text/plain' if broken else 'image/png',body='unavailable' if broken else PNG);return
    if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(body='');return
    def reply(data):h.fulfill(content_type='application/json',body=json.dumps(data,ensure_ascii=False))
    if u.path=='/auth/v1/settings':reply({'external':{'email':True}});return
    if name=='community_feed_page':reply([{'id':OLD,'parent_id':None,'author_name':'כותבת מהצ׳אט הישן','author_contributor_id':None,'author_user_id':None,'body':'טקסט ההודעה נשמר לפני התמונה\n\n'+original+'\n\nטקסט נוסף אחרי התמונה','origin':'openweb','created_at':'2026-11-02T20:26:27Z','total_count':1,'reactions':{}}]);return
    if name=='community_message_context':reply([{'id':OLD,'parent_id':None,'body':'public fixture','origin':'openweb','created_at':'2026-11-02T20:26:27Z'}]);return
    if name=='world_group_source_arrivals_v2':reply([]);return
    if name=='community_replies_page':reply([]);return
    if name=='community_thread_updates':reply([{'root_id':c['root_id'],'new_count':0,'first_reply_id':None,'first_path':None} for c in req.post_data_json['p_cursors']]);return
    if req.method in ['GET','HEAD','OPTIONS']:reply([]);return
    state['writes'].append(u.path);reply({})
   ctx.route('**/*',route);page=ctx.new_page();page.on('pageerror',lambda e:state['errors'].append(str(e)));page.goto(BASE+'/community/chat',wait_until='domcontentloaded');root=page.locator('#message-'+OLD);expect(root).to_be_visible(timeout=30000)
   preview=root.locator('.sod29-community-link-previews .sod29-community-attachment-image');preview.scroll_into_view_if_needed();expect(preview).to_have_count(1);expect(preview).to_have_attribute('href',original);expect(preview).to_have_attribute('target','_blank');expect(root.locator('.sod29-community-body')).to_contain_text('טקסט נוסף אחרי התמונה')
   if broken:
    expect(preview.get_by_role('status')).to_contain_text('התמונה לא נטענה.',timeout=10000);expect(preview.locator('img')).to_have_count(0)
   else:
    expect(preview.locator('img')).to_have_attribute('src',original);expect(preview.locator('img')).to_have_attribute('referrerpolicy','no-referrer');page.wait_for_function('(s)=>{const e=document.querySelector(s);return e&&e.complete&&e.naturalWidth>0}',arg='#message-'+OLD+' .sod29-community-attachment-image img');expect(root.locator('.sod29-community-link-card')).to_have_count(0)
   assert not state['errors'],state;assert not state['writes'],state;assert state['image_requests']==1;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2');page.screenshot(path=f'/tmp/community-legacy-image-{width}-{broken}.png');report.append({'width':width,'broken_image':broken,'inline_preview':not broken,'original_fullsize_link':True,'text_preserved':True,'referrer_omitted':True,'fallback_link':broken,'errors':state['errors'],'writes':state['writes']});ctx.close()
 b.close()
server.shutdown();Path('/tmp/community-legacy-image-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
