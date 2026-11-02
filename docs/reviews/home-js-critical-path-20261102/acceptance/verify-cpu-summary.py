#!/usr/bin/env python3
"""Recompute the report's CPU/trace/coverage evidence from sanitized raw CDP JSON.
Usage: python3 verify-cpu-summary.py EXTRACTED_EVIDENCE_DIR CPU_SUMMARY_JSON
Read-only; no browser/network/private configuration. Samples are self weights.
"""
import json, sys
from pathlib import Path
from collections import defaultdict
from urllib.parse import urlsplit
raw, saved=Path(sys.argv[1]),json.loads(Path(sys.argv[2]).read_text())
def union(intervals):
    merged=[]
    for a,b in sorted(intervals):
        if b<=a: continue
        if merged and a<=merged[-1][1]:merged[-1][1]=max(b,merged[-1][1])
        else:merged.append([a,b])
    return sum(b-a for a,b in merged)/1000
for label,name in [('before','code-only-baseline-0d4a-diagnostic'),('after','code-only-candidate-2570-diagnostic')]:
    data=json.loads((raw/name/'diagnostic.json').read_text()); expected=saved['targets'][label]
    primary=next(p['time'] for p in data['snapshot']['observer']['phases'] if p.get('primary')=='ready' and p.get('heroTitle'))
    metrics={m['name']:m['value'] for m in data['usefulMetrics']};start=metrics['NavigationStart']*1e6;end=start+primary*1000
    profile=data['cpuProfile'];nodes={n['id']:n['callFrame'] for n in profile['nodes']};clock=profile['startTime'];product=0
    for node,delta in zip(profile['samples'],profile['timeDeltas']):
        stop=clock+delta;weight=max(0,min(stop,end)-max(clock,start))/1000;clock=stop
        if urlsplit(nodes[node].get('url','')).path.startswith('/assets/'):product+=weight
    assert abs(product-expected['productAssetSampleSelfTotalMs'])<.01,(label,'sample',product,expected['productAssetSampleSelfTotalMs'])
    events=defaultdict(list)
    for e in data['trace']:
        if e.get('ph')=='X' and e.get('dur',0)>0:events[(e['pid'],e['tid'])].append(e)
    categories={'capturedCompileUnionMs':{'v8.compile','v8.compileModule'},'capturedEvaluationUnionMs':{'v8.evaluateModule','EvaluateScript'},'capturedFunctionCallUnionMs':{'FunctionCall'},'layoutUnionMs':{'Layout'},'styleUnionMs':{'UpdateLayoutTree'}}
    for thread in expected['traceThreadsClippedToDOM']:
        ev=events[(thread['pid'],thread['tid'])]
        for key,names in categories.items():
            value=union([(max(start,e['ts']),min(end,e['ts']+e['dur'])) for e in ev if e['name'] in names])
            assert abs(value-thread[key])<.01,(label,thread['role'],key,value,thread[key])
    # Outer program ranges are overridden by narrower function/block ranges.
    total=executed=0
    for script in data['coverage']:
        if not urlsplit(script['url']).path.startswith('/assets/'):continue
        ranges=[r for f in script['functions'] for r in f['ranges']];length=max([r['endOffset'] for r in ranges] or [0]);mask=bytearray(length)
        for r in sorted(ranges,key=lambda r:r['endOffset']-r['startOffset'],reverse=True):
            a,b=r['startOffset'],r['endOffset'];mask[a:b]=bytes([int(r['count']>0)])*(b-a)
        total+=length;executed+=sum(mask)
    assert total==expected['coverageTotalCodeUnits'],(label,'coverage-total',total,expected['coverageTotalCodeUnits'])
    assert executed==expected['coverageExecutedCodeUnitsApprox'],(label,'coverage-executed',executed,expected['coverageExecutedCodeUnitsApprox'])
    print(json.dumps({'target':label,'verified':True,'primaryDOMMs':primary,'productSelfSampleMs':product,'coverageCodeUnits':total,'coverageExecutedApprox':executed}))
