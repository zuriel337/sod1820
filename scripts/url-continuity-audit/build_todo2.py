import json, random, re, urllib.parse as up, collections
D = 'data/'
random.seed(2029)
uni = [json.loads(l) for l in open(D + 'unified.jsonl')]
ok = set(); bad = set()
for l in open(D + 'crawl-full.jsonl'):
    r = json.loads(l)
    (bad if any(h['status'] == 403 for h in r['hops']) else ok).add(r['key'])
def shape(k):
    p = up.unquote(up.urlsplit(k).path)
    if p.startswith('/number/'): return 'number'
    if re.match(r'^/forum/[0-9a-f-]{36}$', p): return 'forum-uuid'
    return 'other'
rest = [u for u in uni if u['key'] not in ok]
def prio(u):
    s = set(u['sources'])
    if u['key'] in bad or 'gsc' in s or s & {'posts', 'redirect_map', 'recon311', 'audit611', 'unresolved311', 'seo_backup', 'posts_link'}: return 1
    if 'sitemap_now' in s: return 2
    return 3
census = [u for u in rest if shape(u['key']) == 'other']
census.sort(key=lambda u: (prio(u), -(u['clicks'] or 0)))
nums = [u for u in rest if shape(u['key']) == 'number']; random.shuffle(nums)
forums = [u for u in rest if shape(u['key']) == 'forum-uuid']; random.shuffle(forums)
sample_n, sample_f = nums[:600], forums[:400]
todo = census + sample_n + sample_f
with open(D + 'todo-pass2.jsonl', 'w', encoding='utf8') as fh:
    for u in todo: fh.write(json.dumps({'key': u['key'], 'fetch': u['fetch'], 'cls': 'census' if shape(u['key']) == 'other' else 'sample:' + shape(u['key'])}, ensure_ascii=False) + '\n')
print('census', len(census), 'sample numbers', len(sample_n), 'of', len(nums), '| sample forum-uuid', len(sample_f), 'of', len(forums), '| total todo', len(todo))
print('priority mix', collections.Counter(prio(u) for u in census))
json.dump({'numbers_pool': len(nums), 'numbers_sample': len(sample_n), 'forum_pool': len(forums), 'forum_sample': len(sample_f)}, open(D + 'todo-pass2.meta.json', 'w'))
