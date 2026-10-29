"""Real Zvi list with synthetic anonymous responses and actual design tokens.
No live data, external model requests, or product mutations.
"""
import hashlib, json, os, re, socket, subprocess, time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('ZVI_BROWSER_OUT', '/tmp/zvi-research-experience-2029'))
OUT.mkdir(parents=True, exist_ok=True)
HTML = '''<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/zvi-approved-list-2029.jsx"></script></body></html>'''
SOURCE = 'e720a119-00e7-4e27-8c8a-d8671ae7b474'
HIDDEN = 'f720a119-00e7-4e27-8c8a-d8671ae7b474'
CONTRIBUTOR = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'
def uid(i): return f'00000000-0000-4000-8000-{i:012d}'
def meta(role): return {'ext':{'presentation':{'statement_role':role}}}
rows = [{'id':uid(i), 'created_at':'2026-10-28T12:00:00Z', 'statement':f'ממצא בדיקה {i}', 'kind':'fact', 'contributor':'צבי',
         'source_ref':f'channel_updates:{SOURCE}#{i}', 'source_contributor_id':CONTRIBUTOR, 'status':'approved', 'privacy_scope':'public', 'meta':meta('research_statement')}
        for i in range(1, 37)]
# Deliberately return some rows that a correctly governed server would exclude:
# client guards must still not expose them. Role OR below is evaluated faithfully.
rows[1].update(statement='מידע פרטי לא להציג', privacy_scope='private')
rows[2].update(statement='מועמד לא להציג', status='candidate')
rows[3].update(statement='אישי לא להציג', meta={'ext':{'presentation':{'statement_role':'research_statement'},'personal_scope':{'scope':'person_only'}}})
rows[4].update(statement='מקור שהוסר לא להציג', source_ref=f'channel_updates:{HIDDEN}')
rows[28].update(statement='ממצא ללא תפקיד', meta={})
rows[29].update(statement='ממצא קנוני ללא תפקיד', meta={}, status='canonical', promoted_node_id=uid(998), engine_verified=True, engine_detail={'verification_state':'match'})
rows[30].update(statement='תצפית חילוץ מחקרית', meta=meta('extraction_observation'), kind='observation')
rows[31].update(statement='רשומת מקור ללא מחקר לא להציג', meta=meta('source_material'))
rows[32].update(statement='רשומה ללא סיווג לא להציג', meta={})
rows[33].update(statement='צוריאל שאלה אישית לא להציג', meta=meta('research_statement'))
rows[34].update(statement='OCR מהמדיה: נוסח חילוץ')
rows.sort(key=lambda row: row['id'], reverse=True)
# Entirely synthetic reviewed records; the browser intercepts the Vite manifest
# module with exact hashes for these rows. This exercises the real reader without
# copying source material or stable IDs from the user's reviewed corpus.
reviewed_original = [
 {'id':uid(901+i), 'created_at':'2026-10-28T12:00:00Z', 'kind':'observation',
  'statement': ('OCR מהמדיה: חומר סקירה 2' if i == 1 else f'חומר סקירה {i+1}'),
  'contributor':'כותב בדיקה', 'source_ref':f'channel_updates:{HIDDEN if i == 3 else SOURCE}#{i}',
  'source_contributor_id':CONTRIBUTOR, 'status':'approved', 'privacy_scope':'public', 'meta':{}}
 for i in range(28)
]
def fingerprint(row):
 payload=json.dumps([row['id'],row['kind'],row['statement'],row['contributor'],row['source_ref']],ensure_ascii=False,separators=(',',':'))
 return hashlib.sha256(payload.encode('utf-8')).hexdigest()
review_manifest=[{'id':row['id'],'fingerprint':fingerprint(row)} for row in reviewed_original]
review_response=[dict(row) for row in reviewed_original]
review_response[2]['statement']='נתון ששונה אחרי הסקירה ולא יוצג'
manifest_module='export const ZVI_REVIEWED_FINDINGS = Object.freeze('+json.dumps(review_manifest)+');'
roles = {'research_statement','research_analysis','extraction_observation'}
def contrast(foreground, background):
 def luminance(rgb):
  components = [int(value)/255 for value in re.findall(r'\d+', rgb)[:3]]
  linear = [value/12.92 if value<=0.04045 else ((value+0.055)/1.055)**2.4 for value in components]
  return sum(value*weight for value,weight in zip(linear,[.2126,.7152,.0722]))
 light, dark = sorted([luminance(foreground),luminance(background)],reverse=True)
 return (light+.05)/(dark+.05)
