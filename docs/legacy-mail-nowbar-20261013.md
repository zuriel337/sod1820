# Shared source intake — legacy adapter handoff

Actor GPT · task CENTRAL_SOURCE_INTAKE_LEGACY_ADAPTER_20261013.
Owners: existing Research Intake v13 / writer_material_home v6, canonical UI and subscription funnel.
User direction 13 October 2026 23:38 Asia/Jerusalem supersedes automatic NowBar mail delivery.

Current 14 October status: the two identity choices explicitly approved by ZURIEL
were APPLIED privately and verified (see final LIVE closure). Exact13 read now
shows4 canonical matches,9 would-create-private and0 identity blockers. Source
approval/provisioning helpers, private normalized ingress/routing activation and
public distribution remain separate pending stages. No mail was published. Code
tests101/101; exact operator independently reviewed, including native schema fix.

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

## Earlier live baseline (13 October 2026; historical)

Earlier production read-back: restored legacy 99249526, deployment dpl_46k9WvaD5QBUo969obYzJ7pKkNyq.
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


Independent review99b84b96 PASSed604e9d66 code (21 isolated PostgreSQL tests) and
confirmed the same2 data blockers. The two index13 profiles are one account-backed
self-dossier and one private open-web imported profile with a matching mailbox;
mailbox equality is not an authoritative same-person/merge decision. Neither
has an authoritative merge pointer. Index4 account has no contributor pointer.
No profile was chosen or linked. Contributors have no insert/update triggers live.

Follow-up preflight correction: an already-governed merged alias is not counted as a
competing canonical identity. A merged-only mailbox without a matching live canonical
author remains blocked instead of minting a duplicate source identity. Merge history
is preserved; no real merge is performed. Regression tests cover both cases. Actual
new source normalization yielded available text for both receipts (2435/2188 chars),
parent references retained,0 attachments. This is offline adapter evidence, not live
normalization/storage or public publication. Both receipts are the same approved sender
(index1), so this is not proof that every one of the13 mailboxes has native DKIM/DMARC.


The private producer now retains native provider identity_proof independently of
canonical author resolution. A legitimate received sender can therefore be proved
while author/admission remains unresolved. No author, publication or permissions are
inferred from that proof alone. The existing source/privacy/public gates remain required;
a regression test exercises actual handler behavior with positive native proof and
no canonical author. Receiving and provider replays still never invoke public admission.

## Pending canonical decisions: bounded native rehearsal (2026-10-14)

Status: PLANNED + TESTED WITH SYNTHETIC DATA; not live, not a repair runner.
The operator still has two distinct decisions to obtain, not a new consent request
for the already-approved thirteen senders. Person v6 explicitly reserves
contributors.merged_into for manual Human Gate; service_role is not Human Gate.
Current main5dd7032e and private PR head337c26f9 were re-read before this pass.

1. Index4 already has exactly one account Person, but no Contributor. Recommend
   creating a PRIVATE Contributor linked to that exact existing account, keeping
   kind=private, visibility=private, building/trusted/engaged=false and no public
   source flag. Reuse the existing Person; do not create/link a different Person,
   impersonate the account owner or call contributors_claim_legacy as that user.
2. Index13 has an account-linked self-dossier and an unclaimed private import.
   Recommend the account-linked dossier as the future email attribution target,
   only if ZURIEL confirms both records represent the same person. Mark the import
   as a native alias using merged_into=TARGET SLUG, never its UUID. ContributorPage
   redirects to /community/researcher/<merged_into>; an UUID pointer breaks that
   route. Preserve both rows, all material attribution, dossier settings, user_id,
   flags, source metadata and access. No content transfer or profile-field copy.

Live footprint: index4 has one account Person. Index13 account has one account
Person; imported dossier has3 research contributions (2 approved,1 hidden), account
dossier has23 (9 approved,14 hidden), plus1 contributor_content item. Neither has a
contributor legacy identity edge; no merge pointer exists. No content bodies were
retrieved for this decision. A private dossier is NOT evidence that every attributed
contribution is private: current rc_public_read grants approved rows independently
of dossier visibility. Preserve each row's exact current status/ownership.

