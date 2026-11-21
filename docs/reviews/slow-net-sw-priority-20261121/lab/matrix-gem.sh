#!/bin/bash
# profiles: name kbps rtt
S=/tmp/claude-0/-home-user-sod1820/c9b833e8-a63a-5dad-96a0-96133df72f23/scratchpad; L=$S/slowlab; OUT=$L/results-gem.jsonl; : > $OUT
RP_BEFORE=$S/wt-main/public-reading-deploy/route-preload.js; RP_AFTER=$S/wt-slow/public-reading-deploy/route-preload.js
for prof in "fast 0 20" "slow4g 1600 150" "3g 750 300" "slow3g 400 400"; do set -- $prof
  for arm in before after; do RP=$RP_BEFORE; [ $arm = after ] && RP=$RP_AFTER
    node $L/server.mjs $S/lab-$arm $RP 4620 $2 $3 > $L/server.log 2>&1 & SP=$!; sleep 1.5
    reps=2; [ $1 = fast ] && reps=3
    NODE_TLS_REJECT_UNAUTHORIZED=0 node $L/run.cjs https://localhost:4620 $arm $1 "/gematria,/post/manhigut-shel-emet-rut-kedem-20261026" $reps $OUT > /dev/null 2>&1
    kill $SP; wait $SP 2>/dev/null
  done
done
echo DONE
