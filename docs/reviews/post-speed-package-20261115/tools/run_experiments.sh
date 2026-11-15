#!/bin/bash
# Sequential lab experiments (fixture mode: no live traffic). Usage: run_experiments.sh name1 name2 ...
cd "$(dirname "$0")" || exit 1
export NODE_PATH=/usr/local/lib/node_modules_global
for name in "$@"; do
  echo "STAGE $name start $(date -u +%T)" >> ../data/experiments.log
  rm -f ../data/$name.jsonl
  node lab.mjs ../data/cfg-$name.json ../data/$name.jsonl >> ../data/experiments.log 2>&1
  echo "STAGE $name end $(date -u +%T)" >> ../data/experiments.log
done
echo "ALL DONE $(date -u +%T)" >> ../data/experiments.log
