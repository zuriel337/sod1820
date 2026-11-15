#!/bin/bash
# Waits for pass 4, then: merge+classify -> reciprocity targets -> special probes -> host/scheme variants (all low-rate, adaptive back-off).
cd "$(dirname "$0")/.." || exit 1
until grep -q "^done " data/crawl-pass4.log 2>/dev/null; do sleep 5; done
echo "pass4 finished $(date -u +%T)"
python3 -I tools/merge_crawls.py data/crawl-merged.jsonl data/crawl-full.jsonl data/crawl-pass2.jsonl data/crawl-pass2b.jsonl data/crawl-pass3.jsonl data/crawl-pass4.jsonl
python3 -I tools/classify.py data/crawl-merged.jsonl data/class-final > /dev/null
python3 -I tools/build_recip_todo.py data/class-final.json 100
cd data
python3 -I ../tools/crawl.py todo-recip.jsonl crawl-recip.jsonl --rps 1.0 --threads 3 --tag recip --adaptive > crawl-recip.log 2>&1
echo "recip finished $(date -u +%T)"
python3 -I ../tools/crawl.py todo-special.jsonl crawl-special.jsonl --rps 1.0 --threads 2 --tag special --adaptive > crawl-special.log 2>&1
echo "special finished $(date -u +%T)"
python3 -I ../tools/crawl.py todo-host-http-apex.jsonl crawl-host-http-apex.jsonl --rps 1.0 --threads 2 --origin http://sod1820.co.il --tag host --adaptive > crawl-host-http-apex.log 2>&1
python3 -I ../tools/crawl.py todo-host-https-www.jsonl crawl-host-https-www.jsonl --rps 1.0 --threads 2 --origin https://www.sod1820.co.il --tag host --adaptive > crawl-host-https-www.log 2>&1
python3 -I ../tools/crawl.py todo-host-http-www.jsonl crawl-host-http-www.jsonl --rps 1.0 --threads 2 --origin http://www.sod1820.co.il --tag host --adaptive > crawl-host-http-www.log 2>&1
python3 -I ../tools/crawl.py todo-host-vercel-app.jsonl crawl-host-vercel-app.jsonl --rps 1.0 --threads 2 --origin https://sod1820.vercel.app --tag host --adaptive > crawl-host-vercel-app.log 2>&1
echo "hosts finished $(date -u +%T)"
