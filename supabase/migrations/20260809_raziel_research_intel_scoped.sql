-- ============================================================================
-- רזיאל · Research Intelligence — שכבת-הרשאה לפי context_type (Freeze-safe)
-- ----------------------------------------------------------------------------
-- תיקון: RI אינו admin-only. אותו RI, חלון-חשיפה שונה לפי context_type.
-- הסינון בשכבת-הנתונים, לא ב-prompt (§3):
--   request → identity → context_type → authorization → data_scope → filtered → Raziel
-- שלושה מעגלים: PUBLIC (מצרפי, בלי auth) · USER_PRIVATE (רק שלו) · ADMIN (מאומת בלבד).
-- הפונקציה מאמתת admin בעצמה (users.role) — לעולם לא סומכת על התווית.
-- ⛔ עדיין לא מחובר לאף ערוץ (wiring_status=not_wired).
-- ============================================================================

create or replace function public.fn_raziel_research_intel_scoped(
  p_context_type text default 'public_user',
  p_user_ref text default null,
  p_number int default null,
  p_period text default '7d',
  p_limit int default 8
) returns jsonb
  language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_ct text := lower(coalesce(p_context_type,'public_user'));
  v_is_admin boolean := false;
  v_public jsonb;
  v_private jsonb := null;
  v_admin jsonb := null;
  v_refs text[];
  v_exposure text;
begin
  -- 🟢 PUBLIC — תמיד, בלי אימות (§10.6). מצרפי בלבד.
  v_public := fn_raziel_research_intel(p_number, p_period, p_limit);

  -- 🔐 אימות-אדמין בצד-שרת — לעולם לא לסמוך על p_context_type (§3, §10).
  if p_user_ref is not null and p_user_ref ~ '^[0-9a-f-]{36}$' then
    select (role='admin') into v_is_admin from users where id::text = p_user_ref limit 1;
    v_is_admin := coalesce(v_is_admin, false);
  end if;

  -- 👤 USER_PRIVATE — רק המשתמש עצמו, רק הנתונים שלו (§7). מזוהה בלבד.
  if p_user_ref is not null and v_ct in ('authenticated_user','whatsapp_user','admin') then
    -- גשר-זהות uid↔טלפון (כמו fn_raziel_context) — עדיין: רק הזהות של הקורא
    select coalesce(array_agg(distinct r) filter (where r is not null), array[p_user_ref]) into v_refs from (
      select p_user_ref r
      union select phone::text from wa_account_links where user_id::text = p_user_ref
      union select user_id::text from wa_account_links where phone = p_user_ref
    ) x;
    v_private := jsonb_build_object(
      'scope','user_private',
      'own_research_items', (select count(*) from research_items where user_id::text = p_user_ref),
      'own_recent_subjects', coalesce((select jsonb_agg(title order by ord) from (
          select title, row_number() over(order by created_at desc) ord
          from research_items where user_id::text = p_user_ref and title is not null
          order by created_at desc limit 5) t),'[]'::jsonb),
      'own_profile', (select jsonb_build_object('tier',tier,'credits',credits,'xp',xp,'level',level) from profiles where user_id::text = p_user_ref),
      'own_memory_items', (select count(*) from agent_user_memory where user_ref = any(v_refs) and agent='raziel' and memory_scope='personal'),
      'note','נתוני המשתמש עצמו בלבד — אין גישה לנתוני משתמש אחר'
    );
  end if;

  -- 🛡️ ADMIN — רק אם context=admin *וגם* מאומת admin בפועל (§6, §10.3/§10.5).
  if v_ct = 'admin' and v_is_admin then
    v_admin := jsonb_build_object(
      'scope','admin',
      'pending_candidates', (select count(*) from decision_ledger where status='pending'),
      'community_hints_pending', (select count(*) from community_hints where status='pending'),
      'open_definitions', (select count(*) from researcher_definitions where status in ('new','ai_replied')),
      'subscribers_active', (select count(*) from subscribers where active),
      'users_total', (select count(*) from users),
      'ai_tokens_7d', (select coalesce(sum(input_tokens+output_tokens),0) from ai_token_log where created_at > now()-interval '7 days'),
      'note','מידע ניהולי מורשה — מפקדה בלבד'
    );
  end if;

  v_exposure := case
    when v_ct='admin' and v_is_admin then 'full+admin_signals'
    when v_ct in ('authenticated_user','whatsapp_user') and p_user_ref is not null then 'aggregate_public+own_private'
    when v_ct='admin' and not v_is_admin then 'aggregate_public_only(admin_denied:not_verified)'
    else 'aggregate_public_only'
  end;

  return jsonb_build_object(
    'context_type', v_ct,
    'authorized_admin', v_is_admin,
    'exposure', v_exposure,
    'public', v_public,
    'user_private', v_private,
    'admin', v_admin,
    'boundary', 'popularity ≠ research_strength ≠ canonical_truth · user_behavior ≠ canon',
    'generated_at', now()
  );
end
$function$;
comment on function public.fn_raziel_research_intel_scoped(text,text,int,text,int) is
  'רזיאל RI מסונן-הרשאה: PUBLIC(מצרפי)+USER_PRIVATE(רק-שלו)+ADMIN(מאומת). סינון בשכבת-נתונים, מאמת admin בעצמו. לא מחובר.';

-- config §2/§9: RI זמין לכולם, החשיפה לפי context_type.
update public.raziel_config set
  config_version = 7,
  updated_at = now(),
  note = 'RI — הרשאת-חשיפה לפי context_type (public/user_private/admin). enabled לכולם. לא מחובר.',
  config = jsonb_set(
    jsonb_set(
      jsonb_set(config, '{research_intelligence,enabled}', 'true'),
      '{research_intelligence,enabled_by_channel}', jsonb_build_object('command',true,'site',true,'wa',true)),
    '{research_intelligence,exposure_policy}', jsonb_build_object(
      'public_user', 'aggregate_public_only',
      'authenticated_user', 'aggregate_public + own_private',
      'whatsapp_user', 'aggregate_public + own_private',
      'admin', 'full + admin_signals',
      'scoped_function', 'fn_raziel_research_intel_scoped',
      'authorization_flow', 'request→identity→context_type→authorization→data_scope→filtered_context→raziel',
      'admin_verified_server_side', true,
      'expose_admin_boundary', 'נשאר — admin data רק ל-context=admin ומאומת ב-users.role'))
  where id = 1;
