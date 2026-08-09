-- ============================================================================
-- חוקת רזיאל · שלב 3 — מעטפת reliability משותפת (Freeze-safe · additive-only)
-- ----------------------------------------------------------------------------
-- מטרה: להקים מנגנון retry/timeout/fallback קנוני אחד + פנקס-שקילות מבוסס-מדידה
--       מול המצב הקיים בשלושת הערוצים. לא לחבר אף ערוץ, לא לשנות התנהגות.
--
-- מדידת המצב הקיים (סוכן-חקירה קרא את שלוש הפונקציות):
--   · number-researcher = זהב-התקן: 3 ניסיונות בתהליך · backoff[700,1600] ·
--     timeout 45s (AbortController) · fallback לעולם-לא-null.
--   · wa-raziel = 3 ניסיונות מבוזרים על cron · אין backoff · אין timeout ·
--     יש שומר-מטטרון (never_silent).
--   · ai-analyze (אתר + מפקדה persona=raziel) = אפס retry · אפס timeout ·
--     בכשל מחזיר null (שקט) — החלש מהשלושה.
--
-- ⛔ לא עושה: לא נוגע ב-raziel_brain/core · לא נוגע במודל · אין routing ·
--    לא מחבר site/wa/command · לא משנה max_tokens/memory/metatron/פורמט ·
--    לא מוחק אף מנגנון-retry קיים. מודול-הקוד _shared/raziel-reliability.ts
--    לא מיובא ע״י אף פונקציה (אפס פריסה). before=שלב2 · after=שלב2+מעטפת קריאה.
-- ============================================================================

-- ── 0) before: snapshot מלא של קונפיג v2 + המצב-הקיים הנמדד ───────────────────
insert into public.raziel_config_snapshot (config_version, channel, context_type, returned)
select config_version, '__config_full__', 'v2_before_step3', config
from public.raziel_config where id = 1;

-- ── 1) v3: מוסיפים reliability_envelope (spec + current_state + equivalence) ──
update public.raziel_config set
  config_version = 3,
  updated_at = now(),
  note = 'שלב 3 — מעטפת reliability קנונית + פנקס-שקילות. לא מחוברת לאף ערוץ.',
  config = config || jsonb_build_object(
    'reliability_envelope', jsonb_build_object(
      'version', 3,
      'wiring_status', 'not_wired',
      'code_module', 'supabase/functions/_shared/raziel-reliability.ts (built, not imported)',

      -- ה-envelope הקנוני (= זהב-התקן של number-researcher)
      'canonical', jsonb_build_object(
        'retries', 3,
        'backoff_ms', jsonb_build_array(700, 1600),
        'timeout_ms', 45000,
        'timeout_mechanism', 'AbortController per attempt',
        'transient_triggers', jsonb_build_array('http_429','http_5xx','empty_text','timeout'),
        'never_silent', true,
        'guardian', jsonb_build_object('enabled', true, 'content_owner', 'channel', 'policy', 'תמיד טקסט-גיבוי מהותי, לעולם לא null/ריק'),
        'derived_from', 'number-researcher (gold standard)'
      ),

      -- המצב-הקיים כפי שנמדד (before wiring) — לכל ערוץ
      'current_state', jsonb_build_object(
        'wa_raziel', jsonb_build_object(
          'retries', 3, 'retry_mode', 'cross_cron', 'backoff_ms', null, 'timeout_ms', null,
          'never_silent', true, 'guardian', 'metatron_fallback',
          'gaps', jsonb_build_array('no_in_process_timeout','no_backoff')),
        'site_number_researcher', jsonb_build_object(
          'retries', 3, 'retry_mode', 'in_process', 'backoff_ms', jsonb_build_array(700,1600), 'timeout_ms', 45000,
          'never_silent', true, 'guardian', 'inline_hebrew',
          'gaps', jsonb_build_array()),
        'ai_analyze_site_command', jsonb_build_object(
          'retries', 0, 'retry_mode', 'none', 'backoff_ms', null, 'timeout_ms', null,
          'never_silent', false, 'guardian', 'none_returns_null',
          'gaps', jsonb_build_array('no_retry','no_timeout','no_backoff','no_fallback'))
      ),

      -- פנקס-השקילות: הוכחה ש-envelope ≥ כל מצב-קיים (ומה מוסיף)
      'equivalence', jsonb_build_object(
        'vs_wa', jsonb_build_object(
          'retries','eq (3; envelope in-process ≥ cross-cron)',
          'backoff','better (envelope adds [700,1600])',
          'timeout','better (envelope adds AbortController 45s — סוגר את הפער העיקרי של WA)',
          'fallback','eq (שניהם never_silent/guardian)',
          'verdict','envelope ≥ wa'),
        'vs_command_ai_analyze', jsonb_build_object(
          'retries','better (envelope adds 3; ל-ai-analyze אין)',
          'backoff','better (adds)',
          'timeout','better (adds)',
          'fallback','better (adds never_silent; ai-analyze מחזיר null בשקט)',
          'verdict','envelope ≫ ai-analyze (השדרוג הגדול ביותר)'),
        'site_retry_added', jsonb_build_object(
          'was','ai-analyze ללא retry; number-researcher v7 כבר הוסיף retry בתהליך',
          'unchanged', jsonb_build_array('format','model','max_tokens','memory','metatron'),
          'verdict','retry קיים באתר (number-researcher), שאר התנהגות האתר לא שונתה')
      )
    )
  )
where id = 1;

-- ── 2) fn_raziel_reliability — קריאת המעטפת האפקטיבית לערוץ (read-only) ────────
create or replace function public.fn_raziel_reliability(
  p_channel text default 'site'
) returns jsonb
  language sql stable security definer set search_path to 'public'
as $function$
  with norm as (
    select case lower(coalesce(p_channel,'site'))
             when 'wa' then 'wa_raziel' when 'whatsapp' then 'wa_raziel'
             when 'site' then 'site_number_researcher' when 'web' then 'site_number_researcher'
             when 'command' then 'ai_analyze_site_command' when 'admin' then 'ai_analyze_site_command' when 'research' then 'ai_analyze_site_command'
             else 'site_number_researcher' end as ck
  )
  select jsonb_build_object(
    'config_version', c.config_version,
    'channel_key', n.ck,
    'canonical', c.config->'reliability_envelope'->'canonical',
    'current_state', c.config->'reliability_envelope'->'current_state'->n.ck,
    'wiring_status', c.config->'reliability_envelope'->>'wiring_status',
    'generated_at', now()
  )
  from raziel_config c cross join norm n where c.id=1;
$function$;
comment on function public.fn_raziel_reliability(text) is
  'חוקת רזיאל — מעטפת reliability אפקטיבית לערוץ (canonical + current_state + wiring_status). שלב 3: קיימת ולא מחוברת.';

-- ── 3) after: snapshot של המעטפת לכל ערוץ (הוכחת קריאות + הבחנה) ──────────────
insert into public.raziel_config_snapshot (config_version, channel, context_type, returned)
select 3, ch, 'v3_reliability', public.fn_raziel_reliability(ch)
from (values ('site'),('wa'),('command')) as t(ch);
