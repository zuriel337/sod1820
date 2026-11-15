#!/bin/bash
# wait for the main A/B series, then run the long-settle (uncensored LCP) series
cd "$(dirname "$0")" || exit 1
while ! grep -q "^ALL DONE" ../data/ab.log; do sleep 15; done
export NODE_PATH=/usr/local/lib/node_modules_global
LOG=../data/ab2.log; : > $LOG
for name in "$@"; do
  echo "STAGE $name start $(date -u +%T)" >> $LOG
  rm -f ../data/$name.jsonl
  node lab2.mjs ../data/cfg-$name.json ../data/$name.jsonl >> $LOG 2>&1
  echo "STAGE $name end $(date -u +%T)" >> $LOG
done
echo "ALL DONE $(date -u +%T)" >> $LOG
