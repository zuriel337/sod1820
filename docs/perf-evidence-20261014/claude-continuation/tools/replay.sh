#!/bin/bash
# usage: replay.sh <label> <dist> [extra args]
S=/tmp/claude-0/-home-user-sod1820/e4e9c48d-c94f-5113-9932-18e06b01e800/scratchpad
cd /home/user/sod1820
export PLAYWRIGHT_DIR=/opt/node22/node-tools PERF_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
L=$1; D=$2; shift 2
node scripts/perf-execution-2029/measure.mjs --mode replay --runs 7 --dist $S/$D --out $S/out/$L.json --fixtures $S/fix.json.gz --label $L "$@" 2>&1 | tail -3
