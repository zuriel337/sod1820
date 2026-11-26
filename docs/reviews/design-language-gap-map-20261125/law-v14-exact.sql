-- canonical_ui_components_law v14 — EXACT TEXT PRESENTED FOR ZURIEL'S APPROVAL. NOT APPLIED (25.11.2026).
-- Applying it is a database write: it needs ZURIEL's explicit approval of this exact text and file (CLAUDE.md 0.4), then one run of this file.
-- It EXTENDS v13 (owner check EXTEND_EXISTING): v13's text is kept byte for byte and the v14 block is appended; v13 becomes inactive, v14 active (the pattern of v12 → v13).
-- Source of the wording: Design V2 §14.4 and §14.13 (SOD1820_DESIGN_CONTRACT_V2.md) on branch ccr-7ed7f384-d0u3rk.
begin;

do $$
begin
  if not exists (select 1 from nodes where id = '0ebef618-58b3-4efa-a73f-0c5a3ea524de' and rule_id = 'canonical_ui_components_law' and rule_version = 13 and is_active) then
    raise exception 'v13 is not the active canonical_ui_components_law any more; stop and re-read';
  end if;
  if exists (select 1 from nodes where rule_id = 'canonical_ui_components_law' and rule_version = 14) then
    raise exception 'v14 already exists';
  end if;
end $$;

insert into nodes (id, type, label, description, metadata, is_active, rule_id, rule_version, depends_on, supersedes_version, weight)
select gen_random_uuid(), 'rule',
  'רכיבי UI קנוניים v14 — משפחת הכפתורים, הטפסים, החלוניות וחיווי הפעולה בשכבת Royal אחת',
  description || E'\n' || $v14$
—— v14 · ZURIEL 25.11.2026 — משפחת הכפתורים, הטפסים, החלוניות וחיווי הפעולה בשכבת Royal אחת ——
Owner check: EXTEND_EXISTING canonical_ui_components_law; Design V2 §14.4 ו־§14.13. אין רכיב, חוזה או ספרייה מקבילים: כל הרכיבים בקובץ הקיים royal2029.css.
1. משפחת הכפתורים (מרחיבה את v13 §3): .r29-btn (ראשית בכחול רויאל, משנית במסגרת זהב), .r29-btn-group (קבוצה ממורכזת, רוחב אחיד בשורה אחת), .r29-btn.is-icon (ריבוע 44px). בחירה מרובה היא תיבות סימון (.r29-check בתוך .r29-check-group), לא כפתורים גדולים; WatchButton מציג אותן דרך variant="check2029" (אותו מנוע ואותו מצב).
2. טפסים: .r29-field + .r29-input + .r29-hint. תווית 14px, בקרה 16px בגובה 44px לפחות, יישור לתחילת השורה, שגיאה ב־aria-invalid וב־.r29-status; הקלט אינו אובד בשגיאה.
3. חלוניות: רכיב אחד, RoyalSheet2029 + .r29-sheet. role="dialog", aria-modal וכותרת אחת מקושרת; נסגרת ב־Escape, בלחיצה על הרקע ובכפתור אחד; המוקד נכנס, נשאר בפנים וחוזר לפותח; הדף שמאחור אינו גולל. אין מימוש חלונית שני לפוסט.
4. חיווי פעולה: .r29-status[data-state] — טעינה (role=status ו־aria-busy), הצלחה (role=status), שגיאה (role=alert, עם ניסיון חוזר ושמירת הקלט). לעולם לא אחוז או זמן מומצאים.
5. מטרות לחיצה: לפחות 44×44px לכל בקרה; רכיב קומפקטי חזותית (צ'יפ, תגית) שומר שטח לחיצה של 44px ללא חפיפה בין שורות. טקסט אינו מוקטן כדי להכניס תוכן.
6. אכיפה: בדיקת CI button-family-guard-2029 היא מנוף חד־כיווני (כלל כפתור חדש מחוץ ל־royal2029.css = FAIL; החריגים הקיימים רק יורדים), וסריקת אזהרה design-family-warn-2029 לשאר המשפחות (מדווחת מועמדים, אינה נכשלת על מספרים). שתיהן רצות בכל Pull Request ל־main (workflow 2029 Live Contracts). העלאת בסיס או הפיכת משפחה למנוף = החלטת ZURIEL.
7. לא משתנה: ShareActions הקנוני, טלמטריה, הרשאות ופרטיות, שלוש ערכות הצבע, חריגי Design V2 §14.12 C (רזיאל, היכל, מטריצת הצופן, בית המדרש). .r29 נשאר לפי משטח ואינו מוחל על המעטפת; תקציב המעטפת אינו משתנה. גרסה זו אינה אישור למיזוג, לפריסה או לשינוי נתונים.
$v14$,
  metadata || jsonb_build_object(
    'human_gate_v14', jsonb_build_object('by', 'ZURIEL', 'date', '2026-11-25', 'task_key', 'design_gap_map_20261125',
      'instruction', 'ZURIEL approval of this exact text (fill with the approval message at apply time)'),
    'canonical_components_v14', jsonb_build_array('r29-btn', 'r29-btn-group', 'r29-check', 'r29-field', 'r29-input', 'r29-status', 'RoyalSheet2029')),
  true, rule_id, 14, depends_on, 13, weight
from nodes where id = '0ebef618-58b3-4efa-a73f-0c5a3ea524de';

update nodes set is_active = false where id = '0ebef618-58b3-4efa-a73f-0c5a3ea524de';

-- Rollback (separate approval): update nodes set is_active = true where id = '0ebef618-58b3-4efa-a73f-0c5a3ea524de';
--                               delete from nodes where rule_id = 'canonical_ui_components_law' and rule_version = 14;
commit;
