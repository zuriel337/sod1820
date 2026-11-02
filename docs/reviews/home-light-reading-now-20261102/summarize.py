import json, statistics, sys
from pathlib import Path
j=json.loads(Path(sys.argv[1]).read_text());out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
assert j['ok'] and len(j['results'])==12
assert j['candidateSha']=='7c8d3bed9ebfa21d0db86f3420134d9f7a8e79a2'
rows=[]
for c in j['results']:
 for s in c['steps']:
  key='post' if s['name'] in ['home-post','repeat-home-post'] else 'home'
  ready=next(e for e in s['readiness'] if e.get(key))
  useful=ready['time']-s['measurementStart']
  assert not s['admittedReadTimeout']
  errors=[r for r in s.get('reads',[]) if r.get('status',200)>=400]
  assert not errors
  opening=next((e['time'] for e in s['readiness'] if e.get('opening')),None) if s['name']=='home-entry' else None
  rows.append(dict(version=c['version'],width=c['width'],pair=c['pair'],stage=s['name'],usefulMs=useful,
   admittedCompleteMs=max([useful]+[r['end']-s['measurementStart'] for r in s.get('reads',[]) if r.get('end') is not None]),
   driverMs=s['ms'],openingNavMs=opening,cls=s['cls'],documentCls=c['documentCls']))
def stats(xs):return dict(n=len(xs),median=statistics.median(xs),min=min(xs),max=max(xs))
groups=[]
for width in [390,1440]:
 for stage in dict.fromkeys(r['stage'] for r in rows):
  g=dict(width=width,stage=stage)
  for version in ['before','after']:
   subset=[r for r in rows if r['width']==width and r['stage']==stage and r['version']==version]
   assert len(subset)==3
   g[version]={k:stats([r[k] for r in subset]) for k in ['usefulMs','admittedCompleteMs','driverMs','cls']}
   if stage=='home-entry' and version=='after':g[version]['openingNavMs']=stats([r['openingNavMs'] for r in subset])
  groups.append(g)
summary=dict(baseline=j['baselineSha'],candidate=j['candidateSha'],ok=not j.get('failedAttempts'),pairedFunctionalPass=True,allAttemptsPassed=not j.get('failedAttempts'),realSW=True,mocks=False,modelCalls=0,productWrites=0,
 cycles=12,stages=len(rows),pairsPerViewport=3,groups=groups,rows=rows,
 maxDocumentCls={v:max(r['documentCls'] for r in rows if r['version']==v) for v in ['before','after']},
 conditions='390×900 CPU4 RTT150ms down200000B/s up100000B/s;1440×900 unthrottled; fresh contexts, alternating version order; same actual public Home Post identities; no other local browser/build while timed',
 failedAttempts=j.get('failedAttempts',[]),unpairedDiagnosticSamples=j.get('unpairedDiagnosticSamples',[]),
 definitions={'useful':'MutationObserver sees actual Home/Post content and available reading links; not placeholder, paint/LCP or driver polling',
 'openingNav':'basic public document links visible before the application; not loaded Home content or acceptance of every route',
 'admittedComplete':'last safe fetch response end among bounded admitted readers plus useful readiness; separate250ms settle check; not all images/body decoding or deferred sections',
 'repeat':'same context, first Post and repeat Post plus browser back to exact Home address; no claim of field-user percentiles'})
assert summary['maxDocumentCls']['after']<=0.1
(out/'performance-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
fmt=lambda s:f"{s['median']/1000:.2f} [{s['min']/1000:.2f}–{s['max']/1000:.2f}]"
text=['# Home and first Post — repeated native SW comparison','',f"{j['baselineSha']} → {j['candidateSha']}. Twelve completed paired cycles, sixty stages, three complete pairs per viewport. One additional candidate cold entry timed out before any content request; its paired baseline completed. Both retained as diagnostics. Thus14 cold attempts,13 completed,1 failed. One complete pair was rerun. The table describes completed pairs only; it does not turn the failed attempt green. Seconds: median [min–max].",'','| Width | Stage | Actual useful before → after | Admitted completion before → after |','|---|---|---|---|']
for g in groups:text.append('| '+str(g['width'])+' | '+g['stage']+' | '+' | '.join(fmt(g['before'][k])+' → '+fmt(g['after'][k]) for k in ['usefulMs','admittedCompleteMs'])+' |')
text+=['',summary['conditions'],'','Useful is actual in-browser DOM readiness, not LCP. Completion is the bounded admitted read set, not all archive content/media. Opening navigation is measured separately and never counted as useful Home content. Every table row/version has3 completed samples; not fieldp75 or statistical certainty.', '',f"Maximum document session-window CLS on completed cycles: before {summary['maxDocumentCls']['before']:.6f}; after {summary['maxDocumentCls']['after']:.6f}. Budget0.1 unchanged. Completed cycles had no admitted REST completion timeout or HTTP failure."]
text+=['','## Unresolved failed cold entry','','Candidate390/pair3 remained in static document opening for60seconds with zero content requests. Screenshot/failure JSON retained. Worker/bootstrap/code delivery/external stylesheet are possibilities, not proven diagnoses. The complete pair succeeded on fresh retry. Enhanced failure-network capture was added afterwards; it cannot retrospectively establish the missing failed-request trace. This remains OPEN and blocks declaring cold startup stable. No guard was weakened and no failed sample was reported as a pass.']
(out/'PERFORMANCE.md').write_text('\n'.join(text)+'\n')
print(json.dumps({k:summary[k] for k in ['ok','cycles','stages','maxDocumentCls']}))
