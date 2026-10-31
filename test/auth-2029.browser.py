"""Native 2029 entry over existing Auth; intercepted local fixtures only."""
import base64
import functools
import json
import os
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('TASK_AUTH2029_OUT', '/tmp/auth-2029-browser'))
OUT.mkdir(parents=True, exist_ok=True)
ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
KEY = 'sb-linswmnnkjxvweumprav-auth-token'
TARGET = '/community/chat?sort=liked&page=0'
ENTRY = '/login?returnTo=' + quote(TARGET, safe='')

def session(actor=ADMIN):
 def part(v): return base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
 now = int(time.time())
 token = '.'.join([part({'alg':'HS256'}), part({'sub':actor,'role':'authenticated','exp':now+3600}), 'synthetic'])
 return {'access_token':token,'refresh_token':'synthetic-local-only','expires_at':now+3600,'expires_in':3600,'token_type':'bearer',
  'user':{'id':actor,'email':('admin' if actor==ADMIN else 'member')+'@example.invalid','app_metadata':{'provider':'email'},'user_metadata':{}}}

class Files(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
 def do_GET(self):
  path=urlparse(self.path).path
  if not path.startswith(('/assets/','/fonts/','/images/')) and not Path(self.directory,path.lstrip('/')).is_file():
   self.path='/2029.html'
  return super().do_GET()

server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Files,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}'

