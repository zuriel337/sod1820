#!/usr/bin/env python3
"""Narrow live probe: sequential document GETs (no parallel load), 4 s apart. Records server-side timing and cache headers.
usage: ttfb_probe.py out.jsonl repeats gap_s url [url ...]"""
import json, subprocess, sys, time, re, os
out, repeats, gap = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]); urls = sys.argv[4:]
UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 SOD1820-Post-Speed-Audit/1.0'
FMT = '%{http_code}|%{time_namelookup}|%{time_connect}|%{time_appconnect}|%{time_pretransfer}|%{time_starttransfer}|%{time_total}|%{size_download}|%{num_redirects}'
rows = []
for rep in range(repeats):
    for u in urls:
        hdr = f'html/_h.txt'; body = f'html/_b.html'
        p = subprocess.run(['curl', '-sS', '--compressed', '-m', '40', '-A', UA, '-D', hdr, '-o', body, '-w', FMT, u], capture_output=True, text=True)
        w = p.stdout.split('|')
        h = open(hdr, encoding='utf8', errors='replace').read()
        def hv(name):
            m = re.findall(r'^' + name + r':\s*(.*)$', h, re.I | re.M); return m[-1].strip() if m else None
        r = {'url': u, 'rep': rep, 'code': int(w[0]) if w[0].isdigit() else None, 'dns': float(w[1]), 'connect': float(w[2]), 'tls': float(w[3]), 'pretransfer': float(w[4]), 'ttfb': float(w[5]), 'total': float(w[6]), 'bytes': int(w[7]), 'redirects': int(w[8]),
             'cache_control': hv('cache-control'), 'x_vercel_cache': hv('x-vercel-cache'), 'age': hv('age'), 'x_vercel_id': hv('x-vercel-id'), 'server': hv('server'), 'content_encoding': hv('content-encoding'), 'content_length': hv('content-length'), 'server_timing': hv('server-timing'), 'err': p.stderr.strip()[:120] or None}
        rows.append(r); open(out, 'a').write(json.dumps(r, ensure_ascii=False) + '\n')
        if rep == 0:
            slug = re.sub(r'[^A-Za-z0-9]+', '_', u.split('sod1820.co.il')[-1])[:60]
            os.replace(body, f'html/doc_{slug}.html')
        print(f"{r['code']} ttfb={r['ttfb']:.3f} total={r['total']:.3f} bytes={r['bytes']} cache={r['x_vercel_cache']} cc={r['cache_control']} {u[-50:]}", flush=True)
        time.sleep(gap)
