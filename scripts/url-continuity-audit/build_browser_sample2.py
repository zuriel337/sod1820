import json, random, urllib.parse as up
D = 'data/'
random.seed(358)
uni = {}
for l in open(D + 'unified.jsonl'):
    r = json.loads(l); uni[r['key']] = r
crawl = {}
for l in open(D + 'crawl-full.jsonl'):
    r = json.loads(l); crawl[r['key']] = r
sample = []; seen = set()
def add(group, path, **kw):
    if path in seen: return
    seen.add(path); sample.append({'group': group, 'path': path, **kw})
# shortlinks: all GSC ones + random others from the DB map
gsc_p = [k for k, r in uni.items() if k.startswith('/?p=') and 'gsc' in r['sources']]
for k in gsc_p: add('p_shortlink', k, key=k, gsc=True)
others = [k for k, r in uni.items() if k.startswith('/?p=') and 'gsc' not in r['sources']]
random.shuffle(others)
for k in others[:14]: add('p_shortlink', k, key=k, gsc=False)
# main navigation entry points (collect links)
for p in ['/', '/post', '/world', '/code', '/gematria', '/number/358', '/community/chat', '/books', '/topic', '/contact']:
    add('nav', p, key=p, keepLinks=True)
# GSC traffic but absent from the current sitemap and answering 200
dropped = [r for r in uni.values() if 'gsc' in r['sources'] and 'sitemap_now' not in r['sources'] and r['key'] in crawl and crawl[r['key']]['final_status'] == 200 and (r['clicks'] or 0) > 0]
dropped.sort(key=lambda r: -(r['clicks'] or 0))
for r in dropped[:25]: add('dropped_from_sitemap', r['fetch'], key=r['key'])
# unresolved-by-3.11 sample that now redirects or answers
_u = [r for r in uni.values() if r['family'] == 'UNRESOLVED' and r['key'] in crawl and crawl[r['key']]['final_status'] == 200]
for r in random.sample(_u, min(15, len(_u))): add('unresolved311_now_200', r['fetch'], key=r['key'])
json.dump(sample, open(D + 'browser-sample-2.json', 'w'), ensure_ascii=False)
import collections; print(collections.Counter(s['group'] for s in sample), len(sample))
