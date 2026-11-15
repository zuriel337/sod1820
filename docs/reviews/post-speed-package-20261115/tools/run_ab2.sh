#!/bin/bash
# Sequential lab chain: stages named ret-* use lab3.mjs (returning visitor, trusted certificate), every other stage lab2.mjs. LOG env selects the log file.
cd "$(dirname "$0")" || exit 1
export NODE_PATH=/usr/local/lib/node_modules_global
LOG=${LOG:-../data/ab5.log}
for name in "$@"; do
  echo "STAGE $name start $(date -u +%T)" >> $LOG
  rm -f ../data/$name.jsonl
  case $name in ret-*) script=lab3.mjs;; *) script=lab2.mjs;; esac
  node $script ../data/cfg-$name.json ../data/$name.jsonl >> $LOG 2>&1
  echo "STAGE $name end $(date -u +%T)" >> $LOG
done
echo "ALL DONE $(date -u +%T)" >> $LOG
