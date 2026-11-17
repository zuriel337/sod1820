import json, sys, statistics as st
def load(p):
    out=[]
    for line in open(p):
        try: out.append(json.loads(line))
        except Exception: pass
    return out
def metrics(r):
    p=r.get('perf') or {}
    nav=r.get('nav') or {}
    fcp=next((x['t'] for x in p.get('paints',[]) if x['n']=='first-contentful-paint'),None)
    lcp=(p.get('lcp') or [{}])[-1].get('t')
    lcpel=(p.get('lcp') or [{}])[-1].get('el')
    content=(p.get('content') or {}).get('t')
    cls=round(sum(s['v'] for s in p.get('shifts',[])),4)
    return dict(ttfb=nav.get('rs'),fcp=fcp,lcp=lcp,content=content,cls=cls,lcpel=lcpel,seen=r.get('contentSeen'),af=(r.get('af') or {}).get('state') if isinstance(r.get('af'),dict) else r.get('af'))
def med(v):
    v=[x for x in v if x is not None]
    return round(st.median(v)) if v else None
def p75(v):
    v=sorted(x for x in v if x is not None)
    return round(v[int(0.75*(len(v)-1)+0.5)]) if v else None
prefix=sys.argv[1]
arms={a:[metrics(r) for r in load(f'{prefix}-{a}.jsonl')] for a in ('miss','hit')}
posts=sorted({r['post'] for a in ('miss','hit') for r in load(f'{prefix}-{a}.jsonl')})
print('arm  n  TTFB  FCP  LCP  readable  CLSmax  contentSeen')
for a,rows in arms.items():
    print(a, len(rows), med([m['ttfb'] for m in rows]), med([m['fcp'] for m in rows]), med([m['lcp'] for m in rows]), med([m['content'] for m in rows]),
          max([m['cls'] for m in rows] or [0]), sum(1 for m in rows if m['seen']), '| p75 LCP', p75([m['lcp'] for m in rows]), 'p75 readable', p75([m['content'] for m in rows]))
print('per post (median miss -> hit): TTFB / FCP / LCP / readable')
for post in posts:
    rm={a:[metrics(r) for r in load(f'{prefix}-{a}.jsonl') if r['post']==post] for a in ('miss','hit')}
    row=[]
    for k in ('ttfb','fcp','lcp','content'):
        row.append(f"{med([m[k] for m in rm['miss']])}->{med([m[k] for m in rm['hit']])}")
    els={m['lcpel'] for a in rm for m in rm[a]}
    print(post, len(rm['miss']), len(rm['hit']), ' | '.join(row), ' LCP el:', ','.join(sorted(str(e)[:30] for e in els)), ' af:', {m['af'] for a in rm for m in rm[a]})
