-- ============================================================================
-- MESSIANIC SEMANTIC MODEL v1 — APPROVED PERSISTENCE PASS
-- ============================================================================
-- Zuriel Human-Gate: 1=A (speaker attribution -> research_objects.meta),
-- 2=A (messianic families -> additive gematria_words.tags, no new theme
-- nodes), 3=A-corrected (RAW_UNATTRIBUTED gets candidate family/relation
-- classification via disclosed pattern-method + confidence, never blind
-- keyword, never speaker inference), 4=A (scriptural-context match ->
-- candidate GOD/PROPHET speaker attribution, attribution_method=
-- SCRIPTURAL_CONTEXT, still candidate not canonical).
--
-- All writes additive. No DELETE of any pre-existing row/tag. No overwrite
-- of existing tags. No new table. No new theme nodes (confirmed: 0 nodes
-- type='theme' created by this migration). No gematria recomputation.
--
-- NOTE on apply history: the live database was reached via three separate
-- apply_migration calls (Pass 1 / Pass 2 / Pass 3, run consecutively after
-- an initial combined attempt timed out client-side with a clean rollback).
-- Two of those three calls were independently observed to have executed
-- server-side twice each (a tool-reliability issue, not a logic bug) —
-- this produced duplicate tag values within affected rows' tags arrays and
-- 3 duplicate research_objects rows. Both were detected by this task's own
-- validation pass and corrected immediately (tags de-duplicated via
-- `array(select distinct unnest(tags))`, the 3 duplicate research_objects
-- rows deleted by exact id — the 3 that were NOT duplicates were preserved
-- untouched). This file reflects the final, de-duplicated, verified-live
-- state — not a literal replay of the double-executed calls.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASS 1 — CURATED CORE (51 node-linked messianic/geula entities)
-- messianic_relation:explicit applies to all (unambiguous naming by
-- definition of being in this curated set). messianic_family additive,
-- multi-valued where the phrase genuinely spans families.
-- ----------------------------------------------------------------------------

update gematria_words set tags =
  coalesce(tags,'{}')
  || ARRAY['messianic_relation:explicit','messianic_model:v1','messianic_status:curated_explicit']
  || (case when phrase in (
       'אני המשיח','ביאת הגואל','ביאת המשיח','גואל','גואל אחרון','גואל ישראל','דויד בן ישי משיח הויה','התגלות משיח',
       'מלך הגאולה','מלך המשיח','מלך המשיח יבוא בהיסח הדעת בכט אלול','משיח','משיח בא עני ורכב על חמר',
       'משיח בן דוד','משיח בן דוד האמיתי','משיח בן יוסף','משיח צדקנו','משיחו נבחרו','משיחינו','שופר של משיח',
       'צמח דוד מצפה לשכינה הקדושה'
     ) then ARRAY['messianic_family:identity'] else ARRAY[]::text[] end)
  || (case when phrase in ('בניין בית המקדש','בניין ירושלים') then ARRAY['messianic_family:action'] else ARRAY[]::text[] end)
  || (case when phrase in (
       'אור הגאולה','אתחלתא דגאולה','ביאת הגואל','ביאת המשיח','בשורת הגאולה','גאולה','גאולה שלמה','הגאולה השלמה',
       'התגלות משיח','התחלת הגאולה','זמן הגאולה','חבלי משיח','יום הגאולה','ישועה','סוד הגאולה','קיבוץ גלויות',
       'שיבת ציון','תחיית המתים','תיקון השכינה'
     ) then ARRAY['messianic_family:event'] else ARRAY[]::text[] end)
  || (case when phrase in (
       'בית המקדש','בית המקדש השלישי','בניין בית המקדש','בניין ירושלים','ירושלים','מצפה לשכינה','מקדש','ציון',
       'צמח דוד מצפה לשכינה הקדושה','שיבת ציון','שכינה','תיקון השכינה'
     ) then ARRAY['messianic_family:place'] else ARRAY[]::text[] end)
  || (case when phrase in (
       'אתחלתא דגאולה','בית המקדש השלישי','התחלת הגאולה','זמן הגאולה','חבלי משיח','יום הגאולה','ימות המשיח',
       'מלך המשיח יבוא בהיסח הדעת בכט אלול'
     ) then ARRAY['messianic_family:time'] else ARRAY[]::text[] end)
  || (case when phrase in ('מלך הגאולה','מלך המשיח','מלך המשיח יבוא בהיסח הדעת בכט אלול') then ARRAY['messianic_family:kingship'] else ARRAY[]::text[] end)
  || (case when phrase in (
       'אור הגאולה','ישועה','מצפה לשכינה','צמח דוד מצפה לשכינה הקדושה','שופר של משיח','תקוות משיח'
     ) then ARRAY['messianic_family:attribute'] else ARRAY[]::text[] end)
  || (case when phrase in (
       'אני המשיח','בשורת הגאולה','מלך המשיח יבוא בהיסח הדעת בכט אלול','מסרים של המשיח','משיח בא עני ורכב על חמר',
       'סוד הגאולה','תדר משיח בי','תוכנת משיח','תקוות משיח'
     ) then ARRAY['messianic_family:text_claim'] else ARRAY[]::text[] end)