No existing admin Contributor merge/link RPC was found. contributors_claim_legacy
only allows the actual authenticated, email-confirmed account holder to claim an
unlinked same-mailbox profile; fn_get_or_create_my_person is account-owner scoped
and is not a privileged Contributor linking API. Do not use either as an admin
impersonation shortcut. Historical materialization only operates on an already-
resolved Contributor with contributions and does not resolve this ambiguity.

Before any separately-authorized live operator transaction: re-read the exact13
private input and candidates, current account/Person uniqueness, no overlapping
writer, original row snapshots and row counts. Require explicit recorded Human-Gate
decisions for both choices, lock/recheck touched candidates and the existing account
lock namespace, and abort on any changed mailbox, account, Person, merged pointer,
visibility, attribution or candidate count. Record exact actor, decision and
before/after IDs in the existing decision_ledger. Do not deploy a generic email-
based merge engine. Rollback must use reviewed expected-state guards and restore
only the alias pointer/remove an unreferenced newly-created private Contributor;
never delete accounts, Persons, material or source history. No live transaction or
provisioning function call was performed in this pass.

The new isolated reconciliation test uses synthetic identities and replays the
exact footprint through the existing2035 private migration. It proves the preflight
remains blocked until both test-only owner decisions, native slug aliases retain
all26 contributions/one content item/Persons, anonymous visibility is unchanged,
the existing batch then reuses4 and creates9 private identities, and replay adds
none. This is fixture evidence, not completed sender reconciliation, not operator
transaction authorization, not proof of production locking/audit implementation,
and not evidence that all13 senders have native provider proof. No SQL repair runner
or new RPC/table/identity owner was introduced. Public gates remain closed.

### Alias consumer consistency delta

Original Claude review0b27ae25 PASSed the94a98a55 recommendation/rehearsal only
(12 independent tests), and identified two caveats which this follow-up resolves
before any real identity decision. src/lib/writers.js previously resolved only
UUID merge pointers while ContributorPage resolves slug pointers. The existing
read-only resolver now indexes exact slugs too, retains historical UUID support,
and rejects missing/inactive targets, cycles, duplicate slugs and UUID/slug
collisions. It never modifies profiles or infers merges from display-name equality.

Both independently-applicable mail migrations now define the same service-only
email_source_aliases_valid_v1 predicate. Only a native exact slug pointer to one
active, unmerged, same-mailbox canonical target may be excluded from sender
ambiguity. Self-links, dangling/cyclic/inactive/foreign-mailbox pointers and
duplicate slugs/UUID-slug collisions hold the whole preflight; malformed aliases also prevent private
author resolution and revoke current public-mail eligibility/admission. This
validates an already-recorded alias; it does NOT create or authorize identity
merges. Historical UUID pointers may still be read by the generic writer resolver,
but email admission requires the reviewed native slug alias, not a UUID shortcut.

New negative tests cover these branches and direct anonymous public-carrier
revocation plus safe recovery after exact test-only alias repair. All94 local
tests passed. These SQL/read-only resolver changes are branch implementation,
not deployed code. The two real identity blockers remain, and actual account-link/
alias decision, guarded operator transaction, audit and rollback are still pending.

## Human choice 1 recorded; guarded operator prepared (2026-10-14)

ZURIEL explicitly chose option1 at02:01:55 Asia/Jerusalem: link the missing private
Contributor to the existing account/Person; account self-dossier is the selected
primary with the private imported profile retained as a native slug alias. This
records the manual identity decision only, never permission to publish emails,
enable public access, merge main or deploy the production site. Both accounts were
re-read: confirmed Auth email matches the public account mailbox, exactly one
account Person each; private candidate fingerprints/footprint were unchanged.

