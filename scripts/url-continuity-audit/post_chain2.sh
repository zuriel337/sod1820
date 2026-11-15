#!/bin/bash
# After the HTTP passes: light browser re-check -> navigation-link reachability -> robots.txt bodies. Sequential, low volume.
cd "$(dirname "$0")/.." || exit 1
until grep -q "hosts finished" data/post-pass4.log 2>/dev/null; do sleep 5; done
echo "browser start $(date -u +%T)"
cd data
LIGHT=1 node ../tools/pw_browser.cjs browser-sample-3.json browser-3.jsonl 2 > browser-3.log 2>&1
echo "browser finished $(date -u +%T)"
cd ..
python3 -I tools/build_nav_todo.py
cd data
python3 -I ../tools/crawl.py todo-nav.jsonl crawl-nav.jsonl --rps 1.0 --threads 2 --tag nav --adaptive > crawl-nav.log 2>&1
echo "nav finished $(date -u +%T)"
# robots.txt bodies (apex + www), a few polite retries each if the platform denies this IP
for host in sod1820.co.il www.sod1820.co.il; do
  for i in 1 2 3 4 5 6; do
    code=$(curl -s -o robots-$host.txt -m 30 -A "Mozilla/5.0 (compatible; SOD1820-URL-Continuity-Audit/1.0; read-only)" -w '%{http_code}' https://$host/robots.txt)
    echo "$host robots.txt http=$code" >> robots-fetch.log
    [ "$code" = "200" ] && break
    sleep 20
  done
done
echo "robots finished $(date -u +%T)"
