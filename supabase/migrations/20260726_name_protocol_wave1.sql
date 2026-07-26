-- ============================================================
--  Name Research Protocol — Wave 1 (core architecture)
--  Registry + Scheduler + fn_name_protocol
--
--  Principle (Zuriel, 26.7.2026): do NOT rebuild the engines.
--  Build a PROTOCOL LAYER above them. Each engine declares itself
--  in a registry; the scheduler runs them by stage/dependency and
--  assembles one unified research document (Metatron = union only).
--
--  Additive & inert: nothing on the live site calls this yet.
-- ============================================================

-- ── REGISTRY ────────────────────────────────────────────────
-- Each row = one engine wrapper. Add an engine later = INSERT a row,
-- no change to the scheduler or to Metatron.
create table if not exists public.name_protocol_agents (
  agent_id      text primary key,
  label         text not null,                       -- internal/admin label (NOT surfaced to end-user, product decision)
  stage         text not null check (stage in ('discovery','methods','crossings','scoring','synthesis')),
  output_key    text not null,                       -- neutral role key the result lands under (no agent/angel names leak)
  call_template text,                                -- SQL returning ONE jsonb; references $1 = ctx jsonb {name,value,lang}
  depends_on    text[]  not null default '{}',       -- agent_ids this waits for (honored via stage precedence in Wave 1)
  needs_value   boolean not null default false,      -- requires the resolved gematria value ($1->>'value')
  parallel      boolean not null default true,       -- informational: safe to run alongside same-stage peers
  sort          int     not null default 100,
  enabled       boolean not null default true,
  note          text,
  created_at    timestamptz not null default now()
);

comment on table public.name_protocol_agents is
  'Registry of the name-research protocol (Wave 1). Each row declares an engine wrapper: stage, dependencies, and a SQL call_template returning jsonb. fn_name_protocol reads this table and schedules by stage/deps. Add an engine = insert a row, no code change. Server-only config (read via the SECURITY DEFINER function, not by the client).';

alter table public.name_protocol_agents enable row level security;  -- definer function bypasses; no client grant (server-only)

-- Seed: wrap the engines that already exist and are verified live.
insert into public.name_protocol_agents (agent_id,label,stage,output_key,call_template,depends_on,needs_value,sort,note) values
 ('tanach','סוכן התנ״ך','discovery','sources',
    $$select fn_name_in_tanach((($1)->>'name'))$$, '{}', false, 10, 'הופעות השם בתנ״ך + ספרים + פסוקים'),
 ('neighbors','סוכן השכנים','discovery','neighbors',
    $$select fn_name_neighbors((($1)->>'name'),12)$$, '{}', false, 20, 'מילים שמופיעות ליד השם בתנ״ך'),
 ('decomposition','סוכן פירוק-המילה','discovery','decomposition',
    $$select fn_maftech_decompose((($1)->>'name'))$$, '{}', false, 30, 'פירוק-מילה (מפתח). מנוע שורש עברי אמיתי = גל 2'),
 ('gematria','סוכן הגימטריות','methods','gematria',
    $$select fn_all_methods((($1)->>'name'))$$, '{}', false, 40, 'כל השיטות מהמנוע הרשמי (~23)'),
 ('linguistics','סוכן האותיות והצורות','methods','linguistics',
    $$select fn_name_research((($1)->>'name'))$$, '{}', false, 50, 'אותיות · אנגרמות · תמורות · ביטויים · same_value · עיקרון'),
 ('language','סוכן השפות + הקשר','methods','language',
    $$select name_lab_research((($1)->>'name'), null)$$, '{}', false, 60, 'גשרים חוצי-שפות + פוסטים/אוצרות/חידושים'),
 ('verses_by_value','סוכן פסוקי-הערך','crossings','verses_same_value',
    $$select fn_verses_by_gematria((($1)->>'value')::int, 8)$$, '{gematria}', true, 70, 'פסוקים ששווים לערך הרגיל'),
 ('graph_bridges','סוכן גשרי-הגרף','crossings','graph_bridges',
    $$select get_graph_bridges((($1)->>'name'), null)$$, '{}', false, 80, 'גשרים מהגרף המאוחד (עץ אחד)'),
 ('crossings','סוכן ההצלבות','crossings','crossings',
    $$select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from strongest_crossings((($1)->>'name'),2,8) t$$,
    '{gematria,tanach,linguistics}', false, 90, 'זוגות שנפגשים ב-2+ שיטות עצמאיות')
on conflict (agent_id) do update set
  label=excluded.label, stage=excluded.stage, output_key=excluded.output_key,
  call_template=excluded.call_template, depends_on=excluded.depends_on,
  needs_value=excluded.needs_value, sort=excluded.sort, note=excluded.note;

