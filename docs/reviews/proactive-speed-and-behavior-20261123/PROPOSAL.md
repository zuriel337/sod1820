# SOD1820 — Speed Law v2 proposal: Measurable Improvement + Proactive Regression Protection
**23 November 2026 · BRANCH-ONLY · no baseline threshold changed · no production/DB writes**

## Why this addition
The existing Speed Law (CLAUDE.md §Speed Law and `scripts/test-2029-shell-budget.mjs`) is a necessary *non-regression floor*. It tracks eager entry, frame and CSS gzip weights and prohibits increases to hard budgets. It does **not** prove faster perceived loading or continued functional correctness. An optimization can pass byte checks but break a signed-in personal save or delayed user action. This is an explicit user-observed class of problem.

This proposal **extends the existing Speed Law and Control Plane/Attention observability owner**; it does not create a new global owner, separate telemetry store, or duplicate watcher. The old hard gate remains in force without baseline increase.

## Two equal acceptance axes

**A. Faster experience, evidenced.** For each performance-focused PR, compare baseline `main` and candidate using identical route, device, throttling, network, cache, authentication and test data; collect cold navigation and SPA transition separately. Minimum candidate route set: Home, Post, World, Number, public Books, Personal Area. Report p50/p75/p95 and number of samples (NO_DATA if missing) for LCP, INP (real interactions only), CLS, TTFB, FCP and useful action completion time. RUM field p75 should be corroborated with controlled lab tests (do not call lab data CrUX). Target Core Web Vitals good: LCP ≤ 2.5 seconds, INP ≤ 200 ms, CLS ≤ 0.1 at p75; page and device breakdown, sample size and real field origin stated. **Targets are improvement goals, not relaxed CI thresholds or proof of current performance.**

On intentional optimization PRs, require at least one statistically/operationally meaningful **measured improvement**, no material route p75 regression, and no loss of feature capability. If samples are insufficient or mixed, result is **UNKNOWN / NOT ACCEPTED AS FASTER**, not "green".

**B. Every critical user action still works.** Changes in common entry/load, Auth, local Storage, IndexedDB, service worker, app Suspense/lazy imports and HTTP paths trigger affected capabilities. At minimum run:
- Anonymous route opens; authenticated user signs in, clicks **Save**, receives **server confirmation**, reloads and still sees saved content.
- Saved post, number, community source and personal library item each retain exact identity and permission. Account switch cannot leak saved content. Local-only queued state is never shown as synced.
- Offline, storage unavailable/quota full, delayed JS module, expired token, server conflict and retry return explicit outcomes; no silent success or action disappearance.
- PDF/source/book entry still gated by public admission and actual source read; public share links cannot point to closed readers.
- Compare pre/post behavior across 390px mobile and 1440px desktop, light/dark where relevant.

Tests must exercise click→server receipt→reload in a real browser with an authenticated test account. Unit tests and source inspection alone cannot prove this.

## What has been implemented in this PR
- `scripts/performance-change-impact-2029.mjs`: read changed files and produce risk families, affected route/capabilities, failure hypotheses, required checks, with explicit coverage UNKNOWN.
- `scripts/run-proactive-regressions-2029.mjs`: for changes to storage/auth/sync/entry, automatically execute existing `personal-save-decision` and `research-sync-hardening` tests; for Books changes run existing public-source-reader tests; output an attention-ready summary and browser evidence requirement.
- `.github/workflows/proactive-performance-impact-2029.yml`: run for relevant PRs, no credentials, no DB writes, do not alter existing required checks.
- `test/performance-change-impact-2029.test.mjs`: regression tests proving storage lazification and PersonalSaveButton changes flag personal-area/server receipt risk.

**Caveat:** this is *risk prediction and targeted unit coverage*, not a full self-operating browser monitor. Do not claim that every future defect can be predicted. To achieve self-diagnosis, the existing Control Plane must consume browser E2E outcomes, runtime action failures and field performance evidence.

## Next approved implementation inside existing Control Plane/Attention
1. Instrument semantic action transitions (click, started, server_ack, persisted_after_reload, failed, retried) via existing `events`/tracing infrastructure; no new tables. Do not log private payloads or raw user text. Emit count and correlation by release SHA, route, capability, device and coarse cohort only.
2. Add a bounded **release impact matrix** mapping PR diff → user flows → owner → test evidence → field signals → confidence and coverage (PASS / FAIL / UNKNOWN). No inferred zeroes for missing monitoring.
3. Control Plane raises one deduplicated Attention item when a release increases failure rate, loses server_ack/persistence despite local UI success, worsens field p75 or violates functional/browser gates. Alert must link to actual logs/tests/release SHAs; do not page repeatedly.
4. Compare **before/after** every approved optimization, including verified UX and performance; if either becomes worse, propose rollback / bounded repair for human approval rather than autonomously changing production.
5. Browser suite should run against a protected preview at the exact candidate SHA, with authenticated test account and denied guest, across representative routes, before release. Store only proof artifacts compatible with existing CI.
6. Use findings from current personal-save incident as a mandatory regression fixture; verify what specifically broke before asserting causality. Do not use the user’s real account/data as the fixture.

