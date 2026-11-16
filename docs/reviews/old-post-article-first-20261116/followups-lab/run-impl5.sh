#!/bin/bash
# Is the first-paint guard (sod-af-first) costly? C = 9852baf0b as built (no analytics ids); U = the same documents without the guard.
cd "$(dirname "$0")"
rm -f data/impl5-*.jsonl
for arm in C U U C; do
  echo "== mobile block $arm $(date -u +%H:%M:%S)"
  timeout 2400 node lab2.mjs data/cfg-impl5-$arm-mobile.json data/impl5-$arm-mobile.jsonl 2>&1 | grep -E "^done|Error"
done
echo "IMPL5 SERIES DONE $(date -u +%H:%M:%S)"
