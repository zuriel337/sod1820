# Writer / My Workspace / Raziel chain completion — 26 October 2026

Status: IMPLEMENTED + TESTED on an isolated integration branch; draft review candidate. Acceptance results below describe this checkout, not hosted or live product acceptance. No central/main integration, deployment or product database apply is authorized by this delivery.

Actor GPT · task `WRITER_WORKSPACE_RAZIEL_CHAIN_COMPLETION_20261026` · passive report to ZURIEL.

## Baseline and source adoption

- Branch: `gpt/2029-writer-workspace-chain-completion-20261026`.
- Base: `5f2810e780c434be3638730b7f694f79eea40321`, the previous completed Workspace projection slice over central `ea5736aba4aa9bca052beee87fe17015cb5ede14`.
- The previous Workspace slice has not been centrally adopted. A central integrator must include it once, together with this continuation; applying a detached final patch would omit required session/projection work.
- Adopted the complete released Follow candidate delta `1baf950477e6357dc1f89d87d47db15fd457fb23..ba194c2d3c4ff6c17b8bea74f73d8a19d77851cf` (PR #1159 foundation and PR #1164 alignment). Central lacked that foundation, so copying only the final category/series patch was insufficient.
- First integration commit: `5308e3c52027db83199e2c31976c2d8054ef4c93`. This is explicit source adoption, not a claim that the original commits are direct ancestors.
- Two conflicts were reconciled: the Design V2 header retains both shared icon-state treatment and the newer balanced RTL contract; SystemFrame retains current Raziel/session/Workspace callbacks while adopting strict, account-scoped Follow/profile summary readers. Provider nesting and session ownership were preserved.
- Historical source review documents and images are preserved as provenance. Their old branch/main/verification statements are not new acceptance claims for this checkout. This record supersedes them for this isolated integration only.

## Resulting behavior

### One private workspace and one conversation owner

The existing My Workspace entry remains the canonical home. Its native cards open the existing writer modules, Follow center, Research projection and Raziel center. The prior completed slice supplies current/saved conversations, title search, full-picture messages, explicit-link dossier projections, existing research buckets and exact source return. Conversation save/re-save/rename/delete continue through the existing ResearchProvider and Raziel session. No Provider, session, transport, store or backend owner was added.

Strict Workspace profile/unread readers preserve measured zero, reject malformed or stale-account results, and clear private state on principal transitions. User metadata cannot grant access or manufacture a balance. Membership remains a truthful building placeholder, without price, subscription state or entitlement.

### Follow, categories and series

The native Follow center reads the existing notification preferences and inbox. Category aliases and three approved exact series descriptors are shared with the bounded anonymous Posts catalog. Categories, series and writers remain separate selections; no saved preference is broadened or rewritten. Native series/category destinations use 24-item pagination and reject invalid filters and late results from an earlier scope.

Selected channels now come from the same account-scoped preference read, independently of delivery readiness. “נבחר בהעדפות” confirms a saved selection, not a working sender or device subscription. Unavailable/malformed channel data remains unknown. No channel is enabled, no device is registered and no outbound message is sent. Inbox acknowledgement and unfollow remain confirmed by the existing strict acknowledgement/readback paths.

The released Claude shared treatment, WatchButton 2029 and EmailVerify 2029 presentation are adopted without a new palette or redesign. The existing optional fixture route remains gated and disabled in the normal build; no hosted fixture Preview was produced.

### Public writers: honest activity and standing

The existing bounded public likes-summary scan also measures distinct public posting dates in `Asia/Jerusalem` and the latest public message time. It adds no query per card and reads no private visits, searches or login history. The same maximum 5,000-row scan remains; a truncated or invalid-date scan cannot claim complete activity. Only a matching, complete public-chat DTO is consumed.

The Person panel calls these “ימי כתיבה ציבורית” and explains that the latest public activity is not the last account login. Account registration still is not historical community tenure. Person binding, research standing and missing measurements remain unresolved/unknown. No public Person RPC was connected.

The private progress screen no longer renders the old five-level seal or a stored Legacy tier as an approved 2029 standing/membership. Existing measured activity statistics remain available; the missing approved standing is stated plainly.

### Old community replies remain readable

On mobile, the adopted reply inset now wins against the desktop selector; deeper reply levels no longer repeatedly subtract the reading column. Focused mobile messages retain the focus border without the desktop-only extra inset. Actual parent relationships, expand controls, precise message focus, reload and the return to private messages are preserved. No Community authorization/RLS/action owner was changed.

### Acceptance guard precision

The System Frame guard incorrectly treated any path containing `userCenter` as the Legacy `UserCenter` component, including the native 2029 data-adapter directory. It now matches the forbidden component filename. Explicit extensionless and `.jsx` Legacy import-denial assertions remain, and the native adapter-path case is checked. The Production lock was not changed.

## Coordination and exclusions

- BEFORE `0e2728cb-de93-4a78-b20f-320b17fd7b13`: 100 exact paths. Guard addendum `2de5e09f-a209-4a19-97c5-2d2e253ba2e0` adds only `scripts/test-2029-system-frame.mjs`.
- AI hint testing/qualification belongs exclusively to ZURIEL's personal-Journey session. This branch does not edit that worker, Journey files, hint classification or publication decisions. A passive scope boundary is recorded in the shared journal; its exact task key was requested but not supplied. No agent dispatch/ACK or delivered specialist review is claimed.
- Claude's released presentation was adopted. No callable independent Claude execution channel was available; no final Claude visual approval is fabricated.
- No source privacy, identity links, user profile, production data, permission, RLS, RPC, flag, ledger, membership, billing or notification delivery was changed live.
- The Follow SQL migration is copied unchanged from the released source candidate and remains unapplied. The Community migrations `20261026070000` and `20261026142802` remain unapplied; missing capability readers continue to fail closed.

## Verification

Final machine-readable results and two representative local screenshots are in `writer-workspace-chain-completion-evidence-20261026/`. Browser data and Auth are synthetic/intercepted; tests do not forward authenticated product writes or model calls. Disposable PostgreSQL fixtures are separate from the product database.

| Check | Result |
| --- | --- |
| Focused session/saved-session/view-mode/projection/public-writer/Follow/Workspace Node checks | 125 passed |
| Additional shared series projection, strict inbox acknowledgement and notification compatibility Node checks | 21 passed; total 146 |
| Category/series actual-App browser suite | 42 scenarios passed |
| Follow private reads/acks/account changes and native Workspace handoffs | 38 scenarios passed |
| Raziel Workspace | 14 scenarios passed, including guest → A → logout → B, stale hydration, exact return, save identity and touch/keyboard scrolling |
| Personal writer modules | 72 viewport/theme captures (320/390/768/1440 × three presets × six modules), 10 complete flows and six editor-refresh checks passed |
| Community/public Person family | 19 scenarios passed |
| Shared Community message actions | 26 scenarios passed, including missing-reader fail-closed cases |
| Personal replies from old threads | 18 scenarios passed using six synthetic SQL-export account fixtures × three widths, exact focus/reload/return and pending account-change isolation |
| Disposable Follow SQL | 44 assertions and changed-preimage abort passed; zero live writes |
| Shared-series SQL generation parity | Passed |
| Full build | Legacy and 2029 passed; existing chunk/dynamic-import warnings remain |
| Canonical guards | Workspace, System Frame, built graph/lazy, cheap hardening, hard isolation, Legacy containment, Legacy Production lock and three public-language checks passed |
| Whitespace | `git diff --check` passed |

All seven combined browser suites passed with no page errors, unexpected writes or model attempts. The exact suite breakdown is retained in `results.json`; heterogeneous screenshots/flows are not misreported as one uniform test count. The SQL export used for old-thread acceptance was generated by the earlier disposable integration acceptance; this run did not repeat or claim a live SQL migration.

The focused deep reply reading width increased from the observed 84px to 196px at a 320px viewport, and from 154px to 266px at 390px, while retaining the focus border and one parent inset. No horizontal overflow was observed.

Final built graph: 118 reachable records, nine eager records, 401,543 bytes eager JavaScript gzip; the submit adapter and Research Plan remain lazy. Public posting-day calculation reuses the existing bounded likes scan, with no additional request or initial full-research load.

Initial attempts exposed a missing bundled Chromium executable (the series suite now uses the installed executable), the narrow mobile focused-reply column, and one transient touch-scroll assertion under three concurrent suites. The touch interaction passed in an instrumented isolated reproduction without a product change and in the final unmodified acceptance suite with two concurrent suites. Unsuccessful attempts are not counted as passes.

## Remaining owner / release gates

| Dependency | Concrete next action | Current state |
| --- | --- | --- |
| Central candidate | Review the previous `5f2810e7` Workspace slice plus this branch as one ancestry-preserving chain; avoid replaying already equivalent patches | Not merged |
| Live category/series producer | Independent SQL/security challenge, fresh exact preimage check, controlled disposable acceptance, then separate exact DB-apply authorization | Candidate tested locally, not applied; no live series-delivery claim |
| Live Community replies/actions | Review the two existing migrations with their owners and authorize any live apply separately; then controlled authenticated acceptance | Readers fail closed when missing; no client-side ownership fallback |
| Public Person foundation | Repair visibility/avatar/activity/unknown-metric semantics in `person_public_profile_v1` and `people_public_rows_v1` under the existing Person owner before connecting them | Read-only definition audit still finds missing privacy checks and fabricated zero metrics; not consumed |
| 2029 research standing | Supply the existing approved evidence/standing adapter and progression gates, with human curation separate from activity | No invented level or XP conversion |
| Raziel allowance | Supply an owner-approved read-only quota projection; `ai_quota_check` is not treated as a display reader | Unknown, shown unavailable; credits remain separate |
| Raziel live readiness | Respect the existing site lock and perform separately authorized live acceptance after its owner releases it | `lock_raziel_site` was observed enabled; not bypassed |
| Authenticated hosted flow and visuals | After central adoption, authorize an exact isolated deployment and validate real existing GETs/account switching; Claude/ZURIEL final visual review | Local browser verification only; no Preview or final visual approval |
| Hint processing | Coordinate the existing personal-Journey task by its actual task key; preserve this branch's public/private/action boundaries | Reserved, no duplicate work |

No gate here authorizes a new subsystem or a direct live release. This candidate completes the connected, locally reviewable frontend work while keeping unmeasured data and unavailable capabilities explicit.
