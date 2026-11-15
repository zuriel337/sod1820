#!/usr/bin/env python3
"""Aggregate lab records (jsonl) into per-(post, device, scenario) medians with the critical-path decomposition.
usage: analyze.py [--md out.md] [--json out.json] file1.jsonl [file2.jsonl ...]"""
import json, sys, re, statistics as st, collections

def med(xs):
    xs = [x for x in xs if x is not None]
    return round(st.median(xs)) if xs else None
def rng(xs):
    xs = [x for x in xs if x is not None]
    return (round(min(xs)), round(max(xs))) if xs else None

HASHED = re.compile(r'/assets/')
def phases(r):
    """Per-run decomposition (ms from navigation start, or from the SPA navigation instant for nav)."""
    p = r.get('perf') or {}
    c = (p.get('content') or {}).get('t')
    nav0 = p.get('nav') or 0
    reqs = r.get('requests') or []
    # in a 'nav' run the requests list was cleared right before the navigation; times are relative to the document request of the FIRST load
    # which is no longer in the list, so use the absolute page clock instead (performance.now): approximate with request start offsets.
    out = {}
    if r['scenario'] == 'nav':
        base = min((q['s'] for q in reqs if q.get('s') is not None), default=0)
        out['content'] = (c - nav0) if c is not None else None
        out['nav_t0'] = nav0
    else:
        out['content'] = c
    nav = r.get('nav') or {}
    out['ttfb'] = nav.get('rs') if r['scenario'] != 'nav' else None
    out['doc_end'] = nav.get('re') if r['scenario'] != 'nav' else None
    paints = {x['n']: x['t'] for x in (p.get('paints') or [])}
    out['fcp'] = paints.get('first-contentful-paint') if r['scenario'] != 'nav' else None
    lcp = (p.get('lcp') or [])
    last = lcp[-1] if lcp else None
    out['lcp'] = (last['t'] - (nav0 if r['scenario'] == 'nav' else 0)) if last else None
    out['lcp_el'] = (last or {}).get('el')
    out['lcp_url'] = ((last or {}).get('url') or '')[-70:]
    long = p.get('long') or []
    out['tbt'] = round(sum(max(0, t['d'] - 50) for t in long if (c is None or t['t'] <= (c + 3500))))
    out['long_n'] = len(long)
    out['cls'] = round(sum(s['v'] for s in (p.get('shifts') or [])), 4)
    def first(pred):
        for q in sorted(reqs, key=lambda q: (q.get('s') if q.get('s') is not None else 1e9)):
            if pred(q): return q
    ent = first(lambda q: q['ty'] == 'Script' and re.search(r'/assets/2029-[\w-]+\.js$', q['u']))
    route = first(lambda q: q['ty'] == 'Script' and re.search(r'/assets/(Post2029Page|PublicPostAddress2029Page)-', q['u']))
    post = first(lambda q: q['ty'] in ('Fetch', 'XHR') and '/rest/v1/posts?' in q['u'] and 'content' in q['u'])
    t0n = (nav0 if r['scenario'] == 'nav' else 0)
    sub = lambda v: (v - t0n) if (v is not None and r['scenario'] != 'nav') or (v is not None) else None
    out['entry_end'] = ent['e'] if ent and r['scenario'] != 'nav' else None
    out['route_req'] = route['s'] if route else None
    out['route_end'] = route['e'] if route else None
    out['post_req'] = post['s'] if post else None
    out['post_end'] = post['e'] if post else None
    if c is not None:
        js = [q for q in reqs if q['ty'] == 'Script' and q.get('e') is not None and q['e'] <= c + (t0n if r['scenario'] == 'nav' else 0) and 'googletagmanager' not in q['u'] and 'facebook' not in q['u'] and 'googlesyndication' not in q['u']]
        out['graph_end'] = max((q['e'] for q in js), default=None)
        cut = c + (t0n if r['scenario'] == 'nav' else 0)
        cats = collections.Counter(); n = collections.Counter()
        for q in reqs:
            if q.get('e') is None or q['e'] > cut or not q.get('b'): continue
            k = {'Document': 'doc', 'Script': 'js', 'Stylesheet': 'css', 'Font': 'font', 'Image': 'img', 'Fetch': 'api', 'XHR': 'api'}.get(q['ty'], 'other')
            if 'googletagmanager' in q['u'] or 'facebook' in q['u'] or 'googlesyndication' in q['u']: k = '3p'
            cats[k] += q['b']; n[k] += 1
        out['bytes_before_content'] = {k: round(v / 1024, 1) for k, v in cats.items()}
        out['kb_before_content'] = round(sum(cats.values()) / 1024)
        out['req_before_content'] = sum(n.values())
    # first third-party script request time
    tp = first(lambda q: q['ty'] == 'Script' and re.search(r'googletagmanager|fbevents|adsbygoogle', q['u']))
    out['tp_first_req'] = tp['s'] if tp else None
    # images: LCP image request/finish vs content time
    if last and last.get('url'):
        iq = first(lambda q: q['ty'] == 'Image' and q['u'].startswith(last['url'][:60]))
        out['lcp_img_req'] = iq['s'] if iq else None
        out['lcp_img_end'] = iq['e'] if iq else None
    out['n_requests'] = len(reqs)
    out['kb_total'] = round(sum(q.get('b') or 0 for q in reqs) / 1024)
    return out

