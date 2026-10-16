#!/usr/bin/env bash
# Sequential scenario matrix for the Home return-stability / readiness evidence (one browser run at a time, so runs never compete for CPU).
# usage: FX=/path/snapshot.json.gz SOD_CI_SNAPSHOT_SHA256=<sha256 of FX> SCRATCH=/path/with/dist-A,dist-B OUT=/path/for/raw ./run-matrix.sh [group ...]
#   dist-A = the base build, dist-B = the build under test (both from exact commits; record the SHAs next to the results).
# Every run goes through the shared isolation (scripts/ci-isolation/run.mjs): the corpus must be a decodable shared-format snapshot (runner.mjs refuses anything else),
# an unmapped request invalidates the sample and fails the run, nothing is sent to a live service. mobile 390x844 DPR2 CPU x4, CDP 1.6 Mbps / 150 ms unless a scenario says otherwise.
# Groups: core load late gate resize states backfail interrupt widths themes   (widths need fixtures for 320/1440/1920 in the corpus; without them those runs are BLOCKED, not PASS)
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; REPO="$(cd "$HERE/../../.." && pwd)"
S="${SCRATCH:?SCRATCH}"; O="${OUT:?OUT}"; FX="${FX:?FX}"; : "${SOD_CI_SNAPSHOT_SHA256:?SOD_CI_SNAPSHOT_SHA256}"; mkdir -p "$O"
ARMS_AB="A=$S/dist-A,B=$S/dist-B"
PRIVATE="${PRIVATE:-$O/../private-misses-$(date +%s).json}"
# POST: auto = the first visible Home post control whose complete body is in the corpus; set POST=/post/slug to pin it
POST="${POST:-auto}"
run() { local name="$1"; shift; echo "== $name: $*" >&2
  node "$REPO/scripts/ci-isolation/run.mjs" -- node "$HERE/runner.mjs" --fx "$FX" --private "$PRIVATE" "$@" --out "$O/$name.json" > "$O/$name.log" 2>&1; echo "exit $?" >> "$O/$name.log"
  node "$HERE/summarize.mjs" --in "$O/$name.json" --base "${BASE:-A}" --cand B --json "$O/$name.summary.json" --md "$O/$name.summary.md" 2>>"$O/$name.log" || true; }
groups=("$@"); [ ${#groups[@]} -eq 0 ] && groups=(core load late gate resize states backfail interrupt widths themes)
for g in "${groups[@]}"; do case "$g" in
  core)      BASE=A run core-back-AB-10pairs --arms "$ARMS_AB" --pairs 10 --mode back --post "$POST" ;;
  load)      BASE=A run cold-load-AB-7pairs --arms "$ARMS_AB" --pairs 7 --mode load ;;
  late)      for L in 150 900 1800 3200; do BASE=A run late-$L-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode back --post "$POST" --late $L; done ;;
  gate)      BASE=A run gate-late-2500-AB-4pairs --arms "$ARMS_AB" --pairs 4 --mode back --post "$POST" --gateDelay 2500
             BASE=A run gate-closed-after-open-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode back --post "$POST" --gate closed ;;
  resize)    for W in 320 1440; do BASE=A run resize-$W-during-hold-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode back --post "$POST" --late 3200 --resize $W; done ;;
  states)    for ST in empty error outage; do BASE=A run state-$ST-load-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode load --state $ST; done ;;
  backfail)  for ST in error outage; do BASE=A run state-$ST-back-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode back --post "$POST" --state $ST --stateFrom back; done ;;
  interrupt) for T in 250 600; do BASE=A run interrupt-$T-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode back --post "$POST" --interruptAt $T; done ;;
  widths)    for W in 320:640 390:844 1440:900 1920:1080; do BASE=A run width-${W%%:*}-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode back --post "$POST" --width ${W%%:*} --height ${W##*:}; done ;;
  themes)    for T in light parchment; do BASE=A run theme-$T-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode back --post "$POST" --theme $T; done
             BASE=A run reduced-motion-AB-3pairs --arms "$ARMS_AB" --pairs 3 --mode back --post "$POST" --reduced 1 ;;
  *) echo "unknown group $g" >&2 ;;
esac; done
echo "matrix done" >&2
