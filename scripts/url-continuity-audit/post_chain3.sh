#!/bin/bash
# Last pass: re-try (politely, once) the census URLs whose first attempt was refused by the platform mitigation.
cd "$(dirname "$0")/.." || exit 1
until grep -q "robots finished" data/post-chain2.log 2>/dev/null; do sleep 5; done
python3 -I tools/merge_crawls.py data/crawl-merged.jsonl data/crawl-full.jsonl data/crawl-pass2.jsonl data/crawl-pass2b.jsonl data/crawl-pass3.jsonl data/crawl-pass4.jsonl
python3 -I - <<'PY'
import json
def mit(r): return any(h.get('status') == 403 or h.get('mitigated') for h in r.get('hops', [])) or r.get('error') == 'mitigated'
uni = {}
for l in open('data/unified.jsonl'):
    u = json.loads(l); uni[u['key']] = u
rows = [json.loads(l) for l in open('data/crawl-merged.jsonl')]
todo = [r for r in rows if mit(r)]
todo.sort(key=lambda r: -((uni.get(r['key'], {}).get('impr')) or 0))
with open('data/todo-pass5.jsonl', 'w', encoding='utf8') as fh:
    for r in todo: fh.write(json.dumps({'key': r['key'], 'fetch': r['fetch'], 'cls': 'census'}, ensure_ascii=False) + '\n')
print('pass5 todo', len(todo))
PY
cd data
python3 -I ../tools/crawl.py todo-pass5.jsonl crawl-pass5.jsonl --rps 1.0 --threads 3 --tag pass5 --adaptive > crawl-pass5.log 2>&1
echo "pass5 finished $(date -u +%T)"
