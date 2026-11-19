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

## Validation

- All six reported compatibility regressions passed locally.
- Full local native + reading activity/card browser run: **90/90**, no skips. The final indicator test additionally passed after the interrupted-time correction (390/1440, three palettes, keyboard, partial/failure/cancel/complete, surface unmount, principal replacement).
- Reading/session units including isolated PostgreSQL: **159/159**, no skips. Initial environment-only skips were the two PostgreSQL tests, not browser tests; the earlier checkpoint misidentified them. Official PostgreSQL 17.12 Debian packages were extracted to the temporary workspace; these tests accept only a local Unix socket, never Supabase or any remote database.
- A pre-existing client-e2e timing flake reproduced: its event-loop-count driver advanced fake polling timers before the real fixture-handler promise settled. It now drains in-flight fixture calls first; the 600-step guard and all assertions remain unchanged. Focused test and the entire 159-test set pass after that correction.
- Interrupted/resumed readings retain the last provider elapsed sample instead of dropping back to the short client turn duration; dedicated regression passes.
- Final runtime build and shell budget: PASS; eager 203343/203493, frame JS 46851/47338, frame CSS 34301/34362 bytes gzip. No baseline/static frame import change.
- CI **16/16 on 287e61944905f9a961d263a231df573640cbadf8** before the final elapsed-sample/test synchronization correction. Exact final-head CI is reported in PR #1397; old-head success is not substituted for it.

## Files in this integration slice

- Runtime: `src/components/experience2029/ResearchActivity2029.jsx`, `SystemFrame2029.jsx`, `researchActivity2029.css`; `src/lib/research/elsMatrixReadingActivity.js`, `elsMatrixReadingTransport.js`, `razielSession2029.js`.
- Tests: `test/els-native-ui-browser.test.mjs`, `els-matrix-reading-indicator.test.mjs`, `els-matrix-reading-transport.test.mjs`, `els-matrix-reading-client-e2e.test.mjs`; `.github/workflows/els-core-compatibility-gate.yml` adds the indicator/activity/transport unit checks.
- This handoff and the six screenshots below. The separately authorized main merge also imports main's existing files without reimplementing its frame work.

No main merge, Preview/deployment, database writes, Edge deployment, flags/secrets or paid AI calls. Read-only ledger verified with `supabase_read_only_user`, transaction_read_only=on. No work-log write under the current restriction.

## Screenshots (declared mock, actual frame)

The source matrix is Columbia, skip 4545. The matrix is then unmounted to represent another surface; its original Fable reading remains. Provider replies and elapsed samples are injected through the existing session progress sink. No live/provider scan was made. All three palettes are asserted at 390 and 1440 px; these evidence images show Night.

| State | Phone 390 | Desktop 1440 |
|---|---|---|
| Working | [phone](screenshots/fable-390-dark-running.png) | [desktop](screenshots/fable-1440-dark-running.png) |
| Over 13 minutes | [phone](screenshots/fable-390-dark-overdue.png) | [desktop](screenshots/fable-1440-dark-overdue.png) |
| Completed | [phone](screenshots/fable-390-dark-complete.png) | [desktop](screenshots/fable-1440-dark-complete.png) |

Final exact-head CI and local full-run results are reported in PR #1397 and ZURIEL's conversation, without implying that this checkpoint predates its own CI run.
