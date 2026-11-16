# Article-first experiment: A (main ea7257598) vs B (article in the first document + adoption), per device and post.
# Text visible, LCP (and which element), CLS, bytes/requests before the text, and the cover separately (size, request start/end, LCP share).
import json, sys, statistics, collections
sys.path.insert(0, '.')
from analyze import phases
import math
exec(open('mw.py').read())

SP = '<scratchpad>'
covers = {str(r['id']): (r.get('image_url') or '').split('?')[0] for r in json.load(open(SP + '/afssr/rows.json'))}
cfg = json.load(open('data/cfg-af-A-mobile.json'))
post_id = {p['key']: str(p['id']) for p in cfg['posts']}

def rows(arm, dev):
    out = []
    for line in open(f'data/af-{arm}-{dev}.jsonl'):
        r = json.loads(line)
        ph = phases(r)
        cover = covers[post_id[r['post']]]
        reqs = r.get('requests') or []
        cq = sorted([q for q in reqs if q['u'].split('?')[0] == cover and q.get('s') is not None], key=lambda q: q['s'])
        lcp = (r.get('perf') or {}).get('lcp') or []
        last = lcp[-1] if lcp else None
        ph.update(post=r['post'], cover_req=cq[0]['s'] if cq else None, cover_end=cq[0]['e'] if cq else None,
                  cover_kb=round(cq[0]['b'] / 1024) if cq and cq[0].get('b') else None,
                  lcp_is_cover=1 if last and (last.get('url') or '').split('?')[0] == cover else 0,
                  lcp_el=(last or {}).get('el'), lcp_url=((last or {}).get('url') or '')[-28:])
        out.append(ph)
    return out

def med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs)) if xs else None

lines = []
for dev in ('mobile', 'desktop'):
    A, B = rows('A', dev), rows('B', dev)
    lines.append(f'\n### {dev}\n')
    lines.append('| post | n | text visible A → B (ms) | LCP A → B (ms) | CLS A / B (max) | KB before text A → B | requests before text A → B |')
    lines.append('|---|---|---|---|---|---|---|')
    for post in post_id:
        a = [r for r in A if r['post'] == post]; b = [r for r in B if r['post'] == post]
        def cell(m):
            xa = [r.get(m) for r in a if r.get(m) is not None]; xb = [r.get(m) for r in b if r.get(m) is not None]
            if not xa or not xb: return 'n/a'
            p = mann_whitney_p(xa, xb)
            return f'{med(xa)} → {med(xb)} (**{med(xb) - med(xa):+d}**, p {p:.3f})'
        cls = f"{max(r['cls'] for r in a):.3f} / {max(r['cls'] for r in b):.3f}"
        kb = f"{med([r.get('kb_before_content') for r in a])} → {med([r.get('kb_before_content') for r in b])}"
        rq = f"{med([r.get('req_before_content') for r in a])} → {med([r.get('req_before_content') for r in b])}"
        lines.append(f'| {post} | {len(a)}/{len(b)} | {cell("content")} | {cell("lcp")} | {cls} | {kb} | {rq} |')
    lines.append('\nCover image, measured separately:\n')
    lines.append('| post | cover KB | cover request starts A → B (ms) | cover finishes A → B (ms) | LCP is the cover A / B | LCP element B |')
    lines.append('|---|---|---|---|---|---|')
    for post in post_id:
        a = [r for r in A if r['post'] == post]; b = [r for r in B if r['post'] == post]
        els = collections.Counter(r['lcp_el'] + ' ' + r['lcp_url'] for r in b).most_common(1)
        lines.append(f"| {post} | {med([r['cover_kb'] for r in a + b])} | {med([r['cover_req'] for r in a])} → {med([r['cover_req'] for r in b])} | {med([r['cover_end'] for r in a])} → {med([r['cover_end'] for r in b])} | {sum(r['lcp_is_cover'] for r in a)}/{len(a)} / {sum(r['lcp_is_cover'] for r in b)}/{len(b)} | {els[0][0] if els else ''} |")
open('af-results.md', 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
