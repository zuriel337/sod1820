#!/usr/bin/env bash
# Sequential scenario matrix for the Home return-stability / readiness evidence (one browser run at a time, so runs never compete for CPU).
# usage: SCRATCH=/path/with/dist-A,dist-X,dist-B OUT=/path/for/raw ./run-matrix.sh [group ...]
#   dist-A = base 7c3f43f3, dist-X = faithful HomeV2 port 0264aaf4, dist-B = candidate (built from the exact commit under test).
# Every run: mobile 390x844 DPR2 CPU x4, CDP 1.6 Mbps / 150 ms, fixtures frozen (fixtures-combined.json.gz, 106 keys), writes answered 204 and never sent.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; S="${SCRATCH:?SCRATCH}"; O="${OUT:?OUT}"; mkdir -p "$O"
ARMS_AXB="A=$S/dist-A,X=$S/dist-X,B=$S/dist-B"; ARMS_AB="A=$S/dist-A,B=$S/dist-B"; ARMS_XB="X=$S/dist-X,B=$S/dist-B"
POST="/post/chibur-bein-hasafot-mafteach-lagan"
run() { local name="$1"; shift; echo "== $name: $*" >&2; node "$HERE/runner.mjs" "$@" --out "$O/$name.json" > "$O/$name.log" 2>&1; echo "exit $?" >> "$O/$name.log"; node "$HERE/summarize.mjs" --in "$O/$name.json" --base "${BASE:-A}" --cand B --json "$O/$name.summary.json" --md "$O/$name.summary.md" 2>>"$O/$name.log" || true; }
groups=("$@"); [ ${#groups[@]} -eq 0 ] && groups=(load late gate resize states widths themes interrupt)
for g in "${groups[@]}"; do case "$g" in
  load)      BASE=A run cold-load-AB-7pairs --arms "$ARMS_AB" --pairs 7 --mode load ;;
  late)      for L in 150 900 1800 3200; do BASE=A run late-$L-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode back --post "$POST" --late $L; done ;;
  gate)      BASE=A run gate-late-2500-AXB-5pairs --arms "$ARMS_AXB" --pairs 5 --mode back --post "$POST" --gateDelay 2500
             BASE=A run gate-closed-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode back --post "$POST" --gate closed ;;
  resize)    BASE=X run resize-320-during-hold-XB-3pairs --arms "$ARMS_XB" --pairs 3 --mode back --post "$POST" --late 3200 --resize 320
             BASE=X run resize-1440-during-hold-XB-3pairs --arms "$ARMS_XB" --pairs 3 --mode back --post "$POST" --late 3200 --resize 1440 ;;
  states)    BASE=A run state-empty-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode load --state empty
             BASE=A run state-error-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode load --state error ;;
  widths)    BASE=A run width-320-AB-1pair --arms "$ARMS_AB" --pairs 1 --mode back --post "$POST" --width 320 --height 640
             BASE=A run width-1440-AB-1pair --arms "$ARMS_AB" --pairs 1 --mode back --post "$POST" --width 1440 --height 900 ;;
  themes)    for T in light parchment dark; do BASE=A run theme-$T-AB-2pairs --arms "$ARMS_AB" --pairs 2 --mode back --post "$POST" --theme $T; done
             BASE=A run reduced-motion-AB-2pairs --arms "$ARMS_AB" --pairs 2 --mode back --post "$POST" --reduced 1 ;;
  interrupt) BASE=A run interrupt-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode back --post "$POST" --interrupt 1 ;;
  *) echo "unknown group $g" >&2 ;;
esac; done
echo "matrix done" >&2