def install(context, preset='dark', initial=None):
 state={'requests':[],'errors':[],'unexpected':[],'blocked_reads':[],'actor':initial,'fail_password':False,'fail_verify':False,'hold':False,'held':None}
 context.add_init_script('localStorage.setItem("sod-theme",'+json.dumps(preset)+');'+('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session(initial)))+');' if initial else ''))
 def route(handler):
  req=handler.request;u=urlparse(req.url)
  if u.hostname=='127.0.0.1': handler.continue_();return
  if u.hostname!='linswmnnkjxvweumprav.supabase.co': handler.fulfill(status=200,body='');return
  body=json.loads(req.post_data or '{}') if req.method=='POST' else {}
  def reply(data,status=200): handler.fulfill(status=status,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
  if u.path.startswith('/auth/v1/'):
   state['requests'].append({'path':u.path,'query':u.query,'body':body})
   if u.path=='/auth/v1/otp':
    assert body['create_user'] is False,'Preview must not sign up accounts'
    reply({});return
   if u.path in ('/auth/v1/token','/auth/v1/verify'):
    if state['hold']: state['held']=handler;return
    if state['fail_password'] or state['fail_verify']: reply({'msg':'Invalid credentials','error_code':'invalid_credentials'},400);return
    state['actor']=OTHER if body.get('email','').startswith('member') else ADMIN
    reply(session(state['actor']));return
   if u.path=='/auth/v1/user': reply(session(state['actor'] or ADMIN)['user']);return
   if u.path=='/auth/v1/logout':
    assert parse_qs(u.query).get('scope')==['local'];state['actor']=None;reply({});return
   state['unexpected'].append(u.path);reply({},403);return
  if u.path=='/rest/v1/users':
   a=state['actor'] or ADMIN
   reply({'id':a,'username':'fixture','display_name':'חשבון מנהל לבדיקה' if a==ADMIN else 'חשבון אחר לבדיקה','role':'admin' if a==ADMIN else 'user','tier':'member','created_at':'2026-01-01T00:00:00Z'});return
  rpc=u.path.rsplit('/',1)[-1]
  if req.method=='GET' or rpc in ('community_feed_page','community_message_context','community_reply_counts','community_replies_page','world_group_source_arrivals_v2','fn_list_family','fn_method_profile','fn_method_value','fn_all_methods'):
   reply([]);return
  if rpc=='rd_is_admin': reply(state['actor']==ADMIN);return
  if rpc=='community_message_actions_v1': reply([]);return
  if rpc in ('research_state_snapshot_v1','fn_research_path_resume_v1'): state['blocked_reads'].append(rpc);reply({},403);return
  state['unexpected'].append(u.path);reply({},403)
 context.route('**/*',route)
 return state

def open_entry(page,path=ENTRY):
 page.goto(BASE+path,wait_until='domcontentloaded')
 page.locator('[data-experience-surface="auth-2029"]').wait_for()
 page.get_by_role('heading',name='כניסה לחשבון',exact=True).wait_for()

def password(page,email='admin@example.invalid'):
 page.get_by_role('button',name='כניסה עם סיסמה',exact=True).click()
 page.get_by_label('כתובת מייל',exact=True).fill(email)
 page.get_by_label('סיסמה',exact=True).fill('local-synthetic-password')

cases=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 try:
  for preset in ['light','parchment','dark']:
   for width in [320,360,390,1440]:
    context=browser.new_context(viewport={'width':width,'height':900});state=install(context,preset)
    page=context.new_page();page.on('pageerror',lambda e:state['errors'].append(str(e)))
    open_entry(page)
    expect(page.get_by_role('button',name='המשך עם Google')).to_have_count(0)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    assert page.locator('[data-frame-theme-mode]').count()>0
    for box in page.locator('.sod29-auth button,.sod29-auth input,.sod29-auth a').all():
     if box.is_visible(): assert box.bounding_box()['height']>=44
    page.get_by_label('כתובת מייל').focus();page.keyboard.press('Tab')
    assert page.locator(':focus').get_attribute('type')=='submit'
    if (width,preset) in [(390,'dark'),(1440,'light')]:page.screenshot(path=str(OUT/f'{width}-{preset}.png'),full_page=True)
    assert not state['errors'],state['errors'];assert not state['unexpected'],state['unexpected']
    cases.append({'case':'layout','width':width,'preset':preset,'touch':True,'keyboard':True,'no_overflow':True})
    context.close()
  # OTP: source validation, failure recovery, exact return and refresh, no signup.
  context=browser.new_context(viewport={'width':390,'height':900});state=install(context);page=context.new_page();open_entry(page)
  page.get_by_label('כתובת מייל').fill('admin@example.invalid');page.get_by_role('button',name='שלחו לי קוד כניסה').click()
  field=page.get_by_label('קוד כניסה מהמייל');field.wait_for();field.fill('123');page.get_by_role('button',name='כניסה לחשבון ←',exact=True).click()
  expect(page.get_by_role('alert')).to_contain_text('6–10')
  assert not any(x['path']=='/auth/v1/verify' for x in state['requests'])
  state['fail_verify']=True;field.fill('1234567890');page.get_by_role('button',name='כניסה לחשבון ←',exact=True).click();expect(page.get_by_role('alert')).to_contain_text('הקוד שגוי')
  state['fail_verify']=False;page.get_by_role('button',name='כניסה לחשבון ←',exact=True).click();page.wait_for_url(BASE+TARGET)
  page.reload(wait_until='domcontentloaded');assert urlparse(page.url).path=='/community/chat'
  assert not state['unexpected'],state['unexpected'];cases.append({'case':'otp-failure-retry-10digits-exact-return-refresh','pass':True});context.close()
  # Password failure and admin return, without deciding privilege from display name.
  context=browser.new_context();state=install(context);page=context.new_page();open_entry(page);password(page)
  state['fail_password']=True;page.get_by_role('button',name='כניסה לחשבון ←',exact=True).click();expect(page.get_by_role('alert')).to_contain_text('המייל או הסיסמה')
  state['fail_password']=False;page.get_by_role('button',name='כניסה לחשבון ←',exact=True).click();page.wait_for_url(BASE+TARGET)
  cases.append({'case':'password-admin-failure-retry-exact-return','pass':True});context.close()
  # A hostile return target never leaves the existing 2029 app.
  context=browser.new_context();state=install(context);page=context.new_page();open_entry(page,'/login?returnTo='+quote('//external.example/private',safe=''));password(page)
  page.get_by_role('button',name='כניסה לחשבון ←',exact=True).click();page.wait_for_url(BASE+'/2029');cases.append({'case':'external-return-rejected','pass':True});context.close()
  # Current-account view and local signout preserve the same destination.
  context=browser.new_context();state=install(context,initial=ADMIN);page=context.new_page()
  page.goto(BASE+ENTRY,wait_until='domcontentloaded');page.get_by_role('heading',name='שלום, חשבון מנהל לבדיקה').wait_for()
  page.get_by_role('button',name='כניסה עם חשבון אחר').click();page.get_by_role('heading',name='כניסה לחשבון',exact=True).wait_for()
  password(page,'member@example.invalid');page.get_by_role('button',name='כניסה לחשבון ←',exact=True).click();page.wait_for_url(BASE+TARGET)
  assert state['actor']==OTHER;cases.append({'case':'local-signout-account-switch-same-return','pass':True});context.close()
  # An abandoned form cannot navigate back when a late authentication settles.
  context=browser.new_context();state=install(context);page=context.new_page();open_entry(page);password(page);state['hold']=True
  page.get_by_role('button',name='כניסה לחשבון ←',exact=True).click()
  for _ in range(50):
   if state['held']:break
   page.wait_for_timeout(30)
  assert state['held']
  page.get_by_role('link',name='חזרה לגלישה ←',exact=True).click();page.wait_for_url(BASE+TARGET)
  state['actor']=ADMIN;state['held'].fulfill(status=200,content_type='application/json',body=json.dumps(session()))
  page.wait_for_timeout(300);assert page.url==BASE+TARGET;cases.append({'case':'late-auth-does-not-reopen-abandoned-form','pass':True});context.close()
 finally:browser.close();server.shutdown()
json.dump({'cases':cases,'real_network_auth':False,'real_product_writes':0,'model_calls':0},open(OUT/'results.json','w'),ensure_ascii=False,indent=2)
print(json.dumps({'cases':len(cases),'passed':True,'real_product_writes':0,'model_calls':0}))
