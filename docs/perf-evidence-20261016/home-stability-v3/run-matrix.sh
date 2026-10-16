#!/usr/bin/env bash
# Sequential scenario matrix for the Home return-stability / readiness evidence (one browser run at a time, so runs never compete for CPU).
# usage: FX=/path/snapshot.json.gz SOD_CI_SNAPSHOT_SHA256=<sha256 of FX> SCRATCH=/path/with/dist-A,dist-B OUT=/path/for/raw ./run-matrix.sh [group ...]
#   dist-A = the base build, dist-B = the build under test (both from exact commits; record the SHAs next to the results).
# Every run goes through the shared isolation (scripts/ci-isolation/run.mjs): the corpus must be a decodable shared-format snapshot (runner.mjs refuses anything else),
# an unmapped request invalidates the sample and fails the run, nothing is sent to a live service. mobile 390x844 DPR2 CPU x4, CDP 1.6 Mbps / 150 ms unless a scenario says otherwise.
#   PROFILE=mobile|desktop (default mobile; desktop = mouse wheel / keyboard / mouse click, isMobile=false, hasTouch=false, DPR 1), SHA_A / SHA_B = the exact commits of dist-A / dist-B, CORPUS = synthetic|central
#   (said by the caller, never guessed). Every result file carries its signatures (commits, dist-tree signature, input hash, tool hashes, environment); an unknown one stays null.
# Groups: core load late gate resize states backfail interrupt widths themes nav desk failnav recover deskcore mob   (widths need fixtures for 320/1440/1920 in the corpus; without them those runs are BLOCKED, not PASS)
#   nav = display and navigation acceptance: Back, Forward + Back again, a deliberate scroll, the identity of what Home shows, at four widths and three themes, early input, reduced motion, then the first entry at the same widths/themes
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; REPO="$(cd "$HERE/../../.." && pwd)"
S="${SCRATCH:?SCRATCH}"; O="${OUT:?OUT}"; FX="${FX:?FX}"; : "${SOD_CI_SNAPSHOT_SHA256:?SOD_CI_SNAPSHOT_SHA256}"; mkdir -p "$O"
ARMS_AB="A=$S/dist-A,B=$S/dist-B"
PROFILE="${PROFILE:-mobile}"; SIG="--profile $PROFILE"
SHAS=""; [ -n "${SHA_A:-}" ] && SHAS="A=$SHA_A"; [ -n "${SHA_B:-}" ] && SHAS="${SHAS:+$SHAS,}B=$SHA_B"
[ -n "$SHAS" ] && SIG="$SIG --armShas $SHAS"
[ -n "${CORPUS:-}" ] && SIG="$SIG --corpus $CORPUS"
PRIVATE="${PRIVATE:-$O/../private-misses-$(date +%s).json}"
# POST: auto = the first visible Home post control whose complete body is in the corpus; set POST=/post/slug to pin it
POST="${POST:-auto}"
# QUICK=1 uses the smaller pair counts (diagnostics); the default counts are the acceptance counts.
n() { if [ -n "${QUICK:-}" ]; then echo "$2"; else echo "$1"; fi; }
run() { local name="$1"; shift; echo "== $name: $*" >&2
  node "$REPO/scripts/ci-isolation/run.mjs" -- node "$HERE/runner.mjs" --fx "$FX" --private "$PRIVATE" $SIG "$@" --out "$O/$name.json" > "$O/$name.log" 2>&1; echo "exit $?" >> "$O/$name.log"
  node "$HERE/summarize.mjs" --in "$O/$name.json" --base "${BASE:-A}" --cand B --json "$O/$name.summary.json" --md "$O/$name.summary.md" 2>>"$O/$name.log" || true; }