def main():
    args = sys.argv[1:]; md = js = None
    while args and args[0] in ('--md', '--json'):
        if args[0] == '--md': md = args[1]
        else: js = args[1]
        args = args[2:]
    recs = []
    for f in args:
        for l in open(f, encoding='utf8'):
            r = json.loads(l)
            if r.get('error') or not r.get('perf'): continue
            r['_file'] = f; recs.append(r)
    groups = collections.defaultdict(list)
    for r in recs: groups[(r.get('label'), r['device'], r['scenario'], r['post'])].append(r)
    table = []
    for k, rs in sorted(groups.items()):
        ph = [phases(r) for r in rs]
        row = {'label': k[0], 'device': k[1], 'scenario': k[2], 'post': k[3], 'n': len(rs), 'seen': sum(1 for r in rs if r.get('contentSeen'))}
        for m in ('ttfb', 'fcp', 'content', 'lcp', 'tbt', 'entry_end', 'route_req', 'route_end', 'post_req', 'post_end', 'graph_end', 'kb_before_content', 'kb_total', 'lcp_img_req', 'lcp_img_end', 'tp_first_req', 'cls'):
            xs = [p.get(m) for p in ph]
            row[m] = med(xs) if m != 'cls' else (round(st.median([x for x in xs if x is not None]), 4) if any(x is not None for x in xs) else None)
            row[m + '_rng'] = rng(xs) if m != 'cls' else None
        els = collections.Counter(p.get('lcp_el') for p in ph); row['lcp_el'] = els.most_common(1)[0][0] if els else None
        table.append(row)
    hdr = f"{'label':18} {'dev':7} {'scen':5} {'post':4} {'n':>2} {'ttfb':>6} {'fcp':>6} {'content':>8} {'range':>13} {'lcp':>6} {'tbt':>5} {'KBpre':>6} {'entry':>6} {'route':>6} {'data':>6} {'graph':>6} {'imgReq':>6} {'3p':>6}  lcp element"
    lines = [hdr]
    for r in table:
        f = lambda x: '-' if x is None else str(x)
        lines.append(f"{r['label'][:18]:18} {r['device']:7} {r['scenario']:5} {r['post']:4} {r['n']:>2} {f(r['ttfb']):>6} {f(r['fcp']):>6} {f(r['content']):>8} {str(r['content_rng'] or ''):>13} {f(r['lcp']):>6} {f(r['tbt']):>5} {f(r['kb_before_content']):>6} {f(r['entry_end']):>6} {f(r['route_end']):>6} {f(r['post_end']):>6} {f(r['graph_end']):>6} {f(r['lcp_img_req']):>6} {f(r['tp_first_req']):>6}  {r['lcp_el'] or ''}")
    out = '\n'.join(lines)
    print(out)
    if md: open(md, 'w', encoding='utf8').write('```\n' + out + '\n```\n')
    if js: json.dump(table, open(js, 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
