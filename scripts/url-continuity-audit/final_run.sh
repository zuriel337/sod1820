#!/bin/bash
# One sequential driver for the remaining live checks (low volume, adaptive back-off). Stage markers go to data/final-run.log.
cd "$(dirname "$0")/.." || exit 1
cd data
python3 -I ../tools/crawl.py todo-pass4b.jsonl crawl-pass4b.jsonl --rps 1.0 --threads 3 --tag pass4b --adaptive > crawl-pass4b.log 2>&1
echo "STAGE pass4b $(date -u +%T)"
cd ..
python3 -I tools/merge_crawls.py data/crawl-merged.jsonl data/crawl-full.jsonl data/crawl-pass2.jsonl data/crawl-pass2b.jsonl data/crawl-pass3.jsonl data/crawl-pass4.jsonl data/crawl-pass4b.jsonl
python3 -I tools/classify.py data/crawl-merged.jsonl data/class-final > /dev/null
python3 -I tools/build_recip_todo.py data/class-final.json 100
cd data
python3 -I ../tools/crawl.py todo-recip.jsonl crawl-recip.jsonl --rps 1.0 --threads 3 --tag recip --adaptive > crawl-recip.log 2>&1
echo "STAGE recip $(date -u +%T)"
python3 -I ../tools/crawl.py todo-special.jsonl crawl-special.jsonl --rps 1.0 --threads 2 --tag special --adaptive > crawl-special.log 2>&1
echo "STAGE special $(date -u +%T)"
for pair in "http-apex http://sod1820.co.il" "https-www https://www.sod1820.co.il" "http-www http://www.sod1820.co.il" "vercel-app https://sod1820.vercel.app"; do
  set -- $pair
  python3 -I ../tools/crawl.py todo-host-$1.jsonl crawl-host-$1.jsonl --rps 1.0 --threads 2 --origin $2 --tag host --adaptive > crawl-host-$1.log 2>&1
done
echo "STAGE hosts $(date -u +%T)"
LIGHT=1 node ../tools/pw_browser.cjs browser-sample-3.json browser-3.jsonl 2 > browser-3.log 2>&1
echo "STAGE browser $(date -u +%T)"
cd ..
python3 -I tools/build_nav_todo.py
cd data
python3 -I ../tools/crawl.py todo-nav.jsonl crawl-nav.jsonl --rps 1.0 --threads 2 --tag nav --adaptive > crawl-nav.log 2>&1
echo "STAGE nav $(date -u +%T)"
for host in sod1820.co.il www.sod1820.co.il; do
  for i in 1 2 3 4 5 6; do
    code=$(curl -s -o robots-$host.txt -m 30 -A "Mozilla/5.0 (compatible; SOD1820-URL-Continuity-Audit/1.0; read-only)" -w '%{http_code}' https://$host/robots.txt)
    echo "$host robots.txt http=$code" >> robots-fetch.log
    [ "$code" = "200" ] && break
    sleep 20
  done
done
echo "STAGE robots $(date -u +%T)"
cd ..
python3 -I tools/merge_crawls.py data/crawl-merged.jsonl data/crawl-full.jsonl data/crawl-pass2.jsonl data/crawl-pass2b.jsonl data/crawl-pass3.jsonl data/crawl-pass4.jsonl data/crawl-pass4b.jsonl
python3 -I - <<'PY'
import json
def mit(r): return any(h.get('status') == 403 or h.get('mitigated') for h in r.get('hops', [])) or r.get('error') == 'mitigated'
uni = {}
for l in open('data/unified.jsonl'):
    u = json.loads(l); uni[u['key']] = u
rows = [json.loads(l) for l in open('data/crawl-merged.jsonl')]
todo = [r for r in rows if mit(r)]
todo.sort(key=lambda r: -((uni.get(r['key'], {}).get('impr')) or 0))
todo = todo[:200]
with open('data/todo-pass5.jsonl', 'w', encoding='utf8') as fh:
    for r in todo: fh.write(json.dumps({'key': r['key'], 'fetch': r['fetch'], 'cls': 'census'}, ensure_ascii=False) + '\n')
print('pass5 todo', len(todo))
PY
cd data
python3 -I ../tools/crawl.py todo-pass5.jsonl crawl-pass5.jsonl --rps 1.0 --threads 3 --tag pass5 --adaptive > crawl-pass5.log 2>&1
echo "STAGE pass5 $(date -u +%T)"
echo "ALL DONE $(date -u +%T)"
