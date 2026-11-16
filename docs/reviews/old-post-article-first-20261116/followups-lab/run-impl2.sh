#!/bin/bash
# Follow-up series (16.11.2026, afternoon): A = combined base 978662134, B = the PR #1371 head with the follow-ups (frame and header, colours,
# smaller images, fonts, first-paint stylesheet). One unmeasured B pass per device first records the image copies (as the release warm-up would).
cd "$(dirname "$0")"
rm -f data/impl2-*.jsonl data/warm-*.jsonl
for dev in mobile desktop; do
  echo "== $dev warm-up $(date -u +%H:%M:%S)"; timeout 1800 node lab2.mjs data/cfg-warm-B-$dev.json data/warm-B-$dev.jsonl 2>&1 | grep -E "^done|Error"
  for arm in A B B A; do
    echo "== $dev block $arm $(date -u +%H:%M:%S)"
    timeout 2400 node lab2.mjs data/cfg-impl2-$arm-$dev.json data/impl2-$arm-$dev.jsonl 2>&1 | grep -E "^done|Error"
  done
done
echo "IMPL2 SERIES DONE $(date -u +%H:%M:%S)"
