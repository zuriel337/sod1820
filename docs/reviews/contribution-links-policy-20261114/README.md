# contribution_links: a link is public exactly when its message is public (proposal, NOT applied)

Status: **PROPOSAL for review. No SQL was applied.** Applying it needs ZURIEL's separate, explicit approval for the exact file and commit (CLAUDE.md 0.4). Branch: `claude/contribution-links-visible-read-20261114`, first written on `origin/main` `9c4cad137`, synchronised with `origin/main` `4c9630db4` (the merges of #1333 and #1335). Finding and evidence: work_log record `d558163b-900a-4a06-9ad5-0d13dbac09ea`.

| File | Role |
|---|---|
| `supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql` | the change (one `ALTER POLICY`), with state guards and an apply record |
| `supabase/proposed/ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql` | exact rollback, protected against a change in between |
| `tests/sql/contribution_links_visible_message_read_v1.sql` + `tests/sql/fixtures/contribution_links_live_base_20261114/` | 9 cases on a throwaway PostgreSQL (guest, owner, other user, administrator, import, drift, rollback, links that point at another message) |
| `scripts/run-contribution-links-visible-read-sql-test.sh` | runs the SQL test, then 4 two-session concurrency cases; wired into the `security-sql-contracts` job |

## 1. The finding (read live on 14.11.2026, project `linswmnnkjxvweumprav`)

`public.contribution_links` has one policy, `cl_public_read`: `SELECT`, permissive, `TO PUBLIC`, `USING (true)`, and `anon` and `authenticated` hold `SELECT`.
`public.research_contributions` is protected: `rc_public_read` (`status = 'approved' OR author_user_id = auth.uid()`) and `research_contributions_admin_read` (`authenticated`, `rd_is_admin()`).
So the messages are hidden but their provenance rows are not:

* 68,997 rows are readable by any visitor; **23,167 of them belong to 15,583 messages that are not public** (status `hidden` 22,258 rows, `pending` 909 rows).
* For the old chat, each `derived_from` row carries the source-native message id (`target_id`), the original page address and `original_moderation_state` in `note`: `blocked` 10,850, `deleted` 4,025, `pending` 685, one `approved` message deleted afterwards. 25,590 messages are visible.
* The `note` was designed to be public (the importer says it never carries e-mail or other personal data; one address in 41,151 carries a query string, none carries a credential). The exposure is therefore not personal data but the moderation history and source ids of messages the site hides.

## 2. The change

```sql
alter policy cl_public_read on public.contribution_links
  using (exists (select 1 from public.research_contributions rc where rc.id = contribution_links.from_contribution_id));
```

A link is readable exactly when its message is readable **by the same caller under the existing `research_contributions` policies**: a guest sees the links of approved messages, an author also sees the links of their own messages, an administrator sees all. The rule is inherited, not copied, so a later change of the message policy carries over by itself. The policy keeps its name and is altered in place, so there is never a moment without a policy. Nothing else changes: no table, column, index, grant, function, trigger or row, no other policy.

**Revision of 14.11.2026 (review item "audit both directions", Codex):** the one link kind that points at *another message* (`target_type = 'contribution'`, the target id is a text) is also required to point at a message the same caller can read. Without it a public message could reveal the id of a hidden one through its own link. The full expression:

```sql
alter policy cl_public_read on public.contribution_links
  using (
    exists (select 1 from public.research_contributions rc where rc.id = contribution_links.from_contribution_id)
    and (
      contribution_links.target_type <> 'contribution'
      or exists (select 1 from public.research_contributions tc
                 where tc.id = (case when contribution_links.target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                                     then contribution_links.target_id::uuid end))
    )
  );
```

A target id that is not a uuid, or a uuid that is no message, is not readable (fail closed, also for the administrator; the cast cannot raise an error because it is guarded by the pattern inside `case`). The second branch is evaluated only for rows of that kind (a plain `OR`; the 68,990 other rows stop at the first test) and uses the primary key of `research_contributions`. **Live effect today: none** (read 14.11.2026): the 7 links of that kind are from hidden messages to approved ones (already hidden from guests by the first condition), and 0 links point from a public message to a non-public one. It closes the other direction for later rows.

