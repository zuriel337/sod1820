-- G1 laws snapshot reader - READ-ONLY (one SELECT, nothing is written, no function is called).
-- This is the ONE reader that turns the rule rows of public.nodes into the lines of a dated record
-- audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_YYYYMMDD.txt. Until round 3 the record was produced by an unrecorded query; the
-- query is now a file so that "which successor does the system use" has one answer that is tested
-- (tests/sql/g1_laws_snapshot_reader_v1.sql, scripts/run-g1-laws-snapshot-reader-test.sh).
-- Proof that it is the same reader: run read-only on the canonical project on 12.11.2026 it returned exactly the 131 data lines of
-- G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt (md5 of the lines joined by newline: f79d9618ed6f0dca3dacf4a13443973a).
--
--   L|rule_id|active_version|canonical_owner|owner_family|md5_of_description_first_12
--       canonical_owner = metadata.compaction_v1.canonical_owner, else metadata.owner_routing.canonical_owner
--   R|rule_id|last_version|successor|source
--       a RETIRED family (no active version), read from the row of its LAST version, listed when an active law still names it
--       (in its text, in depends_on or in its metadata), when it carries a retired_routing_v1 record, or when the rule guard
--       stamped its retirement (metadata.rule_guard: every retirement made after the guard is applied stays listed, so a law never
--       leaves the active tree without a retirement row). No row carried either key on 12.11.2026.
--       successor / source, in this order:
--         (2) metadata.retired_routing_v1.successor  with source 'retired_routing_v1:<approval_ref>'   (a later, approved mapping)
--         (1) the owner recorded at retirement (same expression as canonical_owner) with an empty source (history, never rewritten)
--         '-' when neither exists.
--       A family that is active again is an L row only: a retired_routing_v1 left on an older row of an active family is history
--       and is not read.
with fam as (
  select rule_id, bool_or(is_active) as has_active, max(rule_version) as last_version
    from public.nodes where type = 'rule' and rule_id is not null group by rule_id
), act as (
  select n.rule_id, n.rule_version, n.description, n.depends_on, n.metadata
    from public.nodes n where n.type = 'rule' and n.is_active and n.rule_id is not null
), ret as (
  select n.rule_id, n.rule_version, n.metadata
    from public.nodes n join fam f on f.rule_id = n.rule_id and f.last_version = n.rule_version
   where n.type = 'rule' and not f.has_active
), listed as (
  select r.*, nullif(r.metadata #>> '{retired_routing_v1,successor}', '') as routed_to,
         coalesce(r.metadata #>> '{retired_routing_v1,approval_ref}', '') as routed_ref
    from ret r
   where (r.metadata ? 'retired_routing_v1')
      or (r.metadata ? 'rule_guard')
      or exists (select 1 from act a
                  where a.description ~ ('\m' || r.rule_id || '\M')
                     or r.rule_id = any (coalesce(a.depends_on, '{}'))
                     or a.metadata::text ~ ('\m' || r.rule_id || '\M'))
), lines as (
  select 1 as ord, rule_id,
         'L|' || rule_id || '|' || rule_version || '|'
           || coalesce(nullif(metadata #>> '{compaction_v1,canonical_owner}', ''), nullif(metadata #>> '{owner_routing,canonical_owner}', ''), '-')
           || '|' || coalesce(nullif(metadata #>> '{compaction_v1,owner_family}', ''), '-')
           || '|' || left(md5(coalesce(description, '')), 12) as line
    from act
  union all
  select 2, rule_id,
         'R|' || rule_id || '|' || rule_version || '|'
           || coalesce(routed_to, nullif(metadata #>> '{compaction_v1,canonical_owner}', ''), nullif(metadata #>> '{owner_routing,canonical_owner}', ''), '-')
           || '|' || case when routed_to is not null then 'retired_routing_v1:' || routed_ref else '' end
    from listed
)
select line from lines order by ord, rule_id collate "C";
