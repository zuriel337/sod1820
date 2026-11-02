import json,statistics,sys
from pathlib import Path
root=Path(sys.argv[1]);out=Path(__file__).parent
datasets={v:json.loads((root/p/'results.json').read_text()) for v,p in [('before','baseline-native-verified'),('after','candidate-native')]}
rows=[];post_signature=None
for version,j in datasets.items():
 assert j['ok'] and len(j['trials'])==14
 for r in j['trials']:
  assert r['ok'] and not r['errors']
  assert not [x for x in r['network'] if x.get('status',200)>=400]
  s=r['snapshot'];assert s['controller']=='/preview-readonly-sw.js'
  signature=json.dumps(r['posts'],ensure_ascii=False,sort_keys=True)
  if post_signature is None:post_signature=signature
  assert signature==post_signature,'Home public content changed in comparison'
  ready=s['readiness'];home=next(x['time'] for x in ready if x['home'])
  ps=next(x['start'] for x in r['steps'] if x['name']=='home-post');bs=next(x['start'] for x in r['steps'] if x['name']=='back-post-home')
  post=next(x['time']-ps for x in ready if x['time']>=ps and x['post'])
  back=next(x['time']-bs for x in ready if x['time']>=bs and x['home'])
  reads=[x for x in s['reads'] if x['start']<ps]
  complete=max([home]+[x['end'] for x in reads if x.get('end') is not None])
  phases=s['phases'];initial=next(x for x in phases if x['stage']=='initial_controller')
  control=initial['time'] if initial['controller'] else next(x['time'] for x in phases if x['stage']=='worker_controller_change' and x['controller'])
  assert all(x['start']>=control for x in s['reads']), 'product read before worker control'
  if r['label'].startswith('warm-') or r['label']=='persistent-reopened':assert initial['controller'],'returning client lost actual worker'
  rows.append(dict(version=version,width=r['width'],label=r['label'],homeUsefulMs=home,homeAdmittedMs=complete,postUsefulMs=post,backHomeUsefulMs=back,controllerMs=control,documentCls=r['documentCls'],initialController=initial['controller']))
def stats(xs):return dict(n=len(xs),median=statistics.median(xs),min=min(xs),max=max(xs))
groups=[]
for width in [390,1440]:
 for kind in ['fresh','warm']:
  g=dict(width=width,kind=kind)
  for v in ['before','after']:
   selected=[r for r in rows if r['version']==v and r['width']==width and r['label'].startswith(kind+'-')]
   assert len(selected)==3
   g[v]={k:stats([r[k] for r in selected]) for k in ['homeUsefulMs','homeAdmittedMs','postUsefulMs','backHomeUsefulMs','documentCls']}
  groups.append(g)
summary=dict(base=datasets['before']['sha'],candidate=datasets['after']['sha'],nativeTrials=28,nativeFailed=0,realSW=True,requestInterception=False,
 metadataIdentityVerified=True,anonymousPublicReader=True,returningPersistentRestart=True,modelCalls=0,productWrites=0,groups=groups,rows=rows,
 maxDocumentCLS={v:max(r['documentCls'] for r in rows if r['version']==v) for v in ['before','after']},
 comparison='same harness/DOM metric and actual public Home Post identities;6fresh+6warm+2persistent perSHA;390x900 CPU4 RTT150ms200000B/s down100000B/s up;1440x900 unthrottled; before block then after block, not interleaved; no concurrent local browser/build during native timing',
 definitions={'usefulHome':'first MutationObserver actual Home cards/reading controls+nonloading hero; not placeholder/navigation/LCP or driver polling',
 'admittedHome':'latest completed safe fetch response among initially admitted Home reads before first Post entry plus useful readiness; separate250ms settle and600ms observation; not image decode/all deferred content',
 'post':'first MutationObserver source-reading DOM from click start; same leading actual Post; not LCP',
 'back':'first Home DOM after browser back, exact full original Home URL asserted',
 'failures':'successful native28 are separate from preserved original60s failure,14harness assertion failures and explicit fault injection; seeFAILURES.md'})
assert summary['maxDocumentCLS']['after']<=0.1
(out/'performance-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
fmt=lambda x:f"{x['median']/1000:.2f} [{x['min']/1000:.2f}–{x['max']/1000:.2f}]"
lines=['# מדידות בית ופוסט — לפני | אחרי','',summary['comparison'],'','שניות: חציון [מינימום–מקסימום],3דגימות בכל שורת מדד/גרסה. לפני ואחרי הם אותו מדד ואותם תנאים. אין ערבוב בין ניווט בסיסי,DOM תוכן שימושי, השלמת קריאות ו־LCP. זהו ניסוי מעבדה, לאp75 בשטח ולא הוכחה סטטיסטית; סדר ההרצות אינו מתחלף ולכן שונות שרת/תעבורה עדיין אפשרית.','', '| רוחב / כניסה | מדד | לפני7c8d3bed | אחרי6cd64a79 |','|---|---|---|---|']
labels={'homeUsefulMs':'תוכן בית שימושי','homeAdmittedMs':'השלמת קריאות הבית שהופעלו','postUsefulMs':'תוכן הפוסט הראשון','backHomeUsefulMs':'חזרה מדויקת לבית'}
for g in groups:
 for k,label in labels.items():lines.append(f"| {g['width']} / {g['kind']} | {label} | {fmt(g['before'][k])} | {fmt(g['after'][k])} |")
lines+=['','משתמש חוזר נבדק גם בפרופילChrome מתמשך שנשמר בדיסק וסגירה/פתיחה מחדש, עםSW קיים בתחילת הדף. אלה2בדיקות לכלSHA, ולא הוצגו כמדגם של3. הבדיקה אנונימית בפרופיל הקריאה הציבורי; אין קבלת חשבון מחובר או החלפת משתמש.','',f"CLS מרבי לאורך כניסה→פוסט→חזרה: לפני{summary['maxDocumentCLS']['before']:.6f}; אחרי{summary['maxDocumentCLS']['after']:.6f}; הסף0.1לא שונה. בכל28הרצות הקבלהNative לא היו pageerrors אוHTTP>=400, ובקשות מוצר החלו רק אחרי שליטתSW. [כל הכשלים והתקיעות](FAILURES.md) נשמרים בנפרד ואינם נעלמים מחישוב התמונה הכוללת."]
(out/'PERFORMANCE.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({k:summary[k] for k in ['nativeTrials','nativeFailed','maxDocumentCLS']}))
