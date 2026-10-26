# Canonical Raziel navigation — central acceptance, 26 October 2026

Task: `CENTRAL_CANONICAL_NAVIGATION_ACTIONS_INTEGRATION_20261026`.
Actor: GPT; passive handoff to ZURIEL.

## Exact adoption and baseline preservation

- Target branch: `gpt/2029-central-raziel-safe-actions-integration-20261026`.
- Verified starting local/remote base: `83da5b2c6bb4f09df2ccaa7771122fd6805dea74`.
- Isolated acceptance branch: `gpt/2029-central-canonical-navigation-integration-20261026`.
- Requested source branch: `claude/smart-navigation-links-mtcd75`.
- Verified source head and single requested commit: `cef782b8ae13b3be83a1987be60ac7b469ec34ea`, whose parent is `ea5736aba4aa9bca052beee87fe17015cb5ede14`.
- Initial patch-equivalence check found the source patch absent. Only that one commit was applied with three-way reconciliation, as `1498b2820`; no cumulative source branch, ELS branch or unrelated released Raziel seam was imported.

The source patch modifies eleven paths. Ten imported path blobs match the requested source commit exactly; the Frame is intentionally based on the newer central version. Whole-file reconstruction verified that SystemFrame equals the exact central base plus the navigation helper import/button, and RazielSessionProvider equals its exact base plus the deterministic navigation return branch. No other Frame/Provider differences were accepted. Because the Frame has newer surrounding imports, a global patch-id alone is not sufficient proof; these blob and hunk-preservation checks record the actual equivalence.

Canonical read-only startup returned `supabase_read_only_user`; bounded latest-per-task ownership checks found relevant Frame/session scopes released, with no active overlapping writer. This read-only connector cannot write a live BEFORE/AFTER; no journal row or external dispatch is claimed. The technical acceptance scopes are released at final handoff.

## Result and bounded integration corrections

The site and WhatsApp share the source's pure navigation grammar and closed number/World route shapes. Explicit navigation turns return before the existing model transport, and ordinary research questions retain that transport. The parser, request builder and Research Plan remain lazy. There is one existing Provider, session and ResearchProvider.

Three narrow issues found during acceptance were corrected:

1. Saved-session serialization previously dropped navigation buttons and pending number clarifications. Its existing projection now retains only the validated, bounded navigation envelope. Save/restore preserves the button/follow-up and conversation mode; malformed versions, routes, numeric mismatches, user-message injection and conflicting envelopes are discarded. It reuses the tiny existing seam validator without importing the lazy navigation grammar eagerly.
2. WhatsApp history ordering now sorts timestamps descending instead of reversing an assumed input order. Tests execute the actual adapter with ascending, descending and mixed inputs, confirming the most recent focus is selected.
3. Canonical-link focus now parses complete URL tokens and checks origin plus the exact number-page path. A canonical-looking substring in a foreign redirect URL or an extra path suffix cannot establish focus. Legitimate query/hash locators on a canonical number path remain accepted.

These are navigation-only changes. `research-run`, App2029 routing and ELS implementation paths retain their exact base blob identities. WhatsApp code is branch-only; no message was sent and no Edge Function was deployed.

## Verification

- New navigation contracts plus saved-session round trips/negative cases: **34/34 passed**.
- Focused session/view-mode/one-shot/request-loader/Frame/Workspace regressions: **66/66 passed**.
- Built actual-App Chromium: passed at **320px and 1440px**. Navigation/clarification turns produced canonical buttons with **zero model calls**; an ordinary question made exactly one intercepted synthetic model call. Clicking the link made no additional model call; no overflow or page error occurred. All external traffic was intercepted.
- Broad Raziel/ELS run: **619 pass / 4 fail / 1 optional browser skip** out of 624. The skipped built-browser entry was then explicitly rerun with the installed Chromium and passed, covering the full 624-entry set with 620 passes and the four known base failures.
- The same J Post, J Topic, M Post golden and bounded ELS-consumer failures were independently reproduced on the exact starting base: **28 pass / 4 fail** in the same 32-test diagnostic set. No new failing test was found; these existing release gaps were not hidden or changed.
- Legacy and 2029 builds passed. Built graph: **130 reachable / 15 eager**, **407,532 eager JS gzip bytes**, **51,210 recovered**, against the unchanged **12,288-byte** requirement. Submission/resolver and Research Plan remain lazy.
- System Frame, My Workspace, hard isolation, cheap hardening, public language 3/3, Legacy research containment, Legacy Production Lock, JavaScript/TypeScript syntax and cumulative whitespace checks passed.

An initial diagnostic used the default child-process output buffer on the large unchanged ELS HTML and exceeded that buffer after the Frame/Provider preservation checks had passed. The excluded-file proof was rerun using Git blob identities and passed without reading large content into the diagnostic output. No source/test was weakened.

## Handoff boundary

The tested result may fast-forward the isolated central branch only after its remote base is rechecked. Source ancestry outside the requested commit is not imported. No main merge/push, hosted Preview, deployment, DB/RLS/flag mutation, real model request, WhatsApp send, live content publication or `research-run` change is authorized or performed.

The existing G4 account-width release gap remains outside this navigation slice. This acceptance is branch integration, not an all-green release or Production approval. Local evidence logs are under `/workspace/artifacts/raziel-navigation-integration-20261026/`.