scripts/sql/apply-private-email-identity-choice-v1.sql is a privileged one-off DML
program, not a migration, permanent RPC or automatic email-based merge engine.
The private exact13 input and expected fingerprints are supplied transaction-
locally by the trusted operator, not committed. Only postgres can execute it;
client-supplied human/actor strings do not grant execution permission. It rechecks
confirmed account/email/Person uniqueness, missing-vs-duplicate candidate counts,
exact private import/current target snapshots, exact unique target slug and material
digest before writing. The account advisory-lock namespace is reused and a short
Contributor SHARE ROW EXCLUSIVE lock prevents phantom inserts by legacy writers
which do not share that namespace. Reads continue; caller bounds waits to2seconds
and statement runtime to10seconds and keeps all statements in one transaction.

The only intended identity changes are one private account-linked source profile
with no email approval/public flags and one native alias pointer. Existing users,
Persons, profiles,26 contributions and one content item retain their original
fields/ownership/status/access; post-write preservation failures roll back both
changes. Mandatory existing decision_ledger audit contains selected IDs, HumanGate
reference and revision digests only; no raw contacts/names/body/code/access-code
snapshots. Revision digests are concurrency guards, not sender identity proof.
An exact replay must match its recorded input/applied rows and creates nothing.
Changed rows/Person/account or a previously rolled-back approval require review.

scripts/sql/rollback-private-email-identity-choice-v1.sql is separately gated and
not automatically invoked after success. It requires the exact unchanged applied
rows and an unused new source, restores only the native alias pointer, retains the
new source as private/inactive, and appends a rollback decision without deleting
rows/material/Persons or overwriting the original audit. Subsequent approval,
material references or other changes block rollback for manual review. A rolled-
back approval cannot be reused to recreate identities.

Seven new isolated PostgreSQL operator tests execute these actual DML blocks:
positive preservation/audit, exact replay, spoofed anon/authenticated execution,
seven stale-state failures, post-write/audit failure atomicity, guarded rollback
and referenced/changed-source denial. Preparation is not evidence of a live apply;
independent specialist review and a fresh expected-state read precede execution.

The first approved live attempt stopped BEFORE WRITES because native
research_contributions.target_id shadowed the original PL/pgSQL local target_id.
Private source/audit counts remained0 and both profile fingerprints/pointers
were independently re-read unchanged. The isolated fixture had omitted that
real column. Both operator blocks now prefix EVERY local with v_, and the actual
native target_id column is in the isolated fixture; the correction is re-tested
and independently reviewed before another attempt. No approval boundary widened.

## LIVE private identity closure after choice 1

The namespace fix5c98611b independently PASSed Claude fb6d547c (7 actual DML tests;
comparison confirmed only local identifiers/header changed from77ac011a). Fresh
live guards and one-writer scan matched the original approved private context.
The corrected single transaction APPLIED both intended identity changes, with
existing decision_ledger audit35dc8055-907e-461a-9c04-999e932f89ab/status=applied.
No rollback was invoked. This is LIVE PRIVATE IDENTITY only, not a site release,
private ingress deployment, sender-approval batch activation or public mail release.

Post-commit verification: case4 new Contributor is private, linked to its existing
confirmed account/Person, building/engaged/trusted=false and both email approval/
public flags absent. Case13 native alias points at the selected account dossier
slug; its original fields except merged_into have the exact prior digest. Target
profile and all26 contributions/one content item retain exact prior digests;
2approved+1hidden and9approved+14hidden distributions remain. Both existing public
Person projections have byte-identical revision digests. Public carrier still has
zero source=email rows. No mail/contact/body was emitted by verification.

Bounded live exact13 read now shows4 unique existing canonical Contributors,
9 would-create-private sources and0 account/ambiguity blockers. This read-only
cross-check is not a live call to the still-uninstalled2035 preflight/provisioning
functions. The missing9 source identities were NOT provisioned and no existing
source received email_source_approved/public grants in this two-choice operation.

Next private-stage implementation remains the independently reviewed2035 private
helpers + exact13 service-only source approval/provisioning, private normalizing
ingress deployment and real provider→private-storage/thread read roundtrip. These
were not authorized/applied by the narrow two-identity choice alone. The accepted
thread-wide destination/media choices and public distribution/release/security
gates remain separate. Main/site deployment/flags/RLS/permissions unchanged by
this operation. Always verify current live coordination before the next scope.
