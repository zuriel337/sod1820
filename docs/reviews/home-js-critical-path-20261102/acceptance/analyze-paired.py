#!/usr/bin/env python3
"""Recreate final timing summaries/tables from the sanitized evidence archive.
Usage: python3 analyze-paired.py EXTRACTED_EVIDENCE_DIR OUTPUT_DIR
No network, product code, private configuration or browser state is read.
"""
import json, statistics, sys
from collections import Counter
from pathlib import Path
raw, out = map(Path, sys.argv[1:3]); out.mkdir(parents=True, exist_ok=True)
read=lambda p: json.loads((raw/p).read_text())
def stats(values):
    values=[v for v in values if v is not None]
    return dict(n=len(values), median=statistics.median(values),min=min(values),max=max(values),values=values) if values else None
j={k:read(f'paired-code-only/{v}-combined.json') for k,v in [('before','baseline'),('after','candidate')]}
v=read('paired-visible/visible.json')['cases']+read('paired-visible-resume/visible.json')['cases']
complete=[c for c in v if c.get('ok') is True]
assert len(complete)==24 and len(v)==25
assert all(x['ok'] and x['stabilityOk'] for d in j.values() for x in d['trials'])
summary={'baselineSHA':j['before']['sha'],'candidateSHA':j['after']['sha'],'protocol':'Exact external Vercel toolbar URL blocked on BOTH; real SW; 3 cold + 3 warm per target/viewport; profiling separate; interrupted visible attempt retained separately.','journeyGroups':[],'visibleGroups':[],'allJourneyCases':sum(len(d['trials']) for d in j.values()),'allJourneyCasesPass':True,'interruptedVisibleAttemptRetained':True,'visibleCases':24}
for width in [390,1440]:
 for state in ['cold','warm']:
    group={'width':width,'state':state,'stages':{},'networkAtPrimary':{},'maxCLS':{},'denied':{}}
    for label, data in j.items():
      cases=[c for c in data['trials'] if c['width']==width and c['state']==state];assert len(cases)==3
      for stage in cases[0]['steps']:
        rows=[next(s for s in c['steps'] if s['name']==stage['name']) for c in cases]
        group['stages'].setdefault(stage['name'],{})[label]={'usefulMs':stats([r['usefulMs'] for r in rows]),'materialMs':stats([r['materialAndMethodsMs'] for r in rows])}
      network=[]
      for c in cases:
        primary=c['steps'][0]['useful']
        resources=[r for r in c['snapshot']['resources'] if r['path'].startswith('/assets/') and r['path'].endswith('.js')]
        started=[r for r in resources if r['start']<=primary];finished=[r for r in started if r['end']<=primary]
        span=lambda rows:max(r['end'] for r in rows)-min(r['start'] for r in rows) if rows else 0
        network.append(dict(startedCount=len(started),startedEventualEncodedBytes=sum(r['bytes'] for r in started),completedCount=len(finished),completedEncodedBytes=sum(r['bytes'] for r in finished),completedTransferBytes=sum(r['transferBytes'] for r in finished),startedCompletionSpanMs=span(started),completedNetworkSpanMs=span(finished)))
      group['networkAtPrimary'][label]={key:stats([n[key] for n in network]) for key in network[0]}
      group['maxCLS'][label]=max(c['documentCls'] for c in cases)
      group['denied'][label]=dict(Counter(f"{r['method']} {r['path']}" for c in cases for r in c['snapshot']['denied']))
    summary['journeyGroups'].append(group)
    visible={'width':width,'state':state}
    for label,target in [('before','baseline'),('after','candidate')]:
      cases=[c for c in complete if c['width']==width and c['state']==state and c['label']==target];assert len(cases)==3
      visible[label]={'domMs':stats([c['visible']['primaryDOM'] for c in cases]),'title95Ms':stats([c['visible']['h1']['opacity0.95']['time'] for c in cases]),'action95Ms':stats([c['visible']['action']['opacity0.95']['time'] for c in cases]),'imageMs':stats([c['visible']['imageLoaded'] for c in cases]),'maxCLS':max(c['cls'] for c in cases),'allFullTitleInViewport':all(c['visible']['h1']['opacity0.95']['fullyInViewport'] for c in cases),'allFullActionInViewport':all(c['visible']['action']['opacity0.95']['fullyInViewport'] for c in cases),'playedStates':[c['visible'].get('initialPlayed') for c in cases]}
    summary['visibleGroups'].append(visible)
