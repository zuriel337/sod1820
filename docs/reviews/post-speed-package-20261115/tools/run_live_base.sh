#!/bin/bash
# Sequential narrow live baseline (never parallel). Stage markers go to data/live-base.log.
cd "$(dirname "$0")" || exit 1
export NODE_PATH=/usr/local/lib/node_modules_global
for name in live-m-cold live-m-warm-nav live-d-cold live-m-3p; do
  echo "STAGE $name start $(date -u +%T)" >> ../data/live-base.log
  node lab.mjs ../data/cfg-$name.json ../data/$name.jsonl >> ../data/live-base.log 2>&1
  echo "STAGE $name end $(date -u +%T)" >> ../data/live-base.log
  if grep -q "platform mitigation" ../data/live-base.log; then echo "ABORT mitigation" >> ../data/live-base.log; break; fi
done
echo "ALL DONE $(date -u +%T)" >> ../data/live-base.log
