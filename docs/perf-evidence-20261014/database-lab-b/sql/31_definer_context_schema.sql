-- ROLE B · LOCAL LAB ONLY · structures needed to run the LIVE fn_number_dossier / fn_number_journey (SECURITY DEFINER) end to end.
-- Table STRUCTURES = live information_schema (columns/types); policies = live pg_policies; data = SYNTHETIC. No live rows were read for this file.
\set ON_ERROR_STOP on
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''), (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub'))::uuid $$;
grant usage on schema auth to anon, authenticated, lab_admin; grant execute on function auth.uid() to anon, authenticated, lab_admin;
-- gematria_words gets the extra live columns used by map_anchor_family and the encrypted-word handling
alter table gematria_words add column if not exists phrase text, add column if not exists phrase_encrypted text, add column if not exists phrase_hint text,
  add column if not exists lead_rank smallint, add column if not exists source_wp_ids int[];
create table if not exists users (id uuid primary key default gen_random_uuid(), email text, username text, role text, created_at timestamptz default now(), display_name text, avatar_url text, tier text, is_researcher bool, senior_level int);
create table if not exists nodes (id uuid primary key default gen_random_uuid(), type text, label text, description text, metadata jsonb, is_active bool, created_at timestamptz default now(), rule_id text, rule_version int, depends_on text[], supersedes_version int, weight int2, hebrew_date text, axis_theme text, gallery_id uuid, identity_key text);
create table if not exists topic_cards (id uuid primary key default gen_random_uuid(), slug text, title text, subtitle text, search_terms text[], image_ids uuid[], numbers int[], highlight_numbers int[], findings jsonb, status text, quality int2, created_by text, created_at timestamptz default now(), approved_at timestamptz, node_id uuid, occurred_at date, meter_score int);
create table if not exists number_anchors (value int, category text, fact text, hint text, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists metatron_anchors (id uuid default gen_random_uuid(), anchor_value int, label text, form text, tier text, parent_value int, canonical_links text[], rule text, created_at timestamptz default now());
create table if not exists convergences (id uuid default gen_random_uuid(), kind text, method text, value int, phrases text[], group_size int, details jsonb, score int, status text, first_seen timestamptz, last_seen timestamptz);
create table if not exists relation_evidence (id uuid default gen_random_uuid(), relation_type text, method text, a_phrase text, b_phrase text, value int, note text, source text, engine_verified bool, status text, created_at timestamptz default now(), updated_at timestamptz default now(), rejection_reason text);
create table if not exists decision_ledger (id uuid default gen_random_uuid(), decision_type text, subject_type text, subject_ref text, human_decision text, human_reason text, provenance jsonb, status text, created_at timestamptz default now(), reason_code text, rules_snapshot jsonb);
create table if not exists learned_patterns (id uuid default gen_random_uuid(), pattern_key text, polarity text, status text);
create table if not exists research_candidates (id uuid default gen_random_uuid(), subject_ref text, recommendation text, status text);
create table if not exists number_roots (id uuid default gen_random_uuid(), number int, root_word text, essence text, is_active bool, space text);
create table if not exists number_branches (id uuid default gen_random_uuid(), number int, branch_name text, description text, phrases text[], is_active bool, sort_order int, space text);
create table if not exists journey_seeds (id uuid default gen_random_uuid(), value int, readiness int, status text, dna jsonb);
create table if not exists word_aliases (id uuid default gen_random_uuid(), word_id uuid, alias text, lang text);
create table if not exists tanach_verses (book_idx int2, book text, chapter int2, verse int2, text text, ragil int4);
create index if not exists tanach_verses_ragil on tanach_verses(ragil);
-- live helper functions used by the two RPCs (verbatim; fingerprints in verify step)
CREATE OR REPLACE FUNCTION public.rd_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin');
$function$;
CREATE OR REPLACE FUNCTION public.zero_root(n integer) RETURNS integer LANGUAGE sql IMMUTABLE AS $function$
  select case when n is null or n=0 then n
              else (n / power(10, (length(n::text) - length(rtrim(n::text,'0'))))::int)::int end;
$function$;
CREATE OR REPLACE FUNCTION public.digit_reverse(n integer) RETURNS integer LANGUAGE sql IMMUTABLE AS $function$
  select case when n is null then null else nullif(reverse(n::text),'')::int end;
$function$;
CREATE OR REPLACE FUNCTION public.fn_graph_space_is_public(p_metadata jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $function$
  SELECT coalesce(p_metadata->>'space', 'core') = 'core';
$function$;
CREATE OR REPLACE FUNCTION public.fn_verses_by_gematria(p_value integer, p_limit integer DEFAULT 12) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select jsonb_build_object(
    'value', p_value,
    'count', (select count(*) from tanach_verses where ragil=p_value),
    'verses', (select coalesce(jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,'text',text)),'[]'::jsonb)
               from (select book,chapter,verse,text,book_idx from tanach_verses where ragil=p_value
                     order by book_idx,chapter,verse limit p_limit) v)
  );
$function$;
CREATE OR REPLACE FUNCTION public.fn_rules_snapshot(p_rule_ids text[]) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select coalesce(
    jsonb_agg(jsonb_build_object('rule_id', n.rule_id, 'version', n.rule_version) order by n.rule_id),
    '[]'::jsonb
  )
  from public.nodes n
  where n.type='rule'
    and n.is_active
    and n.rule_id = any(p_rule_ids)
    and public.fn_graph_space_is_public(n.metadata);
$function$;
CREATE OR REPLACE FUNCTION public.topic_cards_public_findings(f jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE STRICT SET search_path TO 'public' AS $function$
begin
  if jsonb_typeof(f) = 'object' then
    return coalesce(
      (select jsonb_object_agg(e.k, public.topic_cards_public_findings(e.v))
         from jsonb_each(f) as e(k, v)
        where e.k not like '\_%'),
      '{}'::jsonb);
  elsif jsonb_typeof(f) = 'array' then
    return coalesce(
      (select jsonb_agg(public.topic_cards_public_findings(x.e) order by x.ord)
         from jsonb_array_elements(f) with ordinality as x(e, ord)),
      '[]'::jsonb);
  else
    return f;
  end if;
end
$function$;
CREATE OR REPLACE FUNCTION public.map_anchor_family(p_value integer) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  with r as (select zero_root(p_value) root),
  base as (select root, digit_reverse(root) mir from r),
  fam as (
    select distinct v from unnest(array[
      (select root from base), (select root from base)*10, (select root from base)*100,
      (select mir from base),  (select mir from base)*10,  (select mir from base)*100
    ]) v where v between 10 and 1000000
  ),
  axis as (
    select distinct phrase from gematria_words
    where lead_rank is not null
       or (coalesce(array_length(source_wp_ids,1),0)=0 and coalesce(source,'') !~ '^(excel_import|promoted:|auto:|wp_id:)')
  ),
  hits as (
    select b.value, b.phrase, b.method
    from bidim b join axis a on a.phrase = b.phrase
    where b.value in (select v from fam)
      and b.method in ('רגיל','אתבש','קדמי','מילוי','סידורי','אלבם','מסתתר')
      and b.phrase !~ '[A-Za-z0-9]'
  ),
  brdg as (
    select count(distinct wa.id) n, coalesce(jsonb_agg(distinct jsonb_build_object('lang',wa.lang,'alias',wa.alias)) filter (where wa.alias is not null),'[]') list
    from word_aliases wa
    join gematria_words g on g.id = wa.word_id
    where g.phrase in (select distinct phrase from hits) and coalesce(wa.lang,'he') not in ('he','heb','עברית')
  )
  select jsonb_build_object(
    'root', (select root from base),
    'primary_value', (select root from base),
    'mirror_values', to_jsonb(array(select v from unnest(array[(select mir from base),(select mir from base)*10,(select mir from base)*100]) v where v between 10 and 1000000)),
    'zero_shift_values', to_jsonb(array[(select root from base)*10, (select root from base)*100]),
    'family_values', (select to_jsonb(array_agg(v order by v)) from fam),
    'hebrew_terms', coalesce((select to_jsonb((array_agg(distinct phrase))[1:14]) from hits),'[]'),
    'evidence_count', (select count(distinct phrase) from hits),
    'methods', coalesce((select to_jsonb(array_agg(distinct method)) from hits),'[]'),
    'n_bridges', (select n from brdg),
    'bridges', (select list from brdg)
  );
$function$;
-- STUB (declared): live metatron_context is 6.9 KB, internal/admin only; the candidate does not touch the admin branch, so the stub only has to be identical for old vs candidate
CREATE OR REPLACE FUNCTION public.metatron_context(p_request jsonb) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ select jsonb_build_object('context_version','lab-stub','ask',p_request->>'ask') $$;
-- live view + live policies
create or replace view public.topic_cards_public with (security_barrier=true) as
 SELECT id, slug, title, subtitle, search_terms, image_ids, numbers, highlight_numbers, topic_cards_public_findings(findings) AS findings, status, quality, created_by, created_at, approved_at, node_id, occurred_at, meter_score
   FROM topic_cards t WHERE status = 'approved'::text AND COALESCE(findings -> '_do_not_publish'::text, 'false'::jsonb) IS DISTINCT FROM 'true'::jsonb;
alter table nodes enable row level security; alter table topic_cards enable row level security; alter table tanach_verses enable row level security; alter table users enable row level security;
drop policy if exists nodes_admin_read on nodes; drop policy if exists nodes_public_read on nodes; drop policy if exists tv_load_select on tanach_verses; drop policy if exists users_select_public on users;
drop policy if exists topic_cards_admin_write on topic_cards; drop policy if exists topic_cards_public_read on topic_cards;
create policy nodes_admin_read on nodes for select using (rd_is_admin()); create policy nodes_public_read on nodes for select using (fn_graph_space_is_public(metadata));
create policy tv_load_select on tanach_verses for select using (true); create policy users_select_public on users for select using (true);
create policy topic_cards_public_read on topic_cards for select using ((status = 'approved') and (coalesce(((findings ->> '_do_not_publish'))::boolean, false) = false));
-- grants: anon/authenticated get ONLY what the live public contract gives (view, nodes via RLS, verses); nothing on ledger/candidates/patterns/anchors/convergences/evidence
grant select on topic_cards_public, nodes, tanach_verses, users to anon, authenticated;
grant select on all tables in schema public to lab_admin;
grant usage on schema public to lab_admin;
