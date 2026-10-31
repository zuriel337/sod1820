# ELS continuation and structure-count clarity

Actor/owner GPT · recipient ZURIEL · task ELS_SEARCH_CONTINUATION_STRUCTURE_CLARITY_20261030.
Base `fd8ac7f5fc170e3831203feb5613f0a1cb94ccac`, verified against remote
`gpt/els-lexicon-structure-preview-20261030` before writing and again before delivery.
Isolated branch `gpt/els-search-continuation-structure-clarity-20261031`.

## Bounded BEFORE / cause

Read AGENTS, linked coordination/owner instructions, active ELS v9 and single-engine
v2 contracts, and the 2029 Design V2 typography/responsive rules. Live relevant
latest-per-task `work_log_current` ownership was checked through the authorized
read-only connection; no overlapping writer was found. This file is a passive
coordination receipt for the authorized coordinator, not a claimed live log write.

The screenshot's zeroes were **structure relations over selected findings**, not
the primary phrase search count. With only the axis selected there cannot be a
pair. `0/3` described empty temporary comparison slots, not zero search results.

Reproduced `יום משיח בא` with the actual canonical browser discovery implementation
and corpus: one hit `583_-1_239480`, `capped=0`, ANCHOR_FAST_V1. The initial independent
ordered low-skip page ended at 50. The old UI offered continuation simply because
`ordered.max < 500`, even though the primary collector had exhausted its search.
That condition evaluated true for this completed phrase and suggested a redundant
scan through 100. There is no phrase-specific runtime rule in the fix.

## Fix

- Existing discovery collectors expose their execution exhaustion as
  `discoveryComplete`; the verifier preserves it rather than inventing it for
  exact-only/saved candidates. Matching, caps and verifier authority are unchanged.
- One small projection in the existing tool decides whether an actual page,
  retry or uncompleted ordered range is available. Completed or unknown exact-only
  results do not invent continuation. A stale/manual continue command also makes
  no request when continuation is absent.
- The shared regular result rail used by Classic and Research uses that projection.
  Real bounded continuation remains (for example 51–100); it does not promise that
  another occurrence will be found. Local exhaustion never becomes a canonical
  NOT_FOUND claim.
- Structure inspection explains how to select findings, links to the existing
  secondary search and explicit lexical disclosure, and says that one axis is not
  a pair. Opening these controls does not load a dictionary or invoke AI.
- Empty comparison slots now say no snapshots have been added. Existing comparison
  limit, exact restore and temporary lifetime are unchanged. No automatic pair
  discovery or automatic admission of AI overlays was added.

User flow: search the axis → add/select another finding using secondary search or
explicit “מילים במטריצה” / “בדוק והוסף” → “בדוק מבנים בממצאים שנבחרו”. The inspection
compares the selected verified occurrences for parallel lines, same lines and shared
letters; it does not search every possible word. Known terms can also be entered
in the existing crossed-axis search; this is a different operation from inspection.

## Files

- `tools/els/els-code.template.html` and generated `public/tzofen.html`.
- `src/components/experience2029/ElsNativeClassic2029.jsx`.
- `src/components/experience2029/ElsStructureResearch2029.jsx`.
- New `test/els-continuation-availability.test.mjs`.
- `test/els-native-ui-browser.test.mjs`.
- This receipt.

## Verification

- Focused execution/continuation, parity, structure and truth-boundary tests: 25/25.
- Broader adaptive-router, continuation, structure, exact return, ELS/Raziel context
  and global-session regression: 42/42, no skips.
- Focused real-tool Native browser: 3/3. The new test searches the actual phrase at
  320/1440, finds the exact reverse 583 identity, checks both profiles, verifies the
  single-axis explanation and manual addition, and checks all three presets without
  overflow. It observes zero AI/dictionary/verse-word-list requests. Existing
  historical search acceptance proves real 51–100 continuation still works.
- Additional browser: 3/3 (Advanced/Guided, non-AI background return/cancel, global
  Raziel responsive). Global Raziel includes 320/390/768/1440 and mixed text.
- Standard Legacy and 2029 builds pass with real dependencies, no stubs. Built
  dependency graph/budget passes (419466 eager JS gzip bytes), isolation,
  cheap hardening, Legacy Production lock and `git diff --check` pass.
- Full Native browser: **53/53**, no failures, cancellations or skips (497.6 s).
  Includes private/public save, both search scopes, exact skip/no-hit, connected
  cross results, actual continuation and responsive design in three presets at
  320/390/1440. No timeout or expected-result relaxation was used.

Browser verification uses the real React/tool/corpus with declared verification
fixtures. It is not an authenticated live-server, paid-model or live-save test.
Screenshots at 320 and 1440 were inspected. New JSX follows the existing design
tokens and explicit event handlers; no new effects, provider or heavyweight eager
dependency were introduced.

## Release boundary / AFTER

No deploy in this cut. The earlier protected Preview remains at runtime
`fb9a2bf8278f09da9e0ba005463d024cc4ebc3b7`; this fix is not claimed to be on that URL.
No main merge, Production, Edge deploy, DB/RLS, pricing, model call, experiment-ledger
change, Provider or SystemFrame change. Remote main remains
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.
Status: IMPLEMENTED / TESTED / BRANCH-ONLY. Scope released with this passive AFTER
to ZURIEL. The exact delivered HEAD/range are in the delivery message; this file
does not claim insertion of a live `work_log` row or delivery to another agent.
