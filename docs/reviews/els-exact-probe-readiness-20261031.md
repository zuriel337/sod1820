# Exact-skip probe readiness repair

GPT · ELS_EXACT_PROBE_READINESS_20261031 · passive BEFORE to ZURIEL.

Base: `3fcbc25bfed5374a846c801737759bf7fa85cea9`, clean local continuation;
the previous two implementation cuts are still local, with an exact bundle
preserved at `/workspace/els-matrix-mobile-toolbar-20261031.bundle`.
Branch: `gpt/els-exact-probe-readiness-fix-20261031`.
Remote main checked read-only: `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`;
it is not the base. No old commits imported or existing work reset.

Read AGENTS, CLAUDE, owner routing, ELS v9 and single-engine v2. Canonical
read-only connection verified. Bounded current ownership checks found no
overlapping writer on TzofenEmbed or the Native browser acceptance tests;
historical experimental/shared-server scopes are separate. The connection is
read-only: this receipt is not a claim of a live work_log insertion.

Scope: prove and repair repeat-readiness/exact-probe request lifecycle in the
existing host, with deterministic browser regressions. Preserve exact engine
verification, no-hit/privacy assertions, Classic presentation, shared Providers,
Raziel, corpus and search semantics. No model, DB/RLS, deployment or main write.

Existing evidence is in `els-matrix-mobile-toolbar-20261031.md`: duplicate
request 1 following two ready messages returned MATCH then CANDIDATE; later
no-hit requests remained false. A controlled reproduction must establish the
cause before changing runtime code. No timeout increase or weakened assertion.

## Root cause and controlled before/after

The real tool sends a ready ping, scheduling another after 350ms until tier
is known. An already scheduled ping still sends ready. The host previously
replayed the current probe on every ready, independently of its effect's key.
Both verifications therefore ran for one explicit request. After the first
MATCH, the consumer's exact matrix load called the unchanged
`invalidateSearchOperation` / `cancelEngineCalls` path, cancelling the duplicate
pending verification. `promoteVerified` correctly refused to promote it and
returned CANDIDATE. The host incorrectly forwarded both outcomes for one request.

A deterministic test holds the actual host verifier adapter, sends a duplicate
ready from the actual iframe, then releases only the first verification. Before
runtime edits it failed with `[true, false/CANDIDATE]`, 3 probe messages and 2
cancellation messages. No Golden is auto-loaded in this scenario; only external
verification I/O is a declared test double backed by the real corpus oracle.
Evidence: `/tmp/els-exact-ready-before.log`.

After the fix, the unchanged assertion passes with one request and one successful
response. Real no-hit and retry assertions at skip 400000 remain unchanged.
Additional tests exercise late successful verification after a newer no-hit,
pre-ready submission and iframe reload. All four targeted browser cases pass
at 320, 390 and 1440px. Evidence: `/tmp/els-exact-four-browser.log`.

## Implementation

Only `src/components/TzofenEmbed.jsx` changes runtime behavior:

- A ready ping always receives the existing tier response, but queued commands
  replay only on the first handshake of an iframe Document. A new Document
  after genuine reload is distinguished from repeat pings on the same window.
- Exact probes wait for that handshake and submit once per explicit request.
  Pending work may resume into a new iframe Document; completed probes do not
  run again on reload. A new requestId remains an explicit retry.
- Responses require the current request, current Document and trusted iframe
  sender. Late/duplicate responses cannot complete another request. The existing
  canonical verifier still alone determines MATCH/no-hit/error.

No corpus, engine/template, server, Provider, frame, visible UI, styles, pricing,
AI prompt or experiment ledger change. Tests extend existing host/Native suites;
no independent executor, transport or persisted state was added.

## Final verification

- Full non-browser ELS census: 382 tests, 370 passed, 7 failed, 5 skipped.
  All seven failures are unchanged source-shape assertions in
  classic-faithful-port (4), research-bar (1), semantic-surface (1), and
  visual-representation (1). Exact clean base 3fcbc25bf reproduces all seven:
  28 tests, 19 passed, 7 failed, 2 skipped in the selected baseline suites.
  No expectations were weakened. Logs: `/tmp/els-exact-all-unit.log`,
  `/tmp/els-exact-baseline-unit.log`.
  All five skips require unavailable local PostgreSQL; no live database was used
  as a replacement for those tests.
- Host/ELS/Raziel/save focused final tests: 41/41; no skips.
- Both actual builds pass without stubs. Built-graph/lazy gate passes at
  419759 eager gzip bytes. Isolation, cheap hardening and Legacy lock pass.
- An initial Native run was discarded when a parallel corpus-census test
  regenerated identical public/tzofen.html and caused Vite reload. Final browser
  acceptance starts only after those regenerating tests have completed.

- Connected browser acceptance: 8/8, zero skips. Actual global Raziel at
  320/390/768/1440 in all three presets (mixed Hebrew/English, touch, keyboard,
  zero automatic AI); Guided/Advanced entry; non-AI route-unmount/reset/share/
  cancellation in three presets; forms late-response rejection and explicit
  search controls. External I/O is intercepted: no live model/account writes.
  Log: `/tmp/els-exact-connected-browser.log`.

- Repeatability: five consecutive runs of the four exact-probe browser cases,
  20/20 passed, zero failures/skips, including delayed responses and repeat
  ready while real verification is held. Log: `/tmp/els-exact-repeat-browser.log`.

- Full Native browser acceptance: **67/67 passed, zero failures/skips**, 778s.
  Includes Classic private/public saves, ownership and account isolation,
  exact skip/no-hit/retry, connected cross, all three profiles, canonical
  lexicon/language, Fable overlays, sharing, manual selection, pinch zoom and
  320/390/desktop in all presets. Original assertions remain enabled.
  Log: `/tmp/els-exact-native-full-final.log`.
- `git diff --check` passes. The temporary clean-base test worktree was removed;
  the main worktree, earlier bundle and all test evidence logs are preserved.

## Passive AFTER / delivery

GPT · ELS_EXACT_PROBE_READINESS_20261031 · existing ELS host capability owner.
IMPLEMENTED / TESTED / BRANCH-ONLY, with seven known baseline source-test
failures and five unavailable-local-PostgreSQL skips disclosed above. The
previous Native runtime race is fixed, not reclassified as a skipped check.

Files: `src/components/TzofenEmbed.jsx`, `test/els-host-bridge.test.mjs`,
`test/els-native-ui-browser.test.mjs`, and this receipt. No engine/template,
Provider, SystemFrame, AI function, corpus, experiment journal or schema changed.

Fresh ownership recheck found no new overlapping scope since this cut began.
No live work_log write is claimed; the authorized coordinator may record this
passive handoff to ZURIEL. No other session was activated or messaged.

Git remote reads are working again. This branch contains the previously local
manual-selection and mobile-toolbar commits unchanged, plus this repair. It
must be integrated once, checking ancestry/patch equivalence first. Branch
push is delivery only; Vercel git deployment is disabled for `gpt/*` in the
repository configuration. No deploy, main push, merge, paid model or live
product-DB/RLS operation was performed. Final commit/remote SHA is reported
separately after successful push, never inferred from a local commit.
