# Compact signed-in Community, image preview and two visible replies

Task: `COMMUNITY_COMPACT_SIGNED_IN_COMPOSER_20261101` · actor GPT · handoff ZURIEL.

Separate branch: `gpt/community-compact-signed-in-composer-20261101`.
Verified remote base: `gpt/2029-unified-community-latest-integration-20261031` at
`d2dd882f960a329394f4a23d7b6e4a7d4c4c6fd5`.
BEFORE: `632e948d-acb0-4c6c-b1b8-fe63331eac71` (including photo/reply addenda).

## Public behavior

Approved copy follow-up: a small muted public line beneath the conversation
heading reads: ״כבר הייתם חלק מהשיחה? הירשמו עם המייל שלכם, ונעזור לכם לחבר את
הפרופיל מהצ׳אט הישן לחשבון החדש.״ It wraps on mobile, and does not appear inside
individual profiles or claim screens. This is copy only; existing verification
and account-linking requirements remain unchanged.

Signed-in visitors see their own verified profile name, a small notification bell
and an account settings menu. A single 48px comment row contains the existing
avatar link and an accessible 44px attachment action. Publish and the character
count appear when writing, replying or attaching a file. Guests retain the
canonical AccountEntry2029 providers/email entry. The existing legacy-account
claim entry is available inside account settings for signed-in visitors.

An attached image appears below the authored text in the local draft. Its blob
URL is revoked when removed, published, unmounted or cleared on account switch.
Selecting a file does not upload it. Existing upload limits, retries and confirmed
publication behavior remain in use. The published-message renderer already
places images below the message text and was not changed.

The first two direct public replies appear automatically below visible root
threads. Each initial preview requests at most two rows through the existing
parent-validated reader, near the viewport. More replies are explicitly loaded;
nested expansion and exact shared-reply focus retain their existing behavior.
The source-count popover, single top conversation counter, loaded-window filters,
old conversation and public sharing remain present.

## Existing identities, notification reader and permissions

No new identity, inbox, store, notification writer or server endpoint was added.
The bell uses `getUnreadCount({strict:true})` against `user_notifications`, after
`auth.getUser()` verifies the current principal. The existing SELECT policy
`un_owner_read` restricts rows to `user_id=auth.uid()` or the verified JWT email.
The actual Follow/notification owner read was `subscription_funnel_law` v21;
Person v6 and canonical UI v12 also apply. No contract or policy was changed.

Counts are refreshed on visible entry/focus and at most once a minute while
visible. Loading/errors show no invented badge. Responses and profile names are
principal-scoped; a late response from a previous account cannot replace the
current badge. Opening the page or bell does not mark notifications read,
subscribe, dispatch messages or invoke a model. The bell links to the existing
private notifications route with the exact Community return URL. The gear uses
existing profile/login/claim routes. Account changes clear text and files before
painting the next account's composer.

Server owner-edit/admin-delete capabilities and existing blocked Preview actions
are unchanged. The new branch was not added to the server Preview-write allowlist.
No DB/RLS/migration/Edge/Production changes or live product writes were performed.

## Verification

- `npm run build:2029`; built graph/lazy checks; isolation; cheap hardening; Legacy
  production lock. OneTree content checks also run in prebuild.
- 67 Node tests: Community readers/actions/claims/media/profiles, shared Auth
  entry and sharing/copy boundaries.
- Focused built-browser acceptance: 16 cases, 320/360/390/1440 across light,
  parchment and dark, RTL, keyboard, 44px targets, no horizontal overflow, clean
  default composer, two automatic replies/explicit third, local photo order,
  no early upload, failed upload/publication retry, confirmed image publication,
  blob cleanup, unavailable counts, late count on account switch and logout.
- Existing share regression: 18 cases, including public exact reply/deep links,
  private context removal, native/copy behavior and recursive reply expansion.
- Existing media/reaction regression: 11 cases, including upload/retry, historical
  dislikes, likes rollback/account switch, publication after stale search and
  reply-parent context. Its fixture now accepts the new read-only unread-count
  HEAD request with zero synthetic unread rows.
- Existing UI carry regression: 18 theme cases and 17 Community cases, including
  guest canonical entry, compact filter row, pagination, return and artwork.

Browser tests use an actual built application with intercepted synthetic Auth,
messages, notifications and uploads; zero real product writes or model calls.
These browser runs use `VITE_INTEGRATED_PREVIEW=true`; an ordinary build is also
checked independently. No real account session or live upload was exercised.

Screenshots (direct browser captures, no image editing) are outside the repository:
`/workspace/artifacts/community-compact-20261101/community-compact-390.png`,
`/workspace/artifacts/community-compact-20261101/community-image-below-text-390.png`,
`/workspace/artifacts/community-compact-20261101/community-compact-1440.png`.
The name, unread badge 6 and messages are demonstration data. The image fixture
uses existing approved site artwork. The top historical conversation count is
the existing dated archive figure, not a newly verified live count.

## Integration boundary

Draft PR targets the verified unified integration branch; no merge or deployment.
The base's World, Posts, Books, ELS, explicit Raziel and approved 20-second Home
animation are inherited unchanged. This branch changes only scoped Community
presentation, first-two reply reading, browser expectations and this handoff.
There is no new hosted Preview URL/deployment ID. A future unified Preview must
retain its existing protected deployment and exact server allowlist contract;
this change does not widen that contract.

AFTER and exact remote HEAD/PR are recorded in the passive work log and external
receipt `/workspace/community-compact-signed-in-composer-20261101-receipt.json`.
