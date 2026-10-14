create table gematria_words (id uuid primary key default gen_random_uuid(), source text, vip_source text, is_verified boolean, dna_status text, node_id uuid, category text, tags text[], is_published boolean not null default false);
insert into gematria_words (source, is_verified, is_published, category) select 'src', random()<0.9, random()<0.9, 'c' from generate_series(1, 300000);
create table bidim (word_id uuid, phrase text, method text, value int8, priority int4, category text, is_verified bool, bid_id text, method_version int4, operator text, dependency_version_snapshot jsonb,
  computed_at timestamptz, engine_run_id uuid, provenance_state text, verified_at timestamptz, verified_run_id uuid, verified_method_version int4, verified_mismatch_value int8);
create temp table wids as select array_agg(id) a from (select id from gematria_words where is_verified and is_published limit 250000) s;
create temp table mk as select array_agg(method_key order by method_key) a from (select method_key from gematria_methods where execution_kind <> 'unimplemented' limit 29) s;
-- background: 368,153 rows / 28,769 distinct values (avg 13)
insert into bidim (word_id, phrase, method, value, bid_id, provenance_state, computed_at, method_version)
select (select a[1+floor(random()*cardinality(a))::int] from wids), 'ביטוי '||g, (select a[1+floor(random()*cardinality(a))::int] from mk), 1+floor(power(random(),1.5)*28769)::int, 'b'||g, 'ok', now(), 1 from generate_series(1, 368153) g;
-- test values with N rows (x1 = value 787: 106 rows; x10; x100; max-per-value x100)
insert into bidim (word_id, phrase, method, value, bid_id, provenance_state, computed_at, method_version)
select (select a[1+floor(random()*cardinality(a))::int] from wids), 'מילה '||v||'-'||g, (select a[1+floor(random()*cardinality(a))::int] from mk), v, 'v'||v||'-'||g, 'ok', now(), 1
from (values (787,106),(7871,1060),(7872,10600),(7873,49800)) t(v,n), generate_series(1, 1000000) g where g <= n;
create unique index bidim_bid_id_uidx on bidim (bid_id); create index bidim_method_value on bidim (method, value); create index bidim_phrase_idx on bidim (phrase); create index bidim_value_idx on bidim (value);
analyze bidim; analyze gematria_words;