Alternatives considered and not taken: copying `status = 'approved'` into the links policy (a second rule that can drift); a new column or table for visibility (the existing mechanism already carries the semantics, and `research_intake_foundation_contract_law` v10 requires EXTEND_EXISTING); dropping anon's `SELECT` (it would also hide the links of public messages that the forum feed counts).

Live effect: a guest reads 45,830 of 68,997 rows (the links of approved messages; the same number with the target condition, which changes nothing today); the 23,167 others disappear for guests; 15 of them (authors with an account) stay readable to those authors; administrators and `service_role` read everything. The equivalent hash-join count takes about 57 ms on the whole table, a lookup by message about 0.2 ms (`cl_from_idx` plus the primary key of `research_contributions`).

## 3. Who reads and writes the table (inventory, from the live database and `origin/main`)

| Path | Role | Effect |
|---|---|---|
| `g3_openweb_import_batch`, `g3_openweb_import_message` (import) | SECURITY INVOKER, `EXECUTE` for `service_role` only; `service_role` has `BYPASSRLS` | none. The test runs the live function body: a reply whose parent is a blocked message still resolves through `contribution_links`; a duplicate source message still raises `unique_violation` and leaves no row |
| `link_contribution`, `project_contribution_to_graph`, `admin_person_materialize_contributor_history_v1`, `admin_canonical_data_inventory_v1` | SECURITY DEFINER, owner `postgres` (`BYPASSRLS`) | none |
| `people_public_rows_v1`, `person_public_profile_v1`, `researcher_reputation` | SECURITY DEFINER readers, `anon` may execute | none by this change; they read as owner. **Reviewed 14.11.2026, see section 3a** |
| `src/lib/contributions.js` `getContributionLinks` | browser read | unused export (no caller in `src/`); same rows for approved contributions |
| `src/lib/contributions.js` forum feed `linkCount` | browser read of the links of the contributions returned by `forum_feed_contributions` (approved) | same rows as before |
| `scripts/` (importer, ops SQL) | service key / owner | none |
| views, other policies, triggers, Edge functions, `api/` | | none reference the table (checked in `pg_class`, `pg_policies`, `pg_trigger`, `supabase/functions`, `api/`) |

Correction: an earlier note in record `d558163b` said no reader of `contribution_links` exists in `src/` or `api/`. That was wrong: the two readers above exist in `src/lib/contributions.js` (one unused). Neither changes behaviour for approved contributions.

### 3a. The three definer readers, reviewed (read from the live function bodies, 14.11.2026; no function was executed)

They read the table as its owner, so this policy neither widens nor narrows what they return; the review asked whether what they return exposes the provenance of a **non-public** message. Result: it does not.

* `people_public_rows_v1(integer, integer)`: the per-person `message_count` joins `contribution_links` only to the contributions of `contrib_person`, and that set is built from `research_contributions` with `status in ('approved','published')` for both identity paths. A link of a hidden, blocked, deleted or pending message is never counted. It returns a count, never a link, source id or note.
* `person_public_profile_v1(uuid)`: the same shape (`message_count` = contributions of the person that have an `openweb_message` link), over the same public statuses; a count only.
* `researcher_reputation(uuid)`: returns counters of one account. `links_made` counts the links the account created (`created_by`); `links_continued` counts links of kind `related` that others created towards the account's contributions. Both are aggregate numbers, no link, id or note leaves the function. Side finding, **not changed here** (own contract, not part of provenance): `validated`, `promoted_to_insights` and `links_continued` do not filter on `status`, so a count can include the account's non-approved contributions. It is a number, not a message; recorded for the owner of the reputation contract.
* The status `published` (269 messages) is not readable by guests under `rc_public_read` (it reads `approved` only) and has **no link row**, so no link changes visibility for that status.

## 4. Behaviour matrix (proved by `tests/sql/contribution_links_visible_message_read_v1.sql`)

Fixture: 7 messages (2 approved, 1 pending of author A, 1 pending of author B, blocked, deleted, hidden) with 11 links.

