#!/usr/bin/env python3
"""Small markdown tables (Hebrew labels) for pull-request bodies, built from the JSON written by make_tables.py (no hand transcription).
usage: pr_tables.py <tables dir> <table> <arm> <metric> [<metric2> ...]
prints: | post | base | arm (delta, p) | for the metric; several metrics print several columns."""
import json, sys, os
tables, name, arm, *metrics = sys.argv[1:]
d = json.load(open(os.path.join(tables, name + '.json'), encoding='utf8'))
LABEL = {'O1': 'O1 · ותיק, תמונה ראשונה', 'O3': 'O3 · ותיק, בינוני', 'N3': 'N3 · חדש, בינוני (וידאו)', 'N5': 'N5 · חדש, ארוך (פוסט הייחוס)'}
head = '| פוסט | ' + ' | '.join(f'{m}: בסיס → {arm}' for m in metrics) + ' |'
print(head); print('|' + '---|' * (1 + len(metrics)))
for p in ['O1', 'O3', 'N3', 'N5']:
    if p not in d['posts']: continue
    cells = []
    for m in metrics:
        b = d['base'][p][m]; a = d['arms'][arm][p][m]
        if not b or not a: cells.append('-'); continue
        delta = a['median'] - b['median']; pv = a.get('p')
        ptxt = '' if pv is None else (', p<0.001' if pv < 0.0005 else ', p=%.3f' % pv)
        cells.append(f"{b['median']:,} → {a['median']:,} (**{delta:+,}**{ptxt}; n={b['n']}/{a['n']})")
    print(f'| {LABEL.get(p, p)} | ' + ' | '.join(cells) + ' |')