## Ownership and deployment
Existing owners: Speed Law in CLAUDE.md, `scripts/test-2029-shell-budget.mjs`, release/CI owners, Personal/Research Sync owners for save correctness, and Control Plane/Attention for observability. No global new law, no telemetry duplication, no new baseline, no unauthorized cleanup. The new PR is separate from Siboni Book PR #1519; do not merge cross-scope changes.

**Acceptance:** PR CI green with target tests; browser save→server receipt→reload proof; performance before/after measurements on same conditions; recommendation appears in existing Control Plane, with clear UNKNOWN when inputs absent. **Actual production state remains unchanged until exact release approval.**


## Live evidence calibration — read-only on 23.11.2026
Existing canonical `public.events` recorded **919** `web_vital` events (surface `performance`) and **4** `save` events (surface `activity_2029`) in the previous 48 hours. The saved event samples expose keys such as `operation_id` and `measurement`, but the current read found no separate `save_failed` / `sync_failed` event types. This does not prove no failures; **the lack of server-ack and after-reload stage evidence prevents a reliable detection rate**. Counts are an observation at this check time, not a stable baseline.

`scripts/2029-action-health-regression.mjs` now provides a pure aggregation evaluator for future Control Plane projections: UNKNOWN if events/sample are missing, FAIL if the UI claims success more often than the server confirms, FAIL if after-reload verification loses persisted records, and comparisons that flag failure-rate increases. It consumes only bounded aggregate counts from existing telemetry; it does not log personal data or automatically write to production. The live instrumentation required to feed these counts is **still pending**, so no autonomous post-release alarm is claimed today.


## Release evidence comparator and route-specific anomaly triage — branch extension
- `scripts/compare-performance-evidence-2029.mjs` accepts existing Control Plane aggregate JSON grouped by exact route, device, measurement scope and cohort, with per-metric sample sizes and p75. A candidate cannot claim faster based solely on LCP if INP/CLS materially regress, or if sample coverage is insufficient. This produces `IMPROVED / REGRESSION / NO_MEASURED_IMPROVEMENT / UNKNOWN`, not a numeric "speed score" made from guesses.
- `scripts/2029-field-triage.mjs` classifies route- and device-specific p75 values for LCP, INP and CLS against the established good targets, with explicit `UNKNOWN` when fields are missing. It is a pure interpreter, **not live alert delivery**.
- `docs/reviews/proactive-speed-and-behavior-20261123/field-performance-readonly.sql` uses the existing `public.events` `web_vital` owner to retrieve per-route, per-device, per-build p75 and sample counts. It was executed read-only against the canonical project; no schema change.
- Test files cover "LCP fast but INP slow", low sample INP, route mismatch and the specific symptom classes below.

### Verified field observations (read-only sample, 23.11.2026)
**Build label `2029-DI3uq6Xi`** (not a Git SHA; observations are navigations, not SPA transitions):
- `/community/chat` mobile: 99 total samples, LCP p75 1756ms (n=93), INP p75 288ms (n=37), **CLS p75 0.1345** (n=99), TTFB p75 1211ms. LCP is already good but CLS and INP merit diagnosis.
- `/post/:item` mobile: 86 samples, LCP p75 **2775ms** (n=80), INP p75 **624ms** (n=24), CLS p75 0 (n=86), TTFB p75 1527ms. INP is a **provisional poor-signal**, since n=24 is below the new minimum of 30 for a firm alert. Do not call it independently confirmed poor at p75; demand more interactions and lab/browser replay.
- `/community/chat` desktop: 76 samples, LCP p75 1580ms (n=69), INP p75 142ms (n=20), CLS p75 0.0401 (n=76), TTFB p75 1057ms. Desktop INP is likewise below the firm-signal minimum.

These numbers differ from aggregate cross-route averages and illustrate why detection must be **per route and device**, with sample size. They are not causal attribution to any optimization.

Next step: wire this same read-only report into the existing Control Plane's Attention Inbox using its existing telemetry and alert lifecycle after the governed release. Do not auto-rollback or send repetitive notifications without approval.
