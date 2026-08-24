-- ============================================================================
-- EMOTION RESEARCH SEED v1 — SAFE ADDITIVE PERSISTENCE
-- ============================================================================
-- Smallest additive write for the 8 Zuriel/GPT decisions in this task.
-- Mechanism verified LIVE (not inferred from docs): nodes type='theme' exists
-- (1 precedent row: שבת, pilot 5.8.2026) but the ACTUAL live cross-content
-- theme mechanism is theme_links (deployed, RLS-configured, /theme/:slug page
-- live on main) — NOT edges (edges has zero live precedent for theme
-- membership; the שבת node has 0 edges). Using theme_links is the correct
-- "existing schema", not a new table, and not a deviation from "no parallel
-- taxonomy" — it IS the taxonomy mechanism already chosen and shipped.
--
-- Scope: only the 52/90 approved terms that already exist as live
-- gematria_words rows get any persistence. The other 38 (37 seed gaps + this
-- reconciliation) remain CANDIDATE-ONLY, no row created — per "no gematria
-- backfill yet". No gematria_words row's is_verified/category/world/source/
-- dna_status is touched. tags is append-only (coalesce+concat), nothing
-- removed. No new table, no new node type value beyond the one already-live
-- 'theme', no Premium/UI/rescan.
-- ============================================================================

-- 1) 9 candidate theme nodes (family groupings) — none exist yet (checked:
--    only 'שבת' exists under type='theme' live).
insert into nodes (type, label, description, metadata, is_active) values
('theme', 'אהבה וקִרבה',   'Emotion Research Seed v1 — משפחת נושא מועמדת (candidate). לא קנוני, ממתין לאישור מבני נוסף.', '{"slug":"אהבה וקִרבה","domain":"emotion_research_v1","status":"candidate"}'::jsonb, true),
('theme', 'שמחה וטוב',     'Emotion Research Seed v1 — משפחת נושא מועמדת (candidate).', '{"slug":"שמחה וטוב","domain":"emotion_research_v1","status":"candidate"}'::jsonb, true),
('theme', 'עצב וכאב',      'Emotion Research Seed v1 — משפחת נושא מועמדת (candidate).', '{"slug":"עצב וכאב","domain":"emotion_research_v1","status":"candidate"}'::jsonb, true),
('theme', 'פחד וחרדה',     'Emotion Research Seed v1 — משפחת נושא מועמדת (candidate).', '{"slug":"פחד וחרדה","domain":"emotion_research_v1","status":"candidate"}'::jsonb, true),
('theme', 'כעס ועימות',    'Emotion Research Seed v1 — משפחת נושא מועמדת (candidate).', '{"slug":"כעס ועימות","domain":"emotion_research_v1","status":"candidate"}'::jsonb, true),
('theme', 'פרידה ואובדן',  'Emotion Research Seed v1 — משפחת נושא מועמדת (candidate).', '{"slug":"פרידה ואובדן","domain":"emotion_research_v1","status":"candidate"}'::jsonb, true),
('theme', 'רוגע וביטחון',  'Emotion Research Seed v1 — משפחת נושא מועמדת (candidate).', '{"slug":"רוגע וביטחון","domain":"emotion_research_v1","status":"candidate"}'::jsonb, true),
('theme', 'רגשות פנימיים', 'Emotion Research Seed v1 — משפחת נושא מועמדת (candidate).', '{"slug":"רגשות פנימיים","domain":"emotion_research_v1","status":"candidate"}'::jsonb, true),
('theme', 'קשר בין-אישי',  'Emotion Research Seed v1 — משפחת נושא מועמדת (candidate).', '{"slug":"קשר בין-אישי","domain":"emotion_research_v1","status":"candidate"}'::jsonb, true);

