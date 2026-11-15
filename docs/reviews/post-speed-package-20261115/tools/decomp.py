#!/usr/bin/env python3
"""Decomposition of the base (current-site) cold mobile load per post, from lab JSONL files: where the time and the bytes go.
usage: decomp.py label[,label...] > table.md"""
import json, sys, re, statistics as st, collections, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze
labels = sys.argv[1].split(',')
runs = collections.defaultdict(list)
for label in labels:
    for line in open(f'data/{label}.jsonl', encoding='utf8'):
        r = json.loads(line)
        if r.get('error') or not r.get('perf'): continue
        runs[r['post']].append(r)
med = lambda xs: round(st.median([x for x in xs if x is not None])) if any(x is not None for x in xs) else None
def cat(q):
    u = q['u']
    if re.search(r'googletagmanager|facebook|googlesyndication|doubleclick', u): return '3p'
    return {'Document': 'doc', 'Script': 'js', 'Stylesheet': 'css', 'Font': 'font', 'Image': 'img', 'Fetch': 'api', 'XHR': 'api'}.get(q['ty'], 'other')
head = '| post | n | server wait to first byte | first paint | entry JS done | route graph done | data read done | **content visible** | JS KB / requests before content | CSS | fonts | images | third-party before content | idle main thread | first-party script time | third-party script time |'
print(head); print('|' + '---|' * 16)
names = {'O1': 'O1 old, image first', 'O3': 'O3 old, medium', 'N3': 'N3 new, medium', 'N5': 'N5 new, long'}
for post in ('O1', 'O3', 'N3', 'N5'):
    rs = runs.get(post, [])
    if not rs: continue
    ph = [analyze.phases(r) for r in rs]
    jsb, jsn, cssb, fontb, imgb, tpb = [], [], [], [], [], []
    idle, first, third = [], [], []
    for r in rs:
        c = r['perf']['content']['t']
        agg = collections.Counter(); cnt = collections.Counter()
        for q in r['requests']:
            if q.get('e') is None or q['e'] > c or not q.get('b'): continue
            agg[cat(q)] += q['b']; cnt[cat(q)] += 1
        jsb.append(agg['js'] / 1024); jsn.append(cnt['js']); cssb.append(agg['css'] / 1024); fontb.append(agg['font'] / 1024); imgb.append(agg['img'] / 1024); tpb.append(agg['3p'] / 1024)
        cpu = r.get('cpu') or {}
        total = sum(cpu.values()) or 1
        idle.append(100 * cpu.get('((idle))', 0) / total)
        first.append(sum(v for k, v in cpu.items() if '/assets/' in k)); third.append(sum(v for k, v in cpu.items() if re.search(r'googletagmanager|fbevents|googlesyndication|adsbygoogle|pagead', k)))
    row = [names[post], len(rs), med([p['ttfb'] for p in ph]), med([p['fcp'] for p in ph]), med([p['entry_end'] for p in ph]), med([p['graph_end'] for p in ph]), med([p['post_end'] for p in ph]), med([p['content'] for p in ph]),
           f'{med(jsb)} / {med(jsn)}', f'{med(cssb)} KB', f'{med(fontb)} KB', f'{med(imgb)} KB', f'{med(tpb)} KB', f'{med(idle)} %', f'{med(first)} ms', f'{med(third)} ms']
    print('| ' + ' | '.join(str(x) for x in row) + ' |')
print('\nms from navigation start unless stated; medians of the pooled base runs; script time = main-thread self time under the 4x CPU slowdown over the whole run (about 10 s); "third-party before content" is what had already finished when the content appeared.')
