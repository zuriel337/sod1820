-- ZURIEL explicitly confirmed this scoped governance/passive-log write in chat: מאושר.
-- Apply the previously prepared amendment only; no product/runtime/security changes.
-- No DDL, product rows, RLS, switches, deployment settings or dispatch.
BEGIN;
SET LOCAL statement_timeout='15s';
SET LOCAL lock_timeout='3s';
SET LOCAL standard_conforming_strings=on;
DO $policy_update$
DECLARE
  prev public.nodes%rowtype;
  old_contract text;
  old_source text;
  before_id uuid;
  new_id uuid;
  affected integer;
BEGIN
  SELECT * INTO STRICT prev FROM public.nodes WHERE id='38ef4f91-1ba5-41a4-98d7-f301ab52c50d' FOR UPDATE;
  SELECT body INTO STRICT old_contract FROM public.project_codex WHERE id=30 AND slug='experience_governance_foundation_v1' FOR UPDATE;
  SELECT body INTO STRICT old_source FROM public.project_codex WHERE id=37 AND slug='sod1820_reality_stream_os_master_v3_20261016_draft' FOR UPDATE;
  IF prev.rule_id IS DISTINCT FROM 'experience_governance_foundation_v1_law' OR prev.rule_version<>9 OR prev.is_active IS DISTINCT FROM true OR md5(prev.description)<>'a81601a6a6a10406ea1a05d8288c2a4d' THEN
    RAISE EXCEPTION 'Owner changed; reread and reconcile. No write applied.';
  END IF;
  IF md5(old_contract)<>'4353c5f6fb99b37ede54ed16624b0056' OR md5(old_source)<>'b4b728fdbe6d25f7f4569c25bacf75aa' THEN
    RAISE EXCEPTION 'Contract/source changed; reread and reconcile. No write applied.';
  END IF;
  IF (SELECT count(*) FROM public.nodes WHERE type='rule' AND rule_id=prev.rule_id AND is_active)<>1
     OR EXISTS(SELECT 1 FROM public.nodes WHERE type='rule' AND rule_id=prev.rule_id AND rule_version>=10)
     OR EXISTS(SELECT 1 FROM public.work_log WHERE task_key='GPT_2029_FOCUSED_LOADING_POLICY_ADOPTION_20261016') THEN
    RAISE EXCEPTION 'Existing adoption/claim/newer rule; reconcile instead of duplicating.';
  END IF;

  INSERT INTO public.work_log(topic,what_we_did,status,task_key,from_actor,to_actor,assignment_mode,assignment_scope,primary_owner,release_authorization_state,dispatch_kind,dispatch_state)
  VALUES ('2029 focused-loading policy — BEFORE','Explicitly confirmed governance-only adoption after auto-review clarification. Existing Experience owner; detailed policy in codex id30; provenance pointer in draft id37. Preserve all original bodies. No product/runtime/security/release changes. Passive TO=ZURIEL; no dispatch or ACK.','BEFORE_CLAIMED_WRITE_GOVERNANCE_ONLY_PASSIVE','GPT_2029_FOCUSED_LOADING_POLICY_ADOPTION_20261016','GPT','ZURIEL','WRITE','nodes experience_governance_foundation_v1_law v9->v10; project_codex ids30,37','experience_governance_foundation_v1_law','GOVERNANCE_ONLY_USER_CONFIRMED_NO_PRODUCT_RELEASE',NULL,NULL)
  RETURNING id INTO before_id;

  UPDATE public.project_codex SET body=old_contract || E'\n\n' || '## V10 — טעינה ממוקדת ותוכן טרי ב־2029 · Human Gate ZURIEL · 16.10.2026

מצב: APPROVED GOVERNANCE POLICY / NOT IMPLEMENTATION ACCEPTANCE.
OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1_law.
מקור ההחלטה: project_codex id=37, slug=sod1820_reality_stream_os_master_v3_20261016_draft, פרקים 17, 25, 28.1, 29.3 ו־29.5, יחד עם הבהרת צוריאל בשיחה ב־16.10.2026: המסרים החדשים במרכז, הגלריות כארכיון נגיש לפי דרישה, ובקשתו לקבע זאת בחוקים כדי למנוע עבודה כפולה.
המקור הוא תכנון והיסטוריית החלטה. סעיף זה הוא הגוף הקנוני היחיד למדיניות הטעינה שאומצה; שאר V3 נשאר DRAFT לפי פרק 29.

