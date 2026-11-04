# Torah Tamima account link and Community recent-message times

Task: `COMMUNITY_TORAH_IDENTITY_RECENT_TIME_20261104`. Passive BEFORE:
`8f1d047a-926e-48aa-b69c-a9c509bed3cb`. Base: current main at
`2fd898540196020dcedc0bcc6cca9ef70d449461`. Dedicated review branch:
`codex/community-identity-time-20261104`. Primary retains startup/release ownership.

## Identity: applied and independently read back

ZURIEL explicitly confirmed that the new Torah Tamima writer is his known old
Torah Tamima user, requested the link/original photo and instructed proceed.
This is a manual Human Gate for this exact pair, **not a verified old-email match**.
No email address is published or copied into metadata.

- Current account: `365fb241-77ed-4a9d-98ab-4e30ab53c093`.
- New native message: `81e82bc4-5c05-408b-92b0-4779732c418f`.
- Historical Contributor: `1f95f46b-b18b-480b-a2d2-8a9ce90eb194`.
- Exact original source: `U_QAu9LlY39eZZzLYi`, proven by existing source links
  on all 12 historical messages. Names/face similarity are not matching evidence.
- Canonical Person: `3023585e-1b2e-40e4-8b6d-e6b2743ae9c5`. Created because
  this confirmed active account had none, using the existing account-backfill
  pattern and canonical account advisory lock. No duplicate historical Person.
- Exactly one primary Contributor; two reserved `legacy_seed` edges:
  `2e7c3519-b487-4806-afed-f38704a2dc40` and
  `2cbf5d47-9d28-49e3-b3f1-b06bd206067d`.
- Account image was empty and now uses the exact original public image:
  `https://sod1820.co.il/community-avatars/1215acc5cd59c120f52d.jpg`.
  Real public GET: 200, image/jpeg, 5,792 bytes, SHA-256
  `1215acc5cd59c120f52d4fa7068bc25432ed32afa9f2b0f475732091c8295eb1`.
- Applied decision: `5b028046-3460-474e-9800-ca03f05e4db6`, including exact
  inserted edge/claim IDs, pre-values and conditional rollback guidance.

The exact operational SQL is
`scripts/ops/link-torah-tamima-approved-account-20261104.sql`. It ran through the
authorized canonical Supabase SQL connector after disposable PostgreSQL tests.
It fails closed on competing ownership, another primary, merged/protected
contributors, inactive/unconfirmed accounts, changed native/source provenance or
reserved edge conflicts. Replay keeps IDs and later user image edits/removals.
No client RPC or authentication impersonation was introduced.

Before/after hashes are identical:

| Preserved data | MD5 comparison checksum |
| --- | --- |
| All historical messages plus the identified native message | `65c974fdc228c95d38ec161bf2464267` |
| Contributor excluding only user_id/updated_at | `c717a0a0e74d3e5f82db57972db0b05e` |
| Entire Auth record | `cfef30e5fb90b9fbff16ed84373a235f` |

All 12 historical messages retain their original IDs, bodies, timestamps,
moderation states and provenance; pending rows stay pending. The dossier remains
**private**. Auth/email/provider data, merged_into and visibility are unchanged.
The existing identity→Follow trigger was inspected and exercised in the fixture;
there were no relevant live account/historical-key preferences before the link.
No new subscription or delivery consent is requested by this operation.

Rollback requires reviewing this exact decision's provenance, later activity and
image edits. Remove only the inserted edges/claim and direct link if still the
same. Remove the newly created Person only if unused; otherwise retain it and
review its bounds. Never remove source messages or overwrite later user edits.

## Recent time: implemented and tested, primary integration required

ZURIEL explicitly requests the Community-only exception to the older Home-only
relative-time rule: messages less than 24 hours old show `לפני 5 דקות` /
`לפני 2 שעות`. At 24 hours they return to the existing full date/time. The original
`created_at` is the source, never import, edit or refresh time. Future and invalid
dates do not produce misleading relative labels. Full date/time remains in the
semantic `time` title/accessible label and original datetime attribute.

One shared minute timer serves roots, nested replies and Community author cards.
It pauses while the tab is hidden and catches up on return. Existing bilingual
public-activity overrides and every other surface's date policy stay intact.
No DB schema/RPC/RLS, bootstrap/transport, shared flags, release guard or CSS
changed. No deployment/alias/main update was performed by this task.

Validation:

- 25 PostgreSQL assertions on disposable network-isolated PostgreSQL 17, using
  the exact operation and actual canonical identity→Follow trigger. Includes 14
  rejection cases, late transactional rollback, existing/missing Person, chosen
  photo preservation, exact original source preservation and idempotent replay.
- 88 Community/shared-date Node tests pass.
- Local public-reading production artifact builds; all 79 builder assertions pass.
- Four controlled Chromium cases: 390/1440 × guest/member. Original creation time,
  accessible full date, nested replies, account-photo rendering, minute updates,
  24-hour rollover and hidden-tab resume pass; no unexpected writes/page errors
  or horizontal overflow. HTTP/auth are synthetic; these do not claim a real
  account login/send/update or a deployed relative-time UI.
- Date-display guard: 2/3 pass; the existing main failure at
  `HomeComposition2029.jsx:123` uses direct locale formatting. Verified identical
  on origin/main; outside this scope and not weakened or changed.

The initial avatar-file test failure was a sparse local checkout omission, not a
main defect. Materializing the already-tracked directory resolves it; all 88 pass.

Run:

```sh
bash scripts/run-torah-tamima-approved-account-sql-test.sh
node --test src/lib/community/*.test.js src/lib/relativeTime2029.test.js
node scripts/build-public-reading-production.mjs
python test/community-recent-time.browser.py
```

Primary integration: cherry-pick this review commit onto fresh main; the identity
operation is **already applied** and need not be run again. Include the scoped
Community time component/helper and LiveAuthor/card wiring in the primary's own
tested release. Preserve the already-integrated legacy inline-image fix. This
handoff does not authorize weakening startup/release checks or claim deployment.
