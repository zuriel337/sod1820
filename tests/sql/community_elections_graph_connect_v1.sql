-- Throwaway-Postgres test for supabase/proposed/20261108130000_community_elections_contribution_graph_connect_v1.sql
-- (and its rollback). Never run against a live project: it creates stub tables with the live shapes it needs.
-- The REAL v9 projector text and the REAL migration/rollback files are executed; only the tables are stubs.
\set ON_ERROR_STOP on
\set QUIET on
\set mig `cat supabase/proposed/20261108130000_community_elections_contribution_graph_connect_v1.sql`
\set rb  `cat supabase/proposed/20261108130001_community_elections_contribution_graph_connect_v1_rollback.sql`
\set proj `sed -n '/^CREATE OR REPLACE FUNCTION public.project_contribution_to_graph/,/^\$function\$;/p' supabase/migrations/20261026141352_public_contribution_published_graph_projection_v9.sql`

create schema if not exists auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if; end $$;

create table public.users (id uuid primary key, role text, display_name text);
create function public.rd_is_admin() returns boolean language sql stable security definer set search_path to 'public'
  as $$ select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin') $$;
create function public.fn_graph_space_is_public(p_metadata jsonb) returns boolean language sql immutable
  as $$ select coalesce(p_metadata->>'space', 'core') = 'core' $$;

create table public.nodes (
  id uuid primary key default gen_random_uuid(), type text not null, label text, description text,
  metadata jsonb default '{}'::jsonb, is_active boolean default true, created_at timestamptz default now(), identity_key text);
create unique index nodes_identity_canonical_uidx on public.nodes (type, coalesce(identity_key, label)) where type <> all (array['image','rule']);
create table public.edges (
  id uuid primary key default gen_random_uuid(), from_node uuid references public.nodes(id), to_node uuid references public.nodes(id),
  relation_type text not null, weight double precision, metadata jsonb, created_at timestamptz default now());
create unique index edges_identity_uidx on public.edges (from_node, to_node, relation_type, coalesce(metadata->>'period','')) where created_at >= '2026-08-30 09:00:00+00';
create table public.research_contributions (
  id uuid primary key, status text, origin text, intent text, research_state text, target_type text, target_id text,
  parent_id uuid, graph_node_id uuid, author_name text, created_at timestamptz default now(), updated_at timestamptz,
  deleted_at timestamptz, thread_hidden_at timestamptz, body text, title text);
create table public.contribution_links (id uuid primary key default gen_random_uuid(), from_contribution_id uuid, target_type text, target_id text, relation_type text, note text);
create table public.decision_ledger (
  id uuid primary key default gen_random_uuid(), decision_type text not null, subject_type text, subject_ref text, candidate jsonb,
  domain text, created_by_agent text, agents_involved text[], human_decision text, human_reason text, decided_by text, result_ref jsonb,
  provenance jsonb, status text not null default 'pending', created_at timestamptz not null default now(),
  constraint decision_ledger_human_decision_check check (human_decision = any (array['approve','reject','merge','modify'])),
  constraint decision_ledger_status_governance_vocab check (status is null or status = any (array['confirmed','rejected','applied','executed'])));
create table public.research_objects (id uuid primary key, kind text, status text, privacy_scope text, promoted_node_id uuid);
create table public.community_tree_hints (contribution_id uuid primary key, numbers int[]);

