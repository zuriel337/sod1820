#!/bin/bash
# Fair re-run (16.11.2026, 14:05): C rebuilt WITHOUT the analytics ids, as A and B were built (impl3 C was built with them: gtag+fbevents 600 KB loaded only in C).
cd "$(dirname "$0")"
rm -f data/impl4-*.jsonl
for dev in mobile; do
  for arm in A C C A; do
    echo "== $dev block $arm $(date -u +%H:%M:%S)"
    timeout 2400 node lab2.mjs data/cfg-impl4-$arm-$dev.json data/impl4-$arm-$dev.jsonl 2>&1 | grep -E "^done|Error"
  done
done
echo "IMPL4 SERIES DONE $(date -u +%H:%M:%S)"
