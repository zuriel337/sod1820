"""Actual Community rendering and own-profile replacement; intercepted HTTP only.
Original public avatar bytes are local assets; build public-reading artifact first.
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
 for width in [320,390,1440]:
  for theme in ['dark','light','parchment']:
   for signed in [False,True]:
    def mid(i):return f'10000000-0000-4000-8000-{i:012d}'
    ROOT_ID=mid(1);SECOND=mid(20);THIRD=mid(21);SHIN='f499536a-e993-4a7d-8706-a2e69337c320';ESTHER='99bcfb38-85be-4f38-89f0-7886f2f179e6'
    def row(i,parent=None,contributor=None,user=None,body=None):return {'id':mid(i),'parent_id':mid(parent) if parent else None,'author_contributor_id':contributor,'author_user_id':user,'author_name':'שינשין' if contributor==SHIN else 'Esther26' if contributor==ESTHER else 'כותב חדש','body':body or f'הודעה {i} — שיחה עם צבע, תמונה ושרשור ברור','origin':'openweb' if contributor in [SHIN,ESTHER] else 'community_2029','created_at':f'2026-11-04T12:{59 if i==1 else i:02d}:00Z','reactions':{}}
    rows=[row(1,contributor=SHIN,body='שורש השיחה. אפשר לפתוח את התגובות ולסגור אותן בלי כפתורים מיותרים.'),*[row(i,1,contributor=ESTHER if i==2 else None) for i in range(2,7)],row(7,2),row(8,7),row(20,user=A),row(21,contributor=ESTHER)]
    state={'errors':[],'unexpected':[],'pages':[],'uploads':[],'saves':[],'photo':None,'add_leaf':False}
    ctx=b.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce');ctx.add_init_script('localStorage.sod_legacy_newsletter_invite_until=Date.now()+86400000;localStorage.setItem("sod-theme",'+json.dumps(theme)+')')
    session={'access_token':JWT,'refresh_token':'synthetic','expires_at':int(time.time())+3600,'expires_in':3600,'token_type':'bearer','user':{'id':A,'email':'fixture@example.invalid'}}
    if signed:ctx.add_init_script('sessionStorage.setItem("sod-public-reading-account",'+json.dumps(json.dumps(session))+');')
    def profile():return {'id':A,'display_name':'הפרופיל שלי','username':'fixture','role':'user','tier':'member','avatar_url':state['photo']}
    def route(h):
     req=h.request;u=urlparse(req.url);name=u.path.rsplit('/',1)[-1];q=parse_qs(u.query)
     def reply(data,status=200):h.fulfill(status=status,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
     if u.hostname=='127.0.0.1':
      if u.path=='/api/contributor-self':reply({'state':'unlinked','capabilities':{'avatarUpdate':True}});return
      h.continue_();return
     if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(body='');return
     if u.path=='/auth/v1/user':reply({'id':A,'email':'fixture@example.invalid','email_confirmed_at':'2026-01-01'},200 if signed else 401);return
     if name=='settings':reply({'external':{'email':True}});return
     if name=='users':
      if req.method=='PATCH':state['saves'].append(req.post_data_json);state['photo']=req.post_data_json.get('avatar_url');reply(profile());return
      reply([profile()] if q.get('id',[''])[0].startswith('in.') else profile());return
     if name=='user_notifications' and req.method=='HEAD':h.fulfill(headers={'content-range':'*/2','access-control-expose-headers':'content-range'},body='');return
     if u.path.startswith('/storage/v1/object/gallery/avatars/'):
      assert signed and '/avatars/'+A+'-' in u.path;state['uploads'].append(u.path);reply({'Key':u.path.split('/object/')[1]});return
     if u.path.startswith('/storage/v1/object/public/gallery/avatars/'):h.fulfill(content_type='image/png',body=PNG);return
     if name=='community_feed_page':reply([{**r,'total_count':3} for r in sorted(rows,key=lambda r:r['created_at'],reverse=True) if r['parent_id'] is None]);return
     if name=='community_message_context':
      target=req.post_data_json['p_id'];chain=[];current=next((r for r in rows if r['id']==target),None)
      while current:chain.insert(0,current);current=next((r for r in rows if r['id']==current['parent_id']),None)
      reply(chain);return
     if name=='community_replies_page':
      data=req.post_data_json;state['pages'].append(data);found=[r for r in rows if r['parent_id']==data['p_parent']];off=data.get('p_offset',0);limit=data.get('p_limit',20);reply([{**r,'total_count':len(found)} for r in found[off:off+limit]]);return
     if name=='community_message_actions_v1':reply([]);return
     if name=='community_thread_updates':reply([{'root_id':c['root_id'],'new_count':0,'first_reply_id':None,'first_path':None} for c in req.post_data_json['p_cursors']]);return
     if name in ['notification_prefs','research_state_snapshot_v1','fn_list_family','world_group_source_arrivals_v2']:reply([]);return
     if name=='rd_is_admin':reply(False);return
     if req.method in ['GET','HEAD','OPTIONS']:reply([]);return
     state['unexpected'].append(u.path);reply({},403)
    ctx.route('**/*',route);page=ctx.new_page();page.on('pageerror',lambda e:state['errors'].append(str(e)));page.goto(BASE+'/community/chat',wait_until='domcontentloaded')
    expect(page.locator('#community-live-draft')).to_be_visible(timeout=30000);expect(page.locator('html')).to_have_attribute('data-theme-2029',theme)
    root=page.locator('#message-'+ROOT_ID);expect(root.locator('.sod-user-avatar')).to_have_attribute('data-avatar-state','image',timeout=15000);page.wait_for_function('(s)=>{const e=document.querySelector(s);return e&&e.complete&&e.naturalWidth>0}',arg='#message-'+ROOT_ID+' img',timeout=10000)
    expect(page.locator('#message-'+SECOND+' .sod-user-avatar')).to_have_attribute('data-avatar-state','fallback');assert 'linear-gradient' in page.locator('#message-'+SECOND+' .sod-user-avatar').evaluate('(e)=>getComputedStyle(e).backgroundImage')
    group=page.locator('#message-'+ROOT_ID).locator('..')
    expect(group.locator(':scope > .sod29-community-replies > .sod29-community-more-replies')).to_have_text('עוד 3 תגובות',timeout=15000)
    group.locator(':scope > .sod29-community-replies > .sod29-community-more-replies').click();expect(group.locator(':scope > .sod29-community-replies > .sod29-community-thread-group')).to_have_count(5,timeout=15000)
    expect(group.locator(':scope > .sod29-community-replies > .sod29-community-more-replies')).to_have_count(0)
    for leaf in [3,4,5,6]:
     leafgroup=page.locator('#message-'+mid(leaf)).locator('..');leafgroup.scroll_into_view_if_needed();page.wait_for_timeout(120);expect(leafgroup.locator(':scope > .sod29-community-replies-toggle')).to_have_count(0)
    branch=page.locator('#message-'+mid(2)).locator('..');branch.scroll_into_view_if_needed();expect(branch.locator(':scope > .sod29-community-replies-toggle')).to_have_text('פתיחת תגובות (1)',timeout=15000);branch.locator(':scope > .sod29-community-replies-toggle').click()
    grand=page.locator('#message-'+mid(7)).locator('..');grand.scroll_into_view_if_needed();expect(grand.locator(':scope > .sod29-community-replies-toggle')).to_have_text('פתיחת תגובות (1)',timeout=15000);grand.locator(':scope > .sod29-community-replies-toggle').click();expect(page.locator('#message-'+mid(8))).to_be_visible()
    last=page.locator('#message-'+mid(8)).locator('..');last.scroll_into_view_if_needed();page.wait_for_timeout(120);expect(last.locator(':scope > .sod29-community-replies-toggle')).to_have_count(0)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),(width,theme,signed)
    page.screenshot(path=f'/tmp/community-visual-tree-{width}-{theme}-{signed}.png',full_page=False)
    requests_before=len([r for r in state['pages'] if r['p_parent']==ROOT_ID]);close=group.locator(':scope > .sod29-community-replies > .sod29-community-replies-toggle');expect(close).to_have_text('סגירת תגובות');close.click();expect(group.locator(':scope > .sod29-community-replies-toggle')).to_be_focused();group.locator(':scope > .sod29-community-replies-toggle').click();expect(group.locator(':scope > .sod29-community-replies > .sod29-community-more-replies')).to_have_count(0);assert len([r for r in state['pages'] if r['p_parent']==ROOT_ID])==requests_before
    page.evaluate('scrollTo(0,0)');page.screenshot(path=f'/tmp/community-visual-top-{width}-{theme}-{signed}.png')
    if signed:
     menu=page.locator('summary[aria-label="הגדרות החשבון"]');menu.click();photo_link=page.get_by_role('link',name='החלפת תמונת פרופיל',exact=True);expect(photo_link).to_have_attribute('href','/2029/me/profile?returnTo=%2Fcommunity%2Fchat');menu.click()
     if theme=='dark' and width in [390,1440]:
      page.locator('.sod29-community-compose-avatar').click();expect(page.get_by_label('בחירת תמונת פרופיל מהמכשיר')).to_have_count(1,timeout=15000);page.get_by_label('בחירת תמונת פרופיל מהמכשיר').set_input_files({'name':'own.png','mimeType':'image/png','buffer':PNG});expect(page.get_by_text('התמונה הועלתה — לחצו שמירה ✓',exact=True)).to_be_visible(timeout=15000);page.get_by_role('button',name='שמירה',exact=True).click();expect(page.get_by_text('נשמר בהצלחה ✓',exact=True)).to_be_visible(timeout=15000);assert len(state['uploads'])==1 and len(state['saves'])==1
      page.goto(BASE+'/community/chat',wait_until='domcontentloaded');expect(page.locator('.sod29-community-compose-avatar .sod-user-avatar')).to_have_attribute('data-avatar-state','image',timeout=15000);expect(page.locator('#message-'+SECOND+' .sod-user-avatar')).to_have_attribute('data-avatar-state','image',timeout=15000);expect(page.locator('#message-'+ROOT_ID+' .sod-user-avatar img')).to_have_attribute('src',__import__('re').compile('/community-avatars/'))
    assert not state['errors'],state['errors'];assert not state['unexpected'],state['unexpected'];assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
    report.append({'width':width,'theme':theme,'member':signed,'source_photo':True,'color_fallback':True,'leaf_no_toggle':True,'nested_hierarchy':True,'complete_only_close':True,'cached_reopen':True,'own_profile_upload_ack':len(state['saves']),'page_errors':state['errors'],'real_writes':0});ctx.close()
 b.close()
server.shutdown();Path('/tmp/community-visual-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