-- ── SCHEDULER + PROTOCOL ────────────────────────────────────
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
  v_ctx         jsonb;
  v_variants    jsonb;
  a             record;
  v_res         jsonb;
  v_findings    jsonb := '{}'::jsonb;
  v_agents      jsonb := '[]'::jsonb;
  v_ok          boolean;
  v_err         text;
  t0            timestamptz;
  v_ms          numeric;
  v_stage_order text[] := array['discovery','methods','crossings','scoring','synthesis'];
  v_metatron    jsonb;
  v_scores      jsonb;
  v_stages_run  jsonb := '[]'::jsonb;
begin
  -- ── GATEWAY: normalize + language + value + variants ──
  v_name := btrim(regexp_replace(v_raw, '\s+', ' ', 'g'));
  if v_name = '' then
    return jsonb_build_object('protocol_version', 1, 'error', 'empty_name');
  end if;
  v_lang := case when v_name ~ '[א-ת]' then 'he'
                 when v_name ~ '[A-Za-z]' then 'latin'
                 else 'unknown' end;
  begin v_value := fn_ragil(v_name); exception when others then v_value := null; end;
  v_variants := to_jsonb(array[v_name]);   -- Wave 2: matres-lectionis / ktiv-male↔chaser expansion
  v_ctx := jsonb_build_object('name', v_name, 'value', coalesce(v_value,0), 'lang', v_lang);

  -- ── SCHEDULER: run enabled agents in stage order (deps honored via stage precedence in Wave 1) ──
  for a in
    select * from public.name_protocol_agents
    where enabled and call_template is not null
    order by array_position(v_stage_order, stage), sort
  loop
    if a.needs_value and coalesce(v_value,0) = 0 then continue; end if;
    t0 := clock_timestamp(); v_ok := true; v_err := null; v_res := null;
    begin
      execute a.call_template into v_res using v_ctx;
    exception when others then
      v_ok := false; v_err := left(sqlerrm,180); v_res := null;
    end;
    v_ms := round(extract(milliseconds from clock_timestamp()-t0)::numeric, 1);
    if v_res is not null then
      v_findings := v_findings || jsonb_build_object(a.output_key, v_res);
    end if;
    v_agents := v_agents || jsonb_build_object(
      'agent_id', a.agent_id, 'stage', a.stage, 'output_key', a.output_key,
      'ok', v_ok, 'ms', v_ms, 'error', v_err,
      'empty', (v_res is null or v_res in ('null'::jsonb, '[]'::jsonb, '{}'::jsonb))
    );
  end loop;

  -- stages actually reached (drives the "research journey" checklist on the client)
  select coalesce(jsonb_agg(stage order by o), '[]'::jsonb) into v_stages_run
  from (select distinct (a2->>'stage') stage, array_position(v_stage_order, a2->>'stage') o
        from jsonb_array_elements(v_agents) a2) q;

  -- ── SCORING: depth of crossing (how many independent layers meet on this name) ──
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

  -- ── METATRON: synthesis. Union of what the agents found — every item traces to a source. ──
  v_metatron := jsonb_build_object(
    'value', v_value,
    'headline', jsonb_strip_nulls(jsonb_build_object('name', v_name, 'ragil', v_findings#>'{gematria,רגיל}')),
    'strong_findings', coalesce((
        select jsonb_agg(jsonb_build_object(
          'partner', x->>'partner', 'n_methods', (x->>'n_methods')::int, 'detail', x->>'methods_detail'))
        from jsonb_array_elements(coalesce(v_findings->'crossings','[]'::jsonb)) x
        where (x->>'n_methods')::int >= 2), '[]'::jsonb),
    'recurring', coalesce(v_findings#>'{linguistics,same_value}', '[]'::jsonb),
    'follow_up', coalesce((
      select jsonb_agg(q) from (
        select 'צלול לדף המספר '||v_value                                             as q where v_value is not null
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

  -- ── ASSEMBLE: one unified research document ──
  return jsonb_build_object(
    'protocol_version', 1,
    'research_id', 'NR-'||to_char(now(),'YYMMDD')||'-'||substr(md5(v_name||clock_timestamp()::text),1,5),
    'generated_at', now(),
    'input', jsonb_build_object('raw', v_raw, 'normalized', v_name, 'language', v_lang, 'value', v_value, 'variants', v_variants),
    'stages', coalesce(v_stages_run,'[]'::jsonb) || to_jsonb(array['scoring','synthesis']),
    'agents', v_agents,     -- per-engine meta: ok / ms / empty  (the "journey" is derived from real events)
    'findings', v_findings, -- neutral role keys → raw engine output
    'scores', v_scores,
    'metatron', v_metatron
  );
end;
$fn$;

comment on function public.fn_name_protocol(text, jsonb) is
  'Name Research Protocol (Wave 1). Gateway→Registry→Scheduler→engines→crossings→scoring→Metatron, returning one unified document. Wraps existing engines via name_protocol_agents; does not recompute gematria itself.';

grant execute on function public.fn_name_protocol(text, jsonb) to anon, authenticated;
