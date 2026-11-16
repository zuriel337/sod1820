#!/bin/bash
# Confirmation series (16.11.2026, evening): A = combined base 978662134, C = PR #1371 head 9852baf0b (timeline on open, first-paint rules
# lead until every stylesheet has arrived, one Rubik file for Hebrew text and per-weight stand-ins). Same posts, profiles and settings as impl2.
cd "$(dirname "$0")"
rm -f data/impl3-*.jsonl
for dev in mobile desktop; do
  for arm in A C C A; do
    echo "== $dev block $arm $(date -u +%H:%M:%S)"
    timeout 2400 node lab2.mjs data/cfg-impl3-$arm-$dev.json data/impl3-$arm-$dev.jsonl 2>&1 | grep -E "^done|Error"
  done
done
echo "IMPL3 SERIES DONE $(date -u +%H:%M:%S)"
