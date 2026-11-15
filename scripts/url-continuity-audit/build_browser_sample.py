import json, random, urllib.parse as up, html, collections, sys
D = 'data/'
random.seed(1820)
uni = {}
for l in open(D + 'unified.jsonl'):
    r = json.loads(l); uni[r['key']] = r
crawl = {}
for l in open(D + 'crawl-full.jsonl'):
    r = json.loads(l); crawl[r['key']] = r
posts = [json.loads(l) for l in open(D + 'db-posts.jsonl')]
SUPPRESSED = {'טיוטה', 'פורום'}
def public_wp(p):
    tags = set(p.get('tags') or [])
    wp = p.get('wp_id') or 0
    return (p.get('source') == 'wordpress' or (0 < int(wp) <= 36935)) and not (tags & SUPPRESSED)
sample = []
seen = set()
def add(group, path, **kw):
    if path in seen: return
    seen.add(path); sample.append({'group': group, 'path': path, **kw})
# A. top GSC by clicks that answered 200
top = sorted((r for r in uni.values() if 'gsc' in r['sources'] and r['key'] in crawl and crawl[r['key']]['final_status'] == 200), key=lambda r: -(r['clicks'] or 0))[:120]
for r in top: add('gsc_top', r['fetch'], key=r['key'], clicks=r['clicks'])
# B. WP posts (public) with title expectations
wp = [p for p in posts if public_wp(p)]
random.shuffle(wp)
for p in wp[:90]:
    slug = up.unquote(p['slug'])
    add('wp_post', '/' + up.quote(slug, safe=''), key='/' + slug, expect_title=html.unescape(p.get('title') or ''), post_id=p['id'], wp_id=p.get('wp_id'))
# C. redirects (final 200) stratified by first-hop kind
red = [r for r in crawl.values() if r['final_status'] == 200 and r['n_hops'] >= 1]
buckets = collections.defaultdict(list)
for r in red:
    k = r['key']
    kind = ('slash' if k.endswith('/') else 'p_id' if k.startswith('/?p=') else 'cat' if k.startswith('/category/') else 'tag' if k.startswith('/tag/') else 'attach' if 'sourceAttachment' in (r['final_url'] or '') else 'other')
    buckets[kind].append(r)
for kind, rows in buckets.items():
    random.shuffle(rows)
    for r in rows[:14]: add('redirect_' + kind, uni[r['key']]['fetch'], key=r['key'])
json.dump(sample, open(D + 'browser-sample.json', 'w'), ensure_ascii=False)
print(collections.Counter(s['group'] for s in sample), len(sample))
