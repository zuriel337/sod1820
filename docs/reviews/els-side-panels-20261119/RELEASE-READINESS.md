# PR #1426 release preparation

Actor: GPT (Codex). Recipient: ZURIEL. Branch: `ccr-06bc2910-pgarr4`.
Owners: `els_research_layer_law` v9, `traffic_intelligence_law` v11 and `ai_analyze_contract` v2, read from the canonical database.

## Scope and base

Preparation started from `88f88aff5bea2b47fc0b93a359a81c53b7275324`. Current main `0def5fafeeab8654079d9f7563ea4db3b6acf6c3` is already an ancestor. The working checkout is isolated; main and PR #1437 are not modified. The final candidate SHA and its GitHub checks are reported in the PR and the conversation, rather than referring to the old handoff SHA as the candidate.

The delivered UI retains side inspectors, collapsible advanced search beneath the matrix and an explicit Fable options button. Telemetry extends the existing collector with closed fields and bounded operation events; it does not add a collector, retry loop or eager frame import.

## Failures resolved during preparation

- `release-contracts-2029`: preserve and verify the historical November 18 schema, then apply the November 19 ELS allowlist in the contract test. Update the documented consumer inventory. Add missing Supabase constants and bot predicate to the existing isolated research-provider test doubles; retain their assertions.
- `hard-isolation`: its temporary A3 tooling installation can re-resolve Vite/Rolldown outside the application lockfile. Restore with `npm ci` before the product build. The pinned application builds fit the existing budgets. No baseline or threshold is raised.
- ELS static profile assertion: the explicit Fable options section replaces the former disclosure. Assert the section, its closed initial state and lazy mount, retaining the existing capability gate and single-card invariant.
- Native browser acceptance found 58 px paired buttons at 320 px after the longer Fable label wrapped. Reduce only local vertical padding by one pixel per side; retain 16 px text, equal columns, minimum touch area and the existing 56 px test ceiling.
- The SQL proposal's repeat-apply path now verifies the entire expected function definition; an already-expanded allowlist cannot hide unrelated function drift.

## Local evidence

- 22 disposable PostgreSQL tests: exact read-only live baseline, closed events/fields, rejection of invalid input, unaffected families, unchanged ACL/owner/security settings, drift refusal, repeat apply and exact rollback.
- 140 ELS, measurement and Fable unit/contract tests passed with synthetic provider responses.
- All release-contract gate commands completed successfully after the test-double correction. The initial failing run is not represented as a green run.
- Six public-artifact browser cases passed: guest/member/admin at mobile and desktop widths, real generated worker and production CSP, synthetic Auth/profile backend. Only admin receives the Fable entry; opening/closing options makes zero `ai-analyze` requests.
- Focused native browser cases cover shared inspectors at 320/360/390/1024/1280/1440, regular/cross/advanced drafts and collapse, explicit Fable, fullscreen, joint findings and real telemetry gestures. Full native acceptance remains part of the latest GitHub gate.
- Both `npm run build` and the public build with command-scoped `VITE_ELS_MATRIX_READING_MODE=on` are required on the final tree. GitHub results on the final commit supersede earlier failures; no CI-green claim is based on the old head.

## Fable server compatibility and activation

Read-only inspection found `ai-analyze` ACTIVE v92 in `linswmnnkjxvweumprav`, with JWT verification enabled. Its action parser, owner resolution, token verification, durable job repository, operation dispatcher, new-reading flow and administrator gate match the packaged branch implementations. The changed optional Discovery-seed prompt helpers are not passed by the active new-reading flow. The requested existing Fable entry does not require deploying the whole function.

The live server checks the feature flag and admin tier before provider work. ZURIEL confirmed in this conversation that `ELS_MATRIX_READING_ENABLED` has **not** been set. Activation requires a separate exact authorization; no secret value was requested or inspected. No live paid scan was invoked. Source comparison and synthetic browser proofs do not claim a paid-provider receipt.

## Separate production approvals

1. Merge the exact final PR candidate only after current CI passes and ZURIEL approves.
2. Review and separately authorize the telemetry proposal before deploying a client that emits its new events. Proposal SHA-256: `1000055220d89e89dae2b55692934b6fdd4a27384506bffa66fd42149cf872d6`; rollback: `a9ef6a7ca28914d6e83b45cc40aad852235401863197e06f9b7b92ccb4154b93`. Recheck live definition MD5 `897f442aaa8f75a2f1f2dd332ad92c0a` immediately before application. This proposal is not an automatic migration.
3. Separately authorize setting `ELS_MATRIX_READING_ENABLED=on` in the canonical Supabase project. A flag activation is not authorization for a paid test scan or an Edge Function deployment.
4. Separately authorize website publication of the exact resulting main commit, using `VITE_ELS_MATRIX_READING_MODE=on node scripts/build-public-reading-production.mjs --public-production-candidate --review-source=<exact-main-SHA>` in the deployment build command only. Do not change project-wide environment values or enable automatic Git deployments. Reconcile other already-merged but undeployed work and its database prerequisites before that publication.

No merge, website/Edge deployment, alias move, live SQL, secret/flag change or paid model call is performed by preparation. The read-only ledger connector cannot create an AFTER record; this document and the PR are a handoff to ZURIEL, not a claim that a ledger row or another session received it.
