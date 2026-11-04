# Follow Center2029: wire the accepted view to existing personal readers

Task: `FOLLOW_CENTER_DATA_WIRING_20261025`. Actor GPT; passive handoff to ZURIEL.
Branch: `gpt/follow-center-preview-boundary-20261025`, existing draft PR #1159.
Slice base: `26132363c2af30e83dae5246f909edea86f981b4`.
BEFORE: `e325fd90-55c6-4093-9162-8464e136b0ce`.
Scope refinements: `98285316-c96a-4548-a130-00dc790a9835`,
`e8793e78-3bf2-4502-b0c4-f23d74fd6c0e` (11 exact paths total).

ZURIEL accepted continuation after the exact-head protected Preview and real-component form
captures. This is technical wiring of Claude's accepted view, not a new visual pass. The shared
palette, typography, CSS, SVGs, WatchButton and EmailVerify presentation remain unchanged.

## User flow

Opening `/2029/me/notifications` now mounts the existing native FollowCenter2029 view in the
existing personal layout. The canonical Auth provider supplies the account. The center does
not require contributor-self, a writer binding, XP or private rank to read an account's updates.
Other personal modules and their existing readers/editors are retained. Logged-out visitors
still see the existing personal sign-in gate; no guest inbox is requested.

The new bounded adapter reuses the existing owners:

| Operation | Existing owner and evidence |
| --- | --- |
| Latest updates | `getMyNotifications(30, { strict: true })`, with the existing authenticated client/RLS. A failed/non-array response stays unavailable. This is a loaded page, not a global unread total; the button labels its count as displayed records. |
| Explicit follows | `getNotificationPrefs({ userId })`; measured missing row is empty, malformed topics reject. Existing aliases are normalized/deduplicated through `canonicalFollowTopic`. Email and historical channels are not interpreted as consent. |
| Writer links | `publicWriterFollowLinks` makes one anonymous-visible batch. Ambiguous/private writers have no guessed public link. No query per card. |
| Unfollow | Existing `watchToggle(topic, "center", false, null)` only. A fresh preference read owns the final state, even if a mutation applied before its acknowledgment failed. If readback fails, the follow state is unknown, never a false empty/success. Retry reads without replaying the write. |
| Mark read | Existing strict `markAllRead` / `markNotificationRead`. Only `markedIds` returned by a validated acknowledgment change the same-account snapshot. Empty/partial acknowledgments do not clear everything. Pending actions reject duplicate clicks; failed actions retain unconfirmed records and expose read-only recovery. |
| Open content | The owned safe-link filter and return context remain. A plain click on unread content waits for the mark attempt before document navigation; modifier clicks retain browser behavior. The old exact `/me?tab=messages&dm=` handoff maps through `writerPersonalHref`, preserving native conversation identity. |

The instance controller holds request/view state only. It creates no store, dispatcher, API,
Auth provider or alternative Follow implementation. Each account mounts a fresh controller;
adapter changes and request revisions invalidate old responses. Canonical session checks before
reads/mutations and after inbox/preference/ack reads also reject a changed account. Requests
have a 12-second UI deadline. Late completion after timeout, account or adapter switch cannot
overwrite the current view. No callback falls back to live IO when an injected fixture is missing.

## Channel boundary

The former personal notification stack included the Legacy Push panel. This accepted center
does not expose that panel or enable/disable a channel. This is a bounded inbox/follow wiring
slice; channel-management interaction remains a separate continuation through the existing
Push/consent owners, and existing Legacy channel entry points are unchanged.

Existing accounts may already have historical channel preferences or device subscriptions.
Consequently this controller explicitly supplies an unmeasured channel state. The existing
view/model now displays `לא נבדק`, keeps `chosen=null`, and marks channel/delivery lifecycle
as unknown. It never treats unread consent as opt-out, claims no delivery exists, or derives
Email consent from `channels=['email']`. Default fixture behavior remains compatible. No Push
permission request, service-worker registration, subscription, OTP, consent or delivery action
is initiated by opening the center.

## Verification

- New real-component browser suite: **26 cases pass**, including partial/empty mark acknowledgments,
  mutation failure and pending double-clicks, measured empty and failed reads, authoritative
  unfollow recovery, late account/adapter responses, private prior-account reads, timeout recovery,
  guest guards and three presets at 320/390/1440.
- It also exercises the actual App2029 personal route and actual canonical helper transport:
  GET preferences/inbox, strict PATCH representation and canonical unfollow RPC. The notifications
  route makes **zero contributor-self requests**. Unread exact-target navigation waits for its
  single-item mark attempt and retains the conversation and return URL.
- All test mutations and account sessions are synthetic. Every external request is intercepted;
  zero requests are forwarded, zero live product writes, zero page errors/unexpected requests.
  Existing Auth/frame telemetry and read RPCs are separately blocked/stubbed.
- New adapter unit coverage uses the actual installed Supabase/PostgREST client with intercepted
  HTTP, plus a nonsecret Node equivalent for Vite's marketing environment seam. It checks
  measured/malformed data, anonymous public linking, account checks before/after transport,
  canonical source/on=false, minimum strict mutation evidence and DM target compatibility.
- Focused Node coverage also includes the existing model, strict inbox acknowledgments,
  WatchButton seam, shared treatment/palette/contrast, OTP/identity intent and personal model.
- All **10 focused Node entrypoints** pass (runner file units, not a combined assertion count).
- The built personal journey passes **54 viewport/module combinations, 10 flows and 6 editor
  refresh checks**, including exact DM navigation, save/refresh/draft preservation, account
  masking, privacy and guest/unlinked/ambiguous/error guards. Only obsolete Legacy notification
  selectors changed; the scenarios and assertions remain.
- The accepted center's **43-case** regression passes with its default fixture presentation,
  no page errors and no unexpected writes. Default fixture layout/state compatibility is retained.
- Legacy/default2029 and flagged2029 builds pass, as do Production lock, route hardening,
  World surface, public language, Legacy containment and `git diff --check`. Latest local
  bundler timings are 10.60s /2.62s for Legacy/default2029 and 1.33s for flagged2029; these
  measure local build work, not hosted latency.

Evidence and final build/regression/Preview results are in
`/workspace/artifacts/follow-center-data-20261025/` and PR #1159 / the passive AFTER. Final SHA
is intentionally recorded there, avoiding a self-referential commit in this file.

Live verification used the dedicated readonly canonical connection (`supabase_read_only_user`),
active `subscription_funnel_law` v19 and scoped policy metadata. Existing preference SELECT/UPDATE
uses `user_id=auth.uid()`; inbox SELECT/UPDATE uses the existing account/JWT-email predicate.
No grants, policies, schema or product rows were changed or privately sampled. This is not a
certification of broader historical policies or an authenticated hosted-data acceptance test.

## Integration / remaining work

The full candidate retains its original central lineage. Live central was independently at
`c121dab3badb9297ab3abdbfe88d35189cfa1285`; its incoming paths did not overlap the candidate.
Those commits are not merged here and combined acceptance belongs to the central owner.
`main` remains `8642f7c93c9b653b7a42faaa2809362f3cd280e0`.

Next bounded work: current channel capability/consent/device management through the existing
owners and accepted native controls; guest follow-to-verified-account continuation where its
canonical identity proof permits; central combined testing. This slice does not start those
tasks, migrate SubscribeGate/additional callers, change guest linkage, publish data, assign
identities, implement grades/billing, merge central/main or release Production.
