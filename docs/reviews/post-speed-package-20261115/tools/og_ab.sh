#!/bin/bash
# interleaved cold-process A/B of three og.js variants against the production Supabase REST endpoint (read-only)
cd "$(dirname "$0")/.." || exit 1
export NODE_PATH=/usr/local/lib/node_modules_global
out=data/og-ab.jsonl; : > $out
python3 -I - <<'PY' > data/og_paths.tsv
import json
d=json.load(open('data/sample-posts.json')); posts=d if isinstance(d,list) else d.get('posts',d)
sel={p['key']:p['path'] for p in posts}
for k in ('O1','O3','O4','N1'): print(k+'\t'+sel[k])
PY
for rep in 1 2 3 4 5 6 7 8; do
  while IFS=$'\t' read -r key path; do
    for arm in base parallel invariant; do
      case $arm in base) mod=$PWD/wt-main/api/og.js;; parallel) mod=$PWD/wt-a/api/og.js;; invariant) mod=$PWD/wt-a/api/og_in_variant.js;; esac
      r=$(nice -n 19 node tools/og_cold.mjs "$mod" "$path" 2>/dev/null | tail -n 1)
      echo "{\"rep\":$rep,\"post\":\"$key\",\"arm\":\"$arm\",\"r\":$r}" >> $out
      sleep 1.5
    done
  done < data/og_paths.tsv
done
echo done >> data/og-ab.done
