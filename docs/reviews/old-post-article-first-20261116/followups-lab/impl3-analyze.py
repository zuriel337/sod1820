# Follow-up series: A = combined base (978662134), B = PR #1371 head with the follow-ups. Separately: TEXT, IMAGES, TOOLS (incl. click-to-usable).
import json, sys, statistics, collections, re
sys.path.insert(0, '.')
from analyze import phases
exec(open('mw.py').read())
SP = '/tmp/claude-0/-home-user-sod1820/c9b833e8-a63a-5dad-96a0-96133df72f23/scratchpad'
rows = {str(r['id']): r for r in json.load(open(SP + '/afssr/rows.json'))}
cfg = json.load(open('data/cfg-impl3-A-mobile.json'))
post_id = {p['key']: str(p['id']) for p in cfg['posts']}
norm = lambda u: u.split('?')[0].replace('/storage/v1/render/image/public/', '/storage/v1/object/public/')
def article_images(pid):
    r = rows[pid]; urls = set(re.findall(r'src="([^"]+)"', r.get('content') or ''))
    if r.get('image_url'): urls.add(r['image_url'])
    return {norm(u) for u in urls if 'supabase.co/storage' in u}
def load(arm, dev):
    out = []
    for line in open(f'data/impl3-{arm}-{dev}.jsonl'):
        r = json.loads(line)
        if r.get('error'): continue
        ph = phases(r); pid = post_id[r['post']]; reqs = r.get('requests') or []
        cover = norm(rows[pid].get('image_url') or '')
        imgs = [q for q in reqs if q.get('ty') == 'Image' and norm(q['u']) in article_images(pid) and q.get('e') is not None]
        cq = sorted([q for q in imgs if norm(q['u']) == cover], key=lambda q: q['s'])
        af = r.get('af') or {}
        tools = af.get('at') if arm in ('B', 'C') else ph.get('content')
        last = (((r.get('perf') or {}).get('lcp') or [None])[-1]) or {}
        tt = r.get('toolTimes') or {}
        # text time = the browser's own paint record of the Post's title (the first LCP candidate that is the article's H1); the lab's
        # probe waits for an animation frame, which a first-document article delays until DOMContentLoaded (see the report)
        h1 = [x for x in ((r.get('perf') or {}).get('lcp') or []) if (x.get('el') or '').startswith('H1')]
        title_paint = h1[0]['t'] if h1 else None
        text = title_paint if title_paint is not None else (ph.get('content'))
        kb_before_text = round(sum((q.get('b') or 0) for q in reqs if q.get('e') is not None and text is not None and q['e'] <= text) / 1024)
        req_before_text = sum(1 for q in reqs if q.get('e') is not None and text is not None and q['e'] <= text)
        ph.update(post=r['post'], cover_req=cq[0]['s'] if cq else None, cover_end=cq[0]['e'] if cq else None, cover_kb=round(cq[0]['b'] / 1024) if cq and cq[0].get('b') else None,
                  cover_render='/render/image/' in cq[0]['u'] if cq else None,
                  images_end=max((q['e'] for q in imgs), default=None), images_kb=round(sum(q.get('b') or 0 for q in imgs) / 1024), images_n=len(imgs),
                  tools=tools, adoption=af.get('result'), place=af.get('place'), compensated=af.get('compensated'), lcp_el=last.get('el'),
                  share=tt.get('share'), comments=tt.get('comments'), title_paint=title_paint, text=text, kb_before_text=kb_before_text, req_before_text=req_before_text, text_source='paint' if title_paint is not None else 'probe', fcp=next((p['t'] for p in (r.get('perf') or {}).get('paints') or [] if p['n'] == 'first-contentful-paint'), None))
        out.append(ph)
    return out
def med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs)) if xs else None
def cell(a, b, m):
    xa = [r.get(m) for r in a if r.get(m) is not None]; xb = [r.get(m) for r in b if r.get(m) is not None]
    if not xa or not xb: return f"{med(xa)} → {med(xb)}"
    return f'{med(xa):,} → {med(xb):,} (**{med(xb) - med(xa):+,}**, p {mann_whitney_p(xa, xb):.3f})'
lines = []
for dev in ('mobile', 'desktop'):
    A, B = load('A', dev), load('C', dev)
    lines += [f'\n### {dev}\n', '**1. Text** (the post\'s own title and opening text visible)\n',
              '| post | n | text visible A → B (ms) | source A / B | KB / requests finished before the text A → B | lab probe A → B (ms) | first contentful paint A → B | CLS max A / B |', '|---|---|---|---|---|---|---|---|']
    for post in post_id:
        a = [r for r in A if r['post'] == post]; b = [r for r in B if r['post'] == post]
        lines.append(f"| {post} | {len(a)}/{len(b)} | {cell(a, b, 'text')} | {collections.Counter(r['text_source'] for r in a).most_common(1)[0][0]} / {collections.Counter(r['text_source'] for r in b).most_common(1)[0][0]} | {med([r['kb_before_text'] for r in a])} / {med([r['req_before_text'] for r in a])} → {med([r['kb_before_text'] for r in b])} / {med([r['req_before_text'] for r in b])} | {cell(a, b, 'content')} | {cell(a, b, 'fcp')} | {max(r['cls'] for r in a):.3f} / {max(r['cls'] for r in b):.3f} |")
    lines += ['\n**2. Images** (measured separately; earlier text is not an image result)\n',
              '| post | cover KB A → B | cover starts A → B | cover finishes A → B | requested article images: KB A → B | all requested finished A → B | LCP A → B | LCP element B |', '|---|---|---|---|---|---|---|---|']
    for post in post_id:
        a = [r for r in A if r['post'] == post]; b = [r for r in B if r['post'] == post]
        el = collections.Counter(r['lcp_el'] for r in b).most_common(1)
        lines.append(f"| {post} | {med([r['cover_kb'] for r in a])} → {med([r['cover_kb'] for r in b])} | {med([r['cover_req'] for r in a])} → {med([r['cover_req'] for r in b])} | {cell(a, b, 'cover_end')} | {med([r['images_kb'] for r in a])} → {med([r['images_kb'] for r in b])} ({med([r['images_n'] for r in a])} → {med([r['images_n'] for r in b])} files) | {cell(a, b, 'images_end')} | {cell(a, b, 'lcp')} | {el[0][0] if el else ''} |")
    lines += ['\n**3. Tools** (A: the page renders with its tools; B: the page code has run and adopted the article; the tools load when used)\n',
              '| post | page ready A → B (ms) | open "פרטי הפוסט" → share usable A → B (ms) | go to the end → comment archive A → B (ms) | adoption B (place / correction px) |', '|---|---|---|---|---|']
    for post in post_id:
        a = [r for r in A if r['post'] == post]; b = [r for r in B if r['post'] == post]
        ad = collections.Counter(f"{r['adoption']}/{r['place']}/{r['compensated']}" for r in b).most_common(2)
        lines.append(f"| {post} | {cell(a, b, 'tools')} | {cell(a, b, 'share')} | {cell(a, b, 'comments')} | {', '.join(f'{k} ×{v}' for k, v in ad)} |")
open('impl3-results.md', 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