def role_permitted(row):
 role = row.get('meta',{}).get('ext',{}).get('presentation',{}).get('statement_role')
 return role in roles or (row.get('status')=='canonical' and bool(row.get('promoted_node_id')) and row.get('engine_verified') is True and row.get('engine_detail',{}).get('verification_state')=='match')
expected = {row['id'] for row in rows if role_permitted(row) and row['status'] in ['approved','canonical'] and row['privacy_scope']=='public' and row.get('meta',{}).get('ext',{}).get('personal_scope',{}).get('scope')!='person_only' and HIDDEN not in row['source_ref'] and 'צוריאל' not in row['statement']}
report = {'cases':[], 'failures':[], 'errors':[], 'writes':[], 'model_calls':[]}
s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close(); BASE = f'http://127.0.0.1:{port}'
log = (OUT/'vite.log').open('w')
proc = subprocess.Popen(['node','node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',str(port),'--strictPort'],cwd=ROOT,stdout=log,stderr=log)
try:
 for _ in range(120):
  try:
   if urlopen(BASE, timeout=1).status==200: break
  except Exception: time.sleep(.25)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [320,390,1440]:
   for theme in ['light','parchment','dark']:
    c=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce')
    c.add_init_script('localStorage.setItem("zvi-fixture-theme",'+json.dumps(theme)+')')
    page=c.new_page();page.set_default_timeout(10000);requests=[]
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    def handle(route):
     req=route.request;url=urlparse(req.url);name=url.path.rsplit('/',1)[-1]
     if url.hostname=='127.0.0.1':
      if url.path == '/src/lib/research/zviReviewedFindings2029.js':
       return route.fulfill(content_type='application/javascript',body=manifest_module)
      return route.fulfill(content_type='text/html',body=HTML) if req.is_navigation_request() else route.continue_()
     if name in ['ai-analyze','research-run','raziel-submit']:report['model_calls'].append(name);return route.abort()
     if req.method not in ['GET','HEAD','OPTIONS']:report['writes'].append(name);return route.abort()
     q=parse_qs(url.query); requests.append({'path':name,'query':q})
     if name=='world_contributor_research_v1':
      if q.get('id'):
       requested=set(re.findall(r'[0-9a-f]{8}-[0-9a-f-]{27,}',q['id'][0],re.I))
       return route.fulfill(json=[row for row in review_response if row['id'] in requested],headers={'access-control-allow-origin':'*'})
      ors=q.get('or',[])
      # PostgREST appends one OR for research kinds and another for the cursor;
      # treating only q['or'][0] repeats page one and masks a pagination failure.
      assert any('statement_role' in clause for clause in ors), ors
      candidates=[row for row in rows if role_permitted(row)]
      cursors=[re.search(r'id\.lt\.([0-9a-f-]{36})',clause,re.I) for clause in ors]
      matches=[match for match in cursors if match]
      if matches: candidates=[row for row in candidates if row['id']<matches[-1].group(1)]
      limit=int(q.get('limit',['26'])[0]); data=candidates[:limit]
      return route.fulfill(json=data,headers={'access-control-allow-origin':'*'})
     if name=='channel_updates':return route.fulfill(json=[{'id':SOURCE,'status':'live','channel':'torat-haremez'}],headers={'access-control-allow-origin':'*'})
     return route.fulfill(json=[],headers={'access-control-allow-origin':'*'})
    page.route('**/*',handle)
    try:
     page.goto(BASE+'/world?view=sources&source=tzvi-opoc#world-contributor-material')
     btn=page.get_by_role('button',name='הצגת הממצאים המאושרים');expect(btn).to_be_visible()
     assert not requests,requests
     header_colors=page.locator('.zvi-research__coverage').first.evaluate('(e)=>({foreground:getComputedStyle(e).color,background:getComputedStyle(e.closest(".sod29-root")).backgroundColor})')
     assert contrast(header_colors['foreground'],header_colors['background']) >= 4.5,header_colors
     for selector in ['.zvi-research__button']:
      metrics=page.locator(selector).first.evaluate('(e)=>{let s=getComputedStyle(e),r=e.getBoundingClientRect();return {w:r.width,h:r.height,size:s.fontSize,family:s.fontFamily}}')
      assert metrics['w']>=44 and metrics['h']>=44 and metrics['size']=='16px' and 'Rubik' in metrics['family'],metrics
     btn.click()
     expect(page.get_by_role('link',name='ממצא בדיקה 36',exact=True)).to_be_visible()
     expect(page.get_by_role('button',name='עוד ממצאים')).to_be_visible()
     expect(page.get_by_text('תצפית חילוץ מחקרית',exact=True)).to_be_visible()
     expect(page.get_by_text('ממצא קנוני ללא תפקיד',exact=True)).to_be_visible()
     ocr=page.get_by_role('listitem').filter(has_text='OCR מהמדיה: נוסח חילוץ').inner_text()
     assert 'נדרשת בדיקה מול המקור' in ocr and 'אינו ציטוט מאומת' in ocr,ocr
     note_colors=page.get_by_role('listitem').filter(has_text='OCR מהמדיה: נוסח חילוץ').locator('.zvi-research__note').last.evaluate('(e)=>({foreground:getComputedStyle(e).color,background:getComputedStyle(e.closest(".zvi-research__card")).backgroundColor})')
     assert contrast(note_colors['foreground'],note_colors['background']) >= 4.5,note_colors
     assert page.get_by_text('רשימה חלקית',exact=False).count()>0
     textstyle=page.locator('.zvi-research__excerpt').first.evaluate('(e)=>{let s=getComputedStyle(e),r=e.getBoundingClientRect();return {family:s.fontFamily,size:s.fontSize,w:r.width,h:r.height}}')
     assert textstyle['size']=='18px' and 'Noto Sans Hebrew' in textstyle['family'] and textstyle['w']>=44 and textstyle['h']>=44,textstyle
     linkstyle=page.locator('.zvi-research__action').first.evaluate('(e)=>{let s=getComputedStyle(e),r=e.getBoundingClientRect();return {family:s.fontFamily,size:s.fontSize,w:r.width,h:r.height}}')
     assert linkstyle['size']=='16px' and 'Rubik' in linkstyle['family'] and linkstyle['w']>=44 and linkstyle['h']>=44,linkstyle
     page.get_by_role('button',name='עוד ממצאים').click()
     expect(page.get_by_role('link',name='ממצא בדיקה 1',exact=True)).to_be_visible()
     assert page.get_by_text('חלק מהחומר או מקורותיו אינם זמינים בתצוגה הציבורית.',exact=True).count()==1
     body=page.locator('body').inner_text()
     for hidden in ['מידע פרטי לא להציג','מועמד לא להציג','אישי לא להציג','מקור שהוסר לא להציג','צוריאל שאלה אישית לא להציג','רשומה ללא סיווג לא להציג','רשומת מקור ללא מחקר לא להציג','מאומת במנוע']:
      assert hidden not in body,hidden
     assert page.get_by_role('button',name='עוד ממצאים').count()==0
     research_calls=[r for r in requests if r['path']=='world_contributor_research_v1']
     assert len(research_calls)==2 and len(research_calls[0]['query'].get('or',[]))==1 and len(research_calls[1]['query'].get('or',[]))==2,research_calls
     links=page.locator('.zvi-research__excerpt').evaluate_all('(es)=>es.map(e=>new URL(e.href).searchParams.get("finding"))')
     assert len(links)==len(set(links)) and set(links)==expected, {'expected':sorted(expected),'actual':sorted(links)}
     reviewed=page.get_by_role('region',name='חומר נוסף שנבדק')
     review_button=reviewed.get_by_role('button',name='חומר נוסף שנבדק',exact=True)
     expect(review_button).to_be_visible()
     assert not any(call['query'].get('id') for call in research_calls)
     review_button.click()
     expect(reviewed.get_by_role('link',name='חומר סקירה 1',exact=True)).to_be_visible()
     reviewed_ocr=reviewed.get_by_role('listitem').filter(has_text='OCR מהמדיה: חומר סקירה 2').inner_text()
     assert 'נדרשת בדיקה מול המקור' in reviewed_ocr and 'אינו ציטוט מאומת' in reviewed_ocr,reviewed_ocr
     assert reviewed.get_by_text('נתון ששונה אחרי הסקירה ולא יוצג',exact=True).count()==0
     assert reviewed.get_by_text('חומר סקירה 4',exact=True).count()==0
     expect(reviewed.get_by_text('חלק מהחומר או מקורותיו אינם זמינים בתצוגה הציבורית.',exact=True)).to_be_visible()
     expect(reviewed.get_by_text('חלק מהחומר ממתין לעיון.',exact=True)).to_be_visible()
     more_reviewed=reviewed.get_by_role('button',name='עוד חומר שנבדק')
     expect(more_reviewed).to_be_visible()
     bounds=more_reviewed.evaluate('(e)=>{let r=e.getBoundingClientRect();return {w:r.width,h:r.height}}')
     assert bounds['w']>=44 and bounds['h']>=44,bounds
     more_reviewed.click()
     expect(reviewed.get_by_role('link',name='חומר סקירה 28',exact=True)).to_be_visible()
     reviewed_ids=reviewed.locator('.zvi-research__excerpt').evaluate_all('(es)=>es.map(e=>new URL(e.href).searchParams.get("finding"))')
     expected_reviewed={row['id'] for i,row in enumerate(reviewed_original) if i not in [2,3]}
     assert len(reviewed_ids)==len(set(reviewed_ids)) and set(reviewed_ids)==expected_reviewed
     review_calls=[r for r in requests if r['path']=='world_contributor_research_v1' and r['query'].get('id')]
     assert len(review_calls)==2,review_calls
     review_source=reviewed.get_by_role('link',name='פתיחת המקור').first.get_attribute('href')
     assert SOURCE in review_source and 'sourceRef=' in review_source
     review_before=page.url
     reviewed.get_by_role('link',name='חומר סקירה 1',exact=True).click()
     assert urlparse(page.url).query=='finding='+uid(901)
     assert page.evaluate('history.state.usr.returnTo')=='/world?view=sources&source=tzvi-opoc#world-contributor-material'
     page.go_back();assert page.url==review_before
     reviewed.get_by_role('link',name='פתיחת המקור').first.click()
     assert parse_qs(urlparse(page.url).query)['sourceRef']==['channel_updates:'+SOURCE]
     page.go_back();assert page.url==review_before
     reviewed_note_colors=reviewed.get_by_role('listitem').filter(has_text='OCR מהמדיה: חומר סקירה 2').locator('.zvi-research__note').last.evaluate('(e)=>({foreground:getComputedStyle(e).color,background:getComputedStyle(e.closest(".zvi-research__card")).backgroundColor})')
     assert contrast(reviewed_note_colors['foreground'],reviewed_note_colors['background'])>=4.5
     assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
     page.evaluate('window.scrollTo(0,0)')
     page.screenshot(path=str(OUT/f'{width}-{theme}-viewport.png'))
     page.screenshot(path=str(OUT/f'{width}-{theme}.png'),full_page=True)
     before=page.url
     page.get_by_role('link',name='ממצא בדיקה 36',exact=True).click()
     assert urlparse(page.url).query=='finding='+uid(36),page.url
     assert page.evaluate('history.state.usr.returnTo')=='/world?view=sources&source=tzvi-opoc#world-contributor-material'
     page.go_back();assert page.url==before
     page.get_by_role('link',name='פתיחת המקור').first.click()
     assert parse_qs(urlparse(page.url).query)['sourceRef']==['channel_updates:'+SOURCE]
     assert urlparse(page.url).fragment=='source-occurrence-'+SOURCE
     report['cases'].append({'width':width,'theme':theme,'pages':2,'shown':len(links),'review_pages':2,'review_shown':len(reviewed_ids),'fonts':{'body':textstyle,'action':linkstyle}})
    except Exception as e:
     report['failures'].append({'width':width,'theme':theme,'error':str(e)[:1000],'requests':requests})
     page.screenshot(path=str(OUT/f'failed-{width}-{theme}.png'))
    c.close()
  browser.close()
finally:
 proc.terminate();proc.wait(timeout=10);log.close();(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
assert len(report['cases'])==9 and not report['failures'] and not report['errors'] and not report['writes'] and not report['model_calls']
