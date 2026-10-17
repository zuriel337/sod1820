# Rail fix — a wide return keeps Home's width (independent package)

task_key `CLAUDE_PERF_2029_NEXT_WAVE_20261016` · actor CLAUDE · to ZURIEL, passive (no dispatch, no ACK wait)
Branch `claude/perf-rail-fix-20261016`, from `f60d078822a40d0940860a98470930e3e9fb59d5` (the head the closing round started from). Code commit **`c2ef5064ba161eeb2e5ae14443a1963fd592d524`**; the document commit that carries this file and the evidence follows it.
State: **BRANCH-ONLY**. Not merged, not deployed, no pull request. Frame code only: no Home hook, no restorer, no Legacy, no database / RLS, no live switch.
Input of every measurement is the **synthetic** `smoke-snapshot-3.json.gz` (sha256 `d3f8f58e…a686`, not committed): layout and behavior, no speed claim. **Real-corpus acceptance is `BLOCKED_INPUT`** (the private central corpus is not reachable from here).

## What it is

On a wide screen (≥ 981 px) the context rail is drawn inside the companion capsule, not in the main stage. The main stage nevertheless marked itself `has-context-rail` whenever a context subject existed, which reserves a grid column (286 px + gap) for a rail that is not there. Home's first visit has no subject; the return from a Post has one. So Home was laid out at one width on the first visit and at a narrower one on the return, every remembered box (keyed to the width) was released, and the capsule opened from 56 to 340 px after Home had mounted.

Two pure decisions (`src/components/experience2029/frameLayout2029.js`), used by `SystemFrame2029.jsx`:
* `stageReservesRail`: Home reserves no column for a rail the capsule carries; every other surface keeps exactly the old rule.
* `autoPeekForSubject`: a subject Home was entered with does not open the capsule by itself (a return restores the surface as it was left); a subject that appears while Home is shown still opens it.

Tests (`test/frame-rail-width-2029.test.mjs`, 10): the decision table over every surface × input against a verbatim copy of the old rules; the frame's real stylesheets in Chromium (the reservation changes the width Home gets, the new rule does not); the frame source uses the decisions (an inline revert fails). `node scripts/test-2029-system-frame.mjs` (gate 04) passes.

## The real app, A = `f60d0788`, B = this commit (`results/`, scrubbed of content text, signed: A tree `17ae563a53d7…`, B tree `488ea16e2369…`)

| configuration | pairs | A: CLS of the return | B: CLS of the return | Home's column, first visit → end of the return | capsule at the end |
|---|---|---|---|---|---|
| desktop 1440 × 900, Back from a Post | 10 | 0.063–0.212, median 0.161, **7 of 10 above 0.1** | **0.024–0.044**, median 0.024 | A 1112 → **978** (10/10) · B 1112 → 1112 | A `is-peek` (opened after Home mounted) · B `is-slim` |
| 1440, Forward + Back, deliberate scroll, capsule probe | 3 | 0.087 · 0.166 · 0.177 | 0.044 · 0.024 · 0.044 | A 978 · B 1112 | A `is-peek` · B `is-slim` |
| 1920 × 1080, same | 3 | 0.073 · 0.029 · 0.079 | 0.028 · 0.014 · 0.028 | 1112 → 1112 on both (the free space is wide enough at 1920) | A `is-peek` · B `is-slim` |
| phone 390 × 844, same (no-regression check: the decision is the old rule off the capsule) | 3 | 0.026 · 0.037 · 0.027 | 0.017 · 0.026 · 0.032 | – | – |
| phone 320 × 640, same | A 1/3 · B 2/3 valid | 0.027 | 0.031 · 0.025 | – | – |

Reading place (block displacement) 0 px in every valid sample on both arms; the rail is not hidden (probe `--capsule 1`: the capsule is there with its context indicator and opens on hover with the same rail and context). The earlier signed evidence of the same code (`eed39c9a`, 38 results) is in `docs/perf-evidence-20261016/closing-round/` of `claude/perf-next-wave-20261016`.
The runner and the readiness tool are those of `claude/perf-next-wave-20261016` at `4fb99138` (`docs/perf-evidence-20261016/home-stability-v3/`), run with `--profile desktop|mobile`, `--armShas`, `--corpus synthetic`.

## Not part of this package

The other surfaces' empty column on a wide screen (Post, Topic, World, Number … still reserve a column for a rail drawn in the capsule; a design call for the frame owner, D7 in `docs/perf-evidence-20261016/next-wave/dependency-handoff-20261016.md` of the other branch); the settled-box hook and its space limit; the story block's transient at 320.
