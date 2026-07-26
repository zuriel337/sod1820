-- ============================================================
--  Name Research Protocol — Wave 1.1 (Protocol Audit hardening)
--  Contract-preserving: fn_name_protocol output schema is unchanged.
--
--  Fixes from the audit (Zuriel, 26.7.2026):
--   1. REGISTRY BOUNDARY (critical): the registry no longer stores an
--      arbitrary SQL string executed under SECURITY DEFINER. It now
--      DECLARES a function + typed args; the scheduler APPROVES it
--      against an allowlist and builds a safe, quoted, parameterized
--      call. Registry describes WHAT — it can no longer dictate HOW.
--   2. Gateway normalization: strip Hebrew points/dagesh/te'amim/maqaf
--      → same name with/without nikud yields the same research.
--   3. Real dependency gate: an agent runs only after every depends_on
--      agent has been attempted (observable via seq).
--   4. Traceability: every Metatron block + a document-level provenance
--      map trace each finding to its agent → function.
--   5. Deterministic research_id (hash of normalized name) → idempotency.
-- ============================================================

-- ── ALLOWLIST: the approved-executor gate ───────────────────
-- The scheduler will invoke a function ONLY if it appears here.
-- Adding a capability requires an explicit, reviewable row.
create table if not exists public.name_protocol_allowed_fns (
  fn_name text primary key,
  note    text,
  added_at timestamptz not null default now()
);
alter table public.name_protocol_allowed_fns enable row level security;  -- server-only

insert into public.name_protocol_allowed_fns (fn_name, note) values
 ('fn_name_in_tanach','discovery: tanach occurrences'),
 ('fn_name_neighbors','discovery: co-occurring words'),
 ('fn_maftech_decompose','discovery: word decomposition'),
 ('fn_all_methods','methods: all gematria methods'),
 ('fn_name_research','methods: letters/anagrams/transforms/same_value'),
 ('name_lab_research','methods: language bridges + context'),
 ('fn_verses_by_gematria','crossings: verses of same value'),
 ('get_graph_bridges','crossings: unified-graph bridges'),
 ('strongest_crossings','crossings: multi-method partner pairs')
on conflict (fn_name) do nothing;

-- ── REGISTRY: swap arbitrary SQL for a declarative spec ─────
alter table public.name_protocol_agents drop column if exists call_template;
alter table public.name_protocol_agents add column if not exists fn_name     text;
alter table public.name_protocol_agents add column if not exists fn_args     jsonb not null default '[]'::jsonb;
alter table public.name_protocol_agents add column if not exists result_mode text not null default 'scalar'
  check (result_mode in ('scalar','setof'));

comment on column public.name_protocol_agents.fn_name is 'Function to invoke — must exist in name_protocol_allowed_fns (approved-executor gate).';
comment on column public.name_protocol_agents.fn_args is 'Declarative arg spec: array of {"src":"name"|"value"} | {"const":<json>} with optional "cast":"int". The scheduler builds a safe quoted/typed call — no raw SQL from the registry is ever executed.';

-- Re-seed agents in the declarative form (idempotent).
update public.name_protocol_agents set fn_name=v.fn_name, fn_args=v.fn_args::jsonb, result_mode=v.result_mode
from (values
 ('tanach','fn_name_in_tanach','[{"src":"name"}]','scalar'),
 ('neighbors','fn_name_neighbors','[{"src":"name"},{"const":12}]','scalar'),
 ('decomposition','fn_maftech_decompose','[{"src":"name"}]','scalar'),
 ('gematria','fn_all_methods','[{"src":"name"}]','scalar'),
 ('linguistics','fn_name_research','[{"src":"name"}]','scalar'),
 ('language','name_lab_research','[{"src":"name"},{"const":null}]','scalar'),
 ('verses_by_value','fn_verses_by_gematria','[{"src":"value","cast":"int"},{"const":8}]','scalar'),
 ('graph_bridges','get_graph_bridges','[{"src":"name"},{"const":null}]','scalar'),
 ('crossings','strongest_crossings','[{"src":"name"},{"const":2},{"const":8}]','setof')
) as v(agent_id,fn_name,fn_args,result_mode)
where public.name_protocol_agents.agent_id = v.agent_id;

