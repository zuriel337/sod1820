# Matrix height action and Raziel connection audit

GPT · ELS_MATRIX_HEIGHT_RAZIEL_AUDIT_20261031 · passive receipt to ZURIEL.

## BEFORE

Base `ba9ee00f76e3d5fc28128857c07dc86024327d96`, verified against origin.
Isolated branch `gpt/els-matrix-height-raziel-audit-20261031`.
Live canonical read-only coordination checked before editing: no active writer
overlaps the ELS toolbar component, stylesheet or Native UI browser test.
Other sessions own shared Raziel/Frame files; those are inspected read-only.
No live work-log write is claimed: the connector is read-only.

User request: make the existing 50% matrix-height action prominent/rightmost,
then report actual Raziel connectivity. Preserve the four side launchers and
separate below-matrix research area. Use the existing height state and Design
V2 tokens. Keep four compact display actions: height, selection, share, More;
move screen-fit into More, without removing or duplicating any action.

No shared Provider/Frame/transport edit, new engine/store, model call, DB/RLS,
Edge deployment, main merge or Production change. This is implementation and
read-only audit; previous Preview remains unchanged until separately updated.

## Implemented — matrix height

The existing height toggle is now the first/rightmost display action in RTL,
with a visible `+50%`, semantic accent outline and the label `גובה`. Expanded
state reads `100% / רגיל` and has the accessible name `חזור לגובה הרגיל`.
The actual stage height remains exactly 1.5 times its original height; this is
not zoom, a different matrix, new corpus cells or an engine request.
Screen-fit remains one functional action under More. Manual selection, share,
heat, axis visibility, letter style, verse highlighting and camera are retained.
The four SIDE launchers (scan/results/save/AI) and separate research entry are
unchanged. No shared frame/Provider/AI code was edited.

## Raziel audit — implementation evidence, not a live model-quality claim

Scope is this ELS branch and its global 2029 session, not a claim that every
site capability or a future central branch has been audited. The earlier Preview
at `548ef03f3` has the same relevant Raziel code; this cut edits only the toolbar.
No live model request, personal conversation query or account write was made.

### Connected and exercised

- One `RazielSessionProvider2029` owns the thread, explicit submit and busy turn;
  `askRaziel` is the existing transport into `ai-analyze`. Opening/switching the
  page or chat does not execute a model. Browser fixtures exercise the real
  Provider, frame, request adapter and transport boundaries.
- Explicit ELS entry validates `OK / els_2029_projection_v1 / exact_replay_v1`;
  the UI context and saved request snapshot preserve occurrence/corpus/start/
  end/skip/direction. Unverified or mismatched matrix context fails closed.
  `Els2029Page.jsx:136`, `elsRazielContext.js`, and request adapter.
- Fable reading is a separate explicit action INSIDE the same session/transport,
  admin-only and gated by mode/server availability. The card requests 33x41 and
  at most 25 proposals. The server rebuilds its bounded Torah window from the
  canonical stream and verifies proposals through the canonical ELS engine.
  The client context's 12x20 presentation is NOT the whole Fable search window.
- Returned verified reading findings project onto the same matrix, matched to
  term/scope/corpus/start/skip/direction; another occurrence does not inherit them.
- Global activity supports navigation away, progress/cancel and exact return.
  Durable-job status/recovery is implemented; reload recovery is an explicit
  existing action, not an automatic new paid scan.
- Explicit save preserves context plus a bounded structured reading result
  (findings, positions, receipts, coverage and cost), not just answer text.
  Account synchronization uses ResearchProvider. A synthetic account ACK and
  fresh-browser restoration passed; real cross-device account sync was NOT
  tested here. Anonymous/local storage is not account synchronization.
- Research-map/surprise actions use the same submit and require an eligible
  existing Bundle; these are not an unrestricted automatic ELS search.

### Material gaps — do not call the integration complete

1. **UI occurrence card != full model context.** `normalizeElsFocus` keeps
   coordinates in `surfaceSemantic.els`, but `ai-analyze`'s
   `razielSemanticSurfaceText` only renders its occurrence reference and term.
   Its ELS block omits corpus/start/end/skip/dir. Ordinary occurrence chat does
   not build a matrix-reading context by itself. Some source/selection text may
   incidentally contain identifiers, which is not a structured verified receipt.
   `buildElsRazielSurfaceContext` also defaults to no raw term; ordinary phrase
   identity depends on the authorized subject/context path. Therefore the
   display and saved snapshot are more complete than ordinary model grounding.
