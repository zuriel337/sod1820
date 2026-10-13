# Legacy mail NowBar bridge — review handoff

Actor: GPT. Task: LEGACY_MAIL_NOWBAR_BRIDGE_20261013.
Owners: existing Research Intake / writer material / canonical contributor identity;
existing channel_updates broadcast carrier and legacy NowBar presentation.
Status: IMPLEMENTED / TESTED / BRANCH_ONLY. Provider proof verified; canonical author
provisioning and independent security review pending. Website release remains ON_HOLD
by ZURIEL: preview first, upload later. Combined legacy runtime gates remain required.

## Verified live baseline

Checked canonical Supabase linswmnnkjxvweumprav and Vercel sod1820 in
sod1820-s-projects on 2026-10-13. Public sod1820.co.il resolves to deployment
dpl_46k9WvaD5QBUo969obYzJ7pKkNyq, commit 99249526e91f1d720fae1aa43e82bbbe51ee5c45.
Claude's candidate 1e56a934670cbdbac2442a160d19b9f69766c49d is READY in preview
dpl_398yXyjT5KhsRJ7BmvsTXZKUaQ1o, not assigned to the public domain.
The isolated fix starts from that candidate, not current main 4651042d.
It preserves the candidate's existing Stage0 scope. It does not clear Stage0's
independent release/performance review blockers or authorize a Legacy→2029 cutover.

Diagnosis: zero channel_updates rows with source=email. Live email-inbound v5
stores only private inbound_emails. There are 53 private rows, zero normalized
source_email_v1 rows. Latest arrival is the synthetic reply at 06:41:12 UTC;
no later arrivals were observed. The successful bounded Gmail forwarding test
does not prove there have been new substantive messages since then.
Promoting 1e56a93 alone cannot manufacture the missing public mail producer.

## Implemented

- Private normalization is derived from PR1078, with provider-ID delivery dedup,
  positive-identity-only legacy hydration, collision preservation, full bounded
  text, retryable provider failure, provider/event arrival time and explicit
  oversize/HTML-only/cleaned-empty states. Original source stays private.
- Outlook/wrapped Gmail quotation boundaries are cut before prior bodies;
  contact redaction preserves dates and research numerals. Sanitizer version is
  mail-source-v2. Links remain redacted under the existing privacy decision.
- Known synthetic provider IDs and private rows 56/57 are denied explicitly.
- Canonical contributors provide the single approval home. Server-only
  page_config.email_source_public=true is opt-in, requires exact unique active
  email and canonical contributor identity, and is re-evaluated on every read.
  Current live contributors RLS is enabled and both anon/authenticated UPDATE
  grants are false; no UPDATE/ALL policy was found. Provisioning is NOT done.
- Branch-only migration extends existing channel_updates with source lineage,
  a service-role-only admission RPC, a complete-conversation public reader, and
  public RLS checks. Private/held/revoked/unproved sources remain invisible even
  through direct anonymous SELECT. Non-email source behavior is preserved.
- NowBar uses the sanitized server reader instead of the unpopulated direct
  email table query. Replies appear with their own author, chronological
  parent-first ordering and last-arrival activity. Full source text replaces
  the previous 600-character slice. An unavailable reader has a distinct status.
- Admin email-reply reads preserved RFC Message-ID from private metadata, so
  provider-based storage keys do not break existing outgoing reply threading.
  No email was sent by this work.

## Verification

Node 24: 53 tests PASS across normalization, actual Edge-handler mocks,
thread projection, legacy bar adapter, and real isolated PostgreSQL via PGlite.
Twelve database tests apply the exact migration and exercise actual SQL/RLS:
private inbox/read/write denial, approved root/reply admission, full thread
pagination, synthetic/missing-proof/held exclusion, revocation, collisions,
cyclic lineage, unchanged other sources, and duplicate-identity revocation.
PostgreSQL SQL/PLpgSQL parser passes; NowBar JSX syntax build passes.

```sh
node --test test/source-email-threads.test.mjs test/email-inbound-runtime.test.mjs test/now-bar-email.test.mjs
# Install @electric-sql/pglite in an isolated temporary runtime, then:
PGLITE_MODULE_PATH=/absolute/path/to/pglite/dist/index.js node --test test/legacy-email-source-db.test.mjs
```

Automated positive identity cases use synthetic fixtures. A separate actual provider
API receipt above now proves the live native authentication contract.
PGlite supplies actual PostgreSQL execution against a narrow fixture schema;
it is not a canonical Supabase migration, complete production-schema test,
Edge-runtime deployment, mobile/browser acceptance or production build receipt.

## Exact activation prerequisites

1. **Real identity adapter VERIFIED.** On 2026-10-13 the original Resend API log
   899e10c0-4d3a-4d87-b35a-225bdc6c7479 for the known private technical message
   3aff2258-5acb-4c07-99d3-055c19416c0e returned native authentication
   {spf:pass, dkim:pass, dmarc:pass}. The tool formatting omitted this object;
   the original authenticated response contains it. The actual pure adapter
   accepted the resource-matched real response. The source remains a denied
   technical test, not a public content or publication receipt.
   Official API now documents the receiving-server-owned object and From-aligned
   DKIM. No trusted result is read from email headers; null/gray/fail are held.
   The invented verified_from/provider_authenticated fields were removed.
   https://resend.com/docs/api-reference/emails/retrieve-received-email.
2. **Exact author provisioning prepared.** The approved Gmail source metadata
   from message 1a12c47d7932f8b4 contains exactly 13 unique identities and names.
   Live exact matching resolves four existing contributors: two directly by
   contributor email and two through existing canonical user_id/users.email.
   Nine missing identities receive PRIVATE source-registry entries, not public
   account/phone claims. Account-linked emails are never copied to public
   contributor rows. Existing public/person metadata is otherwise preserved.
   Operator-only provision_email_source_authors_v1 validates exact count,
   uniqueness, inactive/merged/ambiguous identity gates and uses existing
   contributors with private dossier visibility, building=true, trusted=false,
   and user_id=NULL for new source registrations. It has NOT been applied yet.
   Actual names/addresses stay out of git and public handoffs.
3. **Security owner review.** Reconcile PR1078's prior B1-B4 review against this
   exact change. Source proof remains BLOCKED; schema/RLS requires independent
   review and owner acceptance. No specialist delivery/review is claimed.
4. **Compatible release.** Apply the reviewed migration, deploy email-inbound AND
   email-reply together, and stage the exact legacy UI build. Verify an actual
   approved root/reply roundtrip and anon/private/held behavior, plus current
   combined legacy Stage0/browser/canary gates before promotion. Preserve the
   known rollback SHA 99249526. Do not merge into main or change environment
   variables as a shortcut. No production branch/settings change was performed.
5. **Historical/private data.** Never bulk-copy the old inbox or synthetic tests
   into public updates. Backfill requires current identity proof/approval,
   normalization and the same bounded admission RPC. Public media is withheld
   until an authorized durable image path exists; no raw HTML or signed private
   download URL enters the public DTO.

No live product DB write, migration, function deployment, main push, production
promotion, environment mutation or 2029 activation occurred in this work.
Handoff: existing authorized coordinator / original source-security reviewer.

## Standby operation

The existing site_flags carrier has a new mail_source_publication capability,
initialized disabled. SQL admission AND direct/public reads fail closed while
it is disabled or missing. This separates the already-authorized author
permissions and private authentication/normalization from the held website
release. Deploying the private receiving adapter does not publish mail.
Replays can repair derived admission after provisioning without overwriting
original bodies, holds or read/reply state. Enable only with the exact approved
legacy release and its remaining gates.
