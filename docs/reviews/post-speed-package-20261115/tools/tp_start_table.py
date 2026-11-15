#!/usr/bin/env python3
"""When do the Google tag / Meta Pixel start, relative to the moment the text is visible? (first request start minus content-visible time, ms; median [min..max], n)
usage: tp_start_table.py <out.md> <arm label>=<stage,stage...> [...]"""
import json, sys, statistics as st, collections
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import analyze
out = sys.argv[1]; arms = [a.split('=', 1) for a in sys.argv[2:]]
POSTS = ['O1', 'O3', 'N3', 'N5']
lines = ['| first Google tag / Pixel request, ms after the text is visible (negative = before it) | ' + ' | '.join(POSTS) + ' |', '|---|' + '---|' * len(POSTS)]
for name, labels in arms:
    rows = collections.defaultdict(list)
    for label in labels.split(','):
        for l in open(f'data/{label}.jsonl', encoding='utf8'):
            r = json.loads(l)
            if r.get('error') or not r.get('perf'): continue
            c = analyze.phases(r).get('content')
            starts = [q['s'] for q in r['requests'] if q.get('s') is not None and ('googletagmanager.com/gtag' in q['u'] or 'connect.facebook.net' in q['u'])]
            if c is not None and starts: rows[r['post']].append(min(starts) - c)
    cells = [f"{st.median(rows[p]):+.0f} [{min(rows[p]):+.0f}..{max(rows[p]):+.0f}] n={len(rows[p])}" if rows[p] else '-' for p in POSTS]
    lines.append(f'| {name} | ' + ' | '.join(cells) + ' |')
open(out, 'w', encoding='utf8').write('\n'.join(lines) + '\n'); print('\n'.join(lines))