1. תוכן רלוונטי תחילה. הכניסה הרגילה ל־2029 מובילה בתוכן חדש ומאושר, ובתוכן שהמשתמש בחר לקרוא או לחקור. ארכיון הגלריות וכל ההיסטוריה אינם נטענים או מוצגים בשלמותם כברירת מחדל. בקשת ארכיון מפורשת פותחת תוצאה תחומה ממנו. מקור ישן עם קשר ישיר, מוסבר ומורשה למוקד הנוכחי יכול להשתלב בתוצאה הראשונה לפי research_gold_hints_law; ישן אינו מחוק, וחדש אינו אמת או חשיבות אוטומטית.

2. תוכן ראשי אינו ממתין להעמקה. כרטיס מבקש כותרת/תקציר/זהות/תאריך בעל תפקיד ברור/תמונת תצוגה ושדות ההרשאה הנחוצים. הוא אינו מבקש גוף פוסט מלא או גרף מלא כדי לצייר תקציר. דף פוסט שנפתח בכוונה מציג את התוכן הקריא שביקש המשתמש; אין לדחות אותו בשם lazy loading. תמונה או מדיה החיוניות להבנת המקור שומרות כיתוב, ייחוס ועוגן. שלד, הודעת תקלה וספירה שטרם הושלמה אינם תוכן שמיש או תוצאה מאומתת.

3. עומק לפי דרישה. גלריה מלאה, היסטוריה מלאה, קשרים רחוקים, גרף מורחב, חלונית מספר עמוקה, רזיאל ומסעות אינם מחסום לכניסה רגילה. קוד ונתונים שלהם נטענים בעת פתיחה/בחירה או טעינה מקדימה תחומה המוצדקת בכוונת המשתמש. דחיית כל אותה עבודה ל־timer אחרי הציור אינה הוכחת חיסכון. גלילה אינה מפעילה סריקה כבדה של הארכיון. שיטות/ספירות/סדר/תוצאות נשמרים; חלון תוצאות קטן אינו מוצג כמכלול מלא.

4. עיבוד מקור מתרחש מחוץ לקריאת המבקר. חילוץ, OCR, מיפוי מקטעים/תאריכים והכנת קשרים מתבצעים דרך בעלי Intake/Research/Graph הקיימים בעת קליטה או שינוי מתאים, ובמנות תחומות. לאחר שינוי מקור, אישור, שיטה או הרשאה מעדכנים/מבטלים רק נגזרות מושפעות לפי התלויות. "פעם אחת" פירושו שימוש חוזר בתוצאה תקפה, לא תוצאה שאינה מתעדכנת. המלצה ל־index/cache/precompute אינה אישור לטבלה, מנוע, job או store חדשים; נדרשת הוכחת צורך ושיוך בעלים במשימת המימוש.

5. זכאות לפני שליפה ומטמון. רק נתונים המותרים לקורא נכנסים לתוצאה ולספירותיה. אין הסתמכות על הסתרת רכיב או גלריה כתחליף להרשאה בשרת. מטמון ציבורי אינו מכיל טיוטה, מידע פרטי או תוצאת מנהל. גרסת מקור, מוקד והרשאות נשמרים לפי חוזי הבעלים, וביטול פרסום/הרשאה חייב למנוע הגשת נגזרת ישנה שאינה מותרת. אינדקס או מד לא מרחיבים הרשאות.

6. עולם אחד. Research OS / Reality Graph, זהויות, חישובים, מקור, תאריך ופרסום נשארים אצל בעליהם. יחידות תוכן הן מקטעי מקור, לא יסוד/חוזה־על חדש. העולם, הבית, הפוסט, המספר והארכיון מקרינים אותן זהויות בלי העתקי אמת. פרסום מקור, עדכון מקור, יבוא ומועד האירוע נשארים מובחנים. שוויון מספר או תגית אינם יוצרים קשר מאושר, אירוע או הורות.

