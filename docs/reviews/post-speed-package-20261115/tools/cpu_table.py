#!/usr/bin/env python3
"""Main-thread time by script group over a whole cold run (about 10 s, Slow 4G + 4x CPU slowdown), medians of the base runs (CDP profiler, self time, ms). usage: cpu_table.py <label,label...> <out.md>"""
import json, collections, statistics as st, re, sys, os
labels = sys.argv[1].split(','); out = sys.argv[2]
rows = collections.defaultdict(list)
for label in labels:
    for l in open(f'data/{label}.jsonl'):
        x = json.loads(l)
        if x.get('perf') and x.get('cpu'): rows[x['post']].append(x['cpu'])
GROUPS = [('idle', r'^\(\(idle\)\)$'), ('browser work (native, layout, GC, DOM calls)', r'^(\(\((program|garbage collector)\)\)|\([A-Za-z]+\))$'),
          ('entry bundle `2029-*.js`', r'/assets/2029-[^/]+\.js$'), ('Google tag', r'googletagmanager'), ('Meta Pixel', r'connect\.facebook\.net'), ('ad library', r'googlesyndication'),
          ('Supabase client', r'/assets/supabase-'), ('shell + timeline + other first-party chunks', r'/assets/(?!2029-|supabase-|Post2029Page|post2029ReadingProjection|AdSlot)'),
          ('reading page + projection (the "enrichment")', r'/assets/(Post2029Page|PublicPostAddress2029Page|post2029ReadingProjection|AdSlot)')]
def group(k):
    k = k.split('?')[0]
    for name, rx in GROUPS:
        if re.search(rx, k): return name
    return 'other'
posts = [p for p in ('O1', 'O3', 'N3', 'N5') if p in rows]
tot = {}
for p in posts:
    n = len(rows[p]); agg = collections.defaultdict(list)
    for cpu in rows[p]:
        g = collections.Counter()
        for k, v in cpu.items(): g[group(k)] += v
        for name in set(list(g) + [x[0] for x in GROUPS]): agg[name].append(g.get(name, 0))
    tot[p] = {k: st.median(v) for k, v in agg.items()}
lines = ['| main-thread time over the run (ms, 4x CPU slowdown, median of ' + str(len(rows[posts[0]])) + ' runs) | ' + ' | '.join(posts) + ' |', '|---|' + '---|' * len(posts)]
for name, _ in GROUPS + [('other', '')]:
    if all(tot[p].get(name, 0) == 0 for p in posts): continue
    lines.append(f'| {name} | ' + ' | '.join(f'{tot[p].get(name, 0):.0f}' for p in posts) + ' |')
open(out, 'w', encoding='utf8').write('\n'.join(lines) + '\n'); print('\n'.join(lines))
