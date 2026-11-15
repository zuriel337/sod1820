# Build the unified URL list (one record per distinct decoded path+query) from every available source. Read-only on inputs.
import json, re, sys, csv, collections, unicodedata, urllib.parse
D = 'data/'
ORIGIN = 'https://sod1820.co.il'
CANON_HOSTS = {'sod1820.co.il'}

def split_url(u):
    """-> (host or None, scheme or None, path, query) with the raw (still encoded) path/query; None when not a site URL"""
    u = u.strip()
    host = scheme = None
    m = re.match(r'^(https?)://([^/?#]+)(.*)$', u, re.I)
    if m:
        scheme, host, rest = m.group(1).lower(), m.group(2).lower(), m.group(3)
    elif u.startswith('//'):
        return None
    elif u.startswith('/'):
        rest = u
    else:
        return None
    rest = rest.split('#', 1)[0]
    path, _, query = rest.partition('?')
    if not path: path = '/'
    return host, scheme, path, query

def dec(s):
    try: return unicodedata.normalize('NFC', urllib.parse.unquote(s))
    except Exception: return s

def key_of(path, query):
    return dec(path) + (('?' + dec(query)) if query else '')

TEMPLATE_RE = re.compile(r'(:[A-Za-z_]+|\*|\$1|\$\{|<[a-z]+>|\[|\]|\{|\})')
recs = {}
stats = collections.Counter()

def add(url, source, **extra):
    sp = split_url(url)
    if sp is None:
        stats['skipped_non_site:' + source] += 1
        return
    host, scheme, path, query = sp
    if host is not None and host not in CANON_HOSTS and host != 'www.sod1820.co.il':
        stats['skipped_other_host:' + source] += 1
        return
    k = key_of(path, query)
    r = recs.get(k)
    if r is None:
        r = recs[k] = {'key': k, 'raw': {}, 'hosts': set(), 'sources': set(), 'meta': {}}
    rawp = path + (('?' + query) if query else '')
    r['raw'].setdefault(rawp, set()).add(source)
    r['hosts'].add((scheme or '-') + '://' + (host or '-'))
    r['sources'].add(source)
    for kk, vv in extra.items():
        r['meta'].setdefault(source, {})[kk] = vv
    stats['added:' + source] += 1

# 1-2 sitemaps
for u in json.load(open(D + 'ucp-live-sitemap.json', encoding='utf-8'))['urls']: add(u, 'sitemap311')
for u in re.findall(r'<loc>([^<]+)</loc>', open(D + 'sitemap-now-2.xml', encoding='utf-8').read()): add(u.replace('&amp;', '&'), 'sitemap_now')
# 3 GSC
for l in open(D + 'gsc-pages.jsonl', encoding='utf-8'):
    x = json.loads(l); add(x['key'], 'gsc', clicks=x['c'], impressions=x['i'], c28=x['c28'] or 0, i28=x['i28'] or 0, last=x['d2'], pos=x['pos'])
# 4 inventory 3.11
for x in json.load(open(D + 'ucp-url-inventory.json', encoding='utf-8'))['rows']:
    if TEMPLATE_RE.search(x['url']): stats['template_inventory'] += 1; continue
    add(x['url'], 'inv311', family=x['family'], policy=x['currentPolicy'])
# 5 reconciliation 3.11
for x in json.load(open(D + 'exc-reconciliation.json', encoding='utf-8'))['rows']:
    if TEMPLATE_RE.search(x['sourceUrl']): stats['template_recon'] += 1; continue
    add(x['sourceUrl'], 'recon311', family=x['family'], status=x['status'], reason=x['reason'], final=x.get('finalUrl'))
# 6 unresolved 3.11
for x in json.load(open(D + 'ucp-unresolved-urls.json', encoding='utf-8'))['rows']:
    if TEMPLATE_RE.search(x['url']): stats['template_unresolved'] += 1; continue
    add(x['url'], 'unresolved311', policy=x['currentPolicy'])
