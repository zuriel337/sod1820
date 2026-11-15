#!/usr/bin/env python3
"""Generate the markdown tables of the evidence README from the lab JSONL files (data/*.jsonl). usage: make_tables.py <out dir>
Every table is produced by tools/compare.py (medians, min-max, n, delta vs base, exact/approximate Mann-Whitney p); nothing is filtered."""
import subprocess, sys, os, json, collections, statistics as st
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
here = os.path.dirname(os.path.abspath(__file__))

def compare(name, base, arms, metrics):
    args = ['python3', '-I', os.path.join(here, 'compare.py'), '--base', base, '--metrics', metrics, '--json', os.path.join(out, name + '.json')]
    for k, v in arms.items(): args += ['--arm', f'{k}={v}']
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0: text = f'(not available: {r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "error"})'
    else: text = r.stdout.strip()
    open(os.path.join(out, name + '.md'), 'w', encoding='utf8').write(text + '\n'); return text

exists = lambda *labels: all(os.path.exists(f'data/{l}.jsonl') for l in labels)
tables = {}
if exists('fin-base-3', 'fin-b-3', 'fin-c2-3', 'fin-int-3'):
    base = 'fin-base-3' + (',fin-base-4' if exists('fin-base-4') else '')
    intl = 'fin-int-3' + (',fin-int-4' if exists('fin-int-4') else '')
    tables['cold_final'] = compare('cold_final', base, {'B': 'fin-b-3', 'C1+C2 (earlier tree)': 'fin-c2-3', 'A+B+C1+C2+D (earlier tree)': intl}, 'content,fcp,tbt,kb_before_content')
if exists('ab-base-1', 'ab-base-2', 'ab-b-1', 'ab-b-2', 'ab-c1-1', 'ab-c1-2', 'ab-c2-1', 'ab-c2-2', 'ab-int-1', 'ab-int-2'):
    tables['cold_rounds12'] = compare('cold_rounds12', 'ab-base-1,ab-base-2', {'B': 'ab-b-1,ab-b-2', 'C1': 'ab-c1-1,ab-c1-2', 'C1+C2': 'ab-c2-1,ab-c2-2', 'A+B+C1+C2+D (earlier tree)': 'ab-int-1,ab-int-2'}, 'content,tbt')
if exists('ab-base-1', 'ab-base-2', 'ab-c1-1', 'ab-c1-2', 'ab-c2-1', 'ab-c2-2'):
    tables['c1_alone'] = compare('c1_alone', 'ab-base-1,ab-base-2', {'C1 (tag + Pixel after the article)': 'ab-c1-1,ab-c1-2', 'C1+C2': 'ab-c2-1,ab-c2-2'}, 'content,tbt')
if exists('ab-fast-base', 'fin-fast-int'):
    base = 'ab-fast-base' + (',fin-fast-base' if exists('fin-fast-base') else '')
    tables['fast4g'] = compare('fast4g', base, {'A+B+C1+C2+D (earlier tree)': 'fin-fast-int'}, 'content,fcp,lcp,tbt')
if exists('lcp-base', 'lcp-int'):
    pool = lambda a, b: a + (',' + b if exists(b) else '')
    arms = {'C1': 'lcp-c1'} if exists('lcp-c1') else {}
    if exists('lcp-c2'): arms['C1+C2'] = pool('lcp-c2', 'lcp-c2-b')
    if exists('lcp-c3'): arms['C1+C2+C3'] = 'lcp-c3'
    arms['A+B+C1+C2+D (earlier tree)'] = 'lcp-int'
    tables['lcp'] = compare('lcp', pool('lcp-base', 'lcp-base-b'), arms, 'lcp,content')
# variant C3 (the article's cover first): Regular 4G (interleaved base, C, C+C3, C+C3, C, base; 3 runs each = 6 per arm) and Slow 4G cold
if exists('f4-base-1', 'f4-base-2', 'f4-c-1', 'f4-c-2', 'f4-c3-1', 'f4-c3-2'):
    tables['fast4g_c3'] = compare('fast4g_c3', 'f4-base-1,f4-base-2', {'C (C1+C2)': 'f4-c-1,f4-c-2', 'C+C3': 'f4-c3-1,f4-c3-2'}, 'content,fcp,lcp,tbt')
if exists('fin-base-3', 'fin-c2-3', 'fin-c3-3'):
    base = 'fin-base-3' + (',fin-base-4' if exists('fin-base-4') else '')
    tables['cold_c3'] = compare('cold_c3', base, {'C (C1+C2)': 'fin-c2-3', 'C+C3': 'fin-c3-3'}, 'content,fcp,tbt')
if exists('ab-warm-base', 'ab-warm-int'):
    arms = {'D (static headers)': 'ab-warm-d'} if exists('ab-warm-d') else {}
    arms['A+B+C1+C2+D (earlier tree)'] = 'ab-warm-int'
    tables['warm'] = compare('warm', 'ab-warm-base', arms, 'content,fcp')   # same browser process: Blink's memory cache only (the HTTP cache was not in use, see section 2)
