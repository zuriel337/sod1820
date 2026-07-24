-- gematria_api(p_text) — API ציבורי ללקוחות: מעטפת קריאה-בלבד סביב מנוע-הגימטריה הרשמי.
-- ⚠️ gematria_engine_law: הפונקציה לא מחשבת גימטריה בעצמה — היא רק *מרכיבה* את פונקציות-המנוע
--    הרשמיות (fn_ragil / gem_calc / kadmi_gadol_calc) ל-JSON אחיד. מקור-אמת יחיד = ה-DB.
-- קריאה-בלבד (stable). לא נחשפת ל-anon/authenticated — נקראת רק דרך Edge Function gematria-api (service_role).
-- (הוחל חי ב-DB ב-24.7.2026; קובץ זה = תיעוד/שחזור.)
create or replace function public.gematria_api(p_text text)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'input', coalesce(p_text, ''),
    'value', fn_ragil(coalesce(p_text, '')),                       -- ערך רגיל = הערך הראשי
    'distance_from_1820', 1820 - fn_ragil(coalesce(p_text, '')),   -- מרחק מ-1820 (לב הפרויקט)
    'methods', jsonb_build_object(
      'ragil',       fn_ragil(coalesce(p_text, '')),
      'miluy',       g.miluy,
      'misratar',    g.misratar,
      'kadmi',       g.kadmi,
      'gadol',       g.gadol,
      'siduri',      g.siduri,
      'atbash',      g.atbash,
      'albam',       g.albam,
      'kadmi_gadol', kadmi_gadol_calc(coalesce(p_text, ''))
    )
  )
  from gem_calc(coalesce(p_text, '')) g;
$$;

revoke all on function public.gematria_api(text) from public;
revoke all on function public.gematria_api(text) from anon, authenticated;
grant execute on function public.gematria_api(text) to service_role;

comment on function public.gematria_api(text) is
  'API ללקוחות: מעטפת קריאה-בלבד סביב מנוע-הגימטריה הרשמי (fn_ragil/gem_calc/kadmi_gadol_calc). נקראת דרך Edge Function gematria-api בלבד.';