# 7 recognized traffic 3.11
for x in json.load(open(D + 'ucp-db-recognized-traffic.json', encoding='utf-8'))['rows']:
    add(x['path'], 'traffic311', obs=x['observations'], last=x['last_at'][:10])
# 8-10 posts / redirect_map / seo_backup (source data)
posts = [json.loads(l) for l in open(D + 'db-posts.jsonl', encoding='utf-8')]
for p in posts:
    slug = p['slug']
    add('/' + slug, 'posts', post_id=p['id'], wp_id=p['wp_id'], title=p['title'], psource=p['source'], hidden=p['home_hidden'])
    if p['link']: add(p['link'], 'posts_link', post_id=p['id'])
    add('/post/' + slug, 'posts_postroute', post_id=p['id'])
maps = [json.loads(l) for l in open(D + 'db-maps.jsonl', encoding='utf-8')]
for m in maps:
    if m['src'] == 'redirect_map':
        add(m['extra'], 'redirect_map', wp_id=m['wp_id']); add('/?p=' + m['wp_id'], 'redirect_map_pid', wp_id=m['wp_id'])
    elif m['src'] == 'seo_backup':
        add('/' + m['slug'] + '/', 'seo_backup', wp_id=m['wp_id'])
# 11 audit 6.11 sample
with open(D + 'audit0611-crawl-sitemap-sample-772.csv', encoding='utf-8') as f:
    rd = csv.reader(f); hdr = next(rd)
    ui = next((i for i, h in enumerate(hdr) if 'url' in h.lower()), 0)
    for row in rd:
        if row and row[ui].startswith('http'): add(row[ui], 'audit611')

out = []
for k, r in recs.items():
    # representative raw form: prefer what Google requests (gsc), then sitemap_now, then the rest
    pref = ['gsc', 'sitemap_now', 'sitemap311', 'posts_link', 'recon311', 'inv311', 'traffic311']
    best = None
    for s in pref:
        for rawp, ss in r['raw'].items():
            if s in ss: best = rawp; break
        if best: break
    best = best or next(iter(r['raw']))
    g = r['meta'].get('gsc', {})
    out.append({'key': k, 'fetch': best, 'raw_variants': sorted(r['raw'].keys())[:6], 'n_raw': len(r['raw']),
                'hosts': sorted(r['hosts']), 'sources': sorted(r['sources']),
                'clicks': g.get('clicks', 0), 'impr': g.get('impressions', 0), 'c28': g.get('c28', 0), 'i28': g.get('i28', 0),
                'obs': r['meta'].get('traffic311', {}).get('obs', 0),
                'family': (r['meta'].get('inv311') or r['meta'].get('recon311') or {}).get('family'),
                'recon_status': r['meta'].get('recon311', {}).get('status'), 'recon_reason': r['meta'].get('recon311', {}).get('reason'),
                'post_id': (r['meta'].get('posts') or r['meta'].get('posts_link') or r['meta'].get('posts_postroute') or {}).get('post_id'),
                'wp_id': (r['meta'].get('posts') or r['meta'].get('redirect_map') or r['meta'].get('redirect_map_pid') or {}).get('wp_id'),
                'title': r['meta'].get('posts', {}).get('title')})
out.sort(key=lambda x: (-x['clicks'], -x['impr'], x['key']))
with open(D + 'unified.jsonl', 'w', encoding='utf-8') as f:
    for o in out: f.write(json.dumps(o, ensure_ascii=False) + '\n')
print('unified distinct URLs:', len(out))
src_counts = collections.Counter(s for o in out for s in o['sources'])
for s, c in src_counts.most_common(): print(f'  in {s:18s} {c}')
print('multi-source (>=2):', sum(1 for o in out if len(o['sources']) >= 2), ' single-source:', sum(1 for o in out if len(o['sources']) == 1))
print('with www/http host variants:', sum(1 for o in out if any(h not in ('https://sod1820.co.il', '-://-') for h in o['hosts'])))
print({k: v for k, v in stats.items() if k.startswith(('skipped', 'template'))})
