-- ============================================================================
-- חוקת רזיאל · שלב 1 (Freeze-safe · additive-only)
-- ----------------------------------------------------------------------------
-- מטרה: ליצור מקור-קונפיג מרכזי אחד (raziel_config) + ממשק-קריאה יחיד
--       (fn_raziel_config) — כעותק הצהרתי של היעד שאושר באודיט שלב 0.
--
-- ⛔ מה שהמיגרציה הזו *לא* עושה (גבולות שצוריאל הציב לשלב 1):
--   · לא נוגעת ב-raziel_brain / core / prompt / חוקים — אף חוק לא מאוחד/נמחק.
--   · לא משנה מודל בפועל · לא נוגעת ב-raziel_brain.model.
--   · לא משנה retry/timeout · לא נוגעת ב-metatron_context / agent_user_memory.
--   · לא מחברת אף ערוץ לקונפיג — אף פונקציית-קצה לא קוראת מ-fn_raziel_config.
--   · אין routing (routing_enabled=false) · אין migration שמשנה נתונים קיימים.
--
-- הכל כאן CREATE בלבד (טבלאות+פונקציה+שורות-נתונים חדשות). ההתנהגות הקיימת
-- של שלושת הערוצים נשארת *זהה לחלוטין* — נולד רק מקור חדש שאינו בשימוש.
-- ============================================================================

-- ── 1) מקור-הקונפיג (שורה אחת · שרת-בלבד, כמו raziel_brain) ──────────────────
create table if not exists public.raziel_config (
  id             int primary key default 1,
  config_version int not null default 1,
  config         jsonb not null,
  note           text,
  updated_at     timestamptz not null default now(),
  constraint raziel_config_singleton check (id = 1)
);
alter table public.raziel_config enable row level security;
-- שרת-בלבד בכוונה: אין GRANT ל-anon/authenticated. נקרא רק דרך
-- fn_raziel_config (SECURITY DEFINER) ע״י service_role/postgres.
comment on table public.raziel_config is
  'חוקת רזיאל — מקור-קונפיג מרכזי (שלב 1). הצהרתי בלבד; אף ערוץ עוד לא קורא ממנו. server-only (rls_client_read_protocol: בלי grant בכוונה).';

-- ── 2) הקונפיג ההצהרתי — עותק של היעד מהאודיט (policy/pointers, לא טקסט-חוקים) ─
-- הערה: אנחנו *לא* מעתיקים לכאן את טקסט-החוקים (זה שלב 2). כאן רק policy,
-- מצביעים-למקור, override-לערוץ, וסוגי-הקשר — כדי שלא נכפיל/נאחד חוקים בטעות.
insert into public.raziel_config (id, config_version, note, config) values (
  1, 1, 'שלב 1 — מקור הצהרתי, לא בשימוש. נגזר מאודיט שלב 0.',
  jsonb_build_object(
    -- 🟢 משותף — זהה בכל שלושת הערוצים
    'shared', jsonb_build_object(
      'identity',  jsonb_build_object('source','raziel_brain','note','core + addon_site/addon_wa (קיים, לא נוגעים)'),
      'rulebook',  jsonb_build_object('source','raziel_brain.core','status','not_yet_unified',
                     'planned_promotions', jsonb_build_array('never_silent','source_attribution','mark_external_knowledge','canon_wins_conflict')),
      'knowledge', jsonb_build_object('source','metatron_context','one_tree',true,'depth_per_channel',true,
                     'note','מקור-ידע אחד; עומק-שליפה משתנה לפי ערוץ (תיקון א׳ — לא always_metatron)'),
      'epistemics', jsonb_build_array('fact','finding','interpretation','hypothesis'),
      'safety', jsonb_build_object(
        'no_self_calc',true,'no_invented_values',true,'no_prophecy',true,
        'no_living_person_claims',true,'never_silent',true,
        'source_attribution',true,'mark_external_knowledge',true,'canon_wins_conflict',true),
      'reliability', jsonb_build_object('retries',3,'timeout_ms',45000,'backoff_ms',jsonb_build_array(700,1600),'guardian_fallback',true),
      'memory', jsonb_build_object(
        'read_fn','fn_raziel_context','write_fn','fn_raziel_remember',
        'cross_channel',true,'personal_ne_canonical',true,
        'promotion_path', jsonb_build_array('conversation','personal_memory','candidate','evidence','decision','tree'),
        'note','תיקון ב׳ — זיכרון אישי לעולם לא הופך לעובדה בעץ אלא דרך מסלול-השופט'),
      'snapshot', jsonb_build_object('enabled',true,
        'chain', jsonb_build_array('persona','memory_context','knowledge_context','rules_snapshot','engine_snapshot','answer'),
        'note','Replay/Explainability — «למה אמרת לי את זה» בכל ערוץ רלוונטי'),
      -- תיקון ג׳ — model_policy, לא «המודל של רזיאל». routing כבוי.
      'model_policy', jsonb_build_object(
        'default','claude-sonnet-5','fast','claude-haiku-4-5','deep','claude-sonnet-5',
        'routing_policy','task_class','routing_enabled',false,
        'note','כולם על default עד שהמסווג יוכח אמין')
    ),
    -- 🟡 override לערוץ + 🔵 מעטפת-ערוץ (תיקון ד׳ — format לא מאוחד)
    'channels', jsonb_build_object(
      'site',    jsonb_build_object('max_tokens',1600,'knowledge_depth','medium', 'format','json_contract','quota','3/15/100/inf','sign',false),
      'wa',      jsonb_build_object('max_tokens',1500,'knowledge_depth','short',  'format','wa_signed',    'quota','daily',       'sign',true),
      'command', jsonb_build_object('max_tokens',1800,'knowledge_depth','dossier','format','plain_he',     'quota',null,          'sign',false)
    ),
    -- 4 סוגי-הקשר — הצהרה בלבד (לא מופעלים בשלב זה). expose_admin =
    -- גבול ארכיטקטוני: מידע-אדמין לעולם לא נגיש לגולש/וואטסאפ — לא תלוי-prompt.
    'context_types', jsonb_build_object(
      'public_user',        jsonb_build_object('identity','visitor_id','personal_memory',false,'expose_admin',false,'canonical_knowledge',true),
      'authenticated_user', jsonb_build_object('identity','auth_uid',  'personal_memory',true, 'expose_admin',false,'canonical_knowledge',true),
      'admin',              jsonb_build_object('identity','auth_uid',  'personal_memory',true, 'expose_admin',true, 'canonical_knowledge',true),
      'whatsapp_user',      jsonb_build_object('identity','wa_link->auth_uid','personal_memory',true,'expose_admin',false,'canonical_knowledge',true)
    )
  )
) on conflict (id) do nothing;

