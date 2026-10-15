#!/bin/bash
S=/tmp/claude-0/-home-user-sod1820/e4e9c48d-c94f-5113-9932-18e06b01e800/scratchpad
export PLAYWRIGHT_DIR=/opt/node22/node-tools
for pass in 1 2; do
  if [ $pass = 1 ]; then MODES="off world"; else MODES="world off"; fi
  for t in number other; do for m in $MODES; do node $S/wd-measure2.mjs $S $S/dist-P $m $t 4 $S/out/p/replay-$m-$t-p$pass.json replay >> $S/out/p/run.log 2>&1; done; done
done
for r in 1 2 3; do for t in number other; do if [ $((r%2)) = 1 ]; then MODES="off world"; else MODES="world off"; fi; for m in $MODES; do node $S/wd-measure2.mjs $S $S/dist-P $m $t 1 $S/out/p/live-$m-$t-r$r.json live >> $S/out/p/run.log 2>&1; sleep 2; done; done; done
echo done >> $S/out/p/run.log
