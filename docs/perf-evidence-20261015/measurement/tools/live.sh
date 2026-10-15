#!/bin/bash
S=/tmp/claude-0/-home-user-sod1820/e4e9c48d-c94f-5113-9932-18e06b01e800/scratchpad
export PLAYWRIGHT_DIR=/opt/node22/node-tools
for r in 1 2 3; do for t in number other; do if [ $((r % 2)) = 1 ]; then MODES="off world db both"; else MODES="both db world off"; fi; for m in $MODES; do node $S/wd-measure2.mjs $S $S/dist-N $m $t 1 $S/out/live/live-$m-$t-r$r.json live >> $S/out/live/run.log 2>&1; sleep 2; done; done; done
echo done >> $S/out/live/run.log
