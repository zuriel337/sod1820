#!/usr/bin/env python3
# Important links: every internal href found on the navigation pages (rendered DOM), not already measured, to be checked over HTTP.
import json, sys, urllib.parse as up
D = 'data/'
def valid(r): return not any(h.get('status') == 403 or h.get('mitigated') for h in r['hops']) and r.get('error') != 'mitigated'
measured = {}
for f in ('crawl-full.jsonl', 'crawl-pass2.jsonl', 'crawl-pass2b.jsonl', 'crawl-pass3.jsonl', 'crawl-pass4.jsonl'):
    try:
        for l in open(D + f):
            r = json.loads(l)
            if valid(r): measured[up.unquote(r['key'])] = r
    except FileNotFoundError: pass
links = {}
for fn in ('browser-3.jsonl', 'browser-2.jsonl', 'browser-1.jsonl'):
    try:
        for l in open(D + fn):
            r = json.loads(l)
            if r.get('group') != 'nav' or r.get('error') or r.get('httpStatus') != 200: continue
            for h in (r.get('links') or []):
                if h.startswith('/') and not h.startswith('//') and not h.startswith('/api/'): links.setdefault(h, set()).add(r['path'])
    except FileNotFoundError: pass
todo = []
for h, pages in sorted(links.items()):
    k = up.unquote(h)
    if k in measured: continue
    todo.append({'key': 'NAV:' + h, 'fetch': h, 'from': sorted(pages)})
with open(D + 'todo-nav.jsonl', 'w', encoding='utf8') as fh:
    for o in todo[:300]: fh.write(json.dumps(o, ensure_ascii=False) + '\n')
json.dump({'unique_internal_links': len(links), 'already_measured': len(links) - len(todo), 'to_check': min(len(todo), 300), 'over_cap': max(0, len(todo) - 300)}, open(D + 'todo-nav.meta.json', 'w'))
print({'unique_internal_links': len(links), 'already_measured': len(links) - len(todo), 'to_check': min(len(todo), 300)})