create function public.get_or_create_entity_node(p_type text, p_label text, p_meta jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path to 'public' as $f$
declare v uuid; v_existing_key text; v_identity_key text; v_meta jsonb;
begin
  if p_label is null or p_label = '' then return null; end if;
  v_identity_key := nullif(p_meta->>'identity_key', ''); v_meta := coalesce(p_meta, '{}'::jsonb) - 'identity_key';
  if v_identity_key is not null then select id into v from public.nodes where type = p_type and identity_key = v_identity_key limit 1; end if;
  if v is null then
    select id, identity_key into v, v_existing_key from public.nodes where type = p_type and label = p_label limit 1;
    if v is not null and v_identity_key is not null then
      if v_existing_key is null then update public.nodes set identity_key = v_identity_key where id = v;
      elsif v_existing_key <> v_identity_key then v := null; end if;
    end if;
  end if;
  if v is null then
    insert into public.nodes (type, label, is_active, metadata, identity_key)
    values (p_type, p_label, true, v_meta || jsonb_build_object('auto','research_contribution'), v_identity_key) returning id into v;
  end if;
  return v;
end; $f$;
create function public.upsert_edge(p_from uuid, p_to uuid, p_rel text, p_meta jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path to 'public' as $f$
begin
  if p_from is null or p_to is null or p_from = p_to then return; end if;
  if not exists (select 1 from public.edges where from_node = p_from and to_node = p_to and relation_type = p_rel) then
    insert into public.edges (from_node, to_node, relation_type, metadata) values (p_from, p_to, p_rel, coalesce(p_meta,'{}'::jsonb));
  end if;
end; $f$;

:proj

-- RLS exactly as live: public read only when metadata.space = core.
alter table public.nodes enable row level security; alter table public.edges enable row level security;
create policy nodes_public_read on public.nodes for select using (public.fn_graph_space_is_public(metadata));
create policy edges_public_read on public.edges for select using (public.fn_graph_space_is_public(metadata));
grant usage on schema public to anon; grant select on public.nodes, public.edges to anon;

create function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$ begin if not coalesce(ok, false) then raise exception 'FAIL: %', msg; end if; end $$;
create function pg_temp.try(sql text) returns text language plpgsql as $$ begin execute sql; return 'ok'; exception when others then return 'ERR: ' || sqlerrm; end $$;
create function pg_temp.snap() returns text language sql as $$
  select md5(coalesce((select string_agg(to_jsonb(n)::text, '|' order by id) from public.nodes n), '') ||
             coalesce((select string_agg(to_jsonb(e)::text, '|' order by id) from public.edges e), '') ||
             coalesce((select string_agg(to_jsonb(d)::text, '|' order by id) from public.decision_ledger d), '') ||
             coalesce((select string_agg(to_jsonb(c)::text, '|' order by id) from public.research_contributions c), '') ||
             coalesce((select string_agg(to_jsonb(l)::text, '|' order by id) from public.contribution_links l), '')) $$;

-- ---------------------------------------------------------------- fixtures (ids as in the live DB)
insert into public.users values ('b6ce542a-2b07-4749-8aba-532c886f6de7', 'admin', 'sod1820'), ('36f5cb84-71c3-4977-a2c7-d6413e973443', 'admin', 'zuriel');
insert into public.nodes (id, type, label, metadata) values
  ('62603405-f044-4bd2-b586-9fe6c113f774', 'number', '77', '{"value":77,"source":"tree-backfill-idea1"}'),
  ('792eb8d4-4945-4428-8220-2503e1d74c42', 'post', 'הבחירות לכנסת ה־26 — כשהמספרים מתחילים להתחבר - תחילת הרמזים', '{"post_id":5107,"slug":"sharshar-elections-redemption-hints-draft","source_kind":"post"}'),
  ('b1435eeb-cf3c-47c3-84aa-6e5108020da3', 'post', 'בחירות 26 — סרטון', '{"post_id":5128,"source_kind":"post"}');
insert into public.edges (from_node, to_node, relation_type, metadata) values
  ('792eb8d4-4945-4428-8220-2503e1d74c42', '62603405-f044-4bd2-b586-9fe6c113f774', 'documents', '{"tag":"77","via":"pinned_elections_77_chat_thread"}'),
  ('b1435eeb-cf3c-47c3-84aa-6e5108020da3', '792eb8d4-4945-4428-8220-2503e1d74c42', 'related', '{"relation_basis":"election26_post_family"}');
-- the candidate that must stay untouched
insert into public.research_objects values ('e882519e-daac-4c62-8068-e382dde94a44', 'observation', 'candidate', 'private', null);
-- the contribution (exact live body: md5 c5e2b110…, 831 chars) and an unrelated projected contribution
insert into public.research_contributions (id, status, origin, intent, research_state, parent_id, author_name, created_at, body, title)
values ('ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f', 'approved', 'openweb', 'תצפית', 'idea', null, 'Jasha8', '2026-10-28 11:33:02+00',
$body$בישראל נערכו בחירות לכנסת.

תוצאות רשמיות טרם פורסמו.

עם זאת, בולטת לעין מגמה נומרולוגית מאוד מעניינת.

* שיעור ההצבעה בבחירות לכנסת הגיע ל-77.7 % – הנתון הגבוה ביותר מאז שנת 1999

* הבחירות החלו בבוקר יום ט״ז (7) בחשוון והסתיימו בערב יום י״ז (7) בחשוון, ה'תשפ״ז (7).

* מכיוון שעל פי הלוח העברי היום מתחיל עם רדת החושך, הרי שגם בוקר יום ט״ז בחשוון וגם ערב יום י״ז בחשוון חלו באותו יום בלוח הלועזי ה-27 באוקטובר.

* לפני 7 ימים מלאו לנתניהו 77 שנים.

ריבוי כזה של הספרה 7 רומז על הנבואה:

רבי שמעון בן יוחאי אומר:

שבוע שבן דוד בא -

שנה ראשונה מתקיימת "והמטרתי על עיר אחת" וגו' (עמוס ד).

שניה חיצי רעב משתלחין.

שלישית רעב גדול, ומתים בו אנשים ונשים וטף,

וחסידים ואנשי מעשה מתמעטים ותורה משתכחת מלומדיה.

רביעית שובע ואינו שובע.

חמישית שובע גדול, אוכלים ושותים ושמחים.

בשישית קולות.

בשביעית מלחמות.

במוצאי שביעית בן דוד בא.$body$, '');
insert into public.contribution_links (from_contribution_id, target_type, target_id, relation_type) values
  ('ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f', 'openweb_message', 'sp_x_POST$ID$GOES$HERE_c_y', 'derived_from'),
  ('ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f', 'openweb_user', 'u_x', 'authored_by_external');
insert into public.nodes (id, type, label, metadata) values ('925172da-c914-4cb6-bde0-14b43b2b5f27', 'contribution', 'other', '{"space":"core","contribution_id":"b1013707-5b9f-4468-8901-ca5180de522e"}');
insert into public.research_contributions (id, status, origin, intent, parent_id, graph_node_id, author_name, body)
values ('b1013707-5b9f-4468-8901-ca5180de522e', 'approved', 'els', 'חידוש', null, '925172da-c914-4cb6-bde0-14b43b2b5f27', 'חוקר', 'unrelated');
insert into public.community_tree_hints values ('ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f', array[77]);

select pg_temp.check(md5(body) = 'c5e2b1105837e8d57516b1385cca7656' and length(body) = 831, 'fixture body must equal the live body (md5/length)')
  from public.research_contributions where id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';

create temp table _pre as select
  (select md5(to_jsonb(n)::text) from public.nodes n where id = '62603405-f044-4bd2-b586-9fe6c113f774') n77,
  (select md5(to_jsonb(n)::text) from public.nodes n where id = '792eb8d4-4945-4428-8220-2503e1d74c42') p5107,
  (select md5(to_jsonb(n)::text) from public.nodes n where id = 'b1435eeb-cf3c-47c3-84aa-6e5108020da3') vid,
  (select md5(to_jsonb(o)::text) from public.research_objects o where id = 'e882519e-daac-4c62-8068-e382dde94a44') cand,
  (select md5(to_jsonb(n)::text) from public.nodes n where id = '925172da-c914-4cb6-bde0-14b43b2b5f27') other_node,
  (select count(*) from public.nodes) nodes, (select count(*) from public.edges) edges;
create temp table _snap_pre as select pg_temp.snap() s;

-- ---------------------------------------------------------------- A. negative preconditions: fail closed, zero side effects
update public.research_contributions set status = 'pending' where id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';
select pg_temp.check(pg_temp.try(:'mig') like 'ERR: contribution drift%', 'A1 pending status must be refused');
update public.research_contributions set status = 'approved', deleted_at = now() where id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';
select pg_temp.check(pg_temp.try(:'mig') like 'ERR: contribution drift%', 'A2 deleted contribution must be refused');
update public.research_contributions set deleted_at = null, thread_hidden_at = now() where id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';
select pg_temp.check(pg_temp.try(:'mig') like 'ERR: contribution drift%', 'A3 thread-hidden contribution must be refused');
update public.research_contributions set thread_hidden_at = null, body = body || ' ' where id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';
select pg_temp.check(pg_temp.try(:'mig') like 'ERR: contribution drift%', 'A4 changed body (md5) must be refused');
update public.research_contributions set body = replace(body, ' ', '') where id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';
update public.research_contributions set body = $body$בישראל נערכו בחירות לכנסת.

תוצאות רשמיות טרם פורסמו.

עם זאת, בולטת לעין מגמה נומרולוגית מאוד מעניינת.

* שיעור ההצבעה בבחירות לכנסת הגיע ל-77.7 % – הנתון הגבוה ביותר מאז שנת 1999

* הבחירות החלו בבוקר יום ט״ז (7) בחשוון והסתיימו בערב יום י״ז (7) בחשוון, ה'תשפ״ז (7).

* מכיוון שעל פי הלוח העברי היום מתחיל עם רדת החושך, הרי שגם בוקר יום ט״ז בחשוון וגם ערב יום י״ז בחשוון חלו באותו יום בלוח הלועזי ה-27 באוקטובר.

* לפני 7 ימים מלאו לנתניהו 77 שנים.

ריבוי כזה של הספרה 7 רומז על הנבואה:

רבי שמעון בן יוחאי אומר:

שבוע שבן דוד בא -

שנה ראשונה מתקיימת "והמטרתי על עיר אחת" וגו' (עמוס ד).

שניה חיצי רעב משתלחין.

שלישית רעב גדול, ומתים בו אנשים ונשים וטף,

וחסידים ואנשי מעשה מתמעטים ותורה משתכחת מלומדיה.

רביעית שובע ואינו שובע.

חמישית שובע גדול, אוכלים ושותים ושמחים.

בשישית קולות.

בשביעית מלחמות.

במוצאי שביעית בן דוד בא.$body$ where id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';
update public.nodes set is_active = false where id = '62603405-f044-4bd2-b586-9fe6c113f774';
select pg_temp.check(pg_temp.try(:'mig') like 'ERR: Number 77 target drift%', 'A5 inactive Number 77 must be refused');
update public.nodes set is_active = true, metadata = metadata || '{"space":"private"}' where id = '62603405-f044-4bd2-b586-9fe6c113f774';
select pg_temp.check(pg_temp.try(:'mig') like 'ERR: Number 77 target drift%', 'A6 non-core Number 77 must be refused');
update public.nodes set metadata = metadata - 'space' where id = '62603405-f044-4bd2-b586-9fe6c113f774';
insert into public.nodes (id, type, label, metadata) values ('00000000-0000-4000-8000-0000000000aa', 'post', 'dup 5107', '{"post_id":5107}');
select pg_temp.check(pg_temp.try(:'mig') like 'ERR: Post 5107 target drift%', 'A7 duplicate Post 5107 node must be refused');
delete from public.nodes where id = '00000000-0000-4000-8000-0000000000aa';
select pg_temp.check(pg_temp.snap() = (select s from _snap_pre), 'A8 failed runs left no side effects');

-- ---------------------------------------------------------------- B. first run
select pg_temp.check(r = 'ok', 'B1 migration must succeed: ' || r) from (select pg_temp.try(:'mig') r) t;
select pg_temp.check((select count(*) from public.nodes where type = 'contribution' and metadata->>'contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f') = 1, 'B2 exactly one contribution node');
select pg_temp.check((select graph_node_id from public.research_contributions where id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f') = (select id from public.nodes where type = 'contribution' and metadata->>'contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f'), 'B3 pointer set');
select pg_temp.check((select count(*) from public.nodes) = (select nodes from _pre) + 1, 'B4 exactly one new node in total (no duplicate 77 / 5107 / video)');
select pg_temp.check((select count(*) from public.edges) = (select edges from _pre) + 2, 'B5 exactly two new edges');
select pg_temp.check((select count(*) from public.edges e join public.nodes n on n.id = e.from_node where n.type = 'contribution' and n.metadata->>'contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f'
                       and ((e.relation_type = 'mentions' and e.to_node = '62603405-f044-4bd2-b586-9fe6c113f774') or (e.relation_type = 'related' and e.to_node = '792eb8d4-4945-4428-8220-2503e1d74c42'))) = 2, 'B6 mentions→77 and related→5107, no cross-typing');
select pg_temp.check((select count(*) from public.edges e join public.nodes n on n.id = e.from_node where n.metadata->>'contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f') = 2, 'B7 no other edges (nothing to the video node)');
select pg_temp.check((select md5(to_jsonb(n)::text) from public.nodes n where id = '62603405-f044-4bd2-b586-9fe6c113f774') = (select n77 from _pre), 'B8 Number 77 node untouched');
select pg_temp.check((select md5(to_jsonb(n)::text) from public.nodes n where id = '792eb8d4-4945-4428-8220-2503e1d74c42') = (select p5107 from _pre), 'B9 Post 5107 node untouched');
select pg_temp.check((select md5(to_jsonb(n)::text) from public.nodes n where id = 'b1435eeb-cf3c-47c3-84aa-6e5108020da3') = (select vid from _pre), 'B10 video node untouched');
select pg_temp.check((select md5(to_jsonb(o)::text) from public.research_objects o where id = 'e882519e-daac-4c62-8068-e382dde94a44') = (select cand from _pre), 'B11 research_object e882519e untouched (candidate, private, unpromoted)');
select pg_temp.check((select md5(to_jsonb(n)::text) from public.nodes n where id = '925172da-c914-4cb6-bde0-14b43b2b5f27') = (select other_node from _pre), 'B12 unrelated projected contribution untouched');
-- provenance: the two relations carry different, non-mixed bases and attributions
select pg_temp.check((select metadata->>'relation_basis' like 'source_text_states_the_number_77%' and metadata->'attribution'->>'kind' = 'text_reference'
                       and (metadata->>'family') is null from public.edges where relation_type = 'mentions' and metadata->>'via' = 'community_elections_contribution_graph_connect_v1'), 'B13 mentions edge basis/attribution');
select pg_temp.check((select metadata->>'relation_basis' like 'research_assignment_approved_by_zuriel%' and metadata->>'relation_basis' like '%not_stated_in_the_source_message'
                       and metadata->'attribution'->>'kind' = 'analyst_assignment' and metadata->'attribution'->>'decided_by' = 'ZURIEL'
                       and metadata->>'family' = 'election26_post_family' from public.edges where relation_type = 'related' and metadata->>'via' = 'community_elections_contribution_graph_connect_v1'), 'B14 related edge basis = ZURIEL research assignment, not a source statement');
select pg_temp.check((select count(*) from public.edges e join public.decision_ledger d on d.subject_ref = e.id::text and d.subject_type = 'relation'
                       where e.metadata->>'decision_ledger_id' = d.id::text and d.human_decision = 'approve' and d.status = 'executed') = 2, 'B15 ledger row + back-link per relation (intake §4)');
-- observation vs interpretation separation and curated label
select pg_temp.check((select description like 'בישראל נערכו בחירות לכנסת.%' and description like '%לנתניהו 77 שנים.' and description not like '%רומז על הנבואה%' and description not like '%בולטת לעין%'
                       and metadata->'author_interpretation'->>'text' like 'עם זאת, בולטת לעין%' and metadata->'author_interpretation'->>'text' like '%רומז על הנבואה%' and metadata->'author_interpretation'->>'text' like '%במוצאי שביעית בן דוד בא.'
                       and (metadata->'author_interpretation'->>'admitted_as_fact')::boolean = false and (metadata->'epistemic'->>'interpretation_admitted_as_fact')::boolean = false
                       and metadata->'epistemic'->>'observation_verification' = 'source_claim_not_verified'
                       from public.nodes where type = 'contribution' and metadata->>'contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f'), 'B16 observation (description) and interpretation (metadata) are separate, interpretation not admitted as fact');
select pg_temp.check((select position(replace(label, 'תצפית קהילה — ', '') in (select body from public.research_contributions where id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f')) = 0
                       and label not like 'בישראל%' and identity_key = 'research_contribution:ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f'
                       from public.nodes where type = 'contribution' and metadata->>'contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f'), 'B17 curated label (not a body slice) and stable identity_key');
select pg_temp.check((select metadata->'provenance'->>'author' = 'Jasha8' and metadata->'provenance'->>'source_message_path' = '/community/chat?thread=ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f'
                       and metadata->'provenance'->>'origin' = 'openweb' and metadata->'provenance'->>'contributed_at' is not null and metadata->>'space' = 'core'
                       and metadata->'projection_v1'->>'human_gate' = 'ZURIEL' and (metadata->'projection_v1'->>'canonicalization')::boolean = false
                       from public.nodes where type = 'contribution' and metadata->>'contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f'), 'B18 full provenance on the node');
select pg_temp.check((select count(*) from public.nodes where type in ('openweb_message','openweb_user')) = 0
                       and (select count(*) from public.edges where relation_type in ('derived_from','authored_by_external')) = 0, 'B22a import identifiers (external user id, placeholder message id) did not become public nodes/edges');
select pg_temp.check((select count(*) from public.contribution_links where from_contribution_id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f') = 2, 'B22b contribution_links restored');
-- RLS / read access: anon sees the node and both edges; admin-only data stays admin-only
set role anon;
select pg_temp.check((select count(*) from public.nodes where type = 'contribution' and metadata->>'contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f') = 1, 'B19 anon can read the contribution node');
select pg_temp.check((select count(*) from public.edges where metadata->>'source_contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f') = 2, 'B20 anon can read both edges');
select pg_temp.check(pg_temp.try('select public.project_contribution_to_graph(''ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f'')') like 'ERR:%', 'B21 anon cannot call the projector (admin only)');
select pg_temp.check(pg_temp.try('select * from public.decision_ledger') like 'ERR: permission denied%', 'B22 anon cannot read decision_ledger');
reset role;

-- ---------------------------------------------------------------- C. idempotency
create temp table _snap_after_first as select pg_temp.snap() s;
select pg_temp.check(pg_temp.try(:'mig') = 'ok', 'C1 second run succeeds');
select pg_temp.check(pg_temp.snap() = (select s from _snap_after_first), 'C2 second run changes nothing (nodes, edges, ledger, contributions byte-identical)');
select pg_temp.check(pg_temp.try(:'mig') = 'ok' and pg_temp.snap() = (select s from _snap_after_first), 'C3 third run also a no-op');

-- ---------------------------------------------------------------- D. policy: community deletion does NOT remove or hide the approved hint
update public.research_contributions set status = 'hidden', deleted_at = now(), body = null, title = null where id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';
set role anon;
select pg_temp.check((select count(*) from public.nodes where type = 'contribution' and metadata->>'contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f' and metadata->>'space' = 'core') = 1, 'D1 node stays core and readable after the community message is deleted');
select pg_temp.check((select count(*) from public.edges where metadata->>'source_contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f') = 2, 'D2 both relations stay after deletion');
select pg_temp.check((select description like 'בישראל נערכו בחירות לכנסת.%' from public.nodes where type = 'contribution' and metadata->>'contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f'), 'D3 the documented observation survives as independent research documentation');
reset role;
select pg_temp.check(pg_temp.try(:'mig') like 'ERR: contribution drift%', 'D4 a deleted source can no longer be (re)projected by this migration, and nothing is demoted by it');
update public.research_contributions set status = 'approved', deleted_at = null, body = $body$בישראל נערכו בחירות לכנסת.

תוצאות רשמיות טרם פורסמו.

עם זאת, בולטת לעין מגמה נומרולוגית מאוד מעניינת.

* שיעור ההצבעה בבחירות לכנסת הגיע ל-77.7 % – הנתון הגבוה ביותר מאז שנת 1999

* הבחירות החלו בבוקר יום ט״ז (7) בחשוון והסתיימו בערב יום י״ז (7) בחשוון, ה'תשפ״ז (7).

* מכיוון שעל פי הלוח העברי היום מתחיל עם רדת החושך, הרי שגם בוקר יום ט״ז בחשוון וגם ערב יום י״ז בחשוון חלו באותו יום בלוח הלועזי ה-27 באוקטובר.

* לפני 7 ימים מלאו לנתניהו 77 שנים.

ריבוי כזה של הספרה 7 רומז על הנבואה:

רבי שמעון בן יוחאי אומר:

שבוע שבן דוד בא -

שנה ראשונה מתקיימת "והמטרתי על עיר אחת" וגו' (עמוס ד).

שניה חיצי רעב משתלחין.

שלישית רעב גדול, ומתים בו אנשים ונשים וטף,

וחסידים ואנשי מעשה מתמעטים ותורה משתכחת מלומדיה.

רביעית שובע ואינו שובע.

חמישית שובע גדול, אוכלים ושותים ושמחים.

בשישית קולות.

בשביעית מלחמות.

במוצאי שביעית בן דוד בא.$body$, title = '' where id = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';

-- ---------------------------------------------------------------- E. rollback
select pg_temp.check(pg_temp.try(:'rb') = 'ok', 'E1 rollback succeeds');
select pg_temp.check(pg_temp.snap() = (select s from _snap_pre), 'E2 rollback restores the exact pre-migration state (nodes, edges, ledger, contributions)');
select pg_temp.check(pg_temp.try(:'rb') = 'ok' and pg_temp.snap() = (select s from _snap_pre), 'E3 rollback is idempotent');
select pg_temp.check(pg_temp.try(:'mig') = 'ok', 'E4 migration can be applied again after a rollback');
-- a foreign relation attached later blocks the rollback (fail closed)
insert into public.edges (from_node, to_node, relation_type, metadata)
  select n.id, 'b1435eeb-cf3c-47c3-84aa-6e5108020da3', 'related', '{"via":"someone_else"}' from public.nodes n where n.type = 'contribution' and n.metadata->>'contribution_id' = 'ed9fc8bb-8c71-4e4c-9b5f-a951e81d7e8f';
select pg_temp.check(pg_temp.try(:'rb') like 'ERR: rollback refused%', 'E5 rollback refuses when foreign relations were attached');

\echo PASS community_elections_graph_connect_v1 (A1-A8, B1-B22b, C1-C3, D1-D4, E1-E5)
