#!/usr/bin/env python3
# Classify every crawled URL. Evidence-only rules; nothing is inferred when content identity is unknown.
import json, sys, csv, re, urllib.parse as up, collections, html
D = 'data/'
crawl_file = sys.argv[1] if len(sys.argv) > 1 else D + 'crawl-full.jsonl'
out_prefix = sys.argv[2] if len(sys.argv) > 2 else D + 'class'
SITE = 'https://sod1820.co.il'
TEMP_CLOSED = ['/research', '/heichal', '/היכל', '/name', '/name-lab', '/spatial-gematria', '/verse-gematria', '/languages', '/cross', '/archive', '/reality', '/timeline', '/numbers', '/broadcasts']
SUPPRESSED = {'טיוטה', 'פורום'}
# closed families that the edge/handler answers with a documented plain 404 (public-reading-deploy/api/public-document.js)
DOC_CLOSED_PREFIX = ['/audio/', '/data/user/', '/wp-content/plugins/gallery-images/style/', '/wp-json/wp/v2/posts']
uni = {}
for l in open(D + 'unified.jsonl'):
    r = json.loads(l); uni[r['key']] = r
posts_by_slug = {}
posts_by_wp = {}
for l in open(D + 'db-posts.jsonl'):
    p = json.loads(l)
    posts_by_slug[up.unquote(str(p.get('slug') or ''))] = p
    if p.get('wp_id'): posts_by_wp[int(p['wp_id'])] = p
rm_by_wp = {}
for l in open(D + 'db-maps.jsonl'):
    m = json.loads(l)
    if m.get('wp_id') is not None: rm_by_wp[int(m['wp_id'])] = m
def shape(k):
    p = up.unquote(up.urlsplit(k).path)
    if p.startswith('/number/'): return 'number'
    if re.match(r'^/forum/[0-9a-f-]{36}$', p): return 'forum-uuid'
    if p.startswith('/wp-content/uploads') or p.startswith('/wp-content'): return 'wp-content-file'
    if p.startswith('/audio/'): return 'audio-file'
    if p.startswith('/tag/'): return 'tag'
    if p.startswith('/category/'): return 'category'
    if p.startswith('/author/'): return 'author'
    if p.startswith('/topic/'): return 'topic'
    if p.startswith('/post/'): return 'post-route'
    if p.startswith('/community/researcher/'): return 'researcher'
    if k.startswith('/?p='): return 'wp-shortlink'
    if p.startswith('/page/') or '/page/' in p: return 'wp-pagination'
    if p.endswith('/feed') or p.endswith('/feed/'): return 'wp-feed'
    if p.count('/') == 1 and p != '/': return 'root-slug'
    return 'other'
def under(path, prefixes):
    d = up.unquote(path)
    return any(d == p or d.startswith(p if p.endswith('/') else p + '/') or d.startswith(p + '?') for p in prefixes)
def is_temp_closed(key):
    p = up.unquote(up.urlsplit(key).path).rstrip('/')
    return any(p == t or p.startswith(t + '/') for t in TEMP_CLOSED)
def canon_rel(can, final):
    """returns (path_rel, query_rel): path_rel in none/self/encoding_only/slash/host/other_page; query_rel in same/dropped/different"""
    if not can: return ('none', None)
    if can == final: return ('self', 'same')
    a, b = up.urlsplit(can), up.urlsplit(final)
    if (a.scheme, a.netloc) != (b.scheme, b.netloc): return ('host', None)
    pa, pb = up.unquote(a.path), up.unquote(b.path)
    qrel = 'same' if a.query == b.query else ('dropped' if not a.query else 'different')
    if pa in ('', '/') and pb in ('', '/'):
        return ('self', qrel)  # https://host and https://host/ are the same address
    if pa == pb:
        raw_same = a.path == b.path
        return ('self' if raw_same else 'encoding_only', qrel)
    if pa.rstrip('/') == pb.rstrip('/') or (pa == '' and pb == '/') or (pa == '/' and pb == ''):
        return ('slash', qrel)
    return ('other_page', qrel)
