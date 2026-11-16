# Article first, implementation series: A = combined base (#1358 + #1370, 978662134), B = the implementation (real server function + adoption +
# tools on request). Three separate questions: when the TEXT is visible, when the IMAGES are complete, when the TOOLS are ready.
import json, sys, statistics, collections, re, math
sys.path.insert(0, '.')
from analyze import phases
exec(open('mw.py').read())

SP = '<scratchpad>'
rows = {str(r['id']): r for r in json.load(open(SP + '/afssr/rows.json'))}
cfg = json.load(open('data/cfg-impl-A-mobile.json'))
post_id = {p['key']: str(p['id']) for p in cfg['posts']}
def article_images(pid):
    r = rows[pid]; urls = set(re.findall(r'src="([^"]+)"', r.get('content') or ''))
    if r.get('image_url'): urls.add(r['image_url'])
    return {u.split('?')[0] for u in urls if 'supabase.co/storage' in u}

def load(arm, dev):
    out = []
    for line in open(f'data/impl-{arm}-{dev}.jsonl'):
        r = json.loads(line); ph = phases(r); pid = post_id[r['post']]
        reqs = r.get('requests') or []
        cover = (rows[pid].get('image_url') or '').split('?')[0]
        imgs = [q for q in reqs if q.get('ty') == 'Image' and q['u'].split('?')[0] in article_images(pid) and q.get('e') is not None]
        cq = sorted([q for q in imgs if q['u'].split('?')[0] == cover], key=lambda q: q['s'])
        af = r.get('af') or {}
        tools = af.get('at') if arm == 'B' else ph.get('content')
        scripts_before_tools = sum((q.get('b') or 0) for q in reqs if q.get('ty') == 'Script' and '/assets/' in q['u'] and q.get('e') is not None and tools is not None and q['e'] <= tools) / 1024
        last = (((r.get('perf') or {}).get('lcp') or [None])[-1]) or {}
        ph.update(post=r['post'], cover_req=cq[0]['s'] if cq else None, cover_end=cq[0]['e'] if cq else None, cover_kb=round(cq[0]['b'] / 1024) if cq and cq[0].get('b') else None,
                  images_end=max((q['e'] for q in imgs), default=None), images_n=len({q['u'] for q in imgs}), tools=tools, js_kb_before_tools=round(scripts_before_tools),
                  adoption=af.get('result'), place=af.get('place'), lcp_el=last.get('el'))
        out.append(ph)
    return out

def med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs)) if xs else None
def cell(a, b, m):
    xa = [r.get(m) for r in a if r.get(m) is not None]; xb = [r.get(m) for r in b if r.get(m) is not None]
    if not xa or not xb: return 'n/a'
    return f'{med(xa):,} → {med(xb):,} (**{med(xb) - med(xa):+,}**, p {mann_whitney_p(xa, xb):.3f})'

lines = []
for dev in ('mobile', 'desktop'):
    A, B = load('A', dev), load('B', dev)
    lines += [f'\n### {dev}\n', '**1. Text** (the post\'s own title and opening text visible)\n',
              '| post | n | text visible A → B (ms) | KB before the text A → B | requests before the text A → B | CLS max A / B |', '|---|---|---|---|---|---|']
    for post in post_id:
        a = [r for r in A if r['post'] == post]; b = [r for r in B if r['post'] == post]
        lines.append(f"| {post} | {len(a)}/{len(b)} | {cell(a, b, 'content')} | {med([r.get('kb_before_content') for r in a])} → {med([r.get('kb_before_content') for r in b])} | {med([r.get('req_before_content') for r in a])} → {med([r.get('req_before_content') for r in b])} | {max(r['cls'] for r in a):.3f} / {max(r['cls'] for r in b):.3f} |")
    lines += ['\n**2. Images** (measured separately; earlier text is not an image result)\n',
              '| post | cover KB | cover starts A → B | cover finishes A → B | all requested article images finished A → B | LCP A → B | LCP element B |', '|---|---|---|---|---|---|---|']
    for post in post_id:
        a = [r for r in A if r['post'] == post]; b = [r for r in B if r['post'] == post]
        el = collections.Counter(r['lcp_el'] for r in b).most_common(1)
        lines.append(f"| {post} | {med([r['cover_kb'] for r in a + b])} | {med([r['cover_req'] for r in a]):,} → {med([r['cover_req'] for r in b]):,} | {cell(a, b, 'cover_end')} | {cell(a, b, 'images_end')} | {cell(a, b, 'lcp')} | {el[0][0] if el else ''} |")
    lines += ['\n**3. Tools** (A: the page renders with its tools; B: the page code has run and adopted the article, the tools load when used)\n',
              '| post | tools ready A → B (ms) | page JS downloaded before tools ready A → B (KB) | adoption B |', '|---|---|---|---|']
    for post in post_id:
        a = [r for r in A if r['post'] == post]; b = [r for r in B if r['post'] == post]
        ad = collections.Counter(f"{r['adoption']}/{r['place']}" for r in b).most_common(2)
        lines.append(f"| {post} | {cell(a, b, 'tools')} | {med([r['js_kb_before_tools'] for r in a])} → {med([r['js_kb_before_tools'] for r in b])} | {', '.join(f'{k} ×{v}' for k, v in ad)} |")
open('impl-results.md', 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
