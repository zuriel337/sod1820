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
