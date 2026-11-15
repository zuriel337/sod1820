#!/usr/bin/env python3
"""Compare lab arms against a base arm, per post, from lab JSONL files (tools/lab.mjs).
usage: compare.py --base label1[,label2...] --arm name=label1[,label2...] [--arm ...] [--metrics content,lcp,fcp,tbt,ttfb] [--md out.md] [--json out.json]
A label may be an arm's stage label (the jsonl is data/<label>.jsonl); several labels are pooled (interleaved rounds). Medians are over the pooled runs of a post;
the range is min-max; delta = arm - base on the medians; 'better' means a lower time. Nothing is filtered: every run with a content observation counts."""
import json, sys, argparse, statistics as st, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--base', required=True); ap.add_argument('--arm', action='append', default=[])
ap.add_argument('--metrics', default='content,lcp,fcp,tbt,ttfb,kb_before_content')
ap.add_argument('--md'); ap.add_argument('--json'); ap.add_argument('--data', default='data')
a = ap.parse_args()

def load(labels):
    rows = collections.defaultdict(list)
    for label in labels.split(','):
        for line in open(os.path.join(a.data, label + '.jsonl'), encoding='utf8'):
            r = json.loads(line)
            if r.get('error') or not r.get('perf'): continue
            ph = analyze.phases(r)
            rows[r['post']].append({**ph, 'seen': bool(r.get('contentSeen')), 'label': label})
    return rows


def mann_whitney_p(xs, ys):
    """Two-sided Mann-Whitney U p-value, exact by enumeration for small samples (n1*n2 combinations <= 200k), otherwise a tie-corrected normal approximation."""
    import itertools, math
    n1, n2 = len(xs), len(ys)
    if n1 < 3 or n2 < 3: return None
    data = [(v, 0) for v in xs] + [(v, 1) for v in ys]
    order = sorted(range(len(data)), key=lambda i: data[i][0]); ranks = [0.0] * len(data); i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and data[order[j + 1]][0] == data[order[i]][0]: j += 1
        for k in range(i, j + 1): ranks[order[k]] = (i + j) / 2 + 1
        i = j + 1
    u1 = sum(r for r, (_, g) in zip(ranks, data) if g == 0) - n1 * (n1 + 1) / 2
    mean = n1 * n2 / 2
    if math.comb(n1 + n2, n1) <= 200000:
        total = n1 + n2; allranks = ranks; count = 0; extreme = abs(u1 - mean); combos = 0
        for comb in itertools.combinations(range(total), n1):
            u = sum(allranks[k] for k in comb) - n1 * (n1 + 1) / 2
            combos += 1
            if abs(u - mean) >= extreme - 1e-9: count += 1
        return count / combos
    ties = collections.Counter(v for v, _ in data)
    tie_term = sum(t ** 3 - t for t in ties.values()) / ((n1 + n2) * (n1 + n2 - 1))
    var = n1 * n2 / 12 * ((n1 + n2 + 1) - tie_term)
    z = (abs(u1 - mean) - 0.5) / math.sqrt(var) if var > 0 else 0
    return math.erfc(z / math.sqrt(2))

def stats(rs, m):
    xs = [r[m] for r in rs if r.get(m) is not None]
    if not xs: return None
    return {'n': len(xs), 'median': round(st.median(xs)), 'min': round(min(xs)), 'max': round(max(xs))}

metrics = a.metrics.split(',')
base = load(a.base)
arms = {}
for spec in a.arm:
    name, labels = spec.split('=', 1)
    arms[name] = load(labels)
posts = sorted(base.keys())
out = {'metrics': metrics, 'posts': posts, 'base': {}, 'arms': {n: {} for n in arms}}
lines = []
for m in metrics:
    lines.append(f'\n### {m}  (median ms [min-max] n;  delta vs base)\n')
    head = '| post | base | ' + ' | '.join(arms) + ' |'
    lines.append(head); lines.append('|' + '---|' * (2 + len(arms)))
    for p in posts:
        b = stats(base[p], m); out['base'].setdefault(p, {})[m] = b
        cells = [f"{b['median']} [{b['min']}-{b['max']}] n={b['n']}" if b else '-']
        for n, rows in arms.items():
            s = stats(rows.get(p, []), m); out['arms'][n].setdefault(p, {})[m] = s
            pv = mann_whitney_p([r[m] for r in base[p] if r.get(m) is not None], [r[m] for r in rows.get(p, []) if r.get(m) is not None]) if (s and b) else None
            if s: s['p'] = pv
            if s and b: cells.append(f"{s['median']} [{s['min']}-{s['max']}] n={s['n']}  **{s['median'] - b['median']:+d}**" + (f" p={pv:.3f}" if pv is not None else ''))
            else: cells.append('-')
        lines.append(f'| {p} | ' + ' | '.join(cells) + ' |')
text = '\n'.join(lines)
print(text)
if a.md: open(a.md, 'w', encoding='utf8').write(text + '\n')
if a.json: json.dump(out, open(a.json, 'w'), ensure_ascii=False, indent=1)
