# Community replies and reading continuity — 2026-11-04

ZURIEL explicitly requested implementation of the two proposed priorities: Replies to me and resume reading with new reply counts. Passive scope claim: COMMUNITY_REPLIES_READING_CONTINUITY_20261104, BEFORE 85906865-7a5b-438d-8c00-bf9c985ea8e2. Source base 209a210fad86da95cf5b5052ec1d1759d80c2071; preserved all 16 nonoverlapping candidate files through 3ccef042f9732321ba0769834a9794a2e55f9e95. Main remains 2195c9784c5c9f0b1ec3cd3c1137fbd76045845b.

## Behavior

Signed-in Community controls link directly to the existing private Messages/Replies tab. Its canonical authenticated RPC includes replies to owned native posts and imported Contributor posts with exact existing account or reviewed Person identity edges. No name/email ownership inference. Public Community ancestry is verified by the canonical reader; hidden/deleted reply bodies and deleted parent titles do not leak. Existing research behavior, pagination, precise public thread handoff and private list return are preserved. Rich-text bodies become plain excerpts in the private list. Public releases use /community/chat, retaining historical Preview routing elsewhere.

Resume reading uses a bounded 90-day local view cache, partitioned by verified account or guest. It stores only message IDs, canonical ancestry, timestamps and viewport offset, at most 40 threads. No body cache, new cloud store, domain truth, read receipts, Follow subscriptions or cross-device claim. Backscroll can change the resume position without reducing the furthest chronological seen cursor. Microsecond timestamps are preserved to avoid counting the current message again. Restoring a position still goes through the existing public visibility checks and is constrained by available page height.

New reply badges use community_thread_updates(jsonb), a bounded, public, read-only projection. Only approved visible native/imported descendants count; body-free tombstones can retain otherwise public descendants. Hidden roots/branches, cycles and paths beyond the existing depth bound are excluded. The first unseen nested reply has a canonical ancestry link. A transport/data error never manufactures zero. Refresh pauses when hidden, rejects stale principal/cursor responses and preserves the viewport.

## Database and transport

Applied 20261104143226_community_replies_reading_continuity. Existing replies_to_me baseline 9262089f7315b062deedbcfb9fb913f5 → b8eff459b7acffd86db14acf025b35bc; anonymous execution revoked, authenticated retained. New public projection hash 71af510491660bfcddf988594d8511cd, anon/authenticated execute intentionally granted; PUBLIC revoked. No table, identity, notification engine or product data writes. Existing rc_parent_idx supports traversal. Read-only connector lacks execute on this newly granted function; general connector used for one read-only real public projection check, not to expand connector grants.

Worker admits only the exact private pagination contract after canonical account verification, and the exact bounded public cursor projection using anonymous upstream headers. No cookie/account elevation, actor parameter, wildcard table access or launch/admission flag changes. Legacy production lock unchanged.

Security advisor categories remain six. Existing anonymous function exposure total stays 294 (private replies removed, public projection added); authenticated exposure 457 → 458 is the explicitly required new public projection. No other advisor finding/category changes.

## Verification

- 146 targeted tests pass, including canonical calculator/Now/header/middleware compatibility and exact new transport negative cases.
- Build includes the existing 79 assertions and passes; Legacy production lock passes.
- Disposable PostgreSQL 17 migration and acceptance tests pass: account/Person ownership, NULL contributor self exclusion, private/public ancestry, deleted titles, nested counts, cursor position and rejected duplicate/oversize/malformed requests. No live test posts.
- Synthetic Chromium 390/1440, guest/member: resume exact message and viewport (within 6px), nested new badge navigation, device capture, private Replies entry and exact message/list round trip; no JS errors or unexpected writes.
- Eight additional controlled browser cases preserve rich formatting, safe formatted links/media, synthetic send/edit/reload, personal cloud save acknowledgement, Follow/reload/unfollow/failure and guest login entry.

Publishing and final live read-only evidence are recorded in /workspace/scratch/community-replies-reading-release-20261104.json. Previous live rollback is dpl_9ym1yc7DUvRehxNymJrAcUSDk7Cb. No real authenticated account session is available; account flows were verified with synthetic browser HTTP and disposable SQL, not a live user post.
