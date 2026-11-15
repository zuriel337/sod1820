#!/usr/bin/env python3
# Merge crawl passes: a valid (not platform-mitigated) result wins over a mitigated one; later passes win over earlier valid ones only when the earlier was mitigated.
import json, sys
out = sys.argv[1]; files = sys.argv[2:]
best = {}
def mitigated(r): return any(h.get('status') == 403 or h.get('mitigated') for h in r.get('hops', [])) or r.get('error') == 'mitigated'
for f in files:
    for l in open(f, encoding='utf8'):
        r = json.loads(l); k = r['key']
        if k not in best or (mitigated(best[k]) and not mitigated(r)) or (mitigated(best[k]) and mitigated(r)):
            best[k] = r
with open(out, 'w', encoding='utf8') as fh:
    for r in best.values(): fh.write(json.dumps(r, ensure_ascii=False) + '\n')
print('merged', len(best), 'still mitigated', sum(mitigated(r) for r in best.values()))