7. סדר עבודה וקבלה. ממשיכים תיקוני ביצועים קיימים מהבסיס המאומת; אין התחלה מחדש ואין חובת מיפוי כל הארכיון כתנאי להאצת הליבה או לסגירת G4. בוחרים תיקון לפי תרומתו הנמדדת למסלול הראשי, עם בדיקה תואמת ל־SHA/קלט/פרופיל, cold מול ניווט, תוכן נראה, קריאות/בתים, זמן מסד מיוחס, כשל/ריק, חזרה והרשאות. מסכים עתידיים צורכים את הכלל הזה ואת שערי הביצועים הקיימים. המד המשותף החדש, מסעות מתקדמים ו־VR אינם תנאי לסגירת ביצועי הליבה.

8. גבול האימוץ. אושרה מדיניות הטעינה והקדימות שבסעיף זה בלבד. מיקום/עיצוב המד המשותף, נוסחתו ומשקלותיו, חוויית הזרם הכוללת, שינוי ציונים, מיתוג/נתיבים חדשים, מיפוי הארכיון והפיילוטים החדשים נשארים DRAFT עד ההחלטות הרלוונטיות. quality, convergence_meter ו־Gold/Diamond אינם מתאחדים לציון אמת אחד. אין בתוספת אישור לשינוי קוד, נתוני מוצר, RLS/מתגים חיים, Legacy, merge, CI או פריסה. ביצוע ושחרור נשארים משימות נפרדות תחת הבעלים והשערים הקיימים.

מניעת כפילות: ממשיך קורא את הסעיף הזה דרך Experience Governance. V3 והמסירות מצביעים אליו; אין ליצור "חוזה זרם" או "חוק מהירות" מקביל לאותה אחריות. פרקים שטרם אומצו ב־V3 נשארים תכנון מקור, ואימוצם העתידי נעשה אצל בעליהם בנפרד.
',updated_at=now() WHERE id=30;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Expected one canonical contract'; END IF;
  UPDATE public.project_codex SET body='> **עדכון סמכות · 16.10.2026:** מדיניות הטעינה הממוקדת והתוכן הטרי בלבד אומצה ב־experience_governance_foundation_v1_law v10, בגוף הקנוני project_codex id=30, slug=experience_governance_foundation_v1, סעיף "V10 — טעינה ממוקדת ותוכן טרי ב־2029". מקור האימוץ: פרקים 17, 25, 28.1, 29.3 ו־29.5 והבהרות צוריאל. אין להעתיק את המדיניות לחוזה מקביל. **שאר המסמך, לרבות המד/עיצוב/נוסחאות/חוויית הזרם, נשאר DRAFT; לא ניתן אישור מימוש, שינוי נתוני מוצר או שחרור.** כל גוף V3 המקורי נשמר להלן ללא שינוי.

