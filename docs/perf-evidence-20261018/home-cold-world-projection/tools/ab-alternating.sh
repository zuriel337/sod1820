#!/bin/bash
# Order-alternating A/B (odd rounds before->after, even rounds after->before): the second run of a pair is faster
# (network/proxy warm-up), so a fixed order would credit that effect to whichever variant ran second.
# usage: ab-alternating.sh <dist-before> <dist-after> <out-dir> <profile mobile|desktop> <rounds> <window-ms>
BEFORE=$1; AFTER=$2; OUT=$3; P=$4; N=$5; W=$6
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT"
for i in $(seq 1 "$N"); do
  if [ $((i % 2)) -eq 1 ]; then ORDER="before after"; else ORDER="after before"; fi
  for V in $ORDER; do
    DIST=$BEFORE; [ "$V" = after ] && DIST=$AFTER
    node "$HERE/measure-home.mjs" --dist "$DIST" --label "$V" --profile "$P" --runs 1 --window "$W" --out "$OUT/$P-$V-$i.json" > /dev/null 2>&1
  done
done
