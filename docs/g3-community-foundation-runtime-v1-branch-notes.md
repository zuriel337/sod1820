# G3 Community Foundation Runtime v1 — branch-only notes

Status: BRANCH-ONLY. Not merged, not deployed, no live DB write, no live DB migration applied,
no OpenWeb/chat/public UI/route change. Assignment `work_log.id=7db17ff0-cce5-4d17-9bbb-9b1ad7ee9dae`
(`task_key=G3_COMMUNITY_FOUNDATION_RUNTIME_V1`), `release_authorization_state=BRANCH_ONLY_NO_MERGE_NO_DEPLOY_NO_LIVE_DB_APPLY_NO_CHAT_TOUCH`.

## 1. DRIFT found during owner resolution (report, not silently resolved)

The assignment's `primary_owner` names five rules. Four resolve live exactly as stated:
`research_intake_foundation_contract_law` **v13 active**, `identity_architecture_law` **v1
active**, `graph_privacy_foundation_law` **v1 active**, `truth_axes_foundation_law` **v3
active**. (Note: `SOD1820_MASTER_OWNER_INDEX.md` on `origin/main` still shows
`research_intake_foundation_contract_law **v9 ACTIVE**` at line 76 — the live `nodes` table
has versions 9 through 13 all `is_active=true`, v13 newest. The routing index is stale
relative to live DB; not fixed here — out of this assignment's scope.)

The fifth, `research_contribution_law v9`, is live but **`is_active=false`** — it is the only
version that has ever existed for that `rule_id`. Its own `metadata.compaction_v1` block
(written at the `G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1` gate, `classified_at:
2026-09-15`) reads:

```
classification: LEGACY_RETIRE_OR_SUPERSEDE
archive_reason: existing research_contributions pipeline retained; governance/lifecycle now
  explicitly subordinate to Workspace v3 + Truth Axes
canonical_owner: docs/research-studio-v1-contract.md
```

`docs/research-studio-v1-contract.md` was read in full for this assignment. It is a real,
ZURIEL-approved architecture contract for the general Research OS/Workspace/Findings/Journey
model — but it contains **no** replacement content for the granular, `research_contributions`-
specific design `research_contribution_law v9` carries (intent/origin/research_state
taxonomy, moderation-by-intent, the Extraction Identity Model, `contribution_links` vs
`parent_id` semantics, `decision_ledger` provenance wiring, the WhatsApp-bridge design). It
subordinates *governance placement*, not the technical content this exact task needs.

**Resolution applied here (reconciliation, not a new owner):** `research_contribution_law
v9`'s technical content was used as the extend-existing baseline for schema mapping — it is
the only artifact that actually specifies this domain, and using it does not contradict
`research-studio-v1-contract.md`'s own text. **This is not itself resolved as CLOSED** —
GPT/ZURIEL should either (a) reactivate `research_contribution_law` at its current version,
or (b) explicitly promote its content into a new active version/owner, so a future session
does not have to re-derive this every time. Flagging as an **open thread**, not a blocker,
because live evidence supports both "the content is still the right content" and "the
`is_active` flag disagrees" — a Human-Gate-adjacent naming decision, not a technical one.

## 2. Live security finding acted on (not just theoretical)

`contributors_read` (public SELECT RLS policy, verified live):

```sql
(COALESCE((dossier_settings ->> 'visibility'), 'public') <> 'private') OR (user_id = auth.uid()) OR is-admin
```

Default visibility is **public** when `dossier_settings.visibility` is unset, and
`contributors.email` has no separate RLS/column-level protection. Any importer that creates a
`contributors` row for an unresolved/legacy OpenWeb identity **must** set
`dossier_settings.visibility = 'private'` explicitly, or that person's email becomes
world-readable through the existing public policy. The planner
(`scripts/g3-community-foundation-runtime/planner.mjs`) does this unconditionally for every
new legacy-contributor row it plans, and
`scripts/test-g3-community-foundation-runtime.mjs` asserts it. `research_contributions` itself
has no email column, so it carries no PII leak vector on its own (`rc_public_read`: public
only when `status='approved' OR author_user_id=auth.uid()`).

## 3. Schema crosswalk (0 DDL — everything below reuses existing columns/tables)

| OpenWeb field | Destination |
|---|---|
| `message_id` | `contribution_links.target_id` (`target_type='openweb_message'`, `relation_type='derived_from'`) — the idempotency key |
| `parent_message_id` | `research_contributions.parent_id` (only for true reply/comment threads — see §4) |
| article/general-chat URL | `contribution_links.note` (jsonb-shaped text; `research_contributions` has no URL column and none is added) |
| timestamps | `research_contributions.created_at` |
| moderation state | `research_contributions.status`, conservatively re-derived (see §4) — original value preserved verbatim in `contribution_links.note.original_moderation_state` |
| likes/dislikes | `research_contributions.reactions` (existing jsonb) |
| verified author email → known account | `research_contributions.author_user_id` |
| unverified/unmatched author | `contributors` row (`author_contributor_id`), `dossier_settings.visibility='private'`, email only ever on `contributors.email`, never on `research_contributions` |
| origin/tool of the message | `research_contributions.origin = 'openweb'` — a new *value* in a free-text column (no CHECK constraint exists on `origin`), not a schema change |

No new table, column, or constraint. `contribution_links` and `decision_ledger` already exist
and already carry exactly this shape (confirmed via `information_schema` + `pg_constraint`
live reads); `research_contributions` has exactly one CHECK constraint
(`media` must be a JSON array), nothing on `origin`/`intent`/`status`/`research_state`.

## 4. Decisions made and why

- **Reply threads use `parent_id`, not `contribution_links`.** `research_contribution_law
  v9`'s own text states, as an already-verified live invariant, that every
  `research_contributions` row with non-null `parent_id` carries `intent='תגובה'` +
  `research_state='discussion'` (`src/lib/contributions.js`/`src/lib/seo.js` depend on this
  for thread counts and `DiscussionForumPosting` SEO markup). The planner forces exactly that
  pairing for any imported reply and never uses `parent_id` for anything else.
- **Imports never auto-approve.** `status` is conservatively re-derived from
  `moderation_state` (`deleted`/`hidden` → `hidden`; everything else → `pending`), never
  copied straight to `approved`, because an importer is automation and automation must never
  write an approval "as ZURIEL." The original OpenWeb moderation state is preserved as data
  (in `contribution_links.note`), not lost — it just doesn't dictate live visibility by
  itself.
- **Classification (`intent`) is separated from moderation/publication.** A tiny heuristic
  stub (`classifyIntent`) proposes `intent` for non-reply messages; it never touches `status`
  or `research_state` beyond the conservative default above. Tested explicitly
  (`classification (intent) never sets status/research_state beyond the conservative
  default`).
- **No auth.users row is ever created from an export email.** Only `research_contributions`
  (`author_user_id`) links to an *existing* verified-email match; everyone else gets a private
  `contributors` row, claimable later via `contributors.user_id` on real registration — exactly
  the existing migration/bridge pattern `research_contribution_law v9` already documents for
  the WhatsApp bridge.
- **No email is ever written onto `research_contributions`.** It has no such column; asserted
  by test as a structural guarantee, not just a convention.

## 5. What was built (branch-only)

- `scripts/g3-community-foundation-runtime/planner.mjs` — pure planning function, no DB
  connection, no writes. Takes OpenWeb-shaped messages + a simulated prior-state snapshot,
  returns a list of `{op: 'insert_contribution' | 'skip_duplicate', ...}` operations.
- `scripts/g3-community-foundation-runtime/dry-run-import.mjs` — CLI wrapper, prints the plan
  as JSON. Still no DB connection.
- `test/fixtures/openweb-import/synthetic-messages.json` + `prior-state.json` — cover: matched
  existing account, unmatched legacy identity, reply chain, duplicate `message_id` both
  cross-batch and same-batch (idempotent replay), general-chat URL, article URL,
  hidden/deleted status, likes/dislikes, verified/unverified/absent email.
- `scripts/test-g3-community-foundation-runtime.mjs` (`npm run
  test:g3-community-foundation-runtime`) — 13 assertions, all passing, covering every item in
  the assignment's `verification` list except live RLS execution (no live DB write is
  authorized in this branch; the RLS text itself was read and reasoned about live, in §2).