where node_id is not null and phrase in (
 'אור הגאולה','אני המשיח','אתחלתא דגאולה','ביאת הגואל','ביאת המשיח','בית המקדש','בית המקדש השלישי',
 'בניין בית המקדש','בניין ירושלים','בשורת הגאולה','גאולה','גאולה שלמה','גואל','גואל אחרון','גואל ישראל',
 'דויד בן ישי משיח הויה','הגאולה השלמה','התגלות משיח','התחלת הגאולה','זמן הגאולה','חבלי משיח','יום הגאולה',
 'ימות המשיח','ירושלים','ישועה','מלך הגאולה','מלך המשיח','מלך המשיח יבוא בהיסח הדעת בכט אלול',
 'מסרים של המשיח','מצפה לשכינה','מקדש','משיח','משיח בא עני ורכב על חמר','משיח בן דוד','משיח בן דוד האמיתי',
 'משיח בן יוסף','משיח צדקנו','משיחו נבחרו','משיחינו','סוד הגאולה','ציון','צמח דוד מצפה לשכינה הקדושה',
 'קיבוץ גלויות','שופר של משיח','שיבת ציון','שכינה','תדר משיח בי','תוכנת משיח','תחיית המתים','תיקון השכינה',
 'תקוות משיח'
);

-- ----------------------------------------------------------------------------
-- PASS 2 — SPEAKER ATTRIBUTION (research_objects, Gate 1 + Gate 4)
-- REVERIFIED live before write: "אבוא ואגאלכם" does not exist verbatim —
-- the live row is "אבוא ואגאלכם 260 111 380 671" (id fb25b467). Using the
-- true live phrase, not the assumed clean form.
-- ----------------------------------------------------------------------------

insert into research_objects (kind, statement, terms, value, relates, source, source_ref, contributor, confidence, status, evidence, meta, privacy_scope)
values (
  'hypothesis',
  'Speaker of the phrase "אקים סכת דוד" is hypothesized to be GOD (prophetic first-person), based on a construction match to Amos 9:11 ("ביום ההוא אקים את סכת דויד הנפלת"). Not an exact quote (missing את/הנפלת) — a partial/thematic echo, not verbatim.',
  ARRAY['אקים סכת דוד'], 645, ARRAY['d30b2cec-23a1-4bad-921a-c1e47cb594f9'],
  'ai:messianic_model_v1', 'Amos 9:11', null, 55, 'candidate',
  'Textual construction match to Amos 9:11; not a direct quote (verse reads "אקים את סכת דויד הנפלת").',
  jsonb_build_object(
    'speaker_type','GOD','speaker_name',null,'attribution_method','SCRIPTURAL_CONTEXT',
    'messianic_relation','EXPLICIT','verification_state','candidate_unverified',
    'phrase_id','d30b2cec-23a1-4bad-921a-c1e47cb594f9','model_version','messianic_model_v1'
  ),
  'public_candidate'
),
(
  'hypothesis',
  'Speaker of the phrase "אבוא ואגאלכם 260 111 380 671" is hypothesized to be GOD (prophetic first-person redemption promise), thematically paralleling Exodus 6:6 ("והוצאתי אתכם...וגאלתי אתכם"). Not an exact quote — the verb form/construction differs from the verse; this is a thematic echo, weaker than the Amos 9:11 case.',
  ARRAY['אבוא ואגאלכם 260 111 380 671'], 1237, ARRAY['fb25b467-fd71-446c-8127-e3c0b3b79368'],
  'ai:messianic_model_v1', 'Exodus 6:6', null, 40, 'candidate',
  'Thematic/paraphrase echo of Exodus 6:6''s first-person divine redemption promise; not a direct quote. Live phrase carries trailing numeric annotations (260 111 380 671), not itself part of the claim being evaluated.',
  jsonb_build_object(
    'speaker_type','GOD','speaker_name',null,'attribution_method','SCRIPTURAL_CONTEXT',
    'messianic_relation','EXPLICIT','verification_state','candidate_unverified',
    'phrase_id','fb25b467-fd71-446c-8127-e3c0b3b79368','model_version','messianic_model_v1'
  ),
  'public_candidate'
),
(
  'hypothesis',
  'Speaker of the phrase "ועשו לי מקדש ושכנתי בתוכם" is hypothesized to be GOD — this is a verbatim, word-for-word quote of Exodus 25:8, spoken by God commanding the building of the Tabernacle/Temple. Attribution kept at SCRIPTURAL_CONTEXT per approved Gate 4 scope (not upgraded to a stronger method unilaterally) despite being an exact quote; confidence set higher than the other two rows to reflect that distinction.',
  ARRAY['ועשו לי מקדש ושכנתי בתוכם'], 2120, ARRAY['6023e4fc-1158-4f64-bc6e-3a70afbe21d7'],
  'ai:messianic_model_v1', 'Exodus 25:8', null, 80, 'candidate',
  'Verbatim match to Exodus 25:8 ("ועשו לי מקדש ושכנתי בתוכם"). Source row itself is wa-vip (WhatsApp VIP group), is_verified=true (gematria-engine verified, a separate axis from this speaker claim).',
  jsonb_build_object(
    'speaker_type','GOD','speaker_name',null,'attribution_method','SCRIPTURAL_CONTEXT',
    'messianic_relation','EXPLICIT','verification_state','candidate_unverified',
    'phrase_id','6023e4fc-1158-4f64-bc6e-3a70afbe21d7','model_version','messianic_model_v1'
  ),
  'public_candidate'
);

