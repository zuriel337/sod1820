# Shared source intake — legacy adapter handoff

Actor GPT · task CENTRAL_SOURCE_INTAKE_LEGACY_ADAPTER_20261013.
Owners: existing Research Intake v13 / writer_material_home v6, canonical UI and subscription funnel.
User direction 13 October 2026 23:38 Asia/Jerusalem supersedes automatic NowBar mail delivery.

## Implemented on branch

One private receiving home: existing inbound_emails. Shared source projection and
Research Intake transport adapter, parent-first threads, explicit missing/ambiguous/cyclic
parents, latest arrival/unread state. Same subjects never merge; pagination is explicit.
No source store, topic tree, queue, palette, Follow or Share engine added.

Legacy Admin -> פניות projects this shared model; original read/reply handlers are reused.
/admin?tab=messages opens that existing tab. Explicit draft destinations world/nowbar/writer
persist on the original occurrence at meta.intake_projection_v1. Admin-only SECURITY INVOKER
RPC uses current users.role plus existing RLS, row lock and optimistic revision; a stale
window cannot overwrite a later decision. Body/proof/holds/read/reply metadata is preserved.
Missing capability RPC disables Save honestly rather than pretending a local choice saved.

Follow resolves canonical_follow_subject and renders existing WatchButton only for a
resolved canonical author subject. Unsupported thread subjects never mint a mail namespace.
Private inbox has no public sharing control; public sharing stays owned by ShareActions.
Source adapters consume buildResearchIntakeTransport with private access.

email-inbound never calls public admission, including on replay. It retains verified
webhook/provider identity, delivery dedup, full bounded original text and native From-aligned
Resend DKIM/DMARC admission proof. Legacy NowBar email is OFF by default. Future public
reads require explicit published destination state in addition to current author, proof,
privacy, hold and global release gates. Saving destinations always creates a private draft;
no channel row, research object, notification or canonical content is created.

The existing Intake contract addendum records these owner/actions/routing boundaries.
No 2029 visual/shell/palette/Home/World changes. WhatsApp retains its existing source home;
a combined WhatsApp inbox UI is not claimed in this email-first delivery.

## Live versus branch

Production read-back: restored legacy 99249526, deployment dpl_46k9WvaD5QBUo969obYzJ7pKkNyq.
PR1089 starts from legacy-candidate-20261013@1e56a934, not main@4651042d.
Candidate Stage0 runtime/performance gates remain independently open.
Live inbox: 53 rows including tests; normalized count 0, public source=email rows 0.
Source/public/provision RPCs are absent. Prior apply_migration calls failed Invalid or
expired requestState, nothing applied. Only email-reply v4 was previously deployed as
private RFC reply compatibility. email-inbound remains v5. No email sent by this work.

All new central code/migrations/provisioning/public projections remain BRANCH ONLY.
No main push/merge/production site/env/production-branch change. Website hold persists.
The preview can read existing private rows after admin sign-in; Save stays unavailable
until the independent private routing migration is applied. Public publication remains future work.

## Verification and activation seam

Isolated Node/Edge/PGlite tests cover source proof, dedup, fidelity, thread lineage,
admin/ordinary/anonymous permissions, metadata preservation, stale-window rejection,
draft versus publication, and selected-destination public filtering. JSX syntax checked.
These are not signed-in browser, production database or source-to-public release receipts.

Migration 20261013204540_central_email_intake_destinations is independently applicable:
only private draft-routing and read-only capability RPCs over existing inbound metadata.
It does not require the older public bridge or author provisioning. Rollback drops its
two RPCs, preserving all source and routing metadata. No global publication flag enable.

Next: independent Claude architecture/privacy/action-family review and real legacy preview.
Public destination execution and thread Follow require their existing owners to accept
identity/event/notification seams. No bulk historical publication or source backfill.

## Independent review and receiving concurrency closure

Claude AFTER fa894a18 independently PASSed exact9bf3c7bc private stage: live RLS/role
ACL verified, all68 tests independently pass. Full Vercel preview9bf3c7bc READY,
dpl_A6Sa4C3riBvK5MmMTW9Kx2GgE8xq. Browser anonymous admin gate verified; no signed-in
private UI acceptance is claimed.

The noted replay read/modify/write race is now addressed on the receiving path.
Atomic scalar PostgREST guards compare current route revision and source hold; a
concurrent decision returns503 for provider retry. No private source/headers/body
are serialized into URL filters. Both normalized replay and legacy hydration are
covered, including PostgreSQL revision-guard and adversarial handler tests.

## Current sender identity closure — 14 October 2026

The pasted fd6b23a5/47-test status is superseded. Current base087e373d has72 tests,
independent private-stage/replay PASS, and a real full-build preview. Main now5dd7032e.
Fresh live private inbox:55 rows,0 normalized source_email_v1 rows. Two new substantive
approved-group messages arrived13Oct21:12:55/21:19:59 UTC (14Oct00:12:55/00:19:59 Jerusalem).
They remain private and have no public email carrier rows.

Real receiving-server proof independently re-read from original production Edge API
response logs6b041b95/e4f576fb: messages461bf1e0/3fc7e9f3 have native spf/dkim/dmarc pass,
resource IDs matched, both From identities are in the approved13. The actual source
proof adapter accepted both raw API receipts; with no canonical approval it still
returns no admitted author. No body, header, sender address or signed URL is in git.
Official contract: https://resend.com/docs/api-reference/emails/retrieve-received-email.

Canonical DRIFT/CORRECTION: prior four-row count was not four unique identities.
Fresh exact13 preflight:2 resolved (source indices3,6),9 would-create-private,
1 existing account needing canonical contributor link (index4),1 ambiguous mailbox
mapped to2 active profiles (index13). Candidate IDs for index13 are
19936860-6b35-4386-bc44-113289858ff0 and fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf;
existing unlinked account is2702ccc0-705e-46c7-8455-a26c80fcaf72. No identity is
chosen/merged by name, kind, age or email equality. No author provisioning occurred.

The existing2035 migration now independently installs PRIVATE mailbox/author helpers,
service-only exact-batch preflight and provisioning. It only sets email_source_approved;
it never enables email_source_public or public grants/policies. Ambiguous/unlinked
accounts block the entire write batch. Public bridge now separately requires BOTH
private source approval and explicit public approval, plus native proof/routing/holds.
The private stage can be installed without1930 public bridge or publication flag.

Current site/read permissions verified: private inbox has admin-only SELECT/UPDATE
RLS and no anon table grant; users.role is not client-updatable. Public broadcast
carrier SELECT exists, so no source-email row may be inserted before reviewed proof,
identity/publication gates. No live migrations/functions/public flags were applied.

All accepted questionnaire choices are recorded in the existing Intake addendum:
whole thread, verified-reply inheritance after first publication, all3 destinations,
text+original images. These remain planned distribution/media semantics; no automatic
publishing of new threads, raw HTML, quotes, attachments or provider signed URLs.

If native proof is missing/gray/fail, hold the private email. An authenticated canonical
writer submission through existing site contribution flow is a separate safe source,
not a forged-email exception. No new consent requests or verification emails were sent.

Remaining activation conditions: Person-owner resolution of indices4/13, exact13
private preflight/provision, reviewed private migration + normalizing Edge deployment,
real provider-to-private-storage/read roundtrip, then separately reviewed public
thread/image/destination and existing legacy release gates. Older public migrations
must not be applied merely to install private sender identity support.
