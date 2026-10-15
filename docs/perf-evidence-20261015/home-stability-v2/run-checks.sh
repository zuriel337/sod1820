#!/bin/bash
# Compact B checks (one successful sample each, all attempts retained in raw/). Usage: run-checks.sh DIST_B
D=$1; R="node runner.mjs --arms B=$D --pairs 1"
for L in 150 900 1800 3200; do $R --late $L --out raw/late-$L.json --shot raw/shot-late-$L; done
$R --interrupt 1 --out raw/interrupt.json
$R --width 320 --height 640 --out raw/w320.json --shot raw/shot-w320
$R --width 360 --height 740 --out raw/w360.json --shot raw/shot-w360
$R --width 1440 --height 900 --out raw/w1440.json --shot raw/shot-w1440
$R --theme light --out raw/theme-day.json --shot raw/shot-day
$R --theme parchment --out raw/theme-parchment.json --shot raw/shot-parchment
$R --theme dark --out raw/theme-night.json --shot raw/shot-night
$R --reduced 1 --out raw/reduced.json --shot raw/shot-reduced
$R --state empty --out raw/state-empty.json --shot raw/shot-empty
$R --state error --out raw/state-error.json --shot raw/shot-error
echo ALLDONE
