#!/bin/bash
# Final server A/B: main's api/og.js against the shipped package A api/og.js, interleaved, cold process then warm pool, real network (read-only REST reads of public posts).
# Run it alone (no lab running); 8 repetitions; one request at a time.
cd "$(dirname "$0")/.." || exit 1
export NODE_PATH=/usr/local/lib/node_modules_global
out=data/og-ab-final.jsonl; : > $out
for rep in 1 2 3 4 5 6 7 8; do
  while IFS=$'\t' read -r key path; do
    for arm in base final; do
      case $arm in base) mod=$PWD/wt-main/api/og.js;; final) mod=$PWD/wt-a/api/og.js;; esac
      r=$(nice -n 19 node tools/og_cold.mjs "$mod" "$path" 2>/dev/null | tail -n 1)
      echo "{\"rep\":$rep,\"post\":\"$key\",\"arm\":\"$arm\",\"head\":\"$(git -C $(dirname $(dirname $mod)) rev-parse --short HEAD)\",\"r\":$r}" >> $out
      sleep 1.5
    done
  done < data/og_paths.tsv
done
echo done >> data/og-ab-final.done
