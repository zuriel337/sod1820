#!/usr/bin/env python3
"""Per-run table of every lab stage (one CSV row per run, no filtering), from data/*.jsonl. usage: export_runs.py <out.csv>
The raw stage files (request-level, about 36 MB) stay out of the repository; every table of the README is computed from exactly these rows (tools/compare.py reads the raw files, which hold the same numbers)."""
import json, sys, glob, os, csv
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze
cols = ['label', 'scenario', 'device', 'post', 'run', 'content_seen', 'ttfb', 'fcp', 'content', 'lcp', 'lcp_element', 'tbt', 'cls', 'kb_before_content', 'kb_total', 'entry_end', 'route_end', 'post_end', 'blocked_requests']
out = csv.writer(open(sys.argv[1], 'w', newline='', encoding='utf8')); out.writerow(cols)
n = 0
for path in sorted(glob.glob('data/*.jsonl')):
    label = os.path.basename(path)[:-6]
    if label.startswith(('live-', 'fx-', 'ttfb-')): continue
    for line in open(path, encoding='utf8'):
        r = json.loads(line)
        if r.get('error') or not r.get('perf'): continue
        ph = analyze.phases(r)
        out.writerow([label, r['scenario'], r['device'], r['post'], r.get('run'), int(bool(r.get('contentSeen'))), ph.get('ttfb'), ph.get('fcp'), ph.get('content'), ph.get('lcp'), ph.get('lcp_el'), ph.get('tbt'), ph.get('cls'),
                      ph.get('kb_before_content'), ph.get('kb_total'), ph.get('entry_end'), ph.get('route_end'), ph.get('post_end'), r.get('blocked')])
        n += 1
print(n, 'runs')
