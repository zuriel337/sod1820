-- COMMAND_CENTER_ATTENTION_CLOSURE Pass 1B, §7-9 (live rule retrieval, relevance-based).
--
-- Zuriel's explicit requirement: Raziel must reason using the CURRENT canonical active rules
-- (nodes type='rule' is_active), not a frozen/hardcoded prompt -- and NOT by copying hundreds of
-- rules into a static system prompt, and NOT via a second rules table. This function is the one
-- new primitive that makes that possible: a plain, relevance-scored, bounded LIVE query over the
-- existing canonical `nodes` table. No rule content is duplicated anywhere else -- if a new rule
-- is added to `nodes` tomorrow with matching keywords, this function returns it immediately, with
-- zero code change.
--
-- Relevance = weighted keyword overlap (rule_id match >> label match >> description match), not
-- semantic search -- intentionally simple/explainable/auditable over "smarter" but opaque ranking.
-- v2 (this file): weighted scoring, replacing v1's flat "count of matched terms" which let a rule
-- that only incidentally mentions a term once deep in its description tie with -- and sometimes,
-- on alphabetical tiebreak, outrank -- a rule whose rule_id/label is actually about that domain
-- (caught live: querying domain 'els' surfaced broadcast_center_law ahead of els_credits_law).
-- Every returned description is truncated (bounded context, per §3/§8).
-- Internal-only: no grant to anon/authenticated -- callers are the raziel-* edge functions via the
-- service-role key (Supabase service_role already has full function/table access; this must NOT
-- be reachable from the public/regular-user AskRaziel path, per the Human-Gate permission boundary).
create or replace function public.fn_raziel_relevant_rules(
  p_query text default null,
  p_domains text[] default null,
  p_limit integer default 8
)
returns table(rule_id text, label text, description text, score integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  with terms as (
    select distinct lower(d) as term
    from unnest(coalesce(p_domains, array[]::text[])) as d
    where length(d) >= 2
    union
    select distinct lower(t) as term
    from unnest(regexp_split_to_array(coalesce(p_query, ''), '\s+')) as t
    where length(t) >= 3
  ),
  scored as (
    select
      n.rule_id, n.label, n.description,
      (
        select coalesce(sum(
          (case when n.rule_id ilike '%' || t.term || '%' then 5 else 0 end) +
          (case when n.label    ilike '%' || t.term || '%' then 3 else 0 end) +
          (case when n.description ilike '%' || t.term || '%' then 1 else 0 end)
        ), 0)::int
        from terms t
      ) as score
    from public.nodes n
    where n.type = 'rule' and n.is_active and n.rule_id is not null
  )
  select s.rule_id, s.label, left(s.description, 600) as description, s.score
  from scored s
  where s.score > 0
  order by s.score desc, s.rule_id
  limit greatest(1, least(coalesce(p_limit, 8), 20));
$function$;
