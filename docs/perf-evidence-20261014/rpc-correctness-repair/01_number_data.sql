-- Corrected synthetic generator (row-dependent, seeded by hash; reproducible; NO noncorrelated subquery => no InitPlan collapse).
-- Usage: psql -v scale=1 -f 01_number_data.sql   (scale 1|10|100 multiplies the per-value hit count of the 787 shape)
\set ON_ERROR_STOP on
drop table if exists bidim cascade; drop table if exists gematria_words cascade; drop table if exists lab_mk cascade;
create table gematria_words (id uuid primary key, source text, vip_source text, is_verified boolean, dna_status text, node_id uuid, category text, tags text[],
  is_published boolean, is_encrypted boolean);
create table bidim (word_id uuid, phrase text, method text, value int8, priority int4, category text, is_verified bool, bid_id text, method_version int4, operator text,
  dependency_version_snapshot jsonb, computed_at timestamptz, engine_run_id uuid, provenance_state text, verified_at timestamptz, verified_run_id uuid,
  verified_method_version int4, verified_mismatch_value int8);
-- method pool: every registry key (incl. unimplemented/composite/context) + unknown keys + NULL, weights by position (skewed)
create table lab_mk as select row_number() over (order by k nulls first) - 1 as i, k from (select method_key k from gematria_methods union all select 'לא_רשום_'||g from generate_series(1,2) g union all select null) s;
-- words: deterministic ids; mix of verified/published/encrypted/NULL flags (NULL is_published and NULL is_encrypted occur)
insert into gematria_words (id, source, vip_source, is_verified, dna_status, node_id, category, tags, is_published, is_encrypted)
select md5('w'||g)::uuid, 'src'||(g%7), case when g%11=0 then 'vip' end, (g%10)<>0, case when g%13=0 then 'x' end, case when g%17=0 then md5('n'||g)::uuid end, 'c',
       case when g%19=0 then null else array['t'||(g%5)] end,
       case when g%23=0 then null else (g%9)<>0 end, case when g%29=0 then null else (g%31=0) end
from generate_series(1, 20000) g;
-- background: 368,153 rows / ~28,769 distinct values (shape from live)
insert into bidim (word_id, phrase, method, value, bid_id, provenance_state, computed_at, method_version)
select md5('w'||(1+(abs(hashtext('w'||g))%20000)))::uuid,
       case when g%997=0 then null else 'ביטוי '||(abs(hashtext('p'||g))%5000) end,        -- repeated phrases => tied sort keys; some NULL phrase
       (select k from lab_mk where i = floor(power((abs(hashtext('m'||g))%100000)/100000.0, 2) * (select count(*) from lab_mk))::int),
       1+floor(power((abs(hashtext('v'||g))%100000)/100000.0,1.5)*28769)::int, 'b'||g, 'ok', now(), 1
from generate_series(1, 368153) g;
-- test values: 787 x1 (106 rows), 7871 x10, 7872 x100 (same generator, same seed, per-row hash independent of scale)
insert into bidim (word_id, phrase, method, value, bid_id, provenance_state, computed_at, method_version)
select md5('w'||(1+(abs(hashtext('tw'||v||'-'||g))%20000)))::uuid,
       case when g%53=0 then null else 'מילה '||(abs(hashtext('tp'||v||'-'||g))%(20+n/10)) end,
       (select k from lab_mk where i = floor(power((abs(hashtext('tm'||v||'-'||g))%100000)/100000.0, 1.3) * (select count(*) from lab_mk))::int),
       v, 'v'||v||'-'||g, 'ok', now(), 1
from (values (787,106),(7871,1060),(7872,10600)) t(v,n), generate_series(1, 20000) g where g <= n and (:scale::int >= case v when 787 then 1 when 7871 then 10 else 100 end);
create unique index bidim_bid_id_uidx on bidim (bid_id); create index bidim_method_value on bidim (method, value); create index bidim_value_idx on bidim (value);
analyze bidim; analyze gematria_words;
-- ASSERT distribution BEFORE any timing (fails the run if the generator collapses like the d34 InitPlan generator did)
do $$ declare dm int; nn int; unk int; begin
  select count(distinct method), count(*) filter (where method is null), count(*) filter (where method like 'לא_רשום_%') into dm, nn, unk from bidim;
  if dm < 20 or nn = 0 or unk = 0 then raise exception 'generator collapsed: distinct methods=%, null=%, unknown=%', dm, nn, unk; end if;
  raise notice 'generator OK: distinct methods=% null-method rows=% unknown-method rows=%', dm, nn, unk; end $$;