-- ── SCHEDULER + PROTOCOL (hardened, same output contract) ───
create or replace function public.fn_name_protocol(p_name text, p_opts jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_raw         text := coalesce(p_name,'');
  v_name        text;
  v_lang        text;
  v_value       int;
  a             record;
  e             jsonb;
  v_res         jsonb;
  v_sql         text;
  v_args        text;
  v_part        text;
  v_findings    jsonb := '{}'::jsonb;
  v_agents      jsonb := '[]'::jsonb;
  v_prov        jsonb := '{}'::jsonb;
  v_done        text[] := '{}';
  v_seq         int := 0;
  v_ok          boolean;
  v_err         text;
  v_run         boolean;
  v_missing     text[];
  t0            timestamptz;
  v_ms          numeric;
  v_stage_order text[] := array['discovery','methods','crossings','scoring','synthesis'];
  v_metatron    jsonb;
  v_scores      jsonb;
  v_stages_run  jsonb := '[]'::jsonb;
  v_nikud       text := '[' || chr(1425) || '-' || chr(1479) || ']';  -- U+0591..U+05C7: points/te'amim/dagesh/maqaf
begin
  -- ── GATEWAY: normalize (nikud/maqaf-safe) + language + value ──
  v_name := regexp_replace(v_raw, v_nikud, '', 'g');   -- drop Hebrew combining marks
  v_name := regexp_replace(v_name, '[-–—]', ' ', 'g');  -- hyphens → space
  v_name := btrim(regexp_replace(v_name, '\s+', ' ', 'g'));
  if v_name = '' then
    return jsonb_build_object('protocol_version', 1, 'error', 'empty_name');
  end if;
  v_lang := case when v_name ~ '[א-ת]' then 'he'
                 when v_name ~ '[A-Za-z]' then 'latin'
                 else 'unknown' end;
  begin v_value := fn_ragil(v_name); exception when others then v_value := null; end;

  -- ── SCHEDULER: stage-ordered, dependency-gated, allowlist-guarded ──
  for a in
    select * from public.name_protocol_agents
    where enabled and fn_name is not null
    order by array_position(v_stage_order, stage), sort
  loop
    t0 := clock_timestamp(); v_ok := true; v_err := null; v_res := null; v_run := true;

    -- (a) dependency gate — every depends_on must already be attempted
    v_missing := array(select d from unnest(a.depends_on) d where d <> all(v_done));
    if array_length(v_missing,1) is not null then
      v_ok := false; v_err := 'deps_unmet: '||array_to_string(v_missing,','); v_run := false;
    end if;
    -- (b) approved-executor gate — fn must be identifier-shaped AND allowlisted
    if v_run and (a.fn_name !~ '^[a-z_][a-z0-9_]*$'
                  or not exists (select 1 from public.name_protocol_allowed_fns f where f.fn_name = a.fn_name)) then
      v_ok := false; v_err := 'fn_not_allowlisted: '||a.fn_name; v_run := false;
    end if;
    -- (c) value gate
    if v_run and a.needs_value and coalesce(v_value,0) = 0 then
      v_ok := false; v_err := 'no_value'; v_run := false;
    end if;

    -- build a SAFE call: quoted identifier + typed/escaped args (no raw registry SQL)
    if v_run then
      v_args := '';
      for e in select * from jsonb_array_elements(coalesce(a.fn_args,'[]'::jsonb)) loop
        if e ? 'src' then
          v_part := case when e->>'src'='name'  then quote_literal(v_name)
                         when e->>'src'='value' then coalesce(v_value::text,'null')
                         else 'null' end;
        elsif e ? 'const' then
          v_part := case jsonb_typeof(e->'const')
                         when 'number'  then (e->>'const')
                         when 'boolean' then (e->>'const')
                         when 'null'    then 'null'
                         else quote_literal(e->>'const') end;
        else v_part := 'null'; end if;
        if e ? 'cast' then v_part := v_part || '::' || regexp_replace(e->>'cast','[^a-z]','','g'); end if;
        v_args := v_args || case when v_args='' then '' else ',' end || v_part;
      end loop;

      if a.result_mode = 'setof' then
        v_sql := 'select coalesce(jsonb_agg(to_jsonb(_t)),''[]''::jsonb) from '
                 || quote_ident(a.fn_name) || '(' || v_args || ') _t';
      else
        v_sql := 'select to_jsonb(' || quote_ident(a.fn_name) || '(' || v_args || '))';
      end if;

      begin
        execute v_sql into v_res;
      exception when others then
        v_ok := false; v_err := left(sqlerrm,180); v_res := null;
      end;
    end if;

    v_ms := round(extract(milliseconds from clock_timestamp()-t0)::numeric, 1);
    v_seq := v_seq + 1;
    v_done := v_done || a.agent_id;   -- attempted (ran or gated); dependents may proceed
    if v_res is not null then
      v_findings := v_findings || jsonb_build_object(a.output_key, v_res);
      v_prov := v_prov || jsonb_build_object(a.output_key,
                  jsonb_build_object('agent', a.agent_id, 'fn', a.fn_name, 'stage', a.stage));
    end if;
    v_agents := v_agents || jsonb_build_object(
      'seq', v_seq, 'agent_id', a.agent_id, 'stage', a.stage, 'output_key', a.output_key,
      'fn', a.fn_name, 'depends_on', to_jsonb(a.depends_on),
      'ran', v_run, 'ok', v_ok, 'ms', v_ms, 'error', v_err,
      'empty', (v_res is null or v_res in ('null'::jsonb, '[]'::jsonb, '{}'::jsonb))
    );
  end loop;

  select coalesce(jsonb_agg(stage order by o), '[]'::jsonb) into v_stages_run
  from (select distinct (a2->>'stage') stage, array_position(v_stage_order, a2->>'stage') o
        from jsonb_array_elements(v_agents) a2) q;

  -- ── SCORING ──
  select jsonb_build_object(
    'depth', least(100, conv*2 + bridges*12 + xings*6 + least(posts,15) + least(tanach_hits,10)),
    'parts', jsonb_build_object('convergences',conv,'bridges',bridges,'crossings',xings,'posts',posts,'tanach_hits',tanach_hits)
  ) into v_scores
  from (
    select
      coalesce(jsonb_array_length(v_findings#>'{linguistics,same_value}'),0) as conv,
      coalesce(jsonb_array_length(v_findings->'graph_bridges'),0)            as bridges,
      coalesce(jsonb_array_length(v_findings->'crossings'),0)                as xings,
      coalesce((v_findings#>>'{language,posts_count}')::int,0)               as posts,
      coalesce((v_findings#>>'{sources,count}')::int,0)                      as tanach_hits
  ) c;

  -- ── METATRON: union only; every block names its source (traceability) ──
  v_metatron := jsonb_build_object(
    'value', v_value,
    'headline', jsonb_strip_nulls(jsonb_build_object('name', v_name, 'ragil', v_findings#>'{gematria,רגיל}')),
    'strong_findings', jsonb_build_object(
        'source_agent','crossings','source_fn','strongest_crossings',
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'partner', x->>'partner', 'n_methods', (x->>'n_methods')::int, 'detail', x->>'methods_detail'))
          from jsonb_array_elements(coalesce(v_findings->'crossings','[]'::jsonb)) x
          where (x->>'n_methods')::int >= 2), '[]'::jsonb)),
    'recurring', jsonb_build_object(
        'source_agent','linguistics','source_fn','fn_name_research','source_key','same_value',
        'items', coalesce(v_findings#>'{linguistics,same_value}', '[]'::jsonb)),
    'follow_up', coalesce((
      select jsonb_agg(q) from (
        select 'צלול לדף המספר '||v_value as q where v_value is not null
        union all
        select 'נמצא גשר חוצה-שפה — חקור את הצד השני'
          where jsonb_array_length(coalesce(v_findings->'graph_bridges','[]'::jsonb)) > 0
        union all
        select 'השם מופיע בתנ״ך '||(v_findings#>>'{sources,count}')||' פעמים — עיין בהקשר'
          where coalesce((v_findings#>>'{sources,count}')::int,0) > 0
        union all
        select 'נמצאו '||jsonb_array_length(v_findings->'crossings')||' הצלבות רב-שיטתיות — בדוק את החזקות'
          where jsonb_array_length(coalesce(v_findings->'crossings','[]'::jsonb)) > 0
      ) qq), '[]'::jsonb)
  );

  -- ── ASSEMBLE ──
  return jsonb_build_object(
    'protocol_version', 1,
    'research_id', 'NR-'||substr(md5(v_name),1,10),   -- deterministic: same name → same id
    'generated_at', now(),
    'input', jsonb_build_object('raw', v_raw, 'normalized', v_name, 'language', v_lang, 'value', v_value, 'variants', to_jsonb(array[v_name])),
    'stages', coalesce(v_stages_run,'[]'::jsonb) || to_jsonb(array['scoring','synthesis']),
    'agents', v_agents,
    'findings', v_findings,
    'provenance', v_prov,   -- output_key → {agent, fn, stage}: every finding traces to its engine
    'scores', v_scores,
    'metatron', v_metatron
  );
end;
$fn$;

comment on function public.fn_name_protocol(text, jsonb) is
  'Name Research Protocol (Wave 1.1). Declarative registry + allowlisted approved-executor + dependency gate + provenance. Wraps existing engines; never executes raw registry SQL and never recomputes gematria itself.';

grant execute on function public.fn_name_protocol(text, jsonb) to anon, authenticated;
