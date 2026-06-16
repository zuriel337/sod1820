-- ===== מנועי עומק (שכבה 2) — שיטות גימטריה מתקדמות =====
-- כולן אומתו מול דוגמאות נעולות בחוקי ה-DB (nodes type=rule).
-- דורש: scripts/gematria_calc_functions.sql (gem_sum + 8 שיטות בסיס).

-- משולש גדול = קדמי גדול (kadmi_gadol_def): סדר א..ת ואז ך ם ן ף ץ בגדול, ערך מצטבר.
-- אומת: שובו בנים שובבים = 7760 · מלך = 2245.
create or replace function kadmi_gadol_calc(t text) returns int language sql immutable as $$
  select gem_sum(t, '{"א":1,"ב":3,"ג":6,"ד":10,"ה":15,"ו":21,"ז":28,"ח":36,"ט":45,"י":55,"כ":75,"ך":1995,"ל":105,"מ":145,"ם":2595,"נ":195,"ן":3295,"ס":255,"ע":325,"פ":405,"ף":4095,"צ":495,"ץ":4995,"ק":595,"ר":795,"ש":1095,"ת":1495}'::jsonb);
$$;

-- מסתתר גדול (mistater_gadol_def): מסתתר (הפרשים מילה-מילה) על ערכי גדול.
-- אומת: מלך=480 · ירושלים=1558 · תורה=783.
create or replace function mistater_gadol_calc(input text) returns int
language plpgsql immutable as $$
declare
  g jsonb := '{"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ך":500,"ל":30,"מ":40,"ם":600,"נ":50,"ן":700,"ס":60,"ע":70,"פ":80,"ף":800,"צ":90,"ץ":900,"ק":100,"ר":200,"ש":300,"ת":400}'::jsonb;
  total int := 0; w text; ch text; prev int; cur int; i int; have_prev boolean;
begin
  if input is null then return 0; end if;
  foreach w in array regexp_split_to_array(input, '\s+') loop
    have_prev := false;
    for i in 1..coalesce(char_length(w),0) loop
      ch := substr(w, i, 1);
      if g ? ch then
        cur := (g->>ch)::int;
        if have_prev then total := total + abs(cur - prev); end if;
        prev := cur; have_prev := true;
      end if;
    end loop;
  end loop;
  return total;
end; $$;

-- מילוי דמילוי (miluy_demiluy_def): כל אות → שם מלא → סכום המילוי של אותיות השם. חיבורי.
-- אומת: יהוה=610 · חכמה=1230.
create or replace function miluy_demiluy_calc(t text) returns int language sql immutable as $$
  select gem_sum(t, '{"א":266,"ב":848,"ג":257,"ד":924,"ה":35,"ו":64,"ז":193,"ח":854,"ט":855,"י":476,"כ":181,"ך":181,"ל":588,"מ":160,"ם":160,"נ":234,"ן":234,"ס":300,"ע":256,"פ":192,"ף":192,"צ":558,"ץ":558,"ק":289,"ר":890,"ש":486,"ת":458}'::jsonb);
$$;

-- מילוי דמילוי גדול (miluy_demiluy_gadol_def): כמו מילוי דמילוי, אך הסופיות שבתוך שמות-האותיות
-- במילוי הפנימי נספרות בגדול (ן=700 בתוך שי״ן וכו'). אומת: ירושלים=6770 · יהוה=610 (ללא שינוי).
create or replace function miluy_demiluy_gadol_calc(t text) returns int language sql immutable as $$
  select gem_sum(t, '{"א":986,"ב":848,"ג":817,"ד":924,"ה":35,"ו":64,"ז":1493,"ח":854,"ט":855,"י":476,"כ":901,"ך":901,"ל":1148,"מ":1280,"ם":1280,"נ":1534,"ן":1534,"ס":2060,"ע":1556,"פ":912,"ף":912,"צ":558,"ץ":558,"ק":1009,"ר":1540,"ש":1786,"ת":458}'::jsonb);
$$;
