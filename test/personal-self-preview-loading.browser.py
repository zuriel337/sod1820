"""Integrated Preview private loading with intercepted services; no live writes."""
import base64,functools,json,threading,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/tmp/personal-self-api-browser');OUT.mkdir(exist_ok=True)
A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';KEY='sb-linswmnnkjxvweumprav-auth-token'
def session(uid):
 def part(x):return base64.urlsafe_b64encode(json.dumps(x).encode()).decode().rstrip('=')
 token=part({'alg':'HS256'})+'.'+part({'sub':uid,'role':'authenticated','exp':int(time.time())+3600})+'.synthetic'
 return {'access_token':token,'refresh_token':'synthetic','expires_at':int(time.time())+3600,'expires_in':3600,'token_type':'bearer','user':{'id':uid,'email':'fixture@example.invalid'}}
class Files(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  if not Path(self.directory,urlparse(self.path).path.lstrip('/')).is_file():self.path='/2029.html'
  return super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Files,directory=str(ROOT/'preview-deploy'/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}'
def install(context,preset='dark'):
 context.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session(A)))+');localStorage.setItem("sod-theme",'+json.dumps(preset)+');')
 state={'mode':'ready','requests':[],'unexpected':[],'errors':[]}
 def route(h):
  r=h.request;u=urlparse(r.url)
  def reply(data,status=200):h.fulfill(status=status,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
  parts=r.headers.get('authorization','').removeprefix('Bearer ').split('.');uid=json.loads(base64.urlsafe_b64decode(parts[1]+'='*(-len(parts[1])%4)))['sub'] if len(parts)==3 and parts[2]=='synthetic' else None
  name='הדף הראשון' if uid==A else 'הדף השני'
  if u.hostname=='127.0.0.1':
   if u.path=='/api/contributor-self':
    state['requests'].append({'method':r.method,'uid':uid});assert r.method=='GET' and uid in [A,B]
    if state['mode']=='html':h.fulfill(status=200,content_type='text/html',body='<html>wrong static fallback</html>');return
    if state['mode']=='fail':reply({'state':'unavailable'},503);return
    reply({'state':'ready','writer':{'state':'unlinked'} if state['mode']=='unlinked' else {'state':'ready','name':name,'bio':'הביו של החשבון','href':'/community/researcher/123','publicVisible':True},'stats':None});return
   h.continue_();return
  if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(status=200,body='');return
  if u.path=='/auth/v1/settings':reply({'external':{'email':True,'google':True}});return
  if u.path=='/auth/v1/user':reply({'id':uid},200 if uid else 401);return
  if u.path=='/rest/v1/users':reply({'id':uid,'display_name':name,'role':'user','tier':'member'});return
  rpc=u.path.rsplit('/',1)[-1]
  if u.path=='/rest/v1/contributors':
   assert u.query.find('user_id=eq.'+uid)>=0,'own editor query must stay scoped to the active user'
   row={'id':'00000000-0000-4000-8000-000000000001','slug':'own','code':'123','display_name':name,'bio':'הביו של החשבון','page_config':{'version':1,'sections':[],'links':[],'highlights':[]},'active':True,'locked':False,'building':False}
   reply([row] if 'limit=' in u.query else row);return
  if rpc=='rd_is_admin':reply(False);return
  if rpc in ['world_group_source_arrivals_v2','fn_list_family']:reply([]);return
  if r.method=='GET':reply([]);return
  if rpc in ['fn_get_or_create_my_person','research_state_snapshot_v1','fn_research_path_resume_v1']:reply({},403);return
  state['unexpected'].append(u.path);reply({},403)
 context.route('**/*',route);return state
cases=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 try:
  for width in [320,360,390,1440]:
   for preset in ['light','parchment','dark']:
    context=browser.new_context(viewport={'width':width,'height':1000});state=install(context,preset);page=context.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:state['errors'].append(str(e)))
    page.goto(BASE+'/2029/me/page-editor?returnTo=%2Fcommunity%2Fchat');field=page.get_by_placeholder('השם שיוצג בראש הדף שלך');expect(field).to_have_value('הדף הראשון');save=page.get_by_role('button',name='💾 שמור את הדף שלי');expect(save).to_be_disabled();expect(page.get_by_text('יצירה ושמירה של שינויים אינן זמינות כאן.',exact=False)).to_be_visible()
    field.fill('טיוטה מקומית');save.evaluate('e=>e.click()');assert not state['unexpected'];assert state['requests'][0]['uid']==A
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1');expect(page.get_by_role('link',name='חזרה מדויקת')).to_have_attribute('href','/community/chat')
    page.screenshot(path=str(OUT/f'editor-{width}-{preset}.png'));assert not state['errors'];cases.append({'width':width,'preset':preset,'editor_loaded':True,'save_disabled':True,'own_reads':True,'return_preserved':True});context.close()
  for width in [390,1440]:
   context=browser.new_context(viewport={'width':width,'height':1000});state=install(context);state['mode']='html';page=context.new_page();page.set_default_timeout(15000)
   page.goto(BASE+'/2029/me/page-editor');expect(page.get_by_text('לא הצלחנו לטעון את האזור הזה.',exact=True)).to_be_visible();state['mode']='ready';page.get_by_role('button',name='נסו שוב',exact=True).click();expect(page.get_by_placeholder('השם שיוצג בראש הדף שלך')).to_have_value('הדף הראשון')
   page.reload();expect(page.get_by_placeholder('השם שיוצג בראש הדף שלך')).to_have_value('הדף הראשון')
   page.evaluate("""s=>{const k='sb-linswmnnkjxvweumprav-auth-token';localStorage.setItem(k,JSON.stringify(s));const c=new BroadcastChannel(k);c.postMessage({event:'SIGNED_IN',session:s});setTimeout(()=>c.close(),100)}""",session(B));expect(page.get_by_placeholder('השם שיוצג בראש הדף שלך')).to_have_value('הדף השני');assert state['requests'][-1]['uid']==B
   state['mode']='unlinked';page.goto(BASE+'/2029/me/page-editor');expect(page.get_by_role('button',name='יצירת הדף הציבורי',exact=True)).to_be_disabled();assert not state['unexpected'];cases.append({'width':width,'html_failure_and_retry':True,'refresh':True,'account_switch_scoped':True,'unlinked_create_disabled':True});context.close()
 finally:browser.close();server.shutdown()
(OUT/'results.json').write_text(json.dumps({'cases':cases,'real_product_writes':0,'model_calls':0},ensure_ascii=False,indent=2));print(json.dumps({'cases':len(cases),'pass':True,'real_product_writes':0}))