# returning visitor (browser closed and started again on the same profile; trusted lab certificate so that the HTTP cache works): the proof of package D
if exists('ret-base-1', 'ret-base-2', 'ret-d-1', 'ret-d-2', 'ret-int-1', 'ret-int-2'):
    tables['returning'] = compare('returning', 'ret-base-1,ret-base-2', {'D (static headers)': 'ret-d-1,ret-d-2', 'A+B+C1+C2+D (earlier tree)': 'ret-int-1,ret-int-2'}, 'content,fcp,lcp,kb_before_content')
if exists('ab-desk-base', 'ab-desk-int'):
    tables['desktop'] = compare('desktop', 'ab-desk-base', {'A+B+C1+C2+D (earlier tree)': 'ab-desk-int'}, 'content,lcp,fcp')
if exists('ab-nav-base', 'ab-nav-int'):
    tables['nav'] = compare('nav', 'ab-nav-base', {'A+B+C1+C2+D (earlier tree)': 'ab-nav-int'}, 'content,tbt')

# the proposed release tree (A + B + D + C1 + C3, no C2), interleaved with fresh main runs; and the isolation of C2 on top of C1
if exists('fz-base-1', 'fz-base-2', 'fz-fin-1', 'fz-fin-2'):
    tables['fin_cold'] = compare('fin_cold', 'fz-base-1,fz-base-2', {'proposed tree': 'fz-fin-1,fz-fin-2'}, 'content,fcp,tbt,kb_before_content')
if exists('fr-base-1', 'fr-base-2', 'fr-fin-1', 'fr-fin-2'):
    tables['fin_fast4g'] = compare('fin_fast4g', 'fr-base-1,fr-base-2', {'proposed tree': 'fr-fin-1,fr-fin-2'}, 'content,fcp,lcp,tbt')
if exists('lz-base', 'lz-base-b', 'lz-fin', 'lz-fin-b'):
    tables['fin_lcp'] = compare('fin_lcp', 'lz-base,lz-base-b', {'proposed tree': 'lz-fin,lz-fin-b'}, 'lcp,content')
if exists('ret-rc-base-1', 'ret-rc-base-2', 'ret-rc-fin-1', 'ret-rc-fin-2', 'ret-rc-c2-1', 'ret-rc-c2-2'):
    tables['fin_returning'] = compare('fin_returning', 'ret-rc-base-1,ret-rc-base-2', {'proposed tree': 'ret-rc-fin-1,ret-rc-fin-2', 'proposed tree + C2 (#1364)': 'ret-rc-c2-1,ret-rc-c2-2'}, 'content,fcp,kb_before_content')
if exists('c12-c1-1', 'c12-c1-2', 'c12-c2-1', 'c12-c2-2'):
    tables['c2_isolation'] = compare('c2_isolation', 'c12-c1-1,c12-c1-2', {'C1+C2 (ad library on approach)': 'c12-c2-1,c12-c2-2'}, 'content,fcp,tbt')

# server-side: og.js handler time, cold process and warm pool (interleaved, real network). Two files: the earlier three-variant measurement (data/og-ab.jsonl, with the
# concurrent version that was not shipped) and the final one on idle hardware (data/og-ab-final.jsonl: main against the shipped package A).
def server_table(path, arms, names, name, he=False):
    rows = [json.loads(l) for l in open(path)]; g = collections.defaultdict(lambda: collections.defaultdict(list))
    for r in rows:
        if r.get('r') and 'first' in r['r']:
            for ph in ('first', 'second'): g[(r['post'], r['arm'])][ph].append((r['r'][ph]['ms'], r['r'][ph]['calls']))
    lines = (['| פוסט | זרוע | תהליך קר: median [min-max] ms | מאגר חם: median [min-max] ms | בקשות |', '|---|---|---|---|---|'] if he else
             ['| post | arm | cold process: median [min-max] ms | warm pool: median [min-max] ms | requests |', '|---|---|---|---|---|'])
    for post in ('O1', 'O3', 'O4', 'N1'):
        for arm in arms:
            d = g[(post, arm)]
            if not d: continue
            cell = lambda ph: (lambda ms: f'{st.median(ms):.0f} [{min(ms)}-{max(ms)}]')([x[0] for x in d[ph]])
            lines.append(f"| {post} | {names[arm]} | {cell('first')} (n={len(d['first'])}) | {cell('second')} | {sorted(set(x[1] for x in d['first']))[0]} |")
    text = '\n'.join(lines); open(os.path.join(out, name + '.md'), 'w', encoding='utf8').write(text + '\n'); return text
if os.path.exists('data/og-ab.jsonl'):
    tables['server_variants'] = server_table('data/og-ab.jsonl', ('base', 'parallel', 'invariant'), {'base': 'base (two reads, one after the other)', 'parallel': 'two concurrent requests (not shipped)', 'invariant': 'one request, `slug=in.(a,b)` (package A)'}, 'server_variants')
if os.path.exists('data/og-ab-final.jsonl') and os.path.exists('data/og-ab-final.done'):
    tables['server'] = server_table('data/og-ab-final.jsonl', ('base', 'final'), {'base': 'main (two reads, one after the other)', 'final': 'package A as shipped (one request, `slug=in.(a,b)`)'}, 'server')
    server_table('data/og-ab-final.jsonl', ('base', 'final'), {'base': 'main (שתי קריאות ברצף)', 'final': 'חבילה A (בקשה אחת, `slug=in.(a,b)`)'}, 'server_he', he=True)
print('\n'.join(f'{k}: {len(v.splitlines())} lines' for k, v in tables.items()))
