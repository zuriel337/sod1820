# Pending release: ELS, CI reliability, Community, Home media and theme glyph

Actor: GPT (Codex). Recipient: ZURIEL. Branch-only preparation; no production action is implied.

ZURIEL requested #1438 and all remaining current packages, then explicitly selected all five current PRs. The integration starts at current main `0def5fafeeab8654079d9f7563ea4db3b6acf6c3` and preserves these exact source heads as ancestors:

| PR | Source SHA | Scope |
|---|---|---|
| #1426 | `f1eef2dbe62024ef0b9252c2d7cf7bea8e636913` | ELS research/advanced search, explicit admin Fable entry, existing-pipeline telemetry |
| #1429 | `fa979529192f46f1d7ef6527c09ec90c0a09f718` | Stale test repairs, full ELS coverage in three browser jobs, caches and obsolete-run cancellation |
| #1436 | `631e92436bb52e0cfa074b32aa569f0b991bf75f` | Community update marker below its message, one replies toggle |
| #1437 | `eb6e2a7161245a4885903ce726a57701a708b1f8` | Bounded responsive Home media in the existing lazy route |
| #1438 | `babc53cef71ce4b0998595822acbb547945dac4c` | Theme sign beside the Hebrew word on phones |

The observed live website remains deployment `dpl_5nvES4gHiW2R85zmmK4w5sj8FMX3`, source `2fc4fe88285588c199e972750f79be5700f8fee6`. Publishing current main also includes already-merged #1424 (canonical routing documents), #1432 (Tzvi media/source projections), #1433 (Now presentation/Egress) and #1434 (explicit gallery-video playback). Old held drafts are not included.

## Integration corrections

- One merge conflict in the ELS workflow: preserve #1429's SQL/core job and three complete browser shards; run #1426's public Fable proof with the existing pinned/cached browser in shard 3. The aggregate gate still requires all four jobs and exact source-bound native coverage.
- Register the two telemetry viewport cases with static names and the unchanged shared test body. The manifest now covers **90 cases, 30 per shard**; unknown dynamic registrations still fail closed. No scenario, assertion or timeout is removed.
- Retain the Community update link's previous 44 px clickable minimum. The proposed 36 px link was smaller than the existing touch-target contract; its surrounding row was already 44 px.
- Keep #1426's locked dependency restore before the isolation build. Source #1436 failed the old isolation build at 203502/203493 bytes after temporary tool installation; the combined locked build passes. Source PR CI is not substituted for combined-head CI.
- The personal-sync CI job exposed the same incomplete external-boundary test doubles as the earlier research-access test: supply synthetic Supabase URL/key constants and the bot predicate in `scripts/test-research-sync-provider.mjs`. All ten mounted-provider assertions remain unchanged and pass.

## Local validation

- Default build: PASS, 17/18 eager files, 203104/203493 gzip bytes, frame JS 47099/47338 and CSS 34329/34362.
- Public build with command-only `VITE_ELS_MATRIX_READING_MODE=on`: PASS, 17/17 eager files, 202977/205111 gzip bytes, frame JS 47105/47425 and CSS 34329/34362. No baseline, tolerance or lockfile change.
- Public compiled artifact, real worker and CSP, local-only remote fixtures: **13/13** cases passed. Includes three themes at nine header widths, responsive Home media and explicit video admission at 390/1440, delayed Community updates preserving the visible message position and CLS <=0.1, one reply toggle, 44 px notice link, and guest/member/admin Fable admission with zero AI requests.
- Refactored native telemetry registrations: **2/2** browser cases passed, unchanged assertions at 390/1280.
- Shard-manifest adversarial tests and 22 workflow/enforcement/wiring contracts plus actionlint pass. All 559 distinct ELS unit/SQL cases are covered: the broad run passed 556 with three SQL skips caused by a missing psql PATH entry; rerunning both executable SQL files with the existing local client passed 11/11 with no skips, including those three cases. Hosted CI results are recorded on the exact integration PR SHA when complete.

The new Community fixture initially omitted the worker's parent-context proof; it was corrected to supply that read. Those initial fixture failures are not represented as passing runs. Header acceptance also reproduced the author's known guest-login crowding at 480 px in both artifacts: preceding release rails 20/6 px, combined release 17/6 px, neither with horizontal overflow. The existing crowded header is not claimed as repaired; other measured widths retain paired rails, and the theme sign is visible at every width. No existing gate is relaxed for this limitation.

## Production sequence and exact approvals

1. Approve and merge the exact green integration SHA; do not separately bypass failing source PR checks. Confirm the resulting main tree matches the reviewed candidate.
2. **Separate Egress SQL approval:** `supabase/migrations/20261119220000_egress_24h_window.sql`, SHA-256 `30fad7d722b4644c5d5acb02d2291ff159863cf8c569a53fd4c58808dfc8806c`. Work's accepted 30-hour outage/reminder behavior remains unchanged. Recheck both guarded live reader hashes before application.
3. **Separate telemetry SQL approval:** `supabase/proposed/20261119190000_els_action_telemetry_PROPOSAL.sql`, SHA-256 `1000055220d89e89dae2b55692934b6fdd4a27384506bffa66fd42149cf872d6`; rollback SHA-256 `a9ef6a7ca28914d6e83b45cc40aad852235401863197e06f9b7b92ccb4154b93`. Recheck live definition MD5 `897f442aaa8f75a2f1f2dd332ad92c0a`. Apply separately before the client emits expanded events; never auto-apply proposals with deployment.
4. **Separate Fable flag approval:** ZURIEL confirmed `ELS_MATRIX_READING_ENABLED` is not set. Set it to `on` only after authorization. Read-only source comparison shows active `ai-analyze` v92 already supports this flow; no Edge Function deployment is currently required. Each scan still needs the user's explicit action; no paid scan is part of automation.
5. **Website approval:** deploy the exact resulting main commit from `public-reading-deploy`, using command-only `VITE_ELS_MATRIX_READING_MODE=on node scripts/build-public-reading-production.mjs --public-production-candidate --review-source=<exact-main-SHA>`. Do not alter shared project environment, automatic Git deployment or thresholds. Complete candidate checks and the approved alias transition, then verify the live site and source SHA.

The two SQL prerequisites were still unapplied at read-only inspection. Source checks, local fixtures and preparation are not deployment receipts. No live SQL, merge, alias, secret change, Edge deployment or paid model call was performed during this preparation. No work_log AFTER row is claimed through the read-only connector.

Canonical documentation impact: no new contract version or product decision. The changes implement existing owners; the integration evidence and release record suffice.
