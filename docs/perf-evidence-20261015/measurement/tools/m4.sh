#!/bin/bash
S=/tmp/claude-0/-home-user-sod1820/e4e9c48d-c94f-5113-9932-18e06b01e800/scratchpad
export PLAYWRIGHT_DIR=/opt/node22/node-tools
for pass in 1 2; do
  if [ $pass = 1 ]; then MODES="off world db both"; else MODES="both db world off"; fi
  for t in number other; do for m in $MODES; do node $S/wd-measure2.mjs $S $S/dist-N $m $t 4 $S/out/m4/replay-$m-$t-p$pass.json replay >> $S/out/m4/run.log 2>&1; done; done
done
echo done >> $S/out/m4/run.log
