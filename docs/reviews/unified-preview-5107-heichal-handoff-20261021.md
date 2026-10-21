# Unified preview handoff · Post 5107 + Heichal (analysis only, nothing merged) — 21.10.2026

**State:** read-only reconciliation. All trial merges were made in throwaway local worktrees and **not pushed**. No `main`, Production, flag, rule, DB, RLS or hosted-preview change. Product decision applied: all 2029 is a development preview; privacy/permissions stay binding; build/preview gates are **not** bypassed.
Prepared by the shell session (`SHELL_MOBILE_ISLAND_V1_5107_20261021`). Its write claim on the shell files is released with this handoff.

## 1. The lines (as fetched 21.10 ~00:50 UTC)
| Line | Head | Base lineage | vs `gpt/2029-unified-els-integration-20261020` (`e403217f`) |
|---|---|---|---|
| Shell V1 (this session) `claude/shell-mobile-island-5107-20261021` | `12b006b2`+ | PR #1137 → `claude/unified-post-shell-stacked` | 24 ahead / 15 behind, **merges clean** |
| Posts stage D `ccr-37d8f2ad-y091xn` | `10e4a9e2` | PR #1137 head `0ac833c1` | 22 / 15, **merges clean** |
| Frame fixes `claude/frame-preview-fixes-20261021` | `bc6d4bf8` | unified (1 commit on `e403217f`) | 1 ahead |
| Heichal stage 2 `claude/heichal-entry-stage2-20261020` | `37978247` | PR #1138 line | 26 / 417, **one doc conflict** (`AGENTS.md`) |

The 5107 shell branch **does exist on GitHub** (`origin/claude/shell-mobile-island-5107-20261021`); it was pushed before this note.

## 2. Real overlap with `bc6d4bf8` (the only textual conflict)
Shell V1 + `bc6d4bf8` conflict in **3 hunks in 2 files**; every one is mechanical:
1. `SurfaceContextRail2029.jsx`: keep the shell's `ShellPortal` block **and** add `question: "שאלה חופשית"` to `CONTEXT_TYPE_LABEL`.
2. `SystemFrame2029.jsx` (`RazielNativeChat`): keep the shell's `onBusyChange` effect **and** use `contextSubjectRef(context)`.
3. `SystemFrame2029.jsx` (renderTransient): keep the shell's pilot-gated merged "כלים ופעולות" sheet, take `bc6d4bf8`'s ACTION line (with `onReturnExact={returnExact}`), **and pass `onReturnExact={returnExact}` in the merged sheet's Actions tab** (otherwise the pilot loses the exact-return block on phones).
Not a semantic conflict: the two works touch different behavior (island/search/peek vs. free-question guards/return block). Not auto-merged.
`bc6d4bf8` + Heichal stage 2 and Heichal stage 2 + unified: only `AGENTS.md` (both sides add different sections; **keep both**: the unified "Mandatory review and release sequence" and the v17 reporting directive).

## 3. Fixes of `bc6d4bf8` worth adopting
- `freeQuestionContext.js` + frame guards (question never reaches number/gematria/save/research/follow/share; subject refs never print `phrase:<question>`): **adopt**.
- Rail label `question`: **adopt**.
- `ActionProjection onReturnExact` + `.sod29-panel-return` CSS: **adopt, with one product note** (section 5).
- `heichal-scripture-capabilities` test regex: **adopt** (same edit exists in the Heichal lineage; merges clean).
- **Canonical free-question predicate:** one module is enough — keep `src/lib/research/freeQuestionContext.js` and make `heichalEntryDirections.js` import and re-export it (today the predicate exists twice). It is strict (needs `entryIntent === "free_question"`, `subject.type === "phrase"`, a non-empty `entryQuestion`, no `entryExactExpression`, and `subject.id === entryQuestion`), and the only producer of that context is Heichal (checked by grep on all lines), so ordinary calculator phrases are unaffected.

