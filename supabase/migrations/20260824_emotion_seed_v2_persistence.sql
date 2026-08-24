-- ============================================================================
-- EMOTION SEED v2 — approved 9-term closure, additive-only
-- ============================================================================
-- Reuses Seed v1's exact mechanism: gematria_words.tags (term_type:*,
-- cross_domain:*, homograph:*) + theme_links (kind='word') into the 9
-- EXISTING Seed v1 theme nodes. No new theme nodes, no new table.
-- All 9 terms confirmed live (is_verified=true) before write.
-- ============================================================================

update gematria_words set tags =
  coalesce(tags,'{}')
  || ARRAY['emotion_seed:v2','emotion_seed_status:candidate']
  || (case phrase
       when 'רחמים' then ARRAY['term_type:emotion']
       when 'תענוג' then ARRAY['term_type:emotion']
       when 'ענג' then ARRAY['term_type:emotion']
       when 'ישועה' then ARRAY['term_type:emotion','cross_domain:geula']
       when 'סבל' then ARRAY['term_type:emotion']
       when 'יסורים' then ARRAY['term_type:emotion']
       when 'ניצחון' then ARRAY['term_type:emotion','cross_domain:sefirah']
       when 'שלום' then ARRAY['term_type:internal_state','cross_domain:geula','cross_domain:theological']
       when 'שירה' then ARRAY['term_type:expression','homograph:given_name_distinct']
       else ARRAY[]::text[]
     end)
where phrase in ('רחמים','תענוג','ענג','ישועה','סבל','יסורים','ניצחון','שלום','שירה');

insert into theme_links (theme_slug, kind, ref_id, ref_label, ref_url, source)
select 'אהבה וקִרבה', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v2'
from gematria_words gw where gw.phrase in ('רחמים')
union all
select 'שמחה וטוב', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v2'
from gematria_words gw where gw.phrase in ('תענוג','ענג','ישועה','ניצחון','שירה')
union all
select 'עצב וכאב', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v2'
from gematria_words gw where gw.phrase in ('סבל','יסורים')
union all
select 'רוגע וביטחון', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v2'
from gematria_words gw where gw.phrase in ('שלום');

-- Self-check:
--   select count(*) from gematria_words where 'emotion_seed:v2'=any(tags);  -- expect 9
--   select count(*) from theme_links where source='emotion_seed_v2';        -- expect 9