' || old_source,updated_at=now() WHERE id=37;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Expected one source draft'; END IF;

  UPDATE public.nodes SET is_active=false WHERE id=prev.id AND is_active=true;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Expected one predecessor'; END IF;
  INSERT INTO public.nodes(type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  VALUES ('rule','Experience Governance v10 — Focused Loading, Fresh Core and On-Demand Archive',
    prev.description || E'\n\n' || '[UPDATE v10 · Human-Gate ZURIEL · 16.10.2026 — FOCUSED LOADING / FRESH CORE / ON-DEMAND ARCHIVE · EXTEND_EXISTING]
The canonical detailed policy lives only in project_codex.slug=''experience_governance_foundation_v1'' (id=30), section "V10 — טעינה ממוקדת ותוכן טרי ב־2029". Consume that section before 2029 performance or new-surface work. It ratifies bounded first-content loading, new/relevant content priority, on-demand archive/depth and change-driven reuse under the existing owners. Source/provenance: project_codex id=37, slug=''sod1820_reality_stream_os_master_v3_20261016_draft'', §§17,25,28.1,29.3,29.5 plus ZURIEL''s 16.10.2026 chat authorization to fix this policy in the existing laws. Only this scoped loading policy is adopted. The remaining V3 product/UX, shared meter design/formula, new source mapping/pilots and release remain DRAFT or separately gated. This governance amendment makes no implementation, product data, access, score, Legacy, merge or deployment change. All preceding semantics remain unless explicitly scoped here; current owners/gates still apply.',
    coalesce(prev.metadata,'{}'::jsonb) || jsonb_build_object('focused_loading_v10','{"human_gate":"ZURIEL — focused-loading policy only; explicit governance/passive-log write confirmation received in chat after auto-review rejection","source_project_codex_id":37,"source_slug":"sod1820_reality_stream_os_master_v3_20261016_draft","source_body_md5":"b4b728fdbe6d25f7f4569c25bacf75aa","canonical_body_project_codex_id":30,"canonical_body_section":"V10 — טעינה ממוקדת ותוכן טרי ב־2029","adoption":"SCOPED_LOADING_POLICY_ONLY","remaining_v3":"DRAFT","owner_check":"EXTEND_EXISTING","implementation":"NOT_IMPLEMENTED","task_key":"GPT_2029_FOCUSED_LOADING_POLICY_ADOPTION_20261016"}'::jsonb),
    true,prev.rule_id,10,prev.depends_on,9,prev.weight,prev.hebrew_date,prev.axis_theme,prev.gallery_id,prev.identity_key)
  RETURNING id INTO new_id;

  IF (SELECT count(*) FROM public.nodes WHERE type='rule' AND rule_id=prev.rule_id AND is_active)<>1
     OR (SELECT description FROM public.nodes WHERE id=prev.id) IS DISTINCT FROM prev.description
     OR (SELECT metadata FROM public.nodes WHERE id=prev.id) IS DISTINCT FROM prev.metadata
     OR (SELECT left(body,length(old_contract)) FROM public.project_codex WHERE id=30) IS DISTINCT FROM old_contract
     OR (SELECT right(body,length(old_source)) FROM public.project_codex WHERE id=37) IS DISTINCT FROM old_source THEN
    RAISE EXCEPTION 'History or active-version assertion failed; rollback.';
  END IF;

  INSERT INTO public.work_log(topic,what_we_did,status,task_key,from_actor,to_actor,assignment_mode,assignment_scope,primary_owner,release_authorization_state,parent_assignment_id,open_threads,dispatch_kind,dispatch_state)
  VALUES ('2029 focused-loading policy — AFTER','Governance only: Experience v10 active, v9 preserved inactive; full canonical policy in codex30; original V3 preserved in codex37 with scoped adoption pointer, remaining UX/meter/formula DRAFT. No product code/data/RLS/flags/CI/merge/deploy changes. One active rule verified.','AFTER_GOVERNANCE_POLICY_ADOPTED_NOT_IMPLEMENTED_SCOPE_RELEASED','GPT_2029_FOCUSED_LOADING_POLICY_ADOPTION_20261016','GPT','ZURIEL','WRITE','nodes experience_governance_foundation_v1_law; project_codex ids30,37','experience_governance_foundation_v1_law','GOVERNANCE_ONLY_NO_PRODUCT_RELEASE',before_id,'Ownership released. Existing performance work continues; future product implementation/release separate. No dispatch/ACK.',NULL,NULL);
  IF EXISTS(SELECT 1 FROM public.work_log WHERE task_key='GPT_2029_FOCUSED_LOADING_POLICY_ADOPTION_20261016' AND (to_actor IS DISTINCT FROM 'ZURIEL' OR dispatch_kind IS NOT NULL OR dispatch_state IS NOT NULL)) THEN
    RAISE EXCEPTION 'Passive log assertion failed; rollback.';
  END IF;
END $policy_update$;
SELECT rule_id,rule_version,is_active,supersedes_version,id FROM public.nodes WHERE rule_id='experience_governance_foundation_v1_law' AND rule_version IN (9,10) ORDER BY rule_version;
COMMIT;
