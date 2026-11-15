#!/bin/bash
# Sequential lab A/B series (fixture mode: no live traffic). Cold stages are interleaved: round 1 base,b,c1,c2,int; round 2 int,c2,c1,b,base.
cd "$(dirname "$0")" || exit 1
export NODE_PATH=/usr/local/lib/node_modules_global
LOG=${LOG:-../data/ab.log}
for name in "$@"; do
  echo "STAGE $name start $(date -u +%T)" >> $LOG
  rm -f ../data/$name.jsonl
  node lab2.mjs ../data/cfg-$name.json ../data/$name.jsonl >> $LOG 2>&1
  echo "STAGE $name end $(date -u +%T)" >> $LOG
done
echo "ALL DONE $(date -u +%T)" >> $LOG
