# Latest Community delta in unified 2029 Preview

Task: `COMMUNITY_LATEST_DELTA_TO_UNIFIED_PREVIEW_20261031`.
BEFORE: `ef2fabda-656b-4218-8d77-17d793ffc41f`, passive GPT → ZURIEL.
Target base: `9b431be99b6df322413d5032799ec85241d71186`.
Integration branch: `gpt/2029-unified-community-latest-integration-20261031`.
Source: `gpt/community-auth-publish-media-20261031` at
`b056827004725ee287d34f2f64f02411081a6201`, PR1185 reference only.

## Received once

Before application, the existing Community/Share runtime and avatar wrapper
matched source `aa9430dc`; only the central builder/guard carried extra central
adaptations. `git cherry target source aa9430dc` reported all three new patches
missing. The three source parents were checked, then cherry-picked in order:

| Source | Integration |
| --- | --- |
| f5ee28a2e09ee6f901f00eefcff434c27cf58495 | da9d6c852 |
| 1ff40befc94352fe66d750c1afe2e8272d6283c0 | 1e5bdeaa8 |
| b056827004725ee287d34f2f64f02411081a6201 | f68867c60 |

The only conflict was the Preview guard **test**: retain the central Raziel
test, source reply-context fixture arguments, and new public reply test together.
The first combined test patch is not whole-patch-equivalent after this bounded
composition; source runtime equality was checked independently. The latter two
commits are exact patch-equivalent. No historical branch or accepted aa9430dc
code was imported again.

Community/ShareActions/legacy-chat projection/CSS/new URL adapter runtime files
remain byte-identical to source b056827. The nine checked central protected files
(Home20-second CSS, Frame, Provider, request adapter, ai-analyze, Home/Books/World/
Post pages) remain byte-identical to base9b431be99. No other source handoff was
imported. The lower chat keeps its existing source, conversation ID and activation
mechanics; only its accepted public labels change.

## Exact-branch transport composition

The new integration branch is explicitly admitted alongside the reviewed source
branch for the existing bounded Community management, publication, positive
reaction, media, verified legacy claim and own-avatar transports. The existing
payload, method, Auth, same-origin, ownership, file-path and size checks are
unchanged. Other Preview branches, development and Production do not inherit
these exceptions. The thin self API admits the same own-avatar exception only;
it retains caller `getUser`, owned URL checks, ESM, private responses and the
`/api` exclusion from the SPA rewrite. General profile/page writes stay blocked.

Public reply reads still require the exact closed projection, UUID and bounded
pagination. Each request first calls the existing `community_message_context`
reader to validate the parent chain. Invisible parents yield no rows, unavailable
context fails closed, and raw `community_reply_counts` remains blocked. Live
function bodies were independently inspected read-only; the child-page reader
alone does not validate its ancestor chain. Existing authenticated execution
grants were checked without invoking mutations or changing them.

Central World/Books gates, One Tree enforcement, personal read access, and
explicit-only existing Raziel transport are preserved for the new exact branch.
Matrix jobs and unsupported ELS server contracts remain blocked. Build identity
truthfully reports scoped Community product writes enabled, lists their scope,
and marks general profile writes false; it does not claim globally read-only
transport. Automated acceptance performs **zero live product writes or models**.

## Verification before hosted release

- Community/share/guard/self API selection:90/90, zero skips/failures.
- Existing shared-share compatibility:13/13; Home card:11/11; existing Raziel
  Preview fixture regression passes. No test threshold was lowered.
- Exact share browser:18 cases against the built app and18 against the actual
  generated Preview worker. Three levels, root/reply/path, refresh/focus/back,
  native/clipboard failure and retry, 44px/keyboard,320/360/390/1440 and all themes.
  All HTTP/device operations are intercepted fixtures, not real device shares.
- Single upper snapshot/count/disclosure browser:17 cases. UI carry:17 Community
  cases and18 theme-control cases, zero failures/page errors/model calls.
- Writer-personal:90 captures,10 flows,six refresh/ACK checks,zero errors.
  Message actions:47 cases,zero errors/unexpected writes/model attempts,
  including guest/owner/other user/admin and stale principal fixtures.
- Build2029, integrated Preview build, One Tree78, graph/lazy, isolation,
  hardening, Legacy lock and diff check pass. Eager gzip442195 normal and439710
  Preview: +50 JS gzip bytes vs base, unchanged recovery floor12288. Submit
  adapter and Research Plan remain lazy. Existing build chunk warnings remain.

The134.9K upper number is the unchanged verified dated OpenWeb snapshot, not an
automatically updated or locally incremented count. No lower counter remains.
The lower section/jump entry is `ממשיכים לשוחח`.

## Hosted acceptance and limits

Deployment URL/ID/final SHA/remote equality and actual hosted guest acceptance
are recorded in the final passive AFTER after this document is committed. The
hosted check uses existing public rows through canonical readers, intercepts
device sharing/telemetry and performs no live product writes. A bounded read-only
lookup found an eligible public root/reply; no eligible three-level chain was
found in that lookup, so live three-level acceptance is not claimed. Three-level
behavior is proved by the controlled fixture browser tests above.

Authenticated ownership/action/avatar positive cases use fixtures. No real user
message, profile, media or identity was modified for testing. Real account/OAuth
and operational mutation acceptance remain separate from this guest run. Existing
Raziel/ELS backend compatibility and personal relevance gaps are unchanged.

No main merge, Production/alias/domain change, Legacy runtime change, Edge deploy,
product DB/RLS or migration apply. All coordination rows are passive to ZURIEL
with NULL dispatch. Plan37 reconciliation and measured performance follow this
accepted integration; this task does not update the planning body itself.
