# Reader demand loading — Draft #1469

Base: origin/main 886f80db20a6cf21d655a7766d1595766cbd32cd, integrated into the existing Royal branch. No production, database, permission or feature-flag changes. No new PR or store.

User decision: Home and Posts are reading surfaces; research actions belong to World, Heichal, code/ELS and gematria (including existing calculator/number aliases). Personal save and share remain available on explicit action. Exact-return navigation must survive reading a Post.

## Implementation

- Vite-only boundary for the existing Supabase AuthClient. On the canonical public artifact, an empty durable reader session and the existing explicitly anonymous projection defer the real SDK. Existing session/verifier bytes, login/callback URLs, uncertain storage and explicit Auth operations use the real SDK. Storage bytes are loading hints only. Cross-tab durable sign-in wakes the same SDK; normal server identity verification remains mandatory. Other build profiles initialize the SDK normally. No Auth/RLS/session policy is replaced.
- Profile and research cloud operations import the existing auth module on use. Keep the existing synchronous local research store and exact-return context; it has NOT been replaced by a second store or removed from the entry graph.
- Reading routes do not admit research cloud hydration, latest-path reads or ELS observation. Existing principal-bound journal/receipt handling starts on workspace entry or explicit personal save/retry. Reading does not automatically replay pending journals. Personal save is distinct from research actions.
- Post action rows keep personal save, share and reply, and omit research-add on reading routes.
- Includes the previously uncommitted document-owned Royal backdrop work and its tests. The four-route-only background experiment has NOT been implemented. Palace release remains blocked on performance acceptance.

## Measured bytes, identical local public profiles

Before demand split (Royal plus current main): entry203253 + frame46365 + frameCSS34213 =283831 gzip bytes.
After: entry176657 + frame46356 + frameCSS34213 =257226 bytes.
Saving: **26605 bytes (25.98 KiB), 9.37% of the measured shared total**. Entry file count stays17; frame file count3. This is initial graph weight, NOT a claim of milliseconds saved. SDK downloads later on demand. Analytics IDs/profile match between these local arms; not a production-variable baseline lowering.

## Verification

- Final npm run build and public-reading artifact build: PASS; both shell gates pass without threshold changes.
- Focused final Node tests:95/95 (Auth, route admission, research hardening, content-first, Royal document/assets).
- Initial Auth browser matrix on the first lazy-auth candidate:24/24 (account/code/password/recovery/OAuth model, mobile/PWA, storage). Later targeted checks cover the changed anonymous and storage branches.
- Storage browser acceptance after durable-storage guard:13/13.
- Final built-artifact browser tests:2/2. Guest does not request SDK; cross-tab sign-in wakes and verifies it. Reading has zero cloud research reads/writes; World admits hydration; Post preserves exact-return; personal save then receives the existing server receipt. All account/network mutations are local fixtures.
- New tests added to existing CI jobs; CI result must be checked for the delivered SHA.

Caught and fixed: first adapter build exceeded eager file count18>17; moved existing account/cloud actions on demand to restore17. Workspace helper initially added a prohibited static edge; placed it in already-imported researchContext. First guest browser assertion caught the anonymous projection still constructing the SDK. Admission-test setup initially assumed workspace hydration meant synced, although passive context queues correctly remain pending until explicit action; it now awaits the actual snapshot response and asserts no write before save.

The Home content-first source pin was updated for main's new editorial state while retaining loading; the prior analytics callback guard remains intact. A temporary negative Home marker mutation was caught and restored byte-for-byte.

## Still open

No new field-speed or matched time comparison for the demand-loading candidate; do not recycle the earlier Royal time measurements as its result. Existing Royal slow-network report found a warm-Home regression and ambiguous warm asset transfers; release is not approved. Local research runtime bytes remain for synchronous continuity. No claim of permanent browser caching. Auth adapter only implements the application's inventoried SDK methods; new SDK usages require extending the boundary and acceptance coverage.
