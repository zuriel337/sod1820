# Follow Center inbox: strict reads and confirmed read acknowledgments

Status: bounded technical foundation on the isolated review candidate. The Follow Center's
visual completion, visual acceptance and real-data UI wiring remain separate.

- Branch: `gpt/follow-center-preview-boundary-20261025` (existing draft PR #1159).
- This slice's base: `86e1b9a2885a9106a1663e254298aceeed0bbf94`.
- Unchanged central integration base: `1baf950477e6357dc1f89d87d47db15fd457fb23`.
- Task: `FOLLOW_CENTER_INBOX_ACK_FOUNDATION_20261025`.
- BEFORE: `2eeca439-0318-4954-9f60-f902b4cabcf4`.
- Three paths only: `src/lib/notifications.js`, `test/notification-inbox-ack.test.mjs`, this review.

## Current-state correction

The previous remaining-work summary incorrectly listed the page-editor save acknowledgment
defect as still open. The exact editor AFTER `592f9105` records its completed correction and
PR #1155 delivery; that PR was subsequently integrated into the central candidate. Current code
already uses `reload(true)` after saving, retains a confirmed same-account editor during overview
refresh, and requires a strict save acknowledgment. The historical visual reports describing
the older failure do not supersede that implementation. Do not duplicate the editor fix.

The current continuation addresses a different remaining dependency in the notification owner.

## Reproduced problem

The existing `getMyNotifications(..., { strict: true })` could treat missing/non-array data as a
successful empty list. `getUnreadCount()` ignored PostgREST errors and turned an absent count
into zero. Both mark-read helpers discarded PostgREST errors and returned no acknowledgment.
These compatibility defaults cannot establish that a new 2029 center loaded or saved anything.

With the actual installed Supabase/PostgREST client and an entirely intercepted HTTP transport,
the new 12-case test fails eight cases on the unchanged base. No external request is forwarded.

## Delivered interface in the existing owner

No new inbox service, store, API, dispatcher, Auth provider or subscription mechanism is added.
The existing helpers gain an explicit strict option; default Legacy signatures/returns remain.

| Existing helper | Strict behavior |
| --- | --- |
| `getMyNotifications(limit, { strict: true })` | Returns an actual array, including a measured empty array. Missing client, permission/network error or non-array data rejects. A loaded page is not an author-wide or inbox-wide total. |
| `getUnreadCount({ strict: true })` | Returns the server's exact nonnegative safe-integer count, including measured zero. Missing/error/invalid counts reject instead of inventing zero. |
| `markNotificationRead(id, { strict: true })` | Requests the modified row's `id,read_at` in the same filtered PATCH. Only validated returned evidence supplies `markedIds`. Invalid input, permission/network error, absent representation, wrong ID, duplicates or invalid read timestamps reject. |
| `markAllRead({ strict: true })` | Uses the existing unread-only bulk PATCH and returns only validated, confirmed IDs from its response. No per-item requests. |

Strict mutation result: `{ ok: true, markedIds: [...] }`. An empty `markedIds` is a confirmed
no-op: no local row is proved read. It is not permission to set a badge to zero or clear a
snapshot. A partial returned set confirms only those IDs. A caller must retain unconfirmed/new
items and refresh from the reader as needed; row-return limits are not assumed to prove a full
inbox. Already-read timestamps are not overwritten because the existing `read_at IS NULL`
filter remains in both PATCH paths. No retry/readback is added to a mutation.

Default callers keep their existing fallback/void behavior and do not request a representation.
The already-existing strict list consumer automatically benefits from array validation. The
new strict count/mutation modes are prepared for the accepted 2029 controller; they are not
wired into the fixture center or the current personal notification panels by this slice.
Consequently this is not a claim that the old panels' optimistic mark-read behavior is repaired.

## Privacy and integration contract

Live metadata-only readback confirmed an existing authenticated SELECT policy and UPDATE policy
for `user_notifications`, both scoped by the existing owner predicate. `authenticated` can read
`id`/`read_at` and update `read_at`; it does not have whole-table UPDATE permission. This code
continues to write only `read_at` and adds no grants, policy bypass or alternate identity input.
Only IDs are returned in the acknowledgment DTO; notification bodies and extra response fields
are not copied into it. This review does not change or certify the broader historical policies.

Future UI wiring must derive the principal from the canonical Auth path, prevent guest inbox
mutations, and scope every request/result to that principal. A late response from a prior account
must not update a new account's state. The helper uses the existing authenticated client/RLS;
it neither creates a parallel session nor replaces caller-side account-scope guards.

The live `subscription_funnel_law` v19 was verified through the read-only connector. Follow,
identity, channel consent and delivery remain separate. This slice does not read real inbox
rows, mark a real notification, send an OTP/message, opt anyone into a channel or alter consent.
Current Supabase documentation confirms `.update()` does not return modified rows unless
`.select()` is requested; the transport test verifies that actual wire behavior.

## Verification and continuation

- Direct regression: 12/12 test cases pass, including malformed/empty/partial evidence,
  permission/network failures, measured zero, minimum returned projection, wrong/duplicate IDs,
  invalid inputs and default compatibility. The eight failing base cases establish regression
  sensitivity. Fetch is intercepted for every request; unexpected endpoints/methods fail.
- Six focused Node entrypoints pass: inbox acknowledgment, consent, follow identity, center model,
  private-writer model and public Person composition. This runner reports file units, not a
  combined count of all assertions.
- `npm run build` passes Legacy and 2029. Local bundler timings: 2.01s and 1.17s respectively;
  these are build timings, not hosted latency measurements.
- Production lock, cheap route hardening, World surface, public-language, Legacy containment and
  `git diff --check` pass.
- Existing personal-chain browser regression passes ten flows plus six controlled editor checks:
  canonical self navigation, editing/refresh/draft preservation, public-portrait consent/revoke,
  inbox/send retry/replies, follow failure/retry, notification navigation, account-switch masking,
  guest/unlinked/ambiguous/read-failure guards, transient 503 and authentication 401, and invalid
  save acknowledgments. All HTTP data and writes are fixtures; no live endpoint is forwarded.

Evidence: `/workspace/artifacts/follow-center-inbox-ack-20261025/`. The final commit/Preview IDs
are in PR #1159 and the passive AFTER, avoiding a self-referential SHA in this file. The branch's
existing Preview-only public fixture flag remains unchanged; default builds exclude that route.

Claude's next bounded pass remains 2029 WatchButton typography/SVG, real ShareActions placement
and representative shared-treatment consumers. Only after the visual pass and ZURIEL's visual
acceptance should the center use these strict helpers. No callable Claude executor is available
here; no agent activation or dispatch is represented. No central/main merge, Production,
DB/RLS, live product writes, private data release, research grade or billing work.
