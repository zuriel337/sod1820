#!/bin/bash
# wait for the currently running lab process, then run the remaining (trimmed) stages sequentially
cd "$(dirname "$0")" || exit 1
export NODE_PATH=/usr/local/lib/node_modules_global
while pgrep -f "node lab.mjs" > /dev/null; do sleep 5; done
for name in "$@"; do
  echo "STAGE $name start $(date -u +%T)" >> ../data/experiments.log
  rm -f ../data/$name.jsonl
  node lab.mjs ../data/cfg-$name.json ../data/$name.jsonl >> ../data/experiments.log 2>&1
  echo "STAGE $name end $(date -u +%T)" >> ../data/experiments.log
done
echo "ALL DONE (trimmed) $(date -u +%T)" >> ../data/experiments.log
