# Opening-parts email consent — source implementation, shared change NOT deployed

Base `979c25aa2a91fa96de3a50db8fc93425a183c694`; passive BEFORE
`5ce04c53-2a9e-46ce-a36d-e6be51e7de71`; owner subscription_funnel_law v21,
existing subscribers/newsletter_campaigns/newsletter_sends pipeline.

## What is implemented locally

- The existing `NewsletterSignup2029` now describes only updates about opening
  site parts. Its public-reading closure remains active and collects no email.
- The existing transport accepts an explicit `site-openings` purpose. It first
  probes the existing endpoint with OPTIONS and requires `opening-parts-v1` before
  any POST, preventing an old deployed server from silently ignoring the purpose
  and adding a general subscriber. A matching purpose receipt is also mandatory.
- The proposed signup server validates explicit consent and inserts only the
  existing subscriber row with source, purpose and server consent time. No welcome,
  attribution event, Follow, identity, referral credit, account or model call.
- Replays for an active previously consented opening-only address are idempotent.
  An existing general subscriber, missing consent evidence or suppressed address
  is never modified/reactivated by this anonymous form. It returns verification
  required, not successful signup. Completing the existing verified-owner
  preferences flow for those cases remains open; no substitute identity flow built.
- General newsletter, welcome backfill and re-engagement source readers require
  general purpose. Explicit admin `send-newsletter` purpose=site-openings selects
  only active consented recipients, retaining existing campaign/send auditing and
  signed global unsubscribe. Opening emails have purpose-specific footer and no
  click rewriting/open pixel. A tracking link cannot reactivate opening-only rows.
- All shared changes are source/proposal only. There is no live send, signup,
  unsubscribe, migration, permission update, cron change or Edge deployment here.

## Read-only live evidence, 2026-11-02

`subscribers` contains email/source/active/acquisition/unsubscribed_at/token;
there is no purpose field. Unique index is lower(email). `subscribe_events` has
user_id/visitor_id/topic/source/action/time, no email-only consent identity; it
must not be misused as a second mailing list. `notification_prefs` belongs to the
existing verified identity/Follow/channel flow, not an anonymous newsletter bypass.
No subscriber triggers were found. RLS includes public INSERT with check true,
admin SELECT and admin UPDATE; no policy or grant changed.

Other relevant live/source dependencies:

- cron118 `welcome-auto-new` invokes welcome-backfill hourly. Guarding only the
  signup's immediate welcome or send-newsletter is insufficient.
- send-reengage intentionally preserves its existing legacy active/inactive
  cohort behavior, but excludes opening-only purposes.
- nl-track retains legacy explicit general-cohort resolve behavior; opening-only
  opt-out is not reactivated through it.
- research-nurture selects research_leads, not subscribers. No new research_lead
  is created by this handler. notify-page-ready/reply use separate user flows.
- handle_new_user may subscribe a newly created account. Public-reading admin
  entry is restricted by the identity lane to existing-account password login;
  signup/OTP/OAuth remain separate acceptance and shared-trigger work.

Deployed metadata and complete code were retrieved read-only through Supabase on
2026-11-02 and saved under `rollback/` after credential-pattern inspection:
newsletter-signup v18 (verify_jwt=false), send-newsletter v15 (true),
welcome-backfill v7 (false; existing FB_ADMIN_KEY server check retained),
send-reengage v2 (true), nl-track v2 (false), and unchanged unsubscribe v9 (false).
`rollback/manifest.json` records exact deployment bundle hashes; source SHA256 and
base comparison are in `rollback/source-comparison.json`. send-newsletter and
unsubscribe match the product base apart from EOF normalization. Other differences
are comments/formatting, except the base signup error HTML additionally strips `<`;
that existing base hardening is retained. No newer runtime capability was replaced.
Reverify these versions before any approved deployment; inventory is not permission.

## Exact shared change and order (approval required)

1. Inventory/save current five function versions and verify all active subscriber
   delivery consumers; approved secrets stay in their original project.
2. Validate `subscriber-purpose.proposal.sql` in a clean local schema and a
   production-shaped isolated schema with synthetic existing/suppressed records;
   run twice. It adds two fields and one check on the same table, and constrains
   the existing public-insert policy to the unchanged general envelope. It does
   not create a table, RPC, subscriber copy or new permission engine.
3. Apply that reviewed additive migration; legacy rows retain general delivery
   semantics, with no claimed historic opening consent.
4. Deploy/test sender guards first: send-newsletter, welcome-backfill,
   send-reengage and nl-track. Verify no unguarded cron/sender can include the new
   cohort. No real mail is needed for the negative/capture tests.
5. Deploy newsletter-signup LAST, then verify its contract header and denied
   cases without inserting a real address. Enable the exact frontend/worker seam
   only after this full acceptance. No broad functional-preview unlock.
6. Future manual opening announcements use existing admin send-newsletter with
   explicit purpose=site-openings. Existing server admin identity check remains.

## Return plan

Disable the new signup UI/transport first, leaving all rows and unsubscribe intact.
Before any opening-only rows exist, previous function artifacts can be restored
and the new columns left inert. Once such rows exist, **never restore an unfiltered
old sender**: retain the purpose exclusions (or stop only the relevant sender with
its existing control) until a corrected version is accepted. Do not drop fields,
clear purpose values, reactivate suppressed rows, delete research history or
reclassify opening-only consent as general. Site rollback does not undo consent.

## Validation and open gates

15 offline Node tests pass (12 focused + 3 preserved address/transport cases). Tests execute the actual bundled signup/send handlers with fake
network clients, including no-side-effect signup, missing consent, duplicate,
suppressed/general records, purpose separation, non-admin rejection, read failure,
and old-server contract rejection. Existing public-foundation transport/address
checks remain intact. These are controlled tests, not live delivery proof.

17 SQL replay checks pass in isolated in-memory PGlite 0.5.14 / PostgreSQL 18.6
against clean and production-shaped synthetic schemas, including repeat application,
actual anon/authenticated role denials, server-role insert, unchanged legacy fields,
suppression and transaction rollback. `isolated-sql-receipt.json` is the receipt;
`replay-purpose-proposal.mjs` is reproducible with PGLITE_MODULE pointing to the
installed module. This is SQL/RLS validation, not a full hosted Supabase receipt
or an exact Production PostgreSQL-version reproduction.

Shared migration/function deployment, existing-email verified-owner preference
change, and exact hosted signup/opt-out acceptance remain open.
No claim that this launch requirement is complete while the form is closed.

## Applied receipt — supersedes the proposal-only runtime status above

ZURIEL explicitly approved the immutable e8a72b22 proposal. Root applied the
additive migration `20261102130833_newsletter_opening_parts_consent`, then the
four delivery guards, then signup last. Existing JWT settings were preserved.
Exact versions/hashes and safe live negative checks are in
`shared-apply-receipt.json`. OPTIONS returned opening-parts-v1; missing consent
and invalid address returned400. Subscriber rows remained1021, opening-only
rows0, consent timestamps0 before/after. No successful live test registration,
unsubscribe or email send occurred. Controlled positive tests are not live proof.
The client is enabled by deliberate contract probing, with the exact opening-only
worker allowance; it makes no startup probe. Existing-address verified preference
change remains open. Website Production/Legacy deployment did not change.
