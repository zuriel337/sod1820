-- G1 rule-reader conformance - READ-ONLY catalogue query (one SELECT; no function is executed, nothing is written).
-- Run on the canonical project (execute_sql) to see which DATABASE readers still name a law that has retired, and which successor
-- the system records for it. It is the database-side half of the reader check; the repository half is the dated record
-- audits/g1-agent-entry/G1_RETIRED_LAW_REFERENCES_YYYYMMDD.txt (checked in CI). CI cannot see database function bodies.
-- A row here means: this function or view still points at a retired law. It does NOT say how: read the body. On 12.11.2026 the
-- uses fell into four kinds (foundation-closure-list.md section 7.2): a version stamp through fn_rules_snapshot (the retired ids
-- are silently dropped, so the stamp is empty), an existence guard, an owner label returned to callers, and comments.
-- successor = the same rule as scripts/sql/g1_laws_snapshot.sql: metadata.retired_routing_v1.successor, else the owner recorded
-- at retirement, else '-'.
-- KNOWN FALSE POSITIVE: a retired rule id that is also an ordinary column or word. 'evidence_level' is a column of several tables;
-- it is listed separately (kind = 'name is also a column') and is not a reader of the law.
-- Target after CL-06: no row of kind 'function' or 'view'.
with fam as (
  select rule_id, bool_or(is_active) as has_active, max(rule_version) as last_version
    from public.nodes where type = 'rule' and rule_id is not null group by rule_id
), retired as (
  select n.rule_id, n.rule_version,
         coalesce(nullif(n.metadata #>> '{retired_routing_v1,successor}', ''), nullif(n.metadata #>> '{compaction_v1,canonical_owner}', ''),
                  nullif(n.metadata #>> '{owner_routing,canonical_owner}', ''), '-') as successor,
         case when nullif(n.metadata #>> '{retired_routing_v1,successor}', '') is not null then 'retired_routing_v1' else 'owner at retirement' end as source
    from public.nodes n join fam f on f.rule_id = n.rule_id and f.last_version = n.rule_version
   where n.type = 'rule' and not f.has_active
), columns_named as (
  select distinct a.attname::text as name from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and a.attnum > 0 and not a.attisdropped
), readers as (
  select 'function' as kind, p.proname::text as reader, r.rule_id, r.rule_version, r.successor, r.source, md5(p.prosrc) as body_md5
    from retired r join pg_proc p on p.prosrc ~ ('\m' || r.rule_id || '\M') join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname <> 'fn_rule_compaction_integrity_guard_v1'
  union all
  select 'view', c.relname::text, r.rule_id, r.rule_version, r.successor, r.source, md5(pg_get_viewdef(c.oid, true))
    from retired r join pg_class c on c.relkind in ('v', 'm') join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and pg_get_viewdef(c.oid, true) ~ ('\m' || r.rule_id || '\M')
)
select case when exists (select 1 from columns_named cn where cn.name = x.rule_id) then 'name is also a column' else x.kind end as kind,
       x.reader, x.rule_id as retired_law, x.rule_version as last_version, x.successor, x.source, x.body_md5
  from readers x
 order by 1, x.rule_id collate "C", x.reader collate "C";
