# WORLD_2029_WRITER_PUBLIC_SOURCE_REPAIR_V1 — one-time public-writer research publication plan (PREPARED, NOT APPLIED)

Status: planning evidence only (not an owner, not a contract). BRANCH_ONLY. Nothing here was executed against the live project.
Owner: existing `RESEARCH_2029_ADMIN_PUBLIC_CONTROL_V1` (`admin_research_set_publication_v1`) over `truth_axes_foundation_law` Axis 4 (`privacy_scope`).
Human Gate intent: ZURIEL (work_log `b929858b…`, `cde91839…`). PUBLICATION != TRUTH: only `privacy_scope` changes.

## Order of operations (GPT coordinator, after independent review)
1. Apply migration `20261008100000_research_admin_public_control_v1.sql` (adds `public` to the privacy CHECK, `ro_public_read`, narrowed `ro_dossier_read`, **table SELECT grant**, RPC). Re-run `tests/sql/research_admin_public_control_v1.sql` on a throwaway DB first (`scripts/run-research-admin-public-control-sql-test.sh`).
2. Dry-run the candidate set (read-only SQL below). Compare to the expected 1004 (+2 Zvi gallery rows = 1006). Any difference = STOP and report; do not guess.
3. A real authenticated admin session calls the RPC per id (below). No service-role UPDATE, no fake `auth.uid()`/JWT.
4. Post-check hashes (below). Any protected-axis hash difference = STOP and repair; do not mask by reverting access.

## Candidate predicate (exact lineage only — no name matching, no split_part, no broad contributors table)
Allowlist = exactly the five currently World-admitted writer slugs (curated World writers; re-read them from the World admission source at run time, do not widen). A research object is a candidate only when its contributor lineage is an EXACT id match: canonical `meta->>'contributor_id'`, OR the exact normalized source occurrence (`source_ref = 'channel_updates:<id>'`, whole value, suffixes are NOT stripped) whose `channel_updates.contributor_id` is that id. Expected read-only result: **1004** (Zvi 992 / Shimon 10 / Zion 2).

```sql
-- READ-ONLY dry run. Emits ids/counts only; never text, phones or contact markers.
with allow as (select id::text cid, slug from contributors where slug = any(:'allow_slugs')),   -- the five World-admitted slugs ONLY
cand as (
  select ro.id, ro.status, a.slug
  from research_objects ro
  left join channel_updates cu on ro.source_ref = 'channel_updates:' || cu.id
  join allow a on a.cid = ro.meta->>'contributor_id' or a.cid = cu.contributor_id::text
  where ro.privacy_scope = 'private'
    and ro.owner_person_id is null
    and coalesce(ro.meta #>> '{ext,personal_scope,scope}','') <> 'person_only'
)
select slug, status, count(*) from cand group by 1,2 order by 1,2;
```
Zvi's two gallery rows (-> 1006) are added only after each is proven: `meta.source_refs` -> prior channel source (memo `cde91839`) -> candidate 1006, exactly one id each. Unknown ownership stays HELD (not published). The earlier mismatch (833 vs 992, extra slugs `amit-mike-rob`/`rabbi-zigdon`) is not proven DB drift: it came from a different predicate (coalesce(meta contributor, channel), suffix-discarding source_ref match, no allowlist) vs. the OR-with-`split_part(source_ref,'#',1)` form; re-derive with the exact form above.

## Excluded always
`person_only`, any `owner_person_id IS NOT NULL` (the RPC now rejects it as `owner_bound_cannot_publish`, and `ro_public_read`/`ro_dossier_read` exclude it), `family_shared`, `public_candidate` (not published; stays unless explicitly selected), DMs/bot private conversations, rows with unresolved lineage, contact/phone-marker rows (the metadata-only scan of 1050 name-attributed rows returned 0 but is not exhaustive: run the marker scan again on the final id list before step 3).

## Apply (admin session, bounded batches)
`select admin_research_set_publication_v1(:id, true, 'WORLD_2029_WRITER_PUBLIC_V1 · ZURIEL Human Gate b929858b/cde91839');` in batches of ≤100, stopping on the first `ok=false`. Each call appends actor/time/note/from/to to `meta.publication.history` (append-only).

## Protected-axis hashes (pre and post must be identical)
```sql
select md5(string_agg(concat_ws('|', id, status, engine_verified, engine_detail::text, promoted_node_id, source, source_ref, contributor, statement, terms::text, value), ',' order by id)) from research_objects where id = any(:'ids');
```
On any protected-axis hash difference or unexpected row: STOP and repair/investigate. There is NO blanket rollback-to-private; unpublishing must never be used to mask data corruption.

## Known read-boundary notes for review
- The grant is table-level SELECT; RLS decides rows (public, not person_only, owner_person_id null). `public_candidate` is NOT public. Admin permissions (`ro_admin_read`) unchanged.
- Column exposure: the current consumer (`fetchResearchObjects`) selects `meta` whole, so a column-restricted anon grant cannot hide `meta.publication.history[].by` (admin uuid) or any `meta` contact fields without changing the consumer shape. Exact minimum sanitized read path if that is unacceptable: a `security_invoker` view (or SECURITY DEFINER RPC) `research_objects_public_v1` over the same RLS predicate that returns the consumer's current columns with `meta` replaced by `meta - 'publication' - 'contact'` (only the keys the projection actually reads, e.g. `ext.personal_scope`, `source_refs`), plus `revoke select on research_objects from anon` and the consumer pointed at the view. Not applied here; no live grant.
