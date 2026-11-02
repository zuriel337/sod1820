import json,statistics,sys
from pathlib import Path
source=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
d=json.loads(source.read_text())
expr='אחת ארבע שבע ושתיים'
def target(step,state):
 n=step['name']
 if n in ['home-entry','back-post-home']:return state.get('home')
 if n in ['home-post','back-world-post']:return state.get('post')
 if n in ['post-world','back-number-world']:return state.get('world')
 root,phrase=('3928',expr) if n=='number-method-full-page' else ('913','בראשית') if n=='number-phrase-full-page' else ('1820',expr)
 return state.get('number')==root and state.get('expression')==phrase and state.get('methodReady')
rows=[]
for r in d['results']:
 for s in r['steps']:
  since=s.get('measurementStart',s['startTime'])
  ready=next((e for e in s['readiness'] if target(s,e)),None)
  if ready is None:raise RuntimeError('Missing useful readiness: '+str((r['version'],r['width'],r['pair'],s['name'])))
  useful=ready['time']-since
  material=next((e['time']-since for e in s['readiness'] if target(s,e) and e.get('material')=='ready'),None) if ready.get('number') else useful
  completed=[e['end']-since for e in s.get('reads',[]) if e.get('end') is not None]
  rows.append({'version':r['version'],'width':r['width'],'repeat':r['repeat'],'pair':r['pair'],'step':s['name'],'usefulMs':useful,'materialMs':material,'admittedCompleteMs':max([useful,material or 0]+completed),'driverUsefulMs':s['ms'],'driverMaterialMs':s['materialDriverMs'],'driverCompletionMs':s['completionDriverMs'],'completionTimedOut':s['admittedReadTimeout'],'cls':s['cls'],'documentCls':r.get('documentCls'),'httpFailures':[e for e in s.get('reads',[]) if e.get('status',200)>=400],'unfinishedReads':[e for e in s.get('reads',[]) if e.get('end') is None]})
def stats(xs):return {'n':len(xs),'median':statistics.median(xs),'min':min(xs),'max':max(xs)}
groups=[]
for width in [390,1440]:
 for repeat in ['first','repeat']:
  for step in dict.fromkeys(r['step'] for r in rows):
   group={'width':width,'repeat':repeat,'step':step}
   for ver in ['before','after']:
    subset=[r for r in rows if r['width']==width and r['repeat']==repeat and r['step']==step and r['version']==ver]
    group[ver]={k:stats([r[k] for r in subset if r[k] is not None]) for k in ['usefulMs','materialMs','admittedCompleteMs','driverUsefulMs','cls']}
   groups.append(group)
summary={'before':d['baselineSha'],'after':d['candidateSha'],'realSW':d['realServiceWorker'],'mocks':d['mockResponses'],'cycles':len(d['results']),'stages':len(rows),'ok':d.get('ok'),'functionalOk':d.get('functionalOk'),'candidateClsPass':d.get('candidateClsPass'),'comparison':'3 counterbalanced pairs per viewport, first+repeat in each context; actual public Home cards held identical; 390x900 CPU4 RTT150ms 200000B/s; 1440x900 unthrottled','definitions':{'useful':'first MutationObserver DOM state with correct root/operand and enabled canonical milui (or actual Home/Post/World content), not a skeleton and not a field LCP/paint metric','material':'full initially requested Number entity projection; independent calculation is not blocked','admittedComplete':'last completed admitted safe fetch header/response plus material/useful readiness, after a separate250ms REST settle check; bounded initial readers only, not all archive/deferred sections or image decoding','driver':'Playwright wall duration, includes input and locator polling; not used as DOM timing proof'},'maxDocumentCls':{v:max(r['documentCls'] for r in rows if r['version']==v) for v in ['before','after']},'completionTimeouts':sum(r['completionTimedOut'] for r in rows),'httpFailureCount':sum(len(r['httpFailures']) for r in rows),'groups':groups,'rows':rows}
(out/'performance-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
fmt=lambda s:f"{s['median']/1000:.2f} [{s['min']/1000:.2f}–{s['max']/1000:.2f}]"
text=['# Repeated native comparison — useful versus admitted completion','',f"Base `{d['baselineSha']}` → candidate `{d['candidateSha']}`. {len(d['results'])} cycles/{len(rows)} stages. Three samples per row/version; all retained. Real deployed SW, no request mocks/interception, no product writes or models. Numbers are seconds: median [min–max].",'', 'Useful is in-browser correct actionable DOM, not LCP. Material is full Number entity projection. Completion is the bounded initially admitted safe-read set; closed/offscreen sections remain deferred. Request body/image decode and field-user p75 are not claimed. Driver values include locator polling and are retained in JSON. No overlapping local browser/build jobs during this final comparison.','']
for width in [390,1440]:
 for repeat in ['first','repeat']:
  text += [f'## {width}px / {repeat}', '', '| Stage | Useful before → after | Entity material before → after | Admitted complete before → after |', '|---|---|---|---|']
  for g in groups:
   if g['width']!=width or g['repeat']!=repeat:continue
   text.append('| '+g['step']+' | '+' | '.join(fmt(g['before'][k])+' → '+fmt(g['after'][k]) for k in ['usefulMs','materialMs','admittedCompleteMs'])+' |')
  text.append('')
text += ['## Display stability', '',f"Whole-document maximum session-window CLS: before {summary['maxDocumentCls']['before']:.6f}; after {summary['maxDocumentCls']['after']:.6f}. Unchanged budget0.1. Candidate pass: {summary['candidateClsPass']}. Completion timeouts: {summary['completionTimeouts']}. Admitted HTTP errors: {summary['httpFailureCount']}.",'','Signed-in/account/model/write behavior is not live-tested; these actions remain closed in this reading profile. Native public timings include real server variability, cache and proxy behavior. Three lab samples are not field percentiles or statistical certainty.']
(out/'PERFORMANCE.md').write_text('\n'.join(text)+'\n')
print(json.dumps({k:summary[k] for k in ['cycles','stages','ok','maxDocumentCls','completionTimeouts','httpFailureCount']}))
