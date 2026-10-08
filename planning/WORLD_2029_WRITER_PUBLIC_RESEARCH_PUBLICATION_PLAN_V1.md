# WORLD_2029_WRITER_PUBLIC_SOURCE_REPAIR_V1 — one-time public-writer research publication plan (PREPARED, NOT APPLIED)

Status: planning evidence only (not an owner, not a contract). BRANCH_ONLY. Nothing here was executed against the live project.
Owner: existing `RESEARCH_2029_ADMIN_PUBLIC_CONTROL_V1` (`admin_research_set_publication_v1`) over `truth_axes_foundation_law` Axis 4 (`privacy_scope`).
Human Gate intent: ZURIEL (work_log `b929858b…`, `cde91839…`). PUBLICATION != TRUTH: only `privacy_scope` changes.

## Order of operations (GPT coordinator, after independent review)
1. Apply migration `20261008100000_research_admin_public_control_v1.sql` (adds `public` to the privacy CHECK, `ro_public_read`, narrowed `ro_dossier_read`, **table SELECT grant**, RPC). Re-run `tests/sql/research_admin_public_control_v1.sql` on a throwaway DB first (`scripts/run-research-admin-public-control-sql-test.sh`).
2. Dry-run the candidate set (read-only SQL below). Compare to the expected 1004 (+2 Zvi gallery rows = 1006). Any difference = STOP and report; do not guess.
3. A real authenticated admin session calls the RPC per id (below). No service-role UPDATE, no fake `auth.uid()`/JWT.
4. Post-check hashes (below). Any protected-axis hash difference = STOP, unpublish the batch via the same RPC.

## Candidate predicate (stable lineage only — no name matching)
Rows whose lineage is an exact contributor id: `research_objects.meta->>'contributor_id'` OR a `source_ref = 'channel_updates:<id>'` whose `channel_updates.contributor_id` is a World-admitted contributor.
Restrict with an explicit slug allowlist (curated World writers + active trusted contributors), NOT "every contributor":

```sql
-- READ-ONLY dry run. Emits ids/counts only; never text, phones or contact markers.
with allow as (select id::text cid, slug from contributors where slug = any(:'allow_slugs')),   -- e.g. tzvi-opoc, shimon-haimov, zion-siboni
cand as (
  select ro.id, ro.privacy_scope, ro.status, a.slug
  from research_objects ro
  left join channel_updates cu on ro.source_ref = 'channel_updates:' || cu.id
  join allow a on a.cid = coalesce(ro.meta->>'contributor_id', cu.contributor_id::text)
  where ro.privacy_scope = 'private'
    and ro.owner_person_id is null
    and coalesce(ro.meta #>> '{ext,personal_scope,scope}','') <> 'person_only'
)
select slug, status, count(*) from cand group by 1,2 order by 1,2;
```
Zvi's two additional gallery-source rows: resolve through `meta.source_refs` exactly as in memo `cde91839`; include only if each resolves to exactly one id (revalidate, no guesses).

**Live observation by this run (read-only, 2026-10-08):** the broad predicate above WITHOUT the slug allowlist also returns `amit-mike-rob` (48 candidate) and `rabbi-zigdon` (2), i.e. writers not in the approved set; Zvi (`tzvi-opoc`) 833 approved, Shimon 10, Zion 2, all `owner_person_id` NULL, 0 person_only. This differs from the 1004 figure in the assignment (which is 833+10+2+… via the narrower mapping) — the allowlist and exact predicate MUST be re-derived by the reviewer; the counts here are not authoritative.

## Excluded always
`person_only`, any `owner_person_id IS NOT NULL`, `family_shared`, `public_candidate` (not published; stays unless explicitly selected), DMs/bot private conversations, rows with unresolved lineage, contact/phone-marker rows (the metadata-only scan of 1050 name-attributed rows returned 0 but is not exhaustive: run the marker scan again on the final id list before step 3).

## Apply (admin session, bounded batches)
`select admin_research_set_publication_v1(:id, true, 'WORLD_2029_WRITER_PUBLIC_V1 · ZURIEL Human Gate b929858b/cde91839');` in batches of ≤100, stopping on the first `ok=false`. Each call appends actor/time/note/from/to to `meta.publication.history` (append-only).

## Protected-axis hashes (pre and post must be identical)
```sql
select md5(string_agg(concat_ws('|', id, status, engine_verified, engine_detail::text, promoted_node_id, source, source_ref, contributor, statement, terms::text, value), ',' order by id)) from research_objects where id = any(:'ids');
```
Rollback: same RPC with `p_publish=false` over the recorded id list (access axis only).

## Known read-boundary notes for review
- After the grant, anon reads every `privacy_scope='public'` row incl. `meta.publication.history[].by` (admin uuid). Reviewer may prefer a column-restricted anon grant or a public view; not done here to keep the existing helper contract.
- `ro_dossier_read` is narrowed to `privacy_scope='public'`; before this change it admitted `public_candidate` (live count 0) and would have activated on the grant.