-- ── 3) ממשק-הקריאה היחיד — shared + channel-override (+ context-type אופציונלי) ─
-- SECURITY DEFINER STABLE, כמו fn_raziel_persona. מנרמל aliases של ערוץ.
create or replace function public.fn_raziel_config(
  p_channel text default 'site',
  p_context_type text default null
) returns jsonb
  language sql stable security definer set search_path to 'public'
as $function$
  with norm as (
    select case lower(coalesce(p_channel,'site'))
             when 'wa' then 'wa' when 'whatsapp' then 'wa'
             when 'web' then 'site' when 'site' then 'site'
             when 'command' then 'command' when 'admin' then 'command' when 'research' then 'command'
             else 'site' end as ck
  )
  select jsonb_build_object(
    'config_version', c.config_version,
    'channel_key',    n.ck,
    'shared',         c.config->'shared',
    'channel',        coalesce(c.config->'channels'->n.ck, '{}'::jsonb),
    'context_type',   case when p_context_type is not null
                           then c.config->'context_types'->p_context_type else null end,
    'context_types',  c.config->'context_types',
    'generated_at',   now()
  )
  from public.raziel_config c cross join norm n
  where c.id = 1;
$function$;
comment on function public.fn_raziel_config(text,text) is
  'חוקת רזיאל — ממשק-קריאה יחיד: shared + channel-override (+context_type). שלב 1: קיים ולא בשימוש ע״י אף ערוץ.';

-- ── 4) טבלת-snapshot — הוכחת מה שהפונקציה מחזירה (config_version + לכל ערוץ) ────
create table if not exists public.raziel_config_snapshot (
  id             bigserial primary key,
  config_version int not null,
  channel        text not null,
  context_type   text,
  returned       jsonb not null,
  created_at     timestamptz not null default now()
);
alter table public.raziel_config_snapshot enable row level security;
comment on table public.raziel_config_snapshot is
  'snapshots של פלט fn_raziel_config לכל ערוץ — הוכחת before/after לשלב 1. server-only.';

-- שומרים snapshot של שלושת הערוצים (הוכחה שהפונקציה מבדילה ביניהם).
insert into public.raziel_config_snapshot (config_version, channel, context_type, returned)
select 1, ch, null, public.fn_raziel_config(ch, null)
from (values ('site'),('wa'),('command')) as t(ch);