rows = [json.loads(l) for l in open(crawl_file)]
ok_paths = {up.unquote(up.urlsplit(r['final_url'] or '').path) for r in rows if r.get('final_status') == 200 and not r.get('error')}
out = []
for r in rows:
    k = r['key']; u = uni.get(k, {})
    hops = r['hops']; fs = r['final_status']; nh = r['n_hops']
    last = hops[-1] if hops else {}
    doc = last.get('doc') or {}
    final_url = r.get('final_url') or ''
    fpath = up.unquote(up.urlsplit(final_url).path)
    srcs = set(u.get('sources', []))
    in_sitemap = 'sitemap_now' in srcs
    can = doc.get('canonical'); prel, qrel = canon_rel(can, final_url) if fs == 200 else (None, None); rel = prel
    robots = (doc.get('robots') or '') + ' ' + (last.get('xrt') or '')
    noindex = 'noindex' in robots.lower()
    flags = []
    cls = reason = None
    # identity evidence
    slug_key = up.unquote(up.urlsplit(k).path).strip('/')
    prow = posts_by_slug.get(slug_key) if '/' not in slug_key else None
    wp_q = None
    m = re.match(r'^/\?p=(\d+)$', k)
    if m: wp_q = int(m.group(1))
    identity = None
    if prow: identity = 'db_post'
    elif wp_q and (wp_q in rm_by_wp or wp_q in posts_by_wp): identity = 'wp_id_map'
    elif u.get('recon_status') == 'resolved': identity = 'recon311_resolved'
    if any(h.get('status') == 403 or h.get('mitigated') for h in hops):
        cls, reason = 'UNCHECKED', 'platform_mitigation_403_recheck'
    elif r.get('error') and not hops:
        cls, reason = 'UNCHECKED', 'network_error:' + str(r['error'])[:40]
    elif fs == 200 and u.get('recon_status') == 'intentionally_closed' and noindex:
        # documented as intentionally closed (3.11): the address answers a 200 closed-notice page with noindex (publicReadingPath state closed/account)
        cls, reason = 'INTENTIONAL', 'recon311:' + str(u.get('recon_reason')) + ':closed_notice_200_noindex'
    elif fs == 200:
        if nh > 10: cls, reason = 'BROKEN', 'redirect_chain_too_long'
        elif doc.get('title') and re.search(r'לא נמצא', doc.get('title') or '') and not nh:
            cls, reason = 'BROKEN', 'soft_404_title'
        else:
            cls = 'OK' if nh == 0 else 'OK_REDIRECT'; reason = f'{nh}_hop' if nh else 'direct'
            if nh >= 2: flags.append('chain_ge2')
            if prel in ('slash', 'encoding_only', 'host', 'other_page'): flags.append('canonical_' + prel)
            if prel == 'none' and 'text/html' in (last.get('ct') or ''): flags.append('canonical_missing')
            if qrel == 'dropped': flags.append('canonical_query_dropped')
            elif qrel == 'different': flags.append('canonical_query_different')
            if in_sitemap and prel in ('slash', 'other_page', 'host'): flags.append('sitemap_url_not_canonical')
            if doc.get('n_canonical', 1) not in (1, None) and doc.get('n_canonical', 0) > 1: flags.append('canonical_multiple')
            if noindex and in_sitemap: flags.append('sitemap_noindex_conflict')
            if u.get('recon_status') == 'intentionally_closed' and not noindex: flags.append('documented_closed_but_indexable')
            if in_sitemap and nh: flags.append('sitemap_url_redirects')
            if identity in ('db_post', 'wp_id_map') and wp_q and fpath in ('/', ''): flags.append('p_shortlink_server_metadata_is_home')  # documented design: the SPA resolves the WordPress id as a document identity (PublicPostAddress2029Page)
    elif fs == 503:
        if is_temp_closed(k) or is_temp_closed(final_url): cls, reason = 'TEMP_CLOSED', 'documented_temporarily_closed_503' + ('' if is_temp_closed(k) else '_via_alias')
        else: cls, reason = 'BROKEN', 'unexpected_503'
    elif fs in (404, 410):
        st = u.get('recon_status'); rr = u.get('recon_reason')
        if st == 'intentionally_closed': cls, reason = 'INTENTIONAL', 'recon311:' + str(rr)
        elif st == 'invalid': cls, reason = 'INTENTIONAL', 'recon311_invalid:' + str(rr)
        elif st == 'deferred_post_launch': cls, reason = 'UNDECIDABLE', 'documented_deferred:' + str(rr)
        elif under(k, DOC_CLOSED_PREFIX): cls, reason = 'INTENTIONAL', 'documented_closed_prefix'
        elif re.match(r'^/community/researcher/r-[0-9a-f]{16,}$', up.unquote(up.urlsplit(k).path)): cls, reason = 'INTENTIONAL', 'automatic_profile_not_a_researcher_page'  # api/sitemap.js: r-<hash> profiles are not researcher pages
        elif (lambda m: m and int(m.group(1)) > 1 and up.unquote(up.urlsplit(final_url).path) in ok_paths)(re.search(r'[?&]page=(\d+)', final_url)): cls, reason = 'INTENTIONAL', 'pagination_beyond_last_page_of_existing_collection'  # api/og.js: page>1 without rows -> 404
        elif prow and (set(prow.get('tags') or []) & SUPPRESSED): cls, reason = 'INTENTIONAL', 'public_post_boundary_suppressed_tag'
        elif in_sitemap: cls, reason = 'BROKEN', 'sitemap_url_is_404'
        elif prow: cls, reason = 'BROKEN', 'db_post_without_suppression_but_404'
        elif wp_q and (wp_q in rm_by_wp or wp_q in posts_by_wp): cls, reason = 'BROKEN', 'wp_id_known_404'
        elif identity == 'recon311_resolved': cls, reason = 'BROKEN', 'recon_resolved_but_404'
        else: cls, reason = 'UNDECIDABLE', 'no_identity_evidence'
    elif fs in (301, 302, 307, 308):
        cls, reason = 'BROKEN', 'redirect_loop_or_unfinished'
    else:
        cls, reason = 'BROKEN', 'http_%s' % fs
    rpath = up.unquote(up.urlsplit(k).path)
    robots_txt = 'disallowed' if (rpath.startswith('/api/') or rpath.startswith('/unsubscribe')) else 'allowed'  # public-reading-deploy/api/public-robots.js
    out.append({'key': k, 'class': cls, 'reason': reason, 'robots_txt': robots_txt, 'flags': ';'.join(flags), 'final_status': fs, 'n_hops': nh,
                'final_url': final_url, 'canonical': can, 'canon_rel': rel, 'canon_query_rel': qrel, 'noindex': noindex, 'in_sitemap_now': in_sitemap,
                'clicks': u.get('clicks'), 'impr': u.get('impr'), 'sources': ','.join(sorted(srcs)), 'family': u.get('family'), 'shape': shape(k), 'identity': identity,
                'title': (doc.get('title') or '')[:80]})
json.dump(out, open(out_prefix + '.json', 'w'), ensure_ascii=False)
with open(out_prefix + '.csv', 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
C = collections.Counter((o['class'], o['reason']) for o in out)
print('checked', len(out))
for (c, rsn), n in sorted(C.items(), key=lambda kv: (kv[0][0], -kv[1])): print(f'  {c:12} {rsn:48} {n}')
F = collections.Counter(f for o in out for f in o['flags'].split(';') if f)
print('flags', dict(F))
print('by class', dict(collections.Counter(o['class'] for o in out)))