groups=("$@"); [ ${#groups[@]} -eq 0 ] && groups=(core load late gate resize states backfail interrupt widths themes)
SHOTS="${SHOTS:-}"; SH=""; [ -n "$SHOTS" ] && SH="--shots $SHOTS"
for g in "${groups[@]}"; do case "$g" in
  core)      BASE=A run core-back-AB --arms "$ARMS_AB" --pairs $(n 10 5) --mode back --post "$POST" ;;
  load)      BASE=A run cold-load-AB --arms "$ARMS_AB" --pairs $(n 7 4) --mode load ;;
  late)      for L in 150 900 1800 3200; do BASE=A run late-$L-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --late $L; done ;;
  gate)      BASE=A run gate-late-2500-AB --arms "$ARMS_AB" --pairs $(n 4 2) --mode back --post "$POST" --gateDelay 2500
             BASE=A run gate-closed-after-open-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --gate closed ;;
  resize)    for W in 320 1440; do BASE=A run resize-$W-during-hold-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --late 3200 --resize $W; done ;;
  states)    for ST in empty error outage; do BASE=A run state-$ST-load-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode load --state $ST; done ;;
  backfail)  for ST in error outage; do BASE=A run state-$ST-back-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --state $ST --stateFrom back; done ;;
  interrupt) for T in 250 600; do BASE=A run interrupt-$T-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --interruptAt $T; done ;;
  widths)    for W in 320:640 390:844 1440:900 1920:1080; do BASE=A run width-${W%%:*}-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --width ${W%%:*} --height ${W##*:}; done ;;
  themes)    for T in light parchment; do BASE=A run theme-$T-AB --arms "$ARMS_AB" --pairs $(n 3 1) --mode back --post "$POST" --theme $T; done
             BASE=A run reduced-motion-AB --arms "$ARMS_AB" --pairs $(n 3 1) --mode back --post "$POST" --reduced 1 ;;
  nav)       for W in 320:640 390:844 1440:900 1920:1080; do BASE=A run nav-width-${W%%:*}-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --width ${W%%:*} --height ${W##*:} --forward 1 --deliberate 1 $SH; done
             for T in light parchment; do BASE=A run nav-theme-$T-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --theme $T --forward 1 --deliberate 1 $SH; done
             BASE=A run nav-reduced-motion-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --reduced 1 --forward 1 --deliberate 1 $SH
             for T in 250 600; do BASE=A run nav-interrupt-$T-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --interruptAt $T $SH; done
             for W in 320:640 390:844 1440:900 1920:1080; do BASE=A run nav-load-width-${W%%:*}-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode load --width ${W%%:*} --height ${W##*:} $SH; done
             for T in light parchment; do BASE=A run nav-load-theme-$T-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode load --theme $T $SH; done ;;
  desk)      # a person with a mouse and a keyboard (PROFILE=desktop): the wide layouts, Back / Forward + Back again, a deliberate scroll (wheel and keys), early input by wheel and by key, themes, then the first entry
             for W in 1440:900 1920:1080; do BASE=A run desk-width-${W%%:*}-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --width ${W%%:*} --height ${W##*:} --forward 1 --deliberate 1 --capsule 1 $SH; done
             for T in light parchment; do BASE=A run desk-theme-$T-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --width 1440 --height 900 --theme $T --forward 1 --deliberate 1 $SH; done
             for T in 250 600; do BASE=A run desk-interrupt-wheel-$T-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --width 1440 --height 900 --interruptAt $T --input wheel $SH; done
             for T in 250 600; do BASE=A run desk-interrupt-key-$T-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --width 1440 --height 900 --interruptAt $T --input key $SH; done
             for ST in error outage; do BASE=A run desk-state-$ST-back-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --width 1440 --height 900 --state $ST --stateFrom back $SH; done
             for W in 1440:900 1920:1080; do BASE=A run desk-load-width-${W%%:*}-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode load --width ${W%%:*} --height ${W##*:} $SH; done ;;
  mob)       # the phone half of the acceptance (PROFILE=mobile): 320 and 390, Back / Forward + Back again, a deliberate scroll, themes, reduced motion, early touch, then the first entry
             for W in 320:640 390:844; do BASE=A run mob-width-${W%%:*}-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --width ${W%%:*} --height ${W##*:} --forward 1 --deliberate 1 $SH; done
             for T in light parchment; do BASE=A run mob-theme-$T-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --theme $T --forward 1 --deliberate 1 $SH; done
             BASE=A run mob-reduced-motion-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --reduced 1 --forward 1 --deliberate 1 $SH
             for T in 250 600; do BASE=A run mob-interrupt-$T-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --interruptAt $T $SH; done
             for W in 320:640 390:844; do BASE=A run mob-load-width-${W%%:*}-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode load --width ${W%%:*} --height ${W##*:} $SH; done ;;
  recover)   # a failure on the return that is over by the next entry: the fresh entry (second return) loads fine. The price of starting a failed area at the bound is measured here.
             for W in ${WIDTHS:-320:640 390:844 1440:900 1920:1080}; do BASE=A run recover-${W%%:*}-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --width ${W%%:*} --height ${W##*:} --state error --stateFrom back --forward 1 --recover 1 $SH; done ;;
  deskcore)  # the wide return at 1440 on a desktop profile, the case the central session reproduced: more pairs, because 2 are not an acceptance (CORE_PAIRS, default 10)
             BASE=A run desk-core-1440-AB --arms "$ARMS_AB" --pairs ${CORE_PAIRS:-10} --mode back --post "$POST" --width 1440 --height 900 ;;
  failnav)   # failures on a return, then Forward + Back again (a fresh entry to Home): what the document ends with and what the reading place does. WIDTHS="320:640 390:844" PROFILE=mobile, or WIDTHS="1440:900 1920:1080" PROFILE=desktop
             for W in ${WIDTHS:-320:640 390:844 1440:900 1920:1080}; do for ST in error outage; do BASE=A run failnav-$ST-${W%%:*}-AB --arms "$ARMS_AB" --pairs $(n 3 2) --mode back --post "$POST" --width ${W%%:*} --height ${W##*:} --state $ST --stateFrom back --forward 1 $SH; done; done ;;
  *) echo "unknown group $g" >&2 ;;
esac; done
echo "matrix done" >&2