-- 2) theme_links: word -> family, only for terms that already exist live.
--    קבלה legitimately appears under two families (Family 7 + Family 9) —
--    two distinct rows, same ref_id, different theme_slug — satisfies the
--    unique(theme_slug,kind,ref_id) constraint and preserves multi-family
--    membership exactly as approved (decision 1).
insert into theme_links (theme_slug, kind, ref_id, ref_label, ref_url, source)
select 'אהבה וקִרבה', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1'
from gematria_words gw where gw.phrase in ('אהבה','חיבה','געגוע','חמלה','תשוקה','חסד')
union all
select 'שמחה וטוב', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1'
from gematria_words gw where gw.phrase in ('שמחה','נחת','סיפוק','תקווה','גיל','הכרת תודה','חן')
union all
select 'עצב וכאב', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1'
from gematria_words gw where gw.phrase in ('עצב','צער','כאב','יגון','בכי','דמעה','אבל','חרטה')
union all
select 'פחד וחרדה', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1'
from gematria_words gw where gw.phrase in ('פחד','יראה','חרדה','דאגה','חשש','בהלה','אימה','לחץ')
union all
select 'כעס ועימות', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1'
from gematria_words gw where gw.phrase in ('כעס','זעם','שנאה','קנאה','נקמה','טינה')
union all
select 'פרידה ואובדן', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1'
from gematria_words gw where gw.phrase in ('פרידה','חסר','שכול')
union all
select 'רוגע וביטחון', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1'
from gematria_words gw where gw.phrase in ('ביטחון','אמונה','נחמה','מנוחה','קבלה')
union all
select 'רגשות פנימיים', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1'
from gematria_words gw where gw.phrase in ('בושה','אשמה','גאווה','בלבול','ספק')
union all
select 'קשר בין-אישי', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1'
from gematria_words gw where gw.phrase in ('סליחה','נתינה','קבלה','בגידה','פיוס');

-- 3) term_type tags — additive append, never overwrite existing tags.
update gematria_words set tags = coalesce(tags,'{}') || ARRAY['term_type:emotion','emotion_seed:v1','emotion_seed_status:candidate']
where phrase in ('אבל','אהבה','אימה','אמונה','אשמה','בהלה','בושה','גאווה','גיל','געגוע','זעם','חיבה','חמלה','חסד','חרטה','טינה','יגון','יראה','כאב','כעס','נחת','עצב','פחד','פרידה','צער','קנאה','שכול','שמחה','שנאה','תקווה','תשוקה');

update gematria_words set tags = coalesce(tags,'{}') || ARRAY['term_type:internal_state','emotion_seed:v1','emotion_seed_status:candidate']
where phrase in ('ביטחון','בלבול','דאגה','הכרת תודה','חן','חסר','חרדה','חשש','לחץ','מנוחה','נחמה','סיפוק','ספק','קבלה');

update gematria_words set tags = coalesce(tags,'{}') || ARRAY['term_type:relation_state','emotion_seed:v1','emotion_seed_status:candidate']
where phrase in ('בגידה');

update gematria_words set tags = coalesce(tags,'{}') || ARRAY['term_type:expression','emotion_seed:v1','emotion_seed_status:candidate']
where phrase in ('בכי','דמעה');

update gematria_words set tags = coalesce(tags,'{}') || ARRAY['term_type:action','emotion_seed:v1','emotion_seed_status:candidate']
where phrase in ('נקמה','נתינה','סליחה','פיוס');

-- 4) cross-domain / homograph flags — additive, on top of term_type tags above.
update gematria_words set tags = coalesce(tags,'{}') || ARRAY['cross_domain:theological']
where phrase in ('אמונה','יראה','נחמה','ביטחון');

update gematria_words set tags = coalesce(tags,'{}') || ARRAY['cross_domain:halachic']
where phrase in ('ספק');

update gematria_words set tags = coalesce(tags,'{}') || ARRAY['homograph:kabbalah_sense_distinct']
where phrase in ('קבלה');

-- ============================================================================
-- Self-check (read-only, run manually after applying):
--   select count(*) from nodes where type='theme' and metadata->>'domain'='emotion_research_v1';  -- expect 9
--   select theme_slug, count(*) from theme_links where source='emotion_seed_v1' group by theme_slug order by 1;  -- expect 9 rows, sums to 53
--   select count(*) from gematria_words where 'emotion_seed:v1' = any(tags);  -- expect 52
-- ============================================================================
