# Anatomy pilot — ריבוע 5787 (`תפרצי בתשפז`) inside the existing spatial stack

Branch-only experiment (2026-11-15). No DB, contract, Edge, `main` or Production change. No new route, engine, calculator, CSS system or data model.

## What already existed (read from `origin/main` c2acc064 and canonical Supabase, read-only)

| Capability | Existing owner |
|---|---|
| Canonical numbers/steps | `public.gematria_method_trace('ריבוע', …)` → `CUMULATIVE_PREFIX`, `per_word_reset`, parity verified (3110 + 2677 = 5787) |
| Fetch + fail-closed projection | `gematriaTrace.js`, `gematriaTracePresentation.js` (`isVerifiedMethodTrace`, `projectGematriaTrace`) |
| Interactive method illustration | `SpatialMethodStage2029` (Number page inspector, Beit Midrash, World source story/connections) |
| Opening from the station | `/2029/number/5787?focus=<expression>&method=ריבוע` (existing deep link) |
| Letter glyphs | `HebrewGlyph2029` (same 27 assets) |
| Spatial law | `docs/spatial-gematria-v2-contract.md` (projection, never a truth source) |

For ריבוע the stage fell through to the generic `TraceFamilyStage`: prefix step buttons only — no letter increment, no word subtotals, no closing equation.

## What "Anatomy" adds

Nothing as a separate capability. `hebrewLetterAnatomy` supplies letter-name spellings for מילוי methods; ריבוע has no spelling layer. **So no Anatomy component, scene or page was built.** The only real gap was a per-word accumulation view, built as one stage inside the existing file next to Milui/Regular/Kadmi/TriangleWord.

## What changed

- `SpatialMethodStage2029.jsx`: `RibuaStage` (dispatched from the existing entry point for `ריבוע`; degrades to the generic stage when the engine numbers are not internally consistent). Consumes `projectGematriaTrace`, parses nothing itself.
- `gematriaTracePresentation.js`: prefix rows also carry the engine `base_value` (`base`), so every consumer of the shared projection sees it.
- `spatialMethodStage2029.css`: 25 lines on the existing `--sms-*` tokens.
- Test + verbatim engine fixture, browser check script, this evidence.

## Requirements → status

| Requirement | Result |
|---|---|
| Data only from `gematria_method_trace` | Browser check ran against the live RPC through the Number page. No hardcoded 5787/תפרצי in the stage (test-enforced). |
| Opens from the existing station | Number-page inspector, same panel as every other method. |
| Shared-component change propagates | One component; test asserts all four consumers import it and no second public component exists. |
| Static state | Default: every step visible, no running animation (`getAnimations()` = 0 at rest). |
| Keyboard | Roving tabindex; ArrowLeft/Right (RTL), Up/Down, Home/End; prev/next buttons. |
| Reduced motion | `prefers-reduced-motion` and `data-frame-reduced-motion`: play control removed. |
| Pause off-screen | Play is user-initiated only; `IntersectionObserver` + `visibilitychange` stop it; one timer. |
| Mobile performance (390/320 px, 4× CPU) | 144 DOM nodes, 14 MB heap, frame-gap p95 17 ms while playing, ≤2 frames >50 ms in 3 s, 0 controls <44 px, min font 14 px, no horizontal overflow. CLS attributable to the stage: 0. |

Page-level CLS (not caused by this view): 0.19 at 390 px / 4× CPU for method `רגיל` versus 0.12 for `ריבוע` — the existing inspector opening shifts the page (`sod29-number-method-inspector`). Reported, not touched (fixed threshold ≤0.1 is a ZURIEL decision).

## Linking from the post 5107 unit

- `posts.content` of 5107 on the live DB contains no 5787 / תפרצי / ריבוע (only `פ״ז = 87 — מניין השנה תשפ״ז`).
- The 5787 unit exists only in open draft PR #1358 (`yamin-smol-2026-5787-1237-1158`, claim `c5787`, `PreviewUnitExtras2029.Engine()`), written by another active writer. Not imported or modified here.
- Link without duplication: that unit's Engine panel mounts the same `SpatialMethodStage2029` (props `expression`, `methodKey`, `trace` from `fetchGematriaMethodTrace`, which is the GPT handoff of 13.11), or links to the existing deep link above. Either way it receives this view for free. It needs the PR #1358 owner, so no change was made.

## Recommendation

Extend — but through the existing stage, not through Anatomy. The same pattern fits the other `CUMULATIVE_PREFIX` / `LETTER_LEDGER` variants (ריבוע גדול, משולש מילה, קדמי) with the same adapter. Do not create an Anatomy framework. Keep to ≤1 new stage per method family with the same verification gate and a test per family.

## Not done (needs separate approval)

- Vercel Preview deployment (CLAUDE.md rule 7 / 0.4 — protected Preview needs ZURIEL approval for an exact commit). Verified on a local production build + `vite preview` instead.
- Any merge, PR, DB, deploy or change to PR #1358.
