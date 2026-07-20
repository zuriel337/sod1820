-- 🌱 מנוע-האירועים «מה קורה במערכת» — שני rules ב-nodes (שלב 1: מנוע).
-- pulse_scoring: משקלי-ניקוד מכווננים בלי פריסה (נקראים ב-src/lib/systemEvents.js → getScoreWeights).
-- curation_over_quantity_law: עיקרון-העיצוב חוצה-האתר «הכוח בבחירה, לא בכמות».
-- אידמפוטנטי — לא יוצר כפילות אם כבר קיים.

insert into public.nodes (type, label, rule_id, rule_version, is_active, description, metadata)
select 'rule', 'ניקוד-פעילות (מנוע האירועים)', 'pulse_scoring', 1, true,
  'משקלי מנוע-האירועים «מה קורה במערכת» (systemEvents.js). מכווננים כאן בלי פריסה. אין חוקים קשיחים — רק ציון, והמערכת ממיינת לבד. שכבות: צמיחה (כרטיסים) · תקשורת (מצב-ערוץ) · פעילות (שורת-חיים) · התכנסות (שיא: ≥2 מקורות על אותו מספר).',
  jsonb_build_object('weights', jsonb_build_object(
    'base', jsonb_build_object('צופן',40,'מספר',40,'פוסט',30,'חידוש',30,'דיון',25,'רמז',20,'התכנסות',50),
    'hasNumber',20,'convergenceBonus',50,'freshHours',48,'freshBonus',15))
where not exists (select 1 from public.nodes where rule_id='pulse_scoring');

insert into public.nodes (type, label, rule_id, rule_version, is_active, description, metadata)
select 'rule', 'הכוח בבחירה, לא בכמות', 'curation_over_quantity_law', 1, true,
  'עיקרון-עיצוב חוצה-אתר: כל משטח מציג מבחר מכוון ומוגבל, לא זרם אינסופי. כל פריט שמוצג = עבר סינון → נתפס כמשמעותי; זרם אינסופי מאבד את החשוב. חל בכל מקום (בית, פורום, ספריות, רצועות). מומש קודם במנוע-האירועים (pulse_scoring): מכסת-מקורות + ניקוד, כדי שהרועש לא יבלע את היקר.',
  jsonb_build_object('scope','site-wide','origin','system_pulse')
where not exists (select 1 from public.nodes where rule_id='curation_over_quantity_law');