| Caller | Before | After |
|---|---|---|
| guest (`anon`) | 11 | 4: only the links of the 2 public messages; no link, source id or moderation state of a non-public message |
| author A (`authenticated`) | 11 | 6: public 4 + own pending 2; not B's |
| author B | 11 | 5 |
| another signed-in user, or a session without a user id | 11 | 4 |
| administrator (`rd_is_admin()`) | 11 | 11 |
| `service_role` / the import | 11 | 11 (and 15 after the test's import; the guest then sees only the links of the imported public message) |
| `anon`, `authenticated` writes | denied | denied (no `INSERT`/`UPDATE`/`DELETE` grant, unchanged); the SECURITY DEFINER writer still inserts |

Links that point at another message (case 8, 7 added rows, removed again): public → public readable by everyone (also with an upper-case uuid); public → hidden message only for the administrator; public → the author's own pending message for that author and the administrator; hidden → public only for the administrator; a malformed target id and a uuid that is no message are unreadable for everyone except `service_role`.

## 5. Apply and rollback

**Apply** refuses, and changes nothing, unless the live state is exactly the one read on 14.11.2026: RLS on, exactly one policy `cl_public_read` that is `SELECT`/permissive/`TO PUBLIC`/`USING (true)`/no `WITH CHECK`, no write privilege for `anon` or `authenticated` and `SELECT` kept, RLS on `research_contributions` with exactly the two live read policies (the new rule inherits them, so they must be exactly those). It then alters the policy in place, verifies the result and writes an apply record into the policy comment: `CONTRIBUTION_LINKS_VISIBLE_MESSAGE_READ_V1 applied <time>; qual_md5=<md5 of the applied expression>; before=USING (true)`. A second run refuses ("already applied").

**Rollback** restores `USING (true)` (this reopens the exposure above) and clears the record. It proves first that nothing changed since the apply: the policy comment is the apply record, the md5 of the current expression equals the recorded one, `cl_public_read` is still the only policy and still `SELECT`/permissive/`TO PUBLIC` without `WITH CHECK`. Any later edit, added or dropped policy, changed roles or removed record refuses and leaves everything as is: that needs a human decision. A second rollback refuses.

**Protection against a concurrent change.** Both files take `LOCK TABLE ... IN SHARE UPDATE EXCLUSIVE MODE` with `lock_timeout 3s`. `CREATE/ALTER/DROP POLICY` take that same mode, so a policy change running in another session either finishes first (the file then reads the committed state and refuses if it differs) or is still running (the file fails with a lock timeout and changes nothing). The mode blocks neither readers nor the import's writes. Proved in the runner with two sessions:

| Case | Outcome |
|---|---|
| C1 another session holds the policy lock | the rollback fails closed on the lock timeout; the applied policy is untouched |
| C2 another session edits the policy and commits while the rollback waits | the rollback sees the change and refuses; the other session's edit remains |
| C3 another session adds a policy while the apply waits | the apply sees two policies and refuses; nothing of the proposal is applied |
| C4 a policy change holds the lock | a guest still reads and `service_role` still writes (no blocking) |

## 6. Verification

* `bash scripts/run-contribution-links-visible-read-sql-test.sh`: 9 SQL cases (0 baseline reproduces the finding on the live policy; 1 apply changes one expression and nothing else, byte for byte on grants, indexes and rows; 2 guest; 3 owner A/B/other; 4 administrator; 5 import, definer paths and write denial; 6 a second apply and six drifts refuse; 7 exact rollback and four later-change refusals; 8 links that point at another message) + 4 concurrency cases, on PostgreSQL 16 and 17, as root and as an unprivileged user (about 15 s).
* Mutation checks: an apply that keeps `USING (true)`, a rollback without the fingerprint comparison, an apply without the lock, a rollback without `lock_timeout` and (new) an apply without the target-message condition each fail the test.
* Wired as a step of `security-sql-contracts` in `live-contracts-2029.yml` (job name and timeout unchanged).

## 7. Not in this change

* The three definer readers above (their output is a separate review).
* The `research_contributions` read policy itself (it does not look at `deleted_at` or `thread_hidden_at`; today no approved row has either, and the links follow whatever that policy becomes).
* Showing a message's source on the site and the link to the community history from the personal area: separate follow-ups. For the source, the existing mechanisms are `contribution_links` (old chat, now visibility-safe) and the `decision_ledger` row `community_source_import` (9 explicit message-to-source mappings of the thread of 12 Nov; RLS on, no policy, so a narrow SECURITY DEFINER reader would be needed, as `community_contribution_index_eligible` is).
