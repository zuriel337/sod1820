-- COMPOSITE ACTIVATION — step 2c: governed coverage pass for רגיל+משולש
-- Mirrors bidim_sync()'s exact write contract: value via fn_method_value, identity via
-- fn_bidim_id(word_id, method, version, operator), priority 4, one shared engine_run_id.
-- Because CA-1 already re-keyed the 12,592 historical rows to this SAME canonical identity,
-- ON CONFLICT (bid_id) MATCHES them and UPGRADES them IN PLACE from 'legacy_verified' to
-- 'governed'. They are NOT duplicated. Newly arrived verified corpus rows are inserted.
with run as (select gen_random_uuid() as rid),
calc as (
  select gw.id as word_id, gw.phrase, gw.category, gw.is_verified,
         gm.method_key, gm.version, gm.operator, gm.dependency_versions,
         public.fn_method_value(gm.method_key, gw.phrase) as v
  from public.gematria_words gw
  cross join public.gematria_methods gm
  where gm.method_key = 'רגיל+משולש'
    and gw.is_verified
)
insert into public.bidim (word_id, phrase, method, value, priority, category, is_verified,
                          bid_id, method_version, operator, dependency_version_snapshot,
                          computed_at, engine_run_id, provenance_state)
select c.word_id, c.phrase, c.method_key, c.v, 4, c.category, c.is_verified,
       public.fn_bidim_id(c.word_id, c.method_key, c.version, c.operator),
       c.version, c.operator, c.dependency_versions,
       now(), (select rid from run), 'governed'
from calc c
where c.v is not null
on conflict (bid_id) do update set
  value                       = excluded.value,
  phrase                      = excluded.phrase,
  is_verified                 = excluded.is_verified,
  category                    = excluded.category,
  priority                    = excluded.priority,
  method_version              = excluded.method_version,
  operator                    = excluded.operator,
  dependency_version_snapshot = excluded.dependency_version_snapshot,
  computed_at                 = excluded.computed_at,
  engine_run_id               = excluded.engine_run_id,
  provenance_state            = 'governed';
