#!/usr/bin/env python3
"""Compact summary tables of the README (section 1), computed from the JSON written by make_tables.py (no hand transcription). usage: make_summary_tables.py <tables dir>"""
import json, os, sys
T = sys.argv[1]
def load(name):
    p = os.path.join(T, name + '.json')
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else None
POSTS = ['O1', 'O3', 'N3', 'N5']
MINUS = '−'
def cell(d, arm, post, metric):
    if not d or arm not in d['arms'] or post not in d['posts']: return 'n/a'
    b = d['base'][post].get(metric); a = d['arms'][arm][post].get(metric)
    if not b or not a: return 'n/a'
    delta = a['median'] - b['median']; pv = a.get('p')
    sig = '' if pv is None else (' ***' if pv < 0.01 else ' *' if pv < 0.05 else ' (n.s.)')
    return f"{delta:+,}{sig}".replace('-', MINUS)
def row(label, d, arm, metric):
    return f"| {label} | " + ' | '.join(cell(d, arm, p, metric) for p in POSTS) + ' |'
def n_of(d, arm, metric='content'):
    for post in POSTS:
        try: return f"n={d['base'][post][metric]['n']} vs {d['arms'][arm][post][metric]['n']}"
        except Exception: continue
    return ''
fin_cold, cold, fast, fin_fast, lcp14, fin_lcp, ret, fin_ret, desk, nav, c2 = (load(x) for x in ('fin_cold', 'cold_final', 'fast4g', 'fin_fast4g', 'lcp', 'fin_lcp', 'returning', 'fin_returning', 'desktop', 'nav', 'c2_isolation'))
SIGN = '`***` p<0.01, `*` p<0.05, `(n.s.)` not significant (two-sided Mann-Whitney on the runs; n is per arm).'
# ---- table 1: cold, Slow 4G, content visible
head = '| content visible, cold, Slow 4G + 4x CPU: change against main (ms) | O1 old, image first | O3 old, medium | N3 new, medium | N5 new, long |\n|---|---|---|---|---|'
main_med = (fin_cold or cold)
lines = [head, '| main, same series as the proposed tree (median, ms) | ' + ' | '.join(f"{main_med['base'][p]['content']['median']:,}" for p in POSTS) + ' |']
lines.append(row(f"**B** alone: early read at the original address ({n_of(cold, 'B')})", cold, 'B', 'content'))
if fin_cold: lines.append(row(f"**proposed tree** A+B+C1+C3+D ({n_of(fin_cold, 'proposed tree')})", fin_cold, 'proposed tree', 'content'))
lines.append(row(f"earlier tree A+B+C1+C2+D ({n_of(cold, 'A+B+C1+C2+D (earlier tree)')}; the new posts N3/N5 isolate C)", cold, 'A+B+C1+C2+D (earlier tree)', 'content'))
open(os.path.join(T, 'summary_cold.md'), 'w', encoding='utf8').write('\n'.join(lines) + '\n\n' + SIGN + ' A (server) and D (cache headers) do not act on a cold lab load; see the next table.\n')
# ---- table 2: other conditions, proposed tree
rows = ['| proposed tree against main, change in ms | O1 | O3 | N3 | N5 |', '|---|---|---|---|---|']
def add(label, d, arm, metric, extra=''):
    if d and arm in d['arms']: rows.append(row(f"{label} ({n_of(d, arm, metric)})", d, arm, metric))
if fin_cold:
    add('Cold, Slow 4G: first paint (FCP)', fin_cold, 'proposed tree', 'fcp'); add('Cold, Slow 4G: blocking time in the 3.5 s after the text', fin_cold, 'proposed tree', 'tbt')
if fin_fast: add('Cold, Regular 4G + 4x CPU: content visible', fin_fast, 'proposed tree', 'content'); add('Cold, Regular 4G: LCP', fin_fast, 'proposed tree', 'lcp'); add('Cold, Regular 4G: blocking time', fin_fast, 'proposed tree', 'tbt')
if fin_lcp: add('Cold, Slow 4G, 14 s window: LCP (uncensored)', fin_lcp, 'proposed tree', 'lcp')
if fin_ret: add('Returning visitor, Slow 4G: content visible', fin_ret, 'proposed tree', 'content'); add('Returning visitor: first paint (FCP)', fin_ret, 'proposed tree', 'fcp'); add('Returning visitor: KB transferred before the text', fin_ret, 'proposed tree', 'kb_before_content')
if desk: add('Desktop 10 Mbps, cold: content visible (earlier tree, with C2)', desk, 'A+B+C1+C2+D (earlier tree)', 'content'); add('Desktop, cold: LCP (earlier tree)', desk, 'A+B+C1+C2+D (earlier tree)', 'lcp')
if nav: add('In-app navigation home to post: content visible (earlier tree)', nav, 'A+B+C1+C2+D (earlier tree)', 'content')
open(os.path.join(T, 'summary_conditions.md'), 'w', encoding='utf8').write('\n'.join(rows) + '\n')
print(open(os.path.join(T, 'summary_cold.md'), encoding='utf8').read()); print('\n'.join(rows))