(out/'paired-summary-0d4a-2570.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
lines=['# Matched timing tables: 0d4ad836 → 25709d70','','All values are medians in seconds, n=3 per cell. Positive Δ is slower. Full ranges and every sample are in paired-summary JSON. DOM is not claimed to be full-opacity paint.']
sec=lambda v:f'{v/1000:.3f}'
for g in summary['journeyGroups']:
 lines += ['',f"## {g['width']} px / {g['state']} public journey",'', '| Stage | Useful DOM before | Useful DOM after | Δ | Material before | Material after | Δ |','|---|---:|---:|---:|---:|---:|---:|']
 for name,s in g['stages'].items():
  b,a=s['before']['usefulMs']['median'],s['after']['usefulMs']['median'];bm,am=s['before']['materialMs'],s['after']['materialMs']
  tail='— | — | —' if not bm else f"{sec(bm['median'])} | {sec(am['median'])} | {sec(am['median']-bm['median'])}"
  lines.append(f'| {name} | {sec(b)} | {sec(a)} | {sec(a-b)} | {tail} |')
 lines+=['',f"Maximum full-document CLS before/after: {g['maxCLS']['before']:.6f} / {g['maxCLS']['after']:.6f}. Each side has {sum(g['denied']['before'].values())} retained, blocked lang_links_list attempts in this subgroup."]
lines += ['','## Separate passive Home-only visible-content cohort','','Warm follows the product’s natural entrance-complete session mark, without injecting state. Effective opacity includes ancestors; title and primary action are fully within the viewport in every completed case. No profiling or scroll to manufacture visibility.','','| Width/state | DOM before | DOM after | Title ≥.95 before | Title ≥.95 after | Action ≥.95 before | Action ≥.95 after | Image before | Image after |','|---|---:|---:|---:|---:|---:|---:|---:|---:|']
for g in summary['visibleGroups']:
 vals=[g[label][key]['median'] for key in ['domMs','title95Ms','action95Ms','imageMs'] for label in ['before','after']]
 lines.append(f"| {g['width']} / {g['state']} | "+' | '.join(map(sec,vals))+' |')
lines += ['','## JavaScript network at primary DOM','','Same-origin assets only. Started footprint is eventual encoded body size of requests that STARTED before primary; it is not bytes already received at primary. Completed transfer includes response overhead for requests FINISHED by primary. Warm transfer 0 means cache, not an absence of code execution. Request-span intervals can overlap other work and cannot be summed as exclusive blocking time.','','| Width/state | Completed transfer before/after (B) | Completed encoded before/after (B) | Started eventual encoded before/after (B) | Completed span before/after (s) |','|---|---:|---:|---:|---:|']
for g in summary['journeyGroups']:
 n=g['networkAtPrimary'];pair=lambda key,fn:str(fn(n['before'][key]['median']))+' / '+str(fn(n['after'][key]['median']))
 lines.append(f"| {g['width']} / {g['state']} | {pair('completedTransferBytes',int)} | {pair('completedEncodedBytes',int)} | {pair('startedEventualEncodedBytes',int)} | {pair('completedNetworkSpanMs',sec)} |")
(out/'matched-tables.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'journeys':summary['allJourneyCases'],'visible':summary['visibleCases'],'incompleteRetained':len(v)-len(complete)}))