2. **Follow-up memory is very short.** `buildRazielTranscript` uses only the last
   two messages, 200 characters each, at most 500 transcript characters, inside
   a 600-character context. A completed Fable result remains in the session,
   but the ordinary request does not include its structured findings. A late
   item in a long answer can therefore be unavailable to a follow-up question.
   Same-axis follow-up may reuse the bounded matrix context, NOT all findings.
3. **Deterministic research tools are not automatically AI context.** The current
   `ElsLexiconResearch2029` callback contract handles scans, replay/load, focus
   and word finding; it has no submission of its entire discovery/structure
   output to Raziel. Adding a group to the matrix is not equivalent to sending
   that group's verified relations to the model. Free letter highlighting is
   temporary UI state and must not silently become verified evidence.
4. **Navigation while scanning works; concurrent chatting does not.** The single
   Provider's `busy`/`inFlightRef` rejects another submit, save, restore or reset
   during the long reading. Do not advertise a simultaneous normal conversation
   while the scan owns that turn.
5. **Initial explanation is deterministic.** `buildElsRazielGuidance` constructs
   the initial occurrence explanation without a model. Its presence is evidence
   of context wiring, not proof of live Hebrew understanding or full discovery.

Additional bounded limitations: this reading supports Torah, not all Tanakh;
the client matrix action accepts normalized terms of 2–24 letters and skip >=2;
finding completeness/semantic ranking remains experimental. The card's preflight
ILS copy is still hardcoded ($2 ~= ILS7.40), while result cost comes from server
FX metadata. The saved-result allowlist does not preserve the experimental
`summary.zones` / `coverage_report` additions. These were audited, not changed.

### Reproduced diagnostic (no network/model)

Built an ordinary request using the actual `buildElsRazielSurfaceContext`,
`prepareRazielSessionSubmission` and initial session reducer, with synthetic
coordinates 123456/789 and an old answer containing a marker after character200.
Extracted/transpiled the actual server semantic-text function without running
the handler. Assertions passed:
- structured client ELS context includes occurrence/corpus/start/end/skip/dir;
- its server semantic prompt does not contain the coordinates;
- ordinary follow-up omits the synthetic structured reading finding and the
  late answer marker;
- ordinary occurrence question alone has no `elsMatrixContext`.
This proves the specific data-path omissions; it does not assert what a model
would infer from unrelated text or that every possible submit path omits them.

## Recommended next cut (not implemented here)

Complete the EXISTING verified context/Bundle handoff for an explicit question:
the exact selected occurrence, relevant selected verified findings/relations,
source refs, coverage and last reading result identity. Resolve saved results by
their existing references, not by stuffing the entire screen/chat into a prompt.
Preserve no-auto-AI, no new Provider/store/engine/transport, stale-axis rejection,
privacy and canonical replay. Shared Raziel/Frame/server scopes have other live
owners and require coordination before changes. Only then perform one explicitly
authorized live question to check answer quality; a passed fake is not that test.

## Verification / AFTER

- 162/162 focused ELS/Raziel/action/transport/handler/persistence unit tests.
- 7/7 Native browser tests: new entry and height toolbar, manual selection,
  background return, Fable overlay, responsive rails/height and mobile scan.
  Toolbar checks 320/360/390/768/1440 and all three presets, actual click/keyboard
  height round-trip, screen-fit, no horizontal overflow and no automatic scan/AI.
- 3/3 connected browser scenarios: global Raziel responsiveness (320/390/768/1440
  x three presets), background reading/return/reload, account save/ACK/fresh
  browser/restore and explicit map. External services/model/auth are fixtures.
- Real Legacy and 2029 builds pass, without stubs. Built graph/lazy budget,
  isolation, cheap hardening, Legacy Production lock and diff checks pass.
  Eager JS gzip: 419752 bytes.
- Parchment 320px toolbar screenshot inspected; visible +50% is physically right.

Implemented and tested on the isolated branch only. No Preview/Edge/Production
deployment, live model call, main change or product DB/RLS change in this cut.
Passive AFTER to ZURIEL; scope released after delivery. No live ledger write
is claimed, since the coordination connection is read-only.
