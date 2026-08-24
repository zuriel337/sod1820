-- ============================================================================
-- EMOTION SEED — 37 previously-approved missing terms, corpus admission
-- ============================================================================
-- Zuriel Human-Gate: APPROVED (explicit, this task). This is vocabulary
-- admission only — NOT approval of any future gematria match, convergence,
-- interpretation, or canonical finding on these words.
--
-- is_verified=true determination (verified from live docs/schema, not
-- assumed): CORPUS_APPROVAL_LIFECYCLE.md §1 states as a "confirmed FACT"
-- that gematria_words.is_verified tracks PUBLISH-WORTHINESS (the load-
-- bearing publish gate), NOT per-claim engine verification (that's
-- research_objects.engine_verified, a separate axis, untouched here).
-- Confirmed live via trg_gw_enforce_engine that calculation itself never
-- depends on is_verified. Confirmed live via trg_bidim_sync's own body
-- that it ONLY populates bidim `IF NEW.is_verified` — since this task's
-- own Phase 3 explicitly requires "index through the existing bidim
-- mechanism", is_verified=false would silently defeat that requirement
-- via the existing trigger gate. is_verified=true is therefore both the
-- semantically correct AND functionally necessary value here.
-- ============================================================================

insert into gematria_words (phrase, source, is_verified, notes, tags) values
('אושר','emotion_seed_v1_admission',true,'Emotion Seed v1 — Zuriel Human-Gate approved admission (corpus vocabulary only, not a finding).', ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:emotion']),
('רוגז','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:emotion']),
('שלווה','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:internal_state']),
('רוגע','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:internal_state']),
('יציבות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:internal_state']),
('אמון','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:relation_state']),
('הקרבה','emotion_seed_v1_admission',true,'Homograph risk: distinct from Temple-sacrifice/קרבן vocabulary.', ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:action','homograph:temple_sacrifice_distinct']),
('נטישה','emotion_seed_v1_admission',true,'Dual reading (act of abandoning vs. experience of being abandoned) — primary term_type=action, relation_state noted as secondary, not split into two rows per Zuriel decision.', ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:action','term_type_secondary:relation_state']),
('דחייה','emotion_seed_v1_admission',true,'Dual reading (act of rejecting vs. experience of rejection) — primary term_type=action, relation_state noted as secondary, not split into two rows per Zuriel decision.', ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:action','term_type_secondary:relation_state']),
('ריקנות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:internal_state']),
('תלות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:relation_state']),
('שייכות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:relation_state']),
('בדידות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:internal_state']),
('אובדן','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:emotion']),
('ניתוק','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:relation_state']),
('ריחוק','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:relation_state']),
('שברון לב','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:emotion']),
('מבוכה','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:emotion']),
('מועקה','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:internal_state']),
('עוינות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:relation_state']),
('תסכול','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:emotion']),
('עידוד','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:action']),
('התלהבות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:emotion']),
('חיוביות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:internal_state']),
('קִרבה','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:relation_state']),
('רוך','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:internal_state']),
('ערגה','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:emotion']),
('מרירות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:emotion']),
('ייאוש','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:emotion']),
('יתמות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:relation_state']),
('עלבון','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:emotion']),
('ודאות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:internal_state']),
('ניכור','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:relation_state']),
('אדישות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:internal_state']),
('חוסר אונים','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:internal_state']),
('נאמנות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:relation_state']),
('ערבות','emotion_seed_v1_admission',true,null, ARRAY['emotion_seed:v1','emotion_seed_status:candidate','term_type:relation_state']);

insert into theme_links (theme_slug, kind, ref_id, ref_label, ref_url, source)
select 'אהבה וקִרבה', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1_admission'
from gematria_words gw where gw.source='emotion_seed_v1_admission' and gw.phrase in ('קִרבה','רוך','ערגה')
union all
select 'שמחה וטוב', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1_admission'
from gematria_words gw where gw.source='emotion_seed_v1_admission' and gw.phrase in ('אושר','עידוד','התלהבות','חיוביות')
union all
select 'כעס ועימות', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1_admission'
from gematria_words gw where gw.source='emotion_seed_v1_admission' and gw.phrase in ('רוגז','עוינות','תסכול','מרירות','עלבון')
union all
select 'פרידה ואובדן', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1_admission'
from gematria_words gw where gw.source='emotion_seed_v1_admission' and gw.phrase in ('נטישה','בדידות','אובדן','ניתוק','ריחוק','שברון לב','יתמות')
union all
select 'רוגע וביטחון', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1_admission'
from gematria_words gw where gw.source='emotion_seed_v1_admission' and gw.phrase in ('שלווה','רוגע','יציבות','ודאות')
union all
select 'רגשות פנימיים', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1_admission'
from gematria_words gw where gw.source='emotion_seed_v1_admission' and gw.phrase in ('ריקנות','מבוכה','ניכור','אדישות','חוסר אונים')
union all
select 'עצב וכאב', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1_admission'
from gematria_words gw where gw.source='emotion_seed_v1_admission' and gw.phrase in ('מועקה','ייאוש')
union all
select 'קשר בין-אישי', 'word', gw.id::text, gw.phrase, '/beit-midrash?w=' || gw.phrase, 'emotion_seed_v1_admission'
from gematria_words gw where gw.source='emotion_seed_v1_admission' and gw.phrase in ('אמון','הקרבה','דחייה','תלות','שייכות','נאמנות','ערבות');

-- ============================================================================
-- Backfill the 7 methods NOT covered by trg_bidim_sync (which only handles
-- 14 legacy methods) into bidim, for the FULL 98-term Emotion Seed universe
-- (61 existing v1/v2 + 37 newly admitted). Only APPROVED+ACTIVE+UNDISPUTED
-- methods per live gematria_methods registry, excluding אטבח (disputed).
-- ============================================================================
do $$
declare
  p record; m record; v numeric;
begin
  for p in
    select id, phrase, category from gematria_words
    where is_verified=true and ('emotion_seed:v1'=any(tags) or 'emotion_seed:v2'=any(tags))
  loop
    for m in
      select method_key, "function" from gematria_methods
      where active=true and "function" is not null and category<>'composite'
        and method_key in ('אותיות אחרי','אותיות לפני','מסתתר גדול','מילוי דמילוי גדול','משולש מילה','משולש הפוך','משולש מדרגות')
    loop
      begin
        execute format('select %I($1)', m."function") into v using p.phrase;
        if v is not null then
          insert into bidim (word_id, phrase, method, value, priority, category, is_verified, bid_id)
          values (p.id, p.phrase, m.method_key, v, 4, p.category, true, md5(p.id::text||':'||m.method_key))
          on conflict (bid_id) do nothing;
        end if;
      exception when others then
        null;
      end;
    end loop;
  end loop;
end $$;

-- Self-check:
--   select count(*) from gematria_words where source='emotion_seed_v1_admission';  -- expect 37
--   select count(*) from theme_links where source='emotion_seed_v1_admission';      -- expect 37
--   select count(distinct method) from bidim where word_id in
--     (select id from gematria_words where 'emotion_seed:v1'=any(tags) or 'emotion_seed:v2'=any(tags));  -- expect 21
