# One Community message workflow — verified owner actions and AI continuity

Task: `COMMUNITY_VERIFIED_MESSAGE_ACTIONS_20261026`.
BEFORE: `0d540aa6-41c7-49c1-b16a-b9e34505b76a`.
Base: `91a1718cac5c9e275b5260aa5551dbcdcdf9fe0e`.
Branch: `gpt/2029-community-verified-message-actions-20261026`.

ZURIEL approved continuing unified message management and AI-managed hint
inspection, with minimal screens. This slice supplies the authorization and
transport foundation. It adds no screen, Provider, session, store or model call.
The migration is a branch-only candidate and has NOT been applied live. The new
client adapters are not yet connected to a product component.

## Existing implementation recovered, read-only

The live database already has `community_edit_message`,
`community_delete_message`, `community_edit_history`, restoration/reporting,
private `research_contribution_edits` and `research_contribution_deletions`, and
tombstone-aware Community readers. Its editing policy currently permits native
authors only; historical OpenWeb messages remain uneditable by an ordinary
account even after a verified identity link.

Their existing frontend lives in branch
`gpt/2029-community-unified-handoff-20261019` at
`15a4a95633452f4f80ebd52dd9b88d4bd3e87b88`, outside this candidate's ancestry:

- `src/components/community2029/CommunityMessageManage.jsx`: inline editor,
  deletion confirmation, report and admin-only history. No new standalone page.
- `src/lib/community/communityArchive.js`: existing Community RPC adapters,
  tombstone normalization and readers.
- `supabase/migrations/20261019130000_community_edit_soft_delete_threads.sql`:
  the foundation already applied live as migration `20261019194049`.

This is source/provenance for deliberate integration, not permission to merge
the whole older branch or overwrite newer focus/return, Person, author or
layout changes. The existing editor's local fallback timestamp and relative
edited-date wording also need reconciliation with server acknowledgments and
the current bilingual date owner when its frontend is integrated.

## Implemented in this slice

The new migration extends those exact mutation RPCs and private archives. It
requires the existing foundation instead of creating another archive system.

One private ownership predicate recognizes an explicit native author, a direct
claimed Contributor, or a unique reviewed Contributor→Person→account binding
(`legacy_seed`, confidence 100, explicit `human_gate=true`). An explicit author
or direct Contributor owner cannot be overridden through an alias. Conflicting,
unreviewed, weak or ambiguous historical edges fail closed; names, email,
user_metadata and client display pairs grant no authority.

`community_message_actions_v1(uuid[])` returns bounded flags for at most 100
requested IDs, without Person IDs, private content or another account's hidden
message existence. The helper is not executable by anon/authenticated; the
batch reader and mutations require a real `auth.uid()`.

Edits retain the old body and real actor in the existing private revision
archive. Removal retains content/media in the existing private deletion archive
and clears the public body/title/media while preserving message identity,
attribution, original timestamp, parent and other people's replies. Replay and
failed writes are tested; archives roll back with a failed update.

Direct graph/insight projections return `source_requires_review` rather than
being silently rewritten or removed. This checks the explicit pointers on the
message; it is not a claim of a complete cross-owner dependency scan. Source
and research owners must review indirect references before live deployment.

The older `edit_contribution` / `remove_contribution` endpoints delegate
Community-origin rows to these same checks and archives. Their noncommunity
research behavior is retained. Reviewer attention: a generic Community edit
now follows the author-only Community edit policy; an admin cannot use that
general endpoint as a shortcut around governed source review. Existing
privileged moderation/graph owners are not modified.

The new stateless client adapters use only server acknowledgments, reject
malformed permission responses, preserve missing permissions as unavailable,
and discard responses after principal changes/abort. No optimistic deletion or
fabricated edited timestamp is emitted. Existing visual components are not
changed or duplicated.

## AI behavior to connect through the existing owners

