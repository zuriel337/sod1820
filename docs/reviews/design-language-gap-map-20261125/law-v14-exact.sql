-- canonical_ui_components_law v14 — EXACT TEXT PRESENTED FOR ZURIEL'S APPLY APPROVAL. NOT APPLIED.
-- Content approved IN PRINCIPLE by ZURIEL, 26.11.2026 («מאשר עקרונית את תוכן חוק רכיבי הממשק v14»). Applying it is a database write and needs ZURIEL's SEPARATE explicit
-- approval of this exact file (CLAUDE.md 0.4), then one run. It EXTENDS v13 (owner check EXTEND_EXISTING): v13's text is kept byte for byte and the v14 block is appended.
-- Source of the wording: Design V2 §14.4 and §14.13 on branch ccr-7ed7f384-d0u3rk.
--
-- Safety, all inside one transaction (any failed check raises and nothing is written):
--   1. v13 must still be the active law AND byte-identical to the text this file was prepared against (length 20016, md5 of description, metadata and label below);
--   2. no v14 exists yet;
--   3. after the insert, v14's description must START with v13's description byte for byte, and the appended block must have the md5 recorded here;
--   4. v13's row must be unchanged (same md5) at the end.
-- History is never destroyed: v13 stays as an inactive row, v14 is a new row; a rollback only flips which of the two is active (v14 is kept as inactive history).
begin;

do $$
declare v13 nodes%rowtype;
begin
  select * into v13 from nodes where id = '0ebef618-58b3-4efa-a73f-0c5a3ea524de';
  if not found or v13.rule_id <> 'canonical_ui_components_law' or v13.rule_version <> 13 or not v13.is_active then
    raise exception 'v13 is not the active canonical_ui_components_law any more; stop and re-read';
  end if;
  if length(v13.description) <> 20016 or md5(v13.description) <> 'b93de69fad72cefba0959371a232a111'
     or md5(v13.metadata::text) <> 'c41c7d275fc709883d8ae805f1e31aca' or md5(v13.label) <> 'd592f52ed2e869259c76ec8de7907378' then
    raise exception 'v13 content differs from the text this v14 was prepared against (exact-match check failed); stop and re-read';
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
    'human_gate_v14', jsonb_build_object('by', 'ZURIEL', 'date', '2026-11-26', 'task_key', 'design_gap_map_20261125',
      'instruction', 'מאשר עקרונית את תוכן חוק רכיבי הממשק v14 (ZURIEL, 26.11.2026). החלה במסד: באישור נפרד ומדויק לקובץ זה.'),
    'canonical_components_v14', jsonb_build_array('r29-btn', 'r29-btn-group', 'r29-check', 'r29-field', 'r29-input', 'r29-status', 'RoyalSheet2029')),
  true, rule_id, 14, depends_on, 13, weight
from nodes where id = '0ebef618-58b3-4efa-a73f-0c5a3ea524de';

update nodes set is_active = false where id = '0ebef618-58b3-4efa-a73f-0c5a3ea524de';

do $$
declare v13 nodes%rowtype; v14 nodes%rowtype;
begin
  select * into v13 from nodes where id = '0ebef618-58b3-4efa-a73f-0c5a3ea524de';
  select * into v14 from nodes where rule_id = 'canonical_ui_components_law' and rule_version = 14;
  if left(v14.description, length(v13.description)) <> v13.description then raise exception 'v14 does not start with v13 byte for byte'; end if;
  if md5(substr(v14.description, length(v13.description) + 1)) <> '3756b5b7c6cb74865adb09ffb0699d39' then raise exception 'the appended v14 block differs from the approved text'; end if;
  if md5(v13.description) <> 'b93de69fad72cefba0959371a232a111' or v13.is_active then raise exception 'v13 row changed unexpectedly'; end if;
  if (select count(*) from nodes where rule_id = 'canonical_ui_components_law' and is_active) <> 1 then raise exception 'exactly one active version expected'; end if;
end $$;

commit;

-- ROLLBACK (separate approval; history kept, nothing is deleted — v14 stays as an inactive row):
--   begin;
--   update nodes set is_active = false where rule_id = 'canonical_ui_components_law' and rule_version = 14;
--   update nodes set is_active = true  where id = '0ebef618-58b3-4efa-a73f-0c5a3ea524de';
--   commit;
