#!/bin/bash
cd "$(dirname "$0")"
rm -f data/impl-A-mobile.jsonl data/impl-B-mobile.jsonl data/impl-A-desktop.jsonl data/impl-B-desktop.jsonl
for dev in mobile desktop; do
  for arm in A B B A; do
    echo "== $dev block $arm $(date -u +%H:%M:%S)"
    timeout 2400 node lab2.mjs data/cfg-impl-$arm-$dev.json data/impl-$arm-$dev.jsonl 2>&1 | grep -E "^done|Error"
  done
done
echo "IMPL SERIES DONE $(date -u +%H:%M:%S)"