-- ----------------------------------------------------------------------------
-- PASS 3 — RAW_UNATTRIBUTED BULK CLASSIFICATION (1234 rows)
-- Scope: source='excel_import' AND phrase ~ 'משיח' AND node_id IS NULL
-- (excludes the 51 curated-core rows handled in Pass 1 — no double-tagging).
-- NOT blind keyword: each family uses a disclosed multi-term pattern, not a
-- single generic match. messianic_relation=explicit applies because the
-- literal word משיח is present in every row of this scope (a property of
-- the phrase text itself, independent of source-quality). Confidence is
-- uniformly LOW for this entire pass, reflecting RAW_UNATTRIBUTED origin-
-- tier regardless of how many family-patterns matched. speaker_type is
-- NEVER touched here.
-- ----------------------------------------------------------------------------

update gematria_words set tags =
  coalesce(tags,'{}')
  || ARRAY['messianic_relation:explicit','messianic_model:v1','messianic_status:raw_unattributed_candidate',
           'messianic_classification_method:lexical_pattern_v1','messianic_confidence:low','messianic_family:text_claim']
  || (case when phrase ~ 'משיח בן דוד|משיח בן יוסף|משיח צדקנו|מלך המשיח|משיחנו|משיחי |משיחו|משיחך|גואל|בן דוד|צמח דוד|צמח המשיח'
       then ARRAY['messianic_family:identity'] else ARRAY[]::text[] end)
  || (case when phrase ~ '^א(בנה|גאל|בוא|מלוך|קים|קבץ|תגלה|גלה|קדש|משח|חשף|היה|חדש|שוב|כפר|שיע)'
       then ARRAY['messianic_family:action'] else ARRAY[]::text[] end)
  || (case when phrase ~ 'מקדש|ירושלים|ציון|שכינה'
       then ARRAY['messianic_family:place'] else ARRAY[]::text[] end)
  || (case when phrase ~ 'קץ|אחרית הימים|ימות המשיח|בעוד |בשנה |בחודש |תשפ|בכט אלול|בטו ניסן'
       then ARRAY['messianic_family:time'] else ARRAY[]::text[] end)
  || (case when phrase ~ 'מלך|מלכות|כסא דוד|כתר'
       then ARRAY['messianic_family:kingship'] else ARRAY[]::text[] end)
  || (case when phrase ~ 'גאולה|ביאת|ביאה|התגלות|קיבוץ גלויות|תחיית המתים|ישועה'
       then ARRAY['messianic_family:event'] else ARRAY[]::text[] end)
  || (case when phrase ~ 'צדק|שלום|ניצחון|כבוד'
       then ARRAY['messianic_family:attribute'] else ARRAY[]::text[] end)
where source='excel_import' and phrase ~ 'משיח' and node_id is null;

-- ============================================================================
-- Self-check (read-only, run manually after applying):
--   select count(*) from gematria_words where 'messianic_status:curated_explicit' = any(tags);           -- expect 51
--   select count(*) from research_objects where source='ai:messianic_model_v1';                            -- expect 3
--   select count(*) from gematria_words where 'messianic_status:raw_unattributed_candidate' = any(tags);   -- expect 1234
--   select tags from gematria_words where phrase='משיח';  -- confirm pre-existing "כיוון:חיובי" preserved
-- ============================================================================
