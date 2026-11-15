#!/usr/bin/env python3
# Polite read-only URL checker: hop-by-hop (no auto-redirect), records every hop, then the final document's title/canonical/robots.
# usage: crawl.py <in.jsonl> <out.jsonl> [--rps 6] [--threads 8] [--limit N] [--offset N] [--origin https://sod1820.co.il] [--tag name]
import json, sys, time, threading, re, urllib.parse, argparse, os, random
from concurrent.futures import ThreadPoolExecutor
import requests
from lxml import html as lhtml

ap = argparse.ArgumentParser()
ap.add_argument('inp'); ap.add_argument('out')
ap.add_argument('--rps', type=float, default=6.0); ap.add_argument('--threads', type=int, default=8)
ap.add_argument('--limit', type=int, default=0); ap.add_argument('--offset', type=int, default=0)
ap.add_argument('--origin', default='https://sod1820.co.il'); ap.add_argument('--tag', default='')
ap.add_argument('--field', default='fetch'); ap.add_argument('--maxhops', type=int, default=10)
ap.add_argument('--adaptive', action='store_true', help='back off (cool down + lower rate) when the platform answers x-vercel-mitigated')
args = ap.parse_args()
UA = 'Mozilla/5.0 (compatible; SOD1820-URL-Continuity-Audit/1.0; read-only)'
ORIGIN = args.origin
tl = threading.local()
lock = threading.Lock(); next_slot = [time.monotonic()]
mit_lock = threading.Lock(); recent = []; cooldown_until = [0.0]; cur_rps = [args.rps]; mitigated_total = [0]
def note(mitigated):
    # Platform mitigation (x-vercel-mitigated) is a signal to slow down, never to retry through it.
    with mit_lock:
        recent.append(1 if mitigated else 0)
        if mitigated: mitigated_total[0] += 1
        if len(recent) > 40: recent.pop(0)
        if args.adaptive and mitigated and sum(recent) >= 4:
            cooldown_until[0] = time.monotonic() + 150; cur_rps[0] = max(0.8, cur_rps[0] * 0.6); recent.clear()
            print(f'[guard] mitigation burst: cooling 150s, rps -> {cur_rps[0]:.2f}', flush=True)
        elif args.adaptive and len(recent) == 40 and sum(recent) == 0 and cur_rps[0] < args.rps:
            cur_rps[0] = min(args.rps, cur_rps[0] * 1.25); recent.clear()
def throttle():
    with lock:
        now = time.monotonic(); t = max(now, next_slot[0], cooldown_until[0]); next_slot[0] = t + 1.0 / cur_rps[0]
    d = t - now
    if d > 0: time.sleep(d)
