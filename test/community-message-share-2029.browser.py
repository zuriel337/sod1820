"""Actual built recursive public threads and canonical share; all HTTP/device actions intercepted."""
import functools,json,threading,os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('COMMUNITY_SHARE_EVIDENCE','/tmp/community-message-share'));OUT.mkdir(exist_ok=True)
BUILD=ROOT/os.environ.get('COMMUNITY_SHARE_BUILD_DIR','dist')
HTML=(BUILD/'2029.html').read_text();R='11111111-1111-4111-8111-111111111111';C='22222222-2222-4222-8222-222222222222';G='33333333-3333-4333-8333-333333333333';S='44444444-4444-4444-8444-444444444444'
ROWS=[{'id':i,'parent_id':p,'author_name':'אדם בדיקה','body':body,'origin':'openweb','created_at':'2026-10-31T00:00:00Z','reactions':{}} for i,p,body in [(R,None,'ההודעה הראשית'),(C,R,'תגובה ראשונה'),(G,C,'תגובה בתוך תגובה'),(S,R,'תגובה נוספת')]]
class Files(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Files,directory=str(BUILD)));threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}'
def install(context,theme='dark',mode='copy'):
 context.add_init_script('localStorage.setItem("sod-theme",'+json.dumps(theme)+');')
 context.add_init_script('''window.__copies=[];window.__native=[];window.__failCopy=MODE==='failure';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{if(window.__failCopy)throw Error('synthetic clipboard failure');window.__copies.push(value)}}});document.execCommand=()=>false;Object.defineProperty(navigator,'share',{configurable:true,value:MODE==='native'?async value=>{window.__native.push(value)}:undefined});'''.replace('MODE',json.dumps(mode)))
 state={'writes':[],'reads':[],'errors':[]}
 def route(h):
  req=h.request;u=urlparse(req.url);name=u.path.rsplit('/',1)[-1]
  def reply(data,status=200):h.fulfill(status=status,content_type='application/json',body=json.dumps(data))
  if u.hostname=='127.0.0.1':
   if req.is_navigation_request():h.fulfill(content_type='text/html',body=HTML);return
   if u.path.startswith('/api/'):reply({'state':'login_required'},401);return
   h.continue_();return
  if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(body='');return
  if u.path=='/auth/v1/settings':reply({'external':{'email':True}});return
  args=req.post_data_json if req.method=='POST' else {}
  if name=='community_feed_page':reply([{**ROWS[0],'total_count':1}]);return
  if name=='community_reply_counts':reply([{'parent_id':i,'reply_count':sum(r['parent_id']==i for r in ROWS)} for i in args['p_ids']]);return
  if name=='community_replies_page':
   state['reads'].append(args);rows=[r for r in ROWS if r['parent_id']==args['p_parent']];reply([{**r,'total_count':len(rows)} for r in rows]);return
  if name=='community_message_context':
   state['reads'].append(args);reply([r for r in ROWS if r['id']==args['p_id']]);return
  if name in ['link_identity','track_visit','ingest_event']:h.abort();return
  if name in ['rd_is_admin','world_group_source_arrivals_v2','fn_list_family','writer_public_contributions_page_v1']:reply([]);return
  if req.method in ['GET','HEAD']:reply([]);return
  state['writes'].append(u.path);reply({},403)
 context.route('**/*',route);return state
def message(page,id):return page.locator('#message-'+id)
def share(page,id):return message(page,id).locator('button[data-share-variant="icon"]')
def verify_url(value,path):
 u=urlparse(value);q=parse_qs(u.query);assert u.netloc==urlparse(BASE).netloc and u.path=='/community/chat' and q['thread']==[R],value
 assert not set(q)&{'returnTo','member','dm','sort','_vercel_share','access_token'},value
 if len(path)>1:assert q['reply']==[path[-1]] and q['path']==[','.join(path)],value
 else:assert 'reply' not in q and 'path' not in q,value
cases=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 try:
  for width in [320,360,390,1440]:
   for theme in ['light','parchment','dark']:
    context=browser.new_context(viewport={'width':width,'height':1000});state=install(context,theme);page=context.new_page();page.on('pageerror',lambda e:state['errors'].append(str(e)));page.goto(BASE+'/community/chat');button=share(page,R);expect(button).to_be_visible();expect(button).to_have_attribute('aria-label','שיתוף הודעה');assert button.bounding_box()['width']>=44 and button.bounding_box()['height']>=44
    assert page.evaluate('window.__copies.length+window.__native.length')==0;assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1');assert not state['writes'] and not state['errors'];cases.append({'width':width,'theme':theme,'quiet_share_icon44':True,'no_automatic_share':True});context.close()
  for width in [390,1440]:
   for mode in ['copy','native','failure']:
    context=browser.new_context(viewport={'width':width,'height':1000});state=install(context,mode=mode);page=context.new_page();page.on('pageerror',lambda e:state['errors'].append(str(e)));page.goto(BASE+'/community/chat?sort=liked&_vercel_share=synthetic&returnTo=%2Fprivate');expect(message(page,R)).to_be_visible()
    if mode=='failure':
     share(page,R).click();expect(share(page,R)).to_have_attribute('data-state','error');expect(message(page,R).get_by_role('status')).to_contain_text('ההעתקה נכשלה');assert page.evaluate('window.__copies.length')==0;page.evaluate('window.__failCopy=false')
    share(page,R).click();page.wait_for_function('window.__copies.length+window.__native.length===1');value=page.evaluate('window.__native[0]?.url||window.__copies[0]');verify_url(value,[R])
    expect(message(page,C)).to_be_visible();expect(message(page,S)).to_be_visible();message(page,C).locator('xpath=..').locator(':scope > .sod29-community-replies-toggle').click();expect(message(page,G)).to_be_visible()
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1');page.screenshot(path=str(OUT/f'nested-{width}-{mode}.png'),full_page=True)
    share(page,G).focus();page.keyboard.press('Enter');page.wait_for_function('window.__copies.length+window.__native.length===2');value=page.evaluate('window.__native[1]?.url||window.__copies[1]');verify_url(value,[R,C,G]);page.goto(value);expect(message(page,G)).to_be_visible();expect(message(page,G)).to_have_class('sod29-community-thread is-focused');expect(message(page,G)).to_be_focused();expect(page.get_by_role('link',name='חזרה לקהילה',exact=True)).to_be_visible();expect(page.get_by_text('מתוך התגובות אליי',exact=True)).to_have_count(0)
    page.reload();expect(message(page,G)).to_be_visible();expect(message(page,G)).to_be_focused();page.goto(value+'&returnTo=%2F2029%2Fme%2Fmessages%3Ftab%3Dreplies');expect(page.get_by_role('link',name='חזרה להודעות שלי',exact=True)).to_be_visible();expect(page.get_by_text('מתוך התגובות אליי',exact=True)).to_be_visible();assert not state['writes'] and not state['errors'],state;cases.append({'width':width,'mode':mode,'nested_three_levels':True,'exact_root_and_reply_link':True,'refresh_context':True,'public_return_copy':True});context.close()
 finally:browser.close();server.shutdown()
(OUT/'results.json').write_text(json.dumps({'cases':cases,'real_shares':0,'real_product_writes':0},ensure_ascii=False,indent=2));print(json.dumps({'pass':True,'cases':len(cases),'real_product_writes':0}))