## 4. What connecting Heichal to the unified preview needs (measured on a throwaway composite: unified + frame fixes + Heichal stage 2 + Posts D + shell V1)
Composite builds (`build:2029`) and passes: frame, experience-context, frame-free-question, Heichal stage 1/stage 2/guided-decoding/scripture, unified post shell, Posts D, shell V1 (18/18 after the test fix below). **One real failure:**
- **Route namespace mismatch.** Heichal's door/example hrefs use `/2029/calculator`, `/2029/journey`, `/2029/kingdom`; the unified `App2029.jsx` has `/gematria`, `/code`, `/books`, `/world`, `/heichal` and none of the three `/2029/…` routes. `test/heichal-entry-stage2.test.mjs` ("domain gates are navigation only") fails for exactly this reason. Needed: map the hrefs to the unified routes in one place (the route owner), without creating routes just for the teaser; `/2029/journey` and `/2029/kingdom` have no unified destination yet.
- Shell V1 tests were made forward-compatible with the optional `onReturnExact` prop (and a guard test now fails if the merged sheet drops it).
- Heichal stays **locked in this environment** ("ההיכל נמצא בהכנה") because the route is behind the existing `MaintenanceLock`/site flags; the Number page is locked the same way. Nothing here bypasses it.

### Hosted preview (read-only) — what is required, not done
The existing guard allows exactly one approved hosted branch (`HOSTED_HYBRID_BRANCH` in `scripts/hybrid-preview-source-boundary.mjs`, `vercel.json` `git.deploymentEnabled`, and the hosted-preview build test) with exact host/commit/shallow-checkout/read-only checks. A unified 5107 + Heichal preview needs a new approved review branch name added in those three places in the same one-line pattern as `gpt/2029-shell5107-hosted-review-20261020` (commits `805c14d0`, `cf410d44`, `de960a2c`), with no guard logic weakened. That is the release lane and needs ZURIEL's separate approval; whether the hosted build shows Heichal unlocked is a **site-flag question for that lane** and must not be solved with a bypass.

## 5. Exact return at 320 / 390 / 768 (measured, Chromium, post → /world, both `bc6d4bf8` alone and the shell+frame trial merge)
| State | 320 | 390 | 768 |
|---|---|---|---|
| Header return | hidden | hidden | hidden (hidden up to 980) |
| Mobile navigation sheet | 1 control, enabled, returns to the post | same | same |
| Action panel | 1 control (113px, wraps), returns to the post | 1 (113px) | 1 (51px) |
| Visible at the same time | never more than 1 (sheet and panel are exclusive overlays) | same | same |
Both branches behave identically; the trial merge adds nothing. **Product note:** the navigation sheet already carried Exact Return (Design V2 §§11.1–11.2 put it there), so the panel control is a second path, not a duplicate on screen; keep it or drop it is a product choice.
**Not verified:** a pilot-post round trip through the merged phone sheet (no return target is created when arriving by history in this environment; verified by code and test only), the Heichal→World→Heichal root/expression round trip with expression 776 and any Number-page path (those surfaces are locked here; the Heichal session reports it for its own lineage), and the free-question flow in the composite.

## 6. Suggested order (for the integration owner; nothing executed)
1. `e403217f` (unified) ← `bc6d4bf8` (fast-forward line). 2. ← Heichal stage 2 (resolve `AGENTS.md` as a union; fix Heichal hrefs to unified routes; import the predicate from `freeQuestionContext.js`). 3. ← Posts D `10e4a9e2`. 4. ← shell V1 `12b006b2` with the three resolutions in section 2. 5. Run the frame, Heichal, Posts and shell tests, then browser acceptance (320/390/768 × 3 themes, keyboard, anon/admin) before any hosted preview request.

## 7. Open decisions for ZURIEL
- Approve integration order and the href mapping owner. - Keep or drop the Action-panel return (product). - Approve a hosted-review branch for the unified preview (release lane). - Persistent share (v9) text is still `PROPOSED_ONLY`.
