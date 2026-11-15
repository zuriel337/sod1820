#!/usr/bin/env python3
# Documented (3.11 transition matrix) vs measured (15.11 crawl) per family.
import json, sys, csv, collections
D = 'data/'
cls = json.load(open(sys.argv[1]))
m = {r['id']: r for r in json.load(open(D + 'ucp-transition-matrix.json'))}
uni = {}
for l in open(D + 'unified.jsonl'):
    r = json.loads(l); uni[r['key']] = r
tot = collections.Counter(u['family'] or '(none)' for u in uni.values())
meas = collections.defaultdict(collections.Counter)
for o in cls:
    fam = (uni.get(o['key'], {}).get('family')) or '(none)'
    meas[fam][o['class']] += 1
rows = []
for fam in sorted(tot, key=lambda f: (f == '(none)', f)):
    c = meas.get(fam, collections.Counter()); r = m.get(fam, {})
    rows.append({'family': fam, 'urls_total': tot[fam], 'measured': sum(c.values()), 'OK': c['OK'], 'OK_REDIRECT': c['OK_REDIRECT'], 'TEMP_CLOSED': c['TEMP_CLOSED'],
                 'INTENTIONAL': c['INTENTIONAL'], 'UNDECIDABLE': c['UNDECIDABLE'], 'BROKEN': c['BROKEN'], 'UNCHECKED': c['UNCHECKED'],
                 'documented_old_address': (r.get('old_address') or '')[:100], 'documented_target': (r.get('target_2029') or '')[:100]})
with open(sys.argv[2], 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
for r in rows[:40]:
    print(f"{r['family']:11} total={r['urls_total']:6} measured={r['measured']:6} OK={r['OK']:6} REDIR={r['OK_REDIRECT']:5} TEMP={r['TEMP_CLOSED']:3} INT={r['INTENTIONAL']:3} UND={r['UNDECIDABLE']:4} BRK={r['BROKEN']:3} UNCH={r['UNCHECKED']:4}")
