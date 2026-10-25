# Follow center: explicit-channel consent foundation and visual handoff

Branch: `gpt/follow-center-consent-foundation-20261025`.
Base: `1baf950477e6357dc1f89d87d47db15fd457fb23`, the centrally integrated PR #1155.
Task: `FOLLOW_CENTER_CONSENT_FOUNDATION_20261025`.
BEFORE: `7a41ab0c-c7a3-4568-bb55-d5731c64518f`.

ZURIEL confirmed the central fast-forward and authorized continuing the follow center. Remote
central and GitHub's merged PR state were independently verified. Main remained
`8642f7c93c9b653b7a42faaa2809362f3cd280e0`. The old personal-chain claim was reconciled against
its exact-task release `08d51316-174a-4842-98ab-bf4aa6a1b5be`; it is not a current competing writer.

## Confirmed defect and narrow fix

`NotificationCenter.buildSave` uses `mergeChannelsForSave` for ordinary preference saves and
quiet-mode changes. Missing or empty stored channels were replaced with `["email"]`, even though
the existing default channel constant is empty and Follow v19 requires separate explicit consent.
With the account's email present, the existing `saveNotificationPrefs` path can then call
`subscribeEmail`, which inserts into the subscribers table. Saving unrelated preferences could
therefore introduce email subscription intent without an email choice.

Missing channels now start from `[]`; an explicitly empty choice stays empty. Existing email and
unrelated channels are preserved. Explicit Push selection and the existing linked-account
WhatsApp gate retain their behavior. This changes the existing shared helper rather than creating
a second follow/consent mechanism. There is no visual or routing change in either application.

The old unified-notifications test explicitly expected the implicit email default. That assertion
was stale relative to the active contract. A replacement consent regression failed on the
unchanged implementation with actual `["email"]` versus expected `[]`, then passed after the fix.

The client save-path check invokes the real `saveNotificationPrefs` with intercepted persistence:
six save/quiet cases send empty channels and never reach the subscribers table. A positive
control with an explicit email channel reaches the existing subscriber path, proving interception
observes that side effect. Network calls and all persistence are intercepted; no real account,
preference, subscriber or notification was written. The existing client adapter forwards explicit
empty arrays. A read-only trigger inventory found only `notify_on_new_follower` on this table;
the narrow review did not apply migrations or inspect private preference rows.

This does not validate historical email-channel entries as consent, rewrite existing preferences,
repair historical subscribers, or certify server/provider delivery. An existing channel string
alone remains insufficient proof of consent or delivery readiness under Follow v18/v19.

## Validation

- Targeted Node run: 36/36 tests passed, no skips, including follow identity, writer personal,
  contributor actions/Person and the unified-notification consent regression.
- Regression on unchanged helper: failed at the new missing/empty-channel expectation.
- `npm run build`: Legacy and 2029 passed, including mandatory Production lock.
- Cheap hardening, public language and `git diff --check` passed.
- Actual preference-save adapter tested with synthetic persistence and zero network calls;
  no live channel activation, subscriber insertion or email was performed.
- No UI changed; browser appearance and authenticated hosted save are not claimed as tested by
  this slice. The central session reported an ELS failure that also reproduces on its Base. ELS
  was untouched and was not rerun or declared repaired here.

Evidence: `/workspace/artifacts/follow-center-consent-foundation-20261025/`.
Exact final SHA, PR/Preview and scope release belong to the passive AFTER handoff.

## Concrete next visual task under existing owners

The active authorities are `subscription_funnel_law` v19 (node
`d605d746-e973-4249-851a-d1086e301838`), Person Foundation v6, Design V2 and the current System
Frame addendum. Presentation belongs to Claude under Owner Index line 71. This document states
contract requirements and current capabilities; it is not an adopted new screen design.

Existing entry point: `/2029/me/notifications`, currently composing `NotificationsPanel`,
`FollowingPanel` and `PushPanel` from `UserCenter.jsx`. Public writer follow already reuses
`WatchButton` through `ContributorActionsController2029`. Existing preferences, notifications,
follow resolver, visitor/account identity and dispatcher remain their owners; no parallel store,
API, consent engine or notification sender is required.

The visual candidate must demonstrate these contract requirements:

1. One personal update center: what is new, explicitly followed people/subjects grouped by type,
   why an update was received, and channel preferences. Layout/control choices remain Claude's
   visual task. Existing `source_topic` supplies why-received; do not invent a reason.
2. Updates open the authorized canonical target with exact return preserved. Followed writer
   links resolve through `publicWriterFollowLinks` only for exact unique public contributors;
   ambiguous or private identities do not acquire guessed links or private profile data.
3. Public writer follow is compact, explains what is followed, and is distinct from share/save.
   Reuse `WatchButton`; no second follow button implementation or producer. Do not promise
   automatic updates for a subject whose event producer has not been verified.
4. Guest follow is allowed; its next step is identity verification only. A registered principal
   may choose supported channels separately. Follow, identity, channel choice and delivery are
   distinct states. Returning guests do not need to unfollow/refollow to resume verification.
5. Show actual capability states: this private module currently exposes device Push, while the
   common channel metadata marks email unavailable. Email/digest/WhatsApp readiness requires
   the existing owner's implemented consent/delivery path. Do not manufacture working switches,
   automatic opt-in, provider delivery or a linked WhatsApp account for a visual demonstration.
6. Explicit follow, inferred relevance and Raziel recommendation are distinct labeled inputs.
   Unimplemented relevance/recommendation features must not appear as measured active services.
7. Respect the existing desktop Updates/Context companion and mobile Now/Attention surface;
   no additional fixed bar, notification store or competing feed. Preserve Legacy presentation.
8. Use Design V2 tokens and all three presets. UI labels are at least 16px, reading text 18px,
   semantic metadata meets its floor, and controls are at least 44×44px. Verify 320/390/1440,
   keyboard focus, reduced motion, safe areas, overflow and return context.
9. Model first load, known empty, partial/unavailable reads, pending/confirmed/failed follow or
   unfollow, session change and channel unavailability truthfully. Failed reads are not zero;
   unconfirmed mutations are not success. Private fixtures must be clearly synthetic.

Before implementation, recheck exact-file ownership, create a fresh BEFORE on the confirmed
central base, and prepare a real-data/authorized-fixture visual Preview for ZURIEL's acceptance.
After adoption, GPT can wire the approved view to the existing readers and mutations, preserving
account scoping, consent, retry/error behavior and source navigation.

## Delivery boundaries

No callable Claude executor/CLI is available in this environment
(`SPECIALIST_DISPATCH_UNAVAILABLE`). No Claude task was dispatched or activated; the visual
handoff is passive to ZURIEL in the existing journal. The full follow-center design is still
pending. This technical correction is independently reviewable and does not substitute for it.

No main/central merge, Production, DB/RLS/configuration change, live product mutation,
subscriber contact, identity merge, publication or subscription/credit implementation. Only the
three claimed files change. Release the technical scope after the tested branch handoff.
