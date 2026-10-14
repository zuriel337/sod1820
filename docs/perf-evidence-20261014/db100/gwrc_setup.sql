-- Synthetic isolated copy (NOT live data) of gematria_words and research_contributions with the LIVE column types and the Home-relevant LIVE indexes.
-- :S = scale (1 = live row counts: gw 15,591; rc 41,477). Distribution from live stats: 81% verified/published, 0.1% encrypted, 13% tagged,
-- ragil domain ~2,100 distinct per 15.6K rows (domain grows with S^0.5), rc 62% approved, created 2023..now, 3 rows in the last 7 days per x1 (so x100 -> 300).
drop table if exists gematria_words cascade; drop table if exists research_contributions cascade;
create table gematria_words (
 id uuid primary key default gen_random_uuid(), phrase text, phrase_encrypted text, phrase_hint text, is_encrypted boolean, ragil integer, misratar integer,
 other_value integer, other_method text, category text, notes text, source text, created_by uuid, created_at timestamptz, updated_at timestamptz,
 gadol integer, siduri integer, miluy integer, kadmi integer, atbash integer, albam integer, all_values int8[], scale_level integer, node_id uuid,
 is_verified boolean, unverified_reason text, miluy_demiluy bigint, source_wp_ids int4[], dna_status text, ribua bigint, ribua_gadol bigint,
 space text not null default 'core', visibility_tier smallint not null default 0, visibility_changed_at timestamptz, visibility_reason text,
 tier_ragil smallint not null default 0, tier_misratar smallint not null default 0, tier_kadmi smallint not null default 0, tier_miluy smallint not null default 0,
 essence_method text not null default 'ragil', essence_locked boolean not null default false, tags text[], kadmi_gadol bigint, hakpala bigint, hakpala_gadol bigint,
 vip_source text, lead_rank smallint, world text, is_published boolean not null default false);
insert into gematria_words (phrase, is_encrypted, ragil, misratar, gadol, kadmi, created_at, visibility_changed_at, is_verified, tags, is_published, source, all_values, notes)
select 'ביטוי '||g, (random()<0.001), 1 + floor(power(random(),1.6) * 2100 * sqrt(:S))::int, floor(random()*5000)::int, floor(random()*9000)::int, floor(random()*3000)::int,
  case when g <= 2*:S then now() - (random()*7||' days')::interval else timestamptz '2026-06-05' + random()*(now()-interval '7 days' - timestamptz '2026-06-05') end,
  case when random()<0.3 then now() - (random()*60||' days')::interval end,
  (random()<0.81), case when random()<0.13 then array['messianic_status:raw_unattributed_candidate:1234','messianic_family:text_claim:1243'] || case when random()<0.0003 then array['אוצרות הגילוי'] else array[]::text[] end end,
  (random()<0.81), 'src', array[floor(random()*5000)::bigint, floor(random()*5000)::bigint], repeat('x', 40)
from generate_series(1, 15591*:S) g;
create index idx_gw_ragil on gematria_words (ragil) where is_verified;
create index gematria_words_ragil_phrase_idx on gematria_words (ragil, phrase);
create index idx_gematria_encrypted on gematria_words (is_encrypted);
create index idx_gw_visibility on gematria_words (visibility_tier);
create index idx_gw_phrase_indexable on gematria_words (phrase) where (coalesce(is_verified,false) and coalesce(is_published,false) and (coalesce(visibility_tier::int,0) >= 1) and (nullif(btrim(phrase),'') is not null));
create index idx_gw_wpids on gematria_words using gin (source_wp_ids);
create table research_contributions (
 id uuid primary key default gen_random_uuid(), author_user_id uuid, author_contributor_id uuid, author_name text, intent text not null default 'finding', origin text not null default 'site',
 research_state text not null default 'open', status text not null, target_type text, target_id text, parent_id uuid, title text, body text, gematria_claim jsonb, projected_insight_id uuid,
 reactions jsonb not null default '{}', created_at timestamptz not null, updated_at timestamptz not null default now(), graph_node_id uuid, pinned_at timestamptz, last_activity_at timestamptz,
 image_url text, is_featured boolean not null default false, convergence_slug text, is_answer boolean, reaction_boosts jsonb not null default '{}', media jsonb not null default '[]');
create temp table contrib as select gen_random_uuid() id from generate_series(1, 2300 * greatest(1, :S/10));
create temp table contrib_arr as select array_agg(id) a from contrib;
insert into research_contributions (status, target_type, target_id, author_contributor_id, author_name, title, created_at, convergence_slug, gematria_claim, body)
select (array['approved','approved','approved','hidden','hidden','pending'])[1+floor(random()*6)::int],
  (array['number','number','phrase','els','home','insight'])[1+floor(random()*6)::int], (floor(power(random(),2)*149))::int::text,
  (select a[1 + floor(random()*cardinality(a))::int] from contrib_arr),
  'כותב '||(g%2300), 'כותרת '||g,
  case when g <= 3*:S then now() - (random()*7||' days')::interval else timestamptz '2023-01-01' + random()*(now()-interval '7 days' - timestamptz '2023-01-01') end,
  case when random()<0.0001 then 'conv-'||g end, jsonb_build_object('value', floor(random()*5000)::int), repeat('b', 60)
from generate_series(1, 41477*:S) g;
update research_contributions set status='approved' where id in (select id from research_contributions where convergence_slug is not null);
create index rc_author_idx on research_contributions (author_user_id);
create index rc_facets_idx on research_contributions (origin, intent, research_state, status);
create index rc_parent_idx on research_contributions (parent_id);
create index rc_status_idx on research_contributions (status, created_at desc);
create index rc_target_idx on research_contributions (target_type, target_id, created_at desc);
vacuum analyze gematria_words; vacuum analyze research_contributions;
