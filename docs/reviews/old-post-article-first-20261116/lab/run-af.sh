#!/bin/bash
cd "$(dirname "$0")"
rm -f data/af-A-mobile.jsonl data/af-B-mobile.jsonl data/af-A-desktop.jsonl data/af-B-desktop.jsonl
for dev in mobile desktop; do
  for arm in A B B A; do
    echo "== $dev block $arm $(date -u +%H:%M:%S)"
    timeout 2400 node lab2.mjs data/cfg-af-$arm-$dev.json data/af-$arm-$dev.jsonl 2>&1 | grep -E "^done|Error"
  done
done
echo "AF SERIES DONE $(date -u +%H:%M:%S)"
