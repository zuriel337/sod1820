# ELS / Fable shared activity integration — 19 November 2026

Owner: existing Research Workspace / Raziel Session. Actor GPT; handoff to ZURIEL.
Branch `ccr-06bc2910-pgarr4`, PR #1397. Base `f5705ffaebd74523b8fea51055a40338143618b9`;
merged current main `66553879ea52ac8864844a84340ac0b7961181a8` in `55dad0ab1c4abbae5285ed686b9501c16be0af44` without conflicts, explicitly authorized by ZURIEL.

## Behavior

- Two approved independent matrix inspectors remain open together. Tests address context and discovery by ID, assert aligned inspector tops/bottoms, matrix-relative height, original pan and geometry. Explicit navigation to the lower inspector is asserted separately from subsequent stable page position. No thresholds, skips or engine limits changed.
- Existing lazy `ResearchActivity2029` reads the original global Raziel session for Fable, plus its existing ResearchProvider term task. It creates no store, persistence, model request, server polling or global toolbar. Active Fable takes precedence; an active term task takes precedence over a completed Fable result. Both operations remain in their original owners.
- Source axis is from the initiating turn's immutable continuation, not the currently displayed page/matrix. Session replacement clears visibility. Opening the indicator opens existing Raziel reading/return/cancel UI, without submission.
- Sent, provider-running, cancellation-requested, complete, partial, provider-confirmed cancellation, failure and interrupted-tracking remain distinct. Provider canceling discovered while resuming is also recognized.
- Seconds elapsed update locally; the existing 20-second status loop supplies observed elapsed time and observation timestamp. The 3–13 minute constant gives an explicitly approximate remaining range. Beyond 13 minutes: “לוקח יותר מהרגיל”. No percentage/countdown/progress reset.
- New styles only in lazy `researchActivity2029.css`; no static import added to SystemFrame and no budget/baseline increase.
- Current main retains matrix tool-mode dock. “מערכת” opens the global “כאן · שיתוף · רזיאל · עכשיו · עוד” bar. This integration preserves that behavior and provides the same activity in both modes and bar expansions.

## Explicit contract limit

The server verifies returned candidates *inside* the status response; it emits no intermediate verification state to the existing polling contract. Therefore “מאמת” cannot truthfully be observed in-flight here. No guessed verification stage is emitted, no extra poll is introduced and no server/DB change is made. Separate canonical engine replay/verification retains its own existing operation meter. Making the provider's in-flight verification visible needs a separately reviewed server-contract change; it is not claimed complete by this client slice.

## Validation at implementation checkpoint

- Six previously reported native scenarios passed locally (three inspector/geometry/results cases and structures/lexicon/completed-phrase cases).
- Indicator / activity / transport unit subset: 21/21.
- Broader matrix-reading/session invocation: 147 passed, two existing browser tooling skips in the unit-only invocation; those browser files are separately included in the explicit Playwright run.
- Actual frame indicator browser passed at 390 and 1440, three palettes, keyboard, explicit cancellation, completion, matrix unmount and principal replacement. Final full browser run and extended terminal cases pending.
- Final runtime `npm run build`: PASS; shell gzip eager 203343/203493; frame JS 46852/47338; frame CSS 34301/34362. No baseline change.
- Full native/browser run and CI on the pushed SHA are pending; this is not yet release approval.

No main merge, Preview/deployment, database writes, Edge deployment, flags/secrets or paid AI calls. Read-only ledger verified with `supabase_read_only_user`, transaction_read_only=on. No work-log write under the current restriction.