The existing `classificationSeam.mjs` is a pure heuristic/structured-evidence
gate, not a worker that already runs full AI validation. Raw keywords can
select a scan candidate; they cannot prove a hint, verification or promotion.

The intended single-message flow is:

1. A new eligible public message/version enters the existing Intake/job path.
   Opening a page, scrolling, polling and switching accounts launch no model.
   Historical imports do not trigger an unbounded automatic backfill.
2. AI extracts the actual claim, source and method; it preserves interpretive
   framing and uncertainty. Unusual wording is not a rejection reason.
3. The existing Research Planner invokes applicable canonical engines and
   source/duplication checks. AI does not calculate authoritative values itself.
   Missing, failed or unavailable checks stay explicit; they cannot become
   "everything checked" or "not a hint" by inference.
4. Existing run/evidence and `decision_ledger` candidate carriers retain the
   exact message/version, author credit, results, coverage and dependencies.
   One message/version is not repeatedly processed on every view or retry.
   Message instructions cannot grant tools, privileges or promotion authority.
5. The same message may show a short inline state such as "נבדק", "חסר מקור"
   or "ממתין לאישור", with optional details. Ask one contextual question in the
   existing conversation only when material information is missing. No default
   separate request form or tracking dashboard is needed.
6. Human/standing approval follows the existing World/Truth owner. A successful
   calculation, model opinion, like count or ordinary account role cannot grant
   general canonical/publication authority. The original message stays linked
   and credited; another submitter does not become its author.

## Ownership and integration boundary

At the initial ownership scan, World task
`WORLD_PUBLIC_WRITERS_PUBLISHED_GRAPH_PROJECTION_20261026` held the contribution
graph projection scope (BEFORE `c2a64bb1-8922-4fa3-8432-f348aac555c5`). No
parallel AI-to-tree implementation, graph projection, engine or classification
file was edited here. A final live check found that World had released this
scope at 14:18 UTC in AFTER `1aa6fb36-cbd1-415b-9647-c6de63313918`; its candidate
remains unapplied and is not in this branch. There is no remaining active-writer
conflict on that scope. The integration dependency remains the approved base
and owner-native processing contract, not a claim that the writer is still
active. UI writing remains with the existing visual owner; this
slice supplies capabilities/adapters for reusing the existing controls.

Central integration must establish one approved base containing the current
writer/Workspace chain and the selected existing Community functionality,
review this candidate in development, then obtain separate live-apply approval.
Integrate source changes deliberately, not by copying the entire old branch.
Only after that base exists should the AI job/inline representation be wired
against the current World/Intake contracts. There is no new AI provider,
credit/quota flow, subscription or paid model request in this slice.

## Validation

- Actual candidate migration on disposable, network-isolated PostgreSQL 17:
  66 assertions pass. Native/direct/reviewed ownership, all denial cases,
  private archives, original references, child survival, generic endpoint
  bypasses, compatibility, atomic failures and migration replay are covered.
- New client tests: 10 pass, including pending reads/writes across account
  switching, missing/invalid permission responses and real acknowledgment rules.
- Existing community/replies tests: 19 pass.
- Full Legacy/2029 build passes with existing chunk/dynamic-import warnings.
- Built graph (117 reachable / seven eager / 383,531 bytes eager gzip), hard
  isolation, cheap hardening, System Frame, My Workspace, Legacy Production Lock
  and `git diff --check` pass. No eager bundle growth was introduced.
- No new visual/browser acceptance is claimed: product components are unchanged
  and the new adapters are not yet consumed. Real Auth, hosted UI integration,
  all live RLS policies, independent security review and DB-owner development
  validation remain release dependencies.

Supabase CLI 2.122.0 generated the migration in an isolated temporary workspace
with its own `SUPABASE_HOME`; no project dependency or live configuration was
changed. Current documentation/changelog was consulted. The latest Bun CLI
requires a writable CLI home; its bundled Go compatibility binary no longer
implements `migration`, so the normal CLI with a temporary home was used.