def sess():
    s = getattr(tl, 's', None)
    if s is None:
        s = requests.Session(); s.headers.update({'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'he,en;q=0.5'})
        a = requests.adapters.HTTPAdapter(pool_connections=1, pool_maxsize=1, max_retries=0); s.mount('https://', a); tl.s = s
    return s
def ascii_url(u):
    # keep existing %XX, percent-encode any non-ASCII byte
    return ''.join(c if ord(c) < 128 else urllib.parse.quote(c, safe='') for c in u)
def parse_head(body, ct):
    d = {}
    try:
        doc = lhtml.fromstring(body)
    except Exception:
        return {'parse_error': True}
    t = doc.xpath('//title'); d['title'] = (t[0].text_content().strip()[:200] if t else None)
    c = doc.xpath('//link[@rel="canonical"]/@href'); d['canonical'] = c[0] if c else None; d['n_canonical'] = len(c)
    r = doc.xpath('//meta[@name="robots"]/@content'); d['robots'] = r[0] if r else None; d['n_robots'] = len(r)
    o = doc.xpath('//meta[@property="og:url"]/@content'); d['og_url'] = o[0] if o else None
    h = doc.xpath('//h1'); d['h1'] = (h[0].text_content().strip()[:160] if h else None)
    d['lang'] = (doc.xpath('//html/@lang') or [None])[0]
    d['alts'] = len(doc.xpath('//link[@rel="alternate"]'))
    return d
def fetch_chain(path):
    url = ascii_url(ORIGIN + path if path.startswith('/') else path)
    hops = []; seen = set(); err = None; final = None
    for i in range(args.maxhops + 1):
        if url in seen: err = 'loop'; break
        seen.add(url)
        res = None
        for attempt in range(3):
            throttle(); t0 = time.monotonic()
            try:
                res = sess().get(url, allow_redirects=False, stream=True, timeout=(10, 40)); break
            except Exception as e:
                err = type(e).__name__; time.sleep(1.5 * (attempt + 1)); res = None
        if res is None: break
        ms = int((time.monotonic() - t0) * 1000)
        h = res.headers; st = res.status_code
        if st in (429, 502, 503, 504) and attempt < 2:
            res.close(); time.sleep(2 + attempt * 3); throttle(); 
            try:
                res = sess().get(url, allow_redirects=False, stream=True, timeout=(10, 40)); st = res.status_code; h = res.headers
            except Exception as e: err = type(e).__name__
        hop = {'url': url, 'status': st, 'ms': ms, 'ct': (h.get('content-type') or '')[:60], 'xrt': h.get('x-robots-tag'), 'vc': h.get('x-vercel-cache'), 'cc': (h.get('cache-control') or '')[:80]}
        if h.get('x-vercel-mitigated'): hop['mit'] = h.get('x-vercel-mitigated')
        if st == 403 and hop.get('mit'):
            hop['mitigated'] = True; note(True); res.close(); hops.append(hop); err = 'mitigated'; break
        note(False)
        loc = h.get('location')
        if loc is not None: hop['loc'] = loc; hop['abs'] = urllib.parse.urljoin(url, loc)
        body = None
        if 200 <= st < 300 and 'html' in hop['ct'].lower():
            try: body = res.raw.read(300000, decode_content=True)
            except Exception as e: err = type(e).__name__
            hop['len'] = len(body or b'')
            if body: hop['doc'] = parse_head(body, hop['ct'])
        elif st >= 400 and 'html' in hop['ct'].lower():
            try: body = res.raw.read(60000, decode_content=True)
            except Exception: body = None
            if body: hop['doc'] = parse_head(body, hop['ct'])
        res.close()
        hops.append(hop)
        if 300 <= st < 400 and loc:
            nxt = hop['abs']
            if not nxt.startswith(ORIGIN):  # leaves the site: stop here
                hop['external'] = True; break
            url = nxt; continue
        break
    return {'hops': hops, 'error': err, 'final_status': hops[-1]['status'] if hops else None, 'final_url': hops[-1]['url'] if hops else None,
            'n_hops': len(hops) - 1 if hops else 0}
def work(rec):
    r = fetch_chain(rec[args.field]); r['key'] = rec['key']; r['fetch'] = rec[args.field]
    if args.tag: r['tag'] = args.tag
    return r
recs = [json.loads(l) for l in open(args.inp, encoding='utf-8')]
done = set()
if os.path.exists(args.out):
    for l in open(args.out, encoding='utf-8'):
        try: done.add(json.loads(l)['key'])
        except Exception: pass
recs = recs[args.offset:]
if args.limit: recs = recs[:args.limit]
recs = [r for r in recs if r['key'] not in done]
print(f'to fetch: {len(recs)} (already done {len(done)}) rps={args.rps} threads={args.threads}', flush=True)
t_start = time.time(); n = 0; errs = 0; lk = threading.Lock()
with open(args.out, 'a', encoding='utf-8') as fo, ThreadPoolExecutor(max_workers=args.threads) as ex:
    for r in ex.map(work, recs):
        with lk:
            fo.write(json.dumps(r, ensure_ascii=False) + '\n'); n += 1
            if r['error'] or (r['final_status'] or 0) >= 500: errs += 1
            if n % 200 == 0:
                fo.flush(); el = time.time() - t_start
                print(f'{n}/{len(recs)} {n/el:.1f}/s errors={errs} mitigated={mitigated_total[0]} rps_now={cur_rps[0]:.2f}', flush=True)
print(f'done {n} in {time.time()-t_start:.0f}s errors={errs}', flush=True)
