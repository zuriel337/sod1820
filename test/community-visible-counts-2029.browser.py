"""Built public Community count/pagination/search acceptance; synthetic HTTP only."""
import functools,json,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/tmp/community-visible-counts');OUT.mkdir(exist_ok=True)
HTML=(ROOT/'dist/2029.html').read_text()
class Files(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Files,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}'
def install(context,theme='dark',mode='ready'):
 context.add_init_script('localStorage.setItem("sod-theme",'+json.dumps(theme)+');')
 state={'mode':mode,'total':12045,'reads':[],'writes':[],'errors':[]}
 def route(h):
  req=h.request;u=urlparse(req.url);name=u.path.rsplit('/',1)[-1]
  def reply(data,status=200,headers=None):h.fulfill(status=status,content_type='application/json',body=json.dumps(data),headers=headers or {})
  if u.hostname=='127.0.0.1':
   if req.is_navigation_request():h.fulfill(content_type='text/html',body=HTML);return
   if u.path.startswith('/api/'):reply({'state':'login_required'},401);return
   h.continue_();return
  if u.hostname!='linswmnnkjxvweumprav.supabase.co':h.fulfill(body='');return
  if u.path=='/auth/v1/settings':reply({'external':{'email':True}});return
  if state['mode']=='error' and name=='research_contributions':reply({'message':'synthetic unavailable'},503);return
  if name=='community_feed_page':
   args=req.post_data_json;state['reads'].append(args)
   if state['mode']=='error':reply({'message':'synthetic unavailable'},503);return
   if state['mode']=='zero':reply([]);return
   rows=[{'id':f'11111111-1111-4111-8111-{n:012d}','parent_id':None,'body':'ייחודית' if n==1 else f'הודעת בדיקה {n}','origin':'community_2029','author_name':'אדם בדיקה','created_at':'2026-10-31T00:00:00Z','reactions':{},**({} if state['mode']=='unknown' else {'total_count':state['total']})} for n in range(1,43)]
   if args.get('p_sort')=='oldest':rows.reverse()
   offset=args.get('p_offset',0);reply(rows[offset:offset+args.get('p_limit',40)]);return
  if name=='community_search':
   q=req.post_data_json['p_query'];found=[{'id':'11111111-1111-4111-8111-000000000001','parent_id':None,'body':'ייחודית','origin':'community_2029','author_name':'אדם בדיקה','created_at':'2026-10-31T00:00:00Z','reactions':{},'total_count':1}] if q=='ייחודית' else []
   state.setdefault('searches',[]).append(q);reply(found);return
  if name in ['community_reply_counts','world_group_source_arrivals_v2','rd_is_admin','fn_list_family','writer_public_contributions_page_v1']:reply([]);return
  if name in ['link_identity','track_visit','ingest_event']:h.abort();return
  if req.method in ['GET','HEAD']:reply([],headers={'content-range':'*/0'});return
  state['writes'].append(u.path);reply({},403)
 context.route('**/*',route);return state
cases=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 try:
  for width in [320,360,390,1440]:
   for theme in ['light','parchment','dark']:
    context=browser.new_context(viewport={'width':width,'height':950});state=install(context,theme);page=context.new_page();page.on('pageerror',lambda e:state['errors'].append(str(e)));page.goto(BASE+'/community/chat')
    summaries=page.locator('.sod29-community-conversation-count');expect(summaries).to_have_count(1)
    expect(summaries.first.locator('button')).to_have_text('(134.9K)')
    expect(page.locator('.sod29-community-intro h1')).to_be_visible();expect(page.get_by_role('heading',name='ממשיכים לשוחח',exact=True)).to_be_visible();expect(page.get_by_role('heading',name='הצ׳אט הוותיק',exact=True)).to_have_count(0);expect(page.locator('.sod29-community-feed>.sod29-community-thread-group')).to_have_count(40)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    assert page.locator('.sod29-community-intro').inner_text().split()==['שיחה','(134.9K)']
    for button in [page.get_by_role('button',name='הצטרפו לשיחה'),page.get_by_role('button',name='הכול',exact=True),page.locator('.sod29-community-stream-sort select')]:assert button.bounding_box()['height']>=44
    detail=summaries.first.locator('[popover]');expect(detail).not_to_be_visible();summaries.first.locator('button').click();expect(detail).to_be_visible();expect(detail).to_have_text('כולל הצ׳אט הישן');page.keyboard.press('Escape');expect(detail).not_to_be_visible();page.screenshot(path=str(OUT/f'public-{width}-{theme}.png'));assert not state['writes'] and not state['errors'],state
    cases.append({'width':width,'theme':theme,'public_heading_only':True,'dated_source_total_including_replies':True,'root_count_not_substituted':True,'no_overflow':True,'touch44':True});context.close()
  for width in [390,1440]:
   context=browser.new_context(viewport={'width':width,'height':950});state=install(context);page=context.new_page();page.goto(BASE+'/community/chat');summaries=page.locator('.sod29-community-conversation-count');expect(summaries.first.locator('button')).to_have_text('(134.9K)')
   page.get_by_role('button',name='עוד הודעות',exact=False).click();expect(page.locator('.sod29-community-feed>.sod29-community-thread-group')).to_have_count(42)
   page.get_by_role('searchbox',name='חיפוש בכל השיחות והתגובות').fill('ייחודית');expect(page.locator('.sod29-community-search-hit')).to_have_count(1)
   expect(summaries.first.locator('button')).to_have_text('(134.9K)')
   expect(page.locator('#community-search-scope')).to_contain_text('נמצאה תוצאה אחת בכל השיחות והתגובות');assert 'ייחודית' in state['searches']
   page.get_by_role('searchbox').fill('אין כזו הודעה');expect(page.get_by_text('לא נמצאו התאמות לחיפוש',exact=True)).to_be_visible()
   page.get_by_role('button',name='ניקוי החיפוש',exact=True).click();page.locator('.sod29-community-stream-sort select').select_option('liked');expect(page.locator('#community-search-scope')).to_contain_text('מתוך ההודעות שכבר נטענו בלבד')
   page.reload();expect(page.locator('.sod29-community-stream-sort select')).to_have_value('liked');expect(summaries.first.locator('button')).to_have_text('(134.9K)');assert not state['writes'];cases.append({'width':width,'pagination_search_liked_reload':True});context.close()
  for mode in ['zero','unknown','error']:
   context=browser.new_context(viewport={'width':390,'height':950});state=install(context,mode=mode);page=context.new_page();page.goto(BASE+'/community/chat');summaries=page.locator('.sod29-community-conversation-count');expect(summaries).to_have_count(1)
   expect(summaries.first.locator('button')).to_have_text('(134.9K)')
   if mode=='error':state['mode']='ready';page.get_by_role('button',name='ניסיון נוסף',exact=True).click();expect(page.locator('.sod29-community-feed>.sod29-community-thread-group')).to_have_count(40)
   assert not state['writes'];cases.append({'case':mode,'snapshot_not_loaded_page_count':True});context.close()
 finally:browser.close();server.shutdown()
(OUT/'results.json').write_text(json.dumps({'cases':cases,'count_kind':'dated_verified_snapshot_not_live','real_product_writes':0},ensure_ascii=False,indent=2));print(json.dumps({'pass':True,'cases':len(cases),'real_product_writes':0}))
