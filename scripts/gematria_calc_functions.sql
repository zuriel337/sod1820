-- ===== מנוע הגימטריה ב-Postgres — שכפול מדויק של src/lib/gematria.js =====
-- אומת מול המנוע הרשמי: 0 אי-הסכמות על 7,524 ביטויים × 8 שיטות (15/06/2026).
-- שימוש: ragil_calc(phrase), miluy_calc, kadmi_calc, gadol_calc, siduri_calc,
--        atbash_calc, albam_calc, mistater_calc. עוזר: gem_sum(text, map).
-- מסתתר = חוק misratar_multi (מילה-מילה, הרווח שובר). גדול = סופיות 500-900.
-- onlyHeb: נספרות רק אותיות שקיימות ב-GEM (ניקוד/פיסוק/ספרות מסוננים).

create or replace function gem_sum(input text, map jsonb) returns int
language plpgsql immutable as $$
declare
  gem jsonb := '{"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ך":20,"ל":30,"מ":40,"ם":40,"נ":50,"ן":50,"ס":60,"ע":70,"פ":80,"ף":80,"צ":90,"ץ":90,"ק":100,"ר":200,"ש":300,"ת":400}'::jsonb;
  total int := 0; ch text; i int;
begin
  if input is null then return 0; end if;
  for i in 1..char_length(input) loop
    ch := substr(input, i, 1);
    if gem ? ch then total := total + (map->>ch)::int; end if;
  end loop;
  return total;
end;
$$;

create or replace function ragil_calc(t text) returns int language sql immutable as $$
  select gem_sum(t, '{"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ך":20,"ל":30,"מ":40,"ם":40,"נ":50,"ן":50,"ס":60,"ע":70,"פ":80,"ף":80,"צ":90,"ץ":90,"ק":100,"ר":200,"ש":300,"ת":400}'::jsonb);
$$;
create or replace function miluy_calc(t text) returns int language sql immutable as $$
  select gem_sum(t, '{"א":111,"ב":412,"ג":83,"ד":434,"ה":15,"ו":22,"ז":67,"ח":418,"ט":419,"י":20,"כ":100,"ך":100,"ל":74,"מ":80,"ם":80,"נ":106,"ן":106,"ס":120,"ע":130,"פ":81,"ף":81,"צ":104,"ץ":104,"ק":186,"ר":510,"ש":360,"ת":416}'::jsonb);
$$;
create or replace function kadmi_calc(t text) returns int language sql immutable as $$
  select gem_sum(t, '{"א":1,"ב":3,"ג":6,"ד":10,"ה":15,"ו":21,"ז":28,"ח":36,"ט":45,"י":55,"כ":75,"ך":75,"ל":105,"מ":145,"ם":145,"נ":195,"ן":195,"ס":255,"ע":325,"פ":405,"ף":405,"צ":495,"ץ":495,"ק":595,"ר":795,"ש":1095,"ת":1495}'::jsonb);
$$;
create or replace function siduri_calc(t text) returns int language sql immutable as $$
  select gem_sum(t, '{"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":11,"ך":11,"ל":12,"מ":13,"ם":13,"נ":14,"ן":14,"ס":15,"ע":16,"פ":17,"ף":17,"צ":18,"ץ":18,"ק":19,"ר":20,"ש":21,"ת":22}'::jsonb);
$$;
create or replace function atbash_calc(t text) returns int language sql immutable as $$
  select gem_sum(t, '{"א":400,"ב":300,"ג":200,"ד":100,"ה":90,"ו":80,"ז":70,"ח":60,"ט":50,"י":40,"כ":30,"ך":30,"ל":20,"מ":10,"ם":10,"נ":9,"ן":9,"ס":8,"ע":7,"פ":6,"ף":6,"צ":5,"ץ":5,"ק":4,"ר":3,"ש":2,"ת":1}'::jsonb);
$$;
create or replace function albam_calc(t text) returns int language sql immutable as $$
  select gem_sum(t, '{"א":30,"ב":40,"ג":50,"ד":60,"ה":70,"ו":80,"ז":90,"ח":100,"ט":200,"י":300,"כ":400,"ך":400,"ל":1,"מ":2,"ם":2,"נ":3,"ן":3,"ס":4,"ע":5,"פ":6,"ף":6,"צ":7,"ץ":7,"ק":8,"ר":9,"ש":10,"ת":20}'::jsonb);
$$;
create or replace function gadol_calc(t text) returns int language sql immutable as $$
  select gem_sum(t, '{"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ך":500,"ל":30,"מ":40,"ם":600,"נ":50,"ן":700,"ס":60,"ע":70,"פ":80,"ף":800,"צ":90,"ץ":900,"ק":100,"ר":200,"ש":300,"ת":400}'::jsonb);
$$;
-- מסתתר: ראה scripts/mistater_calc.sql
