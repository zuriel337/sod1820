#!/usr/bin/env python3
"""Pretty-print one lab record: milestones, request waterfall (first-party/API/3P/images), long tasks, CPU by script."""
import json, sys, re
rows = [json.loads(l) for l in open(sys.argv[1])]
i = int(sys.argv[2]) if len(sys.argv) > 2 else 0
r = rows[i]
p = r['perf']; n = r['nav']
print('post', r['post'], r['scenario'], r['device'], r['label'], 'contentSeen', r.get('contentSeen'))
print('nav', n)
print('content', p.get('content'), '| LCP entries', [(x['t'], x['el'], (x['url'] or '')[-60:]) for x in p['lcp']][-3:])
print('FCP', [x for x in p['paints']], '| CLS', round(sum(s['v'] for s in p['shifts']), 4), '| long tasks', len(p['long']), 'sum>50', sum(max(0, t['d'] - 50) for t in p['long']))
print('long tasks (t,d):', [(t['t'], t['d']) for t in p['long']][:30])
print('--- requests (start, hdr, end, status, bytes, type, url)')
def short(u):
    u = re.sub(r'^https://sod1820\.co\.il', '', u); u = re.sub(r'^https://linswmnnkjxvweumprav\.supabase\.co', 'SB', u); return u[:96]
for q in sorted(r['requests'], key=lambda q: (q['s'] if q['s'] is not None else 1e9)):
    if q['ty'] in ('Ping',) : continue
    print(f"{str(q['s']).rjust(6)} {str(q['h']).rjust(6)} {str(q['e']).rjust(6)} {str(q['st']).rjust(4)} {str(q['b']).rjust(8)} {q['ty'][:8].ljust(8)} {q.get('p','')[:3]:3} {short(q['u'])}{'  <-'+q['iu'][-30:] if q.get('iu') and q['ty'] in ('Fetch','XHR') else ''}")
if r.get('cpu'):
    print('--- CPU self time ms by script'); 
    for k, v in list(r['cpu'].items())[:14]: print(f'{str(v).rjust(7)}  {k}')
print('blocked', r.get('blocked'), r.get('blockedList'))
print('3p attempts', r.get('thirdPartyAttempts'))
print('refused (never sent):', r.get('writesRefused'), '| read RPC allowed:', r.get('rpcAllowed'))
