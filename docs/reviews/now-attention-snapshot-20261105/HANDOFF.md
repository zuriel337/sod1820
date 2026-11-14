# NOW_ATTENTION_SNAPSHOT_FOUNDATION_20261105 — bounded technical handoff

**Status:** branch-only, not wired into the visible window, not merged, not deployed.
**Request:** ZURIEL accepted the full approved "עכשיו" roadmap. This handoff implements the first nonvisual, read-only foundation only.
**Repository baseline:** origin/main 03e74edfbeaeb7f1d191fb87dee9f8a3854c73ed (checked 2026-11-05).
**Live at start:** 2029 Production source 969b51423d8b67b7b8061d067b5366e1e2a1c5e4, dpl_xw7fECMyWRrZvxxKdy71yobAhj8h.
**Branch:** gpt/2029-now-attention-snapshot-20261105.
**Coordination:** BEFORE in public.work_log, key NOW_ATTENTION_SNAPSHOT_FOUNDATION_20261105. Current Claude GATES_GREEN_20261105 owns CI/visual gate fixtures; Claude OBSERVABILITY continuation owns its own paths. This task writes only a new pure helper, focused test and this bounded handoff. No shared files touched.

## Existing authority, not a new contract
- Doc37: CONTENT-AUDIENCES-HYBRID-NOW-20261102 / NOW-01, NOW-02, METER-01, FOLLOW-01/02, RAZIEL-01/02; NOW-CENTRAL-HANDOFF-20261103; 12.48.
- publishing_conventions (project_codex 4), research_intake_foundation_contract (project_codex 22).
- System Frame current addendum §10.8 and §3.5.3; Design V2 and current owner index.
- Already deployed: NowPublications2029 over **one** useSystemFeed2029 shared reader. Now's real rows and public links are preserved.

## Added
- src/lib/nowAttentionSnapshot2029.js: pure projection of already-authorized public nowModels only; counts current bounded sample by media, public source and unverified-source marker, with dates in Asia/Jerusalem and bounded publication-day grouping. Source failed/access_filtered and missing coverage are explicit. Returns connectionStrength = null and personalizedAttention = null, never a fake score.
- test/now-attention-snapshot-2029.test.mjs: six targeted tests for dates, bounded sample, source availability, private/id guard, sample truncation, and no raw text leakage. Same cases were executed in a V8 harness with 6/6 passing; **the actual repository Node test, full build and browser/G4 suites have not yet run**.

## Integration boundary: Claude-led visual phase
The current Design/System Frame owner assigns 2029 surface appearance to Claude, not this GPT capability work. Claude may import projectNowAttention into the EXISTING NowPublications2029 component and pass its already loaded nowModels(feed.expandedRows) and existing feed.nowSources.sourceStates, requested, loading, error, and feed.unavailableSources. Do not add a reader, store, separate polling, auth call or ranking. Do not import this projection into the closed-panel startup bundle.

User-facing names must be honest:
- activity.sampledPublicEntries = **מספר הפריטים שנטענו בחלונית**, not total website activity.
- readerCoverage.state = measured_window = currently bounded readers answered, not entire archive covered.
- publicationTimeline.days groups **publication/source-arrival dates**, not historical event dates or approved semantic event chains.
- connectionStrength and personalizedAttention remain null until the authorized owner supplies measured truth/access-bounded data.
- A real activity meter needs canonical authorized aggregate measurement and a defined time window; NEVER multiply loaded samples into a sitewide total or invent a 0–100 score.
- Keep Zvi/public unverified source truth marking and exact World anchor, Or HaGeula / מסרים source identity, real media on user choice, and no accidental duplicates. Real ACL/privacy remains with the canonical reader; a pure projection is not an authorization boundary.

## Next bounded passes (not executed here)
1. **Claude presentation pass, under current owner:** compact collapsible "פעילות בחלון" + publication-time days in the existing Now sheet, appropriate empty/error states, keyboard/safe-area/three palettes/reduced motion. No new top-level surface. Accept at 320/390/1440.
2. **Domain-owned site activity meter:** audit authorized aggregates and time windows; publish only measured metrics with coverage/provenance and no personal search exposure. Keep activity vs coverage vs connection strength as independent axes. Add tests/guard before release.
3. **Follow / "בשבילי":** use existing canonical Follow/notifications and authenticated principal; never infer subscription from viewing. On logout/account change, isolate prior results and cancel stale requests; no private data in public Now or cache. Distinguish recommendation from notification opt-in.
4. **Temporal event history:** use canonical event identities, verified source-locus and time-role, exact return; do not promote matching numbers or similar words into event identity.
5. **Raziel:** one existing companion using authorized Research Context; no model call on opening Now; suggest only explainable relevant next actions; no automatic truth promotion.
6. **Acceptance:** focused unit/browser, real public data, guest/member/admin auth boundaries, exact return/refresh, 2029 Isolation/Visual/G4/Legacy lock, performance & CLS ≤0.1, then separate merge and production approvals.

**NO ACTIONS:** no main merge, protected Preview, Production, alias, DB product data, RLS, Edge, newsletter, auth, private follow/notification store, or source-content changes.