## 6. Realtime readiness (prepared, not applied)

Verified live: `research_contributions` is not in the `supabase_realtime` publication today.
Enabling it is a single additive statement
(`ALTER PUBLICATION supabase_realtime ADD TABLE public.research_contributions;`) but is **not
included as a migration file in this branch**, because Supabase Realtime's default row-change
broadcast is not RLS-aware in every client configuration, and `research_contributions` carries
`pending`/`hidden` rows that must not be broadcast to unauthenticated subscribers ahead of
moderation. Recommended Phase 2 step: confirm (live, against the actual Supabase Realtime
version in use) whether RLS-aware Realtime is active for this project before adding the
publication membership; if not, gate the broadcast through a `SECURITY DEFINER` view/function
that re-applies `rc_public_read`'s own predicate, the same pattern already used elsewhere in
this codebase for `SECURITY DEFINER` public readers.

## 7. Explicitly out of scope here (do_not_touch honored)

No change to `src/legacy/legacy.jsx`, `src/lib/openweb.js`, the `openweb-sso` Edge Function,
`/community/chat`, the OpenWeb widget/config, public `/forum` UX, production DB, `main`, or any
merge/deploy/route cutover. The actual 41,080-message export file was not available and was
not fetched or referenced — all fixtures are synthetic, per the assignment's own instruction.

## 8. Recommended Phase 2 (not started)

1. Resolve the `research_contribution_law` active/inactive DRIFT from §1 (Human-Gate-adjacent
   naming decision).
2. Once the real 41,080-message export file is available: a separate Archive Audit + Identity
   Map + import dry-run against the *real* data, before any write — this branch only proves
   the planning logic against synthetic fixtures, as instructed.
3. Realtime activation per §6, after the RLS-awareness question is answered live.
4. Wire `contribution_events` scoring for imported contributions once Phase 2's real-data pass
   is reconciled (out of scope for this pass; `research_contribution_law`'s own reputation
   model already covers this and needs no new design).
