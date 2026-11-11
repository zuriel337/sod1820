-- SOD1820 · Group B — shared contracts aligned to the Legacy removal (non-frozen rules + codex) — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies its result. Nothing is deleted.
-- Held, NOT in this file: 9 group-B rules frozen by ד5 (canonical_colors_law, logo_integrity_law, brand_spelling_law,
-- sod1820_canonical_identity_law, canonical_ui_components_law, reality_stream_law, raziel_voice_law, els_single_engine_law,
-- video_transcription_law); unified_tags_law (open decision G5 / PR #1296); P3 wording-only rules without another reason
-- to bump (els_research_layer_law, raziel_response_contract).
begin;

-- ── worlds_color_law: v1 → v2 ───────────────────────────────────────────────
do $sod_blk$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='worlds_color_law' and is_active for update;
  if not found then raise exception 'S23 worlds_color_law: no active version (drift)'; end if;
  if v_base.rule_version <> 1 then raise exception 'S23 worlds_color_law: active version is v% (expected v1)', v_base.rule_version; end if;
  if md5(v_base.description) <> '28a7053c115b5f76be3bb5523d59e2fc' then raise exception 'S23 worlds_color_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> 'a966bf87dfb461e9e460f84d675be96c' then raise exception 'S23 worlds_color_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='worlds_color_law' and rule_version > 1) then
    raise exception 'S23 worlds_color_law: a version above v1 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$חוק צבעי העולמות v2 — פלטה גלובלית אחידה · בעלים: Design Contract V2$sod_lbl$, $sod_txt$כל עולם (nodes.metadata.world) משויך למשפחת-צבע קבועה, אחידה בכל האתר (מקור אמת: src/lib/worlds.js). מטרה: סינון מדויק וזיהוי ויזואלי עקבי. ציר רוחני דין→רם: דין/ס"א=אדום, רם/חסד=תכלת. משפחות: גאולה וקודש=זהב #c9a227 · שמות הקודש ואלוהות=זהב בהיר #d4af37 · קבלה וסוד=סגול #8b5cf6 · עבודת ה' ומידות=תכלת #3ea6ff · מלאכים=תכלת בהיר #5bc8e6 · אבות ונביאים=ירוק #2f9e6b · דין וסטרא אחרא=אדום #d64545 · זמן ומועד=כתום #e08a2e · עולם ואקטואליה=כחול-אפור #6b7a99 · טבע וגוף=חום #8a7a4a · כללי=אפור #9a9285. מוצג במד ההתכנסות: «התכנסות מילים» מקובצת לפי עולם בצבעי המשפחה + מקרא צבעים. שלב 1 (לפי קטגוריה/world קיים); הרחבה עתידית: סיווג נוסף.

[v2 · 11.11.2026 · יישור בעלים] בעל החוזה: SOD1820_DESIGN_CONTRACT_V2.md (V1 הוחלף והוא היסטוריה בלבד). ערכי הצבע ומקור האמת src/lib/worlds.js לא השתנו.$sod_txt$, $sod_meta${"axis": "דין(אדום)→רם(תכלת)", "compaction_v1": {"canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "classification": "CHILD_OF_OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "brand_design", "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md"}, "g3_disposition_v1": {"classification": "KEEP_SCOPED_SEMANTIC", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "src/lib/worlds.js remains a current semantic world/domain color owner consumed by 2029 and legacy components and referenced by the active Design Contract", "revalidated_at": "2026-09-30"}, "owner_routing": {"canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "confidence": "high", "domain": "brand_design", "normalized_at": "2026-11-11", "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md", "resolution": "RESOLVED", "source": "SOD1820_MASTER_OWNER_INDEX/project_codex._index/existing_owner_contracts", "version": 1}, "shown_in": "ConvergenceMeter (התכנסות מילים) + legend", "source": "src/lib/worlds.js", "v2_owner_alignment": {"change": "canonical owner V1 → V2; values unchanged", "human_gate": "ZURIEL 2026-11-10 (§4 shared contracts)", "owner_check": "EXTEND_EXISTING"}}$sod_meta$::jsonb, true, 'worlds_color_law', 2,
          v_base.depends_on, 1, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '434338925f6a206cd7dd9e9c0dfe3712' then
    raise exception 'S23 worlds_color_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='worlds_color_law' and is_active) <> 1 then
    raise exception 'S23 worlds_color_law: active version count is not 1';
  end if;
end
$sod_blk$;

-- ── subscription_funnel_law: v22 → v23 ───────────────────────────────────────────────
do $sod_blk$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='subscription_funnel_law' and is_active for update;
  if not found then raise exception 'S23 subscription_funnel_law: no active version (drift)'; end if;
  if v_base.rule_version <> 22 then raise exception 'S23 subscription_funnel_law: active version is v% (expected v22)', v_base.rule_version; end if;
  if md5(v_base.description) <> 'c677126201763faae5a8cd80cf397a81' then raise exception 'S23 subscription_funnel_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> '0bcce796e00094fc782fb7610147cc9a' then raise exception 'S23 subscription_funnel_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='subscription_funnel_law' and rule_version > 22) then
    raise exception 'S23 subscription_funnel_law: a version above v22 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$🧲 חוק מנוע-המשפך — Follow → הרשמה לאורח / ערוצים לרשום (v23 · יישור להסרת Legacy)$sod_lbl$, $sod_txt$עיקרון-על (נעל צוריאל 9.8.2026): לא בונים אוסף כפתורי-Follow ומנגנוני-התראה נפרדים — הכל **מנוע אחד**. כל מקום שאדם מגלה בו תוכן → מציע **פעולה אחת ברורה** → המערכת מנהלת את ההמשך אוטומטית. ממחזרים את הקיים (notification_prefs + user_notifications + Resend + push_subscriptions + subscribers + Follow), לא מערכת מקבילה.

🧱 3 שכבות — לעולם לא מערבבים:
1. מנוי (מה אני עוקב אחריו) = notification_prefs.topics (namespace חופשי: broad · author:<שם> · cat:<קטגוריה> · code:<slug> · codes:new · number:<n> · topic:<slug> · thread:<id> · or-geula · videos · site-news).
2. התראה (אירוע שקרה) = user_notifications (+ פונקציית fan-out אחת notify_topic).
3. ערוץ (איך מגיע) = In-App(פעמון) · Push(send-push) · Email(Resend/notify-approval דפוס) · WhatsApp(עתיד). Dispatcher מרכזי אחד מחליט ערוץ — לא כל תוכן מנהל מייל/push בעצמו.

🔘 WatchButton קנוני יחיד (הכללת FollowWriter) בכל נקודת-תוכן (פוסט/צופן/מספר/מחקר/אור-הגאולה/סרטון/שרשור/קטגוריה). Escalation «הפעולה הבאה» בלבד (לא הכל בבת-אחת): צפייה→Follow→«רוצה Push?»→«רוצה Email?»→Share→«לא לפספס את הבא?». כל לחיצה רושמת subscribe_event עם source.

🤖 אוטומציה (המשתמש לא מבין טריגרים): אירוע-תוכן → מי עוקב? → סוג-עדכון → ערוץ-פעיל → dedup/לא-לעצמו/muted → שליחה → Audit. הגדרות מתקדמות רק ב«מרכז העדכונים שלי».

👤 מרכז-משתמש אחד «🔔 מרכז העדכונים שלי» (UserCenter — רכיב Legacy שהוסר ב-5.11.2026; האזור האישי ב-2029: /2029/me/*): «מה יש היום?» (Feed מאוחד: צופן/פוסט/מספר/כתב/אור-הגאולה/סרטון/שרשור חדשים לפי המנויים) + «אחרי מה אני עוקב» (לפי קטגוריות) + «ערוצים פעילים» + בורר-מייל אחד (בתוך-האתר/מייל/דיג'סט).

🛡️ מרכז-אדמין אחד: משפך (חשיפה→Follow→Push→Email→Share→הרשמה) לפי מקור (פוסט/קטגוריה/צופן/מספר/מחקר/כתב/אור-הגאולה/סרטון/WhatsApp/פורום/ניוזלטר) · מנויים פעילים/חדשים לפי-מקור · ערוצים · מערכת (נוצרו/נשלחו/נכשלו/בתור/ביטלו) · «למה האדם קיבל?» Audit-trail (subscribe→event→notification→channels_sent).

📊 מקור-מנוי = טבלת subscribe_events(user/visitor, topic, source, action, ts) append-only — «186 עקבו אחרי codes:new; 82 מפוסט, 41 מדף-צופן…». WhatsApp = ערוץ-הפצה בלבד (אתר→Follow→הצעת-WA · WA→אתר→Follow), לא מאגר-תוכן. «רזיאל מציע» = שכבת-המלצות עתידית (מבוסס-פעילות, מציע-בלבד/המשתמש-מאשר).

התוכנית המלאה + שלבים: select what_we_did from work_log where topic ilike '%מנוע-משפך%' order by created_at desc limit 1;

== 8 חוקי-ברזל (נעל צוריאל 9.8.2026, v2) — כדי שלא נחזור לפיצול ==
1. Follow אחד לכל האתר: אותו <WatchButton> ואותה לוגיקה בפוסט/קטגוריה/צופן/מספר/מחקר/כתב/אור-הגאולה/סרטון/שרשור — **רק ה-topic משתנה**. אסור רכיב-מעקב נוסף.
2. כל Follow שומר source (post_footer/category/code_page/entity_page/research/writer/or_geula/video/forum/whatsapp) ב-subscribe_events — כדי למדוד איזה תוכן מביא מנויים.
3. כל Follow מסביר מה מקבלים במשפט אחד («תקבל עדכון כשיתפרסם צופן חדש» / «…מחקר חדש בנושא»). אין Follow אנונימי.
4. Follow קודם, ערוץ אחר-כך — לא מציפים. משפך: Follow → «רוצה התראה מיידית?»(Push) → «רוצה גם למייל?»(Email) → בהמשך WhatsApp. כל שלב = פעולה נפרדת.
5. «מה יש היום?»/«מה חדש בשבילי» = היעד המאוחד היחיד — כל מה שנשלח מתנקז לשם. המשתמש לא מחפש בין מודולים.
6. מרכז-האדמין = משפך (חשיפה→Follow→Push→Email→Share), וגם לפי-מקור (פוסט/צופן/מספר/מחקר/כתב/אור-הגאולה/סרטון/WhatsApp/פורום). לא רק «מספר מנויים».
7. שער-מנוי קנוני בתחתית-תוכן = רכיב קבוע יחיד: «רוצה לדעת כשיש המשך? 🔔 עקוב» → אחרי Follow: «✓ אתה במעקב · 📱 רוצה גם התראה מיידית?». ניתן להטמעה בכל סוגי-התוכן בלי רכיב חדש לכל מקום.
8. לא בונים הכל בבת-אחת — מעדכנים חוק/work_log קודם, מציגים שלב-1 מדויק, ורק אחרי אישור מתחילים קוד.
המטרה: עץ אחד · מנוע-מנויים אחד · WatchButton אחד · Feed אחד למשתמש · מרכז-פיקוד אחד לאדמין.

== חוקי-אידמפוטנטיות (v3, נעל צוריאל 9.8.2026) — כלל-ברזל, לא רק עמודה ==
• dedupe מחייב: אותו (recipient + event/kind + source_ref) לא ייצר שתי התראות — נאכף ב-DB (unique index חלקי על dedupe_key + on conflict do nothing). קריטי בטריגרי-פרסום: פוסט שפורסם פעם אחת = התראה אחת לאדם, גם אם הטריגר רץ פעמיים וגם אם האדם עוקב אחרי כמה מהקטגוריות שלו (distinct recipient). ה-topic נשמר ב-source_topic ל-Audit אך לא מרבה התראות.
• Follow שכבר קיים → אין מנוי כפול ואין subscribe_event נוסף. Unfollow → לא מוחקים היסטוריה (append-only). Follow-מחדש (אחרי unfollow) → אירוע חדש ב-subscribe_events. subscribe_events = append-only תמיד.
• שלב 1: notify_topic שולח In-App בלבד (בלי Email/Push). PostFollowBox נשאר ללא שינוי-התנהגות עד שלב 2. אין טבלה נוספת מעבר ל-subscribe_events.
• סגירת-מנוע-בסיסי לפני הרחבה: שלב 1 = DB → notify_topic → fan-out (cat:/codes:new) → WatchButton (צופן/מספר/קטגוריה). בודקים חי, ורק אז מרכז-פיקוד + Email (שלב 2).

== Personal Relevance Layer (v4, נעל צוריאל 9.8.2026) — תיעוד בלבד, שלב עתידי ==
עיקרון-על: לא מבקשים מהמשתמש להגדיר את «העולם שלו» אם המערכת יכולה להסיק אותו מהפעילות. חיפוש→שמירה→נעיצה→מחקר→תרומה→מעקב = סיגנלים של העולם האישי (כבר קיימים ב-research_items: 4,462 חיפושי-ביטוי/238 מספרים/עגלה/ספרייה/נעיצות + research_contributions + notification_prefs). זו עדשה/שאילתה, לא מערכת חדשה.
מבנה: תוכן חדש → זיהוי ישויות → התאמה לעולם-האישי הקיים (research_items) → דירוג רלוונטיות → «מה קורה בעולם שלי» → ורק בהמשך, אם מתאים, הצעת Follow/Push/Email.
4 חוקי-ברזל: (1) רלוונטיות ≠ מנוי — research_items=סיגנל-עניין בלבד; Follow=בחירה מפורשת. אסור להציג «אתה עוקב אחרי X» רק כי חיפש/שמר. UI מבחין ברור: 🔔 אני עוקב · 🟢 רלוונטי אליך · ✨ רזיאל מציע. (2) רלוונטיות לא שולחת אוטומטית Push/Email — בשלב 1 מופיעה רק בתוך «מה קורה בעולם שלי»; ערוצים רק אחרי מדיניות-הסלמה. (3) רזיאל = שכבת דירוג/המלצה בלבד — לא מקור-ידע, לא מאמת, לא משנה את עץ-הידע, לא יוצר מנויים בעצמו. (4) אפס טבלאות חדשות בשלב זה — קודם read-model אחד (my_world) מעל research_items+research_contributions+notification_prefs+הישויות הקיימות, ורואים מה הוא מסוגל.
3 רמות: 🎯 «הדברים שלי» (מוסק אוטומטית) · 🌐 «העולם שלי» (מנוי-אחד, WatchButton יחיד world:<uid>) · 🌍 «כל האתר» (הנושאים הרחבים שכבר נבנו). «המספר האישי» = עוד ישות בתוך העולם האישי, לא בסיס המערכת (האתר עובד מצוין גם בלעדיו).
משמעת: לא בונים את רזיאל/העולם-האישי לפני ש-Watch/Subscription הבסיסי (שלב 1) יציב — לא מחברים שכבת-AI למנוע שעדיין משתנה.

== שפה-קנונית למעקב (v5, נעל צוריאל 9.8.2026) ==
• מעקב ≠ שיתוף: שיתוף=פעולה-על-התוכן-עכשיו · מעקב=עדכונים-בעתיד. אסור לערבב באותו אשכול-אייקונים. אשכול-1=פעולות-תוכן/שיתוף · אשכול-2=«🔔 אזור-מעקב» מובחן ונפרד (קו-הפרדה, כותרת «רוצה לדעת כשיש חדש?», אחרי Follow «✓ אתה במעקב · נעדכן כשמתפרסם חדש»).
• Value-First: לא Follow בראש-הדף לפני שהמשתמש ראה ערך. מיקום: מספר→אחרי התוכן/המחקר · צופן→אחרי הצופן ותוכנו · קטגוריה→אחרי תחילת הרשימה · פוסט→בסוף התוכן.
• רכיב אחיד, משמעות-לפי-ישות: אותו WatchButton, אבל topic+טקסט אמיתיים לפי הישות. לא מציגים כפתור עם משמעות שגויה רק כדי שיהיה כפתור. דוגמה: בדף-צופן-ספציפי אין codes:new («צפנים חדשים» כלליים); «עקוב אחרי הצופן הזה»=code:<slug> יוצג רק כשיהיה לו fan-out אמיתי (שלב 2). codes:new שייך לאזור-צפנים כללי.
• מומש שלב-1: אזור-מעקב קנוני (gate) במספר(number:<n>, תחתית-קריאה) + קטגוריה(cat:<name>, אחרי הפוסטים). צופן-ספציפי ללא-מעקב עד code:<slug>. הכל In-App, source נשמר, אידמפוטנטי.

== 🗺️ מפת «משפחת-המעקב» (v6, נעל צוריאל 9.8.2026 — המסמך הקנוני של שלב 2, לפני נגיעה בעוד כפתור) ==
עיקרון: לא מוסיפים עוד «עקוב» נקודתי. קובעים שפה אחת לכל האתר. 3 פעולות שלעולם לא מתערבבות באותו אשכול:
• 📤 שיתוף = אני מפיץ לאחרים (ShareActions) · • 🔖 שמירה/איסוף = אני שומר אצלי (ToolActions/QuickActions — הוסרו ב-5.11.2026 · הוסף למחקר/ספרייה) · • 🔔 מעקב = המערכת תודיע לי כשיש חדש (WatchButton). מעקב הוא פעולה עצמאית, לא ענקית, ולעולם לא בתוך אשכול-השיתוף.

«מעקב» לא חייב להיות על דבר בודד. 4 משפחות (אותו WatchButton, topic שונה):
【A. ישות】 דבר ספציפי אחד:
• מספר number:<n> — לעקוב? כן · מקבל: עדכון כשמתגלה חומר חדש (מחקר/רמז/התכנסות) על המספר · כפתור: תחתית קריאת דף-המספר, אזור-מעקב מובחן · אחרי Follow: «✓ נעקוב אחרי N עבורך. רוצה שאעקוב גם אחרי העולם המספרי שלך? [כן]» · ערוצים: In-App(1)→Push/Email(2) · רזיאל: מוסיף N ל«המספרים שלי» ומדרג · מרכז אישי: «🔢 המספרים שלי».
• כתב author:<name> — כן · עדכון כשהכתב מפרסם פוסט/חידוש · דף-הכתב + ליד הפוסטים שלו · הצעת «העולם שלי» · In-App(1)→(2) · «👑 הכתבים שאני עוקב אחריהם».
• פוסט/שרשור thread:<id> — כן, עדין · תגובות/המשך לפוסט · סוף התוכן (המרת PostFollowBox→WatchButton, שלב 2) · הצעת-Push · In-App · «הפוסטים שאני עוקב אחריהם».
• התכנסות topic:<slug> — כן · חומר/עדכון בהתכנסות · דף-הטופיק אחרי התוכן · הצעת עולם · In-App(2).
• צופן-ספציפי code:<slug> — ⛔ לא בשלב זה. «עקוב אחר הצופן הזה» = אין דבר כזה. דף-הצופן מפנה לערוץ codes:new. code:<slug> יופעל רק אם/כשיהיה לו fan-out אמיתי לעדכוני-צופן.

【B. ערוץ】 זרם-תוכן (לא ישות בודדת) — כאן «עקוב» טבעי:
• זרם המציאות stream:reality 🌊 — ✅מומש · תמונה/רמז חדש בזרם · כותרת /archive · הצעת-Push · In-App✅→(2) · «🌊 הזרם».
• צפנים חדשים codes:new 🧩 — כן · צופן-קהילה חדש · אזור-הצפנים הכללי /codes (לא דף-צופן בודד) · In-App✅(טריגר קיים)→(2) · «🧩 הצפנים».
• חידושי בית המדרש beitmidrash:new 📜 — כן · חידוש-AI/מערכת חדש · מרכז המחקר/בית המדרש · In-App(2) · רזיאל מדרג לעולם · «📜 חידושים».
• אור הגאולה orgeula:new — כן · שידור/עדכון חדש · דף אור הגאולה · In-App(2).
• סרטוני אור הגאולה orgeula:video 🎬 — כן · סרטון חדש · קטגוריית וידאו/דף אור הגאולה · In-App(2).
• קטגוריה cat:<name> 🗂️ — ✅מומש · פוסט חדש בקטגוריה · ראש דף-הקטגוריה · הצעת-Push · In-App✅→(2).

【C. עולם】 צבירה מעל הישויות של המשתמש (רזיאל עושה את העבודה מאחורי הקלעים; המשתמש לא רואה number:1820/cat:x):
• 🔢 המספרים שלי world:numbers · 🔤 הגימטריות שלי world:gematria · 🔬 המחקרים שלי world:research · 🌍 כל העולם שלי world:mine (מטרייה).
לעקוב? כן (שלב עתידי) · מקבל: עדכונים על כל מה שקשור לעולם שלך · כפתור: הצעת-הסלמה אחרי כל Follow-ישות + במרכז האישי · אחרי: בורר-עניין (☑ מספרים ☑ גימטריות ☑ צפנים ☑ חידושים ☑ כתבים) · ערוצים: In-App→Push→Email · רזיאל: הלב — מסיק חברות מ-research_items ומדרג · מרכז: «🌍 העולם שלי».

【D. אישי】 world:mine = העולם שלך + מה שרזיאל מזהה כרלוונטי — המטרייה שמעל הכל. UI מבחין תמיד: 🔔 אני עוקב · 🟢 רלוונטי אליך · ✨ רזיאל מציע (רלוונטיות ≠ מנוי).

«מעקב = שער» (מודל הלחיצה, לא להעמיס בפעם הראשונה):
לחיצה 1 = Follow (In-App כברירת-מחדל) → «✓ אתה במעקב» + פעולה-הבאה-אחת בלבד (או «רוצה גם התראה מיידית?»Push, או «רוצה שאעקוב אחרי העולם שלך?»). בורר-ההעדפות המלא (ערוצים In-App/Push/Email + בורר-עניין) חי אך ורק ב«🔔 מרכז העדכונים שלי», לא בפופאפ הראשון.
דף-המספר החכם: לא «עקוב אחרי 1820» יבש — אלא «רוצה לדעת כשמתגלה משהו חדש שקשור למספר הזה? 🔔 עקוב» → אחרי: «✓ נעקוב אחרי 1820. רוצה שאעקוב גם אחרי העולם המספרי שלך?» (נקודתי + אישי-רחב בלי לכפות בחירה מראש).

7 ההחלטות לכל יעד-מעקב (התבנית שקובעים לפני בנייה): (1) בכלל אפשר לעקוב? (2) מה בדיוק מקבלים? (3) איפה הכפתור? (4) מה קורה אחרי Follow? (5) In-App/Push/Email? (6) מה רזיאל מוסיף? (7) איך מופיע במרכז האישי?
משמעת: לא נוגעים בעוד כפתור-מעקב עד שהמפה הזו מאושרת. כל יעד חדש = שורה במפה קודם, קוד אחר-כך.

== ✅ הכרעות-נעילה + סדר-ביצוע (v7, אישר צוריאל 9.8.2026 — לא לפתוח מחדש תוך כדי בנייה) ==
1. code:<slug> — לוותר כרגע. רק codes:new מוצג. code:<slug> **לא מוצג בכלל** (לא ככפתור-מושהה) עד שיהיה לצופן אירוע-המשך אמיתי. אין UI שמבטיח התנהגות בלי מנוע מאחוריו.
2. סדר שלב 2 (מאושר בדיוק): (א) PostFollowBox → WatchButton — סוגר את חריגת-המעקב האחרונה: WatchButton אחד בכל האתר. (ב) «מרכז העדכונים שלי» — הלב: מקום אחד עם «🔔 מה חדש בשבילי / אני עוקב / 🟢 רלוונטי / ✨ רזיאל מציע» + ההודעות עצמן + בורר-ערוצים (בתוך-האתר/Push/Email) — ההעדפות חיות כאן בלבד, לא בפופאפ Follow. (ג) רק אחר-כך world:*+רזיאל. קודם צינור אמין (אירוע→מנוי→התראה→מרכז), ורק אז רזיאל מוסיף (אירוע→התאמה→דירוג→«רלוונטי אליך»). לא מערבבים מנוע-התראות עם AI.
3. world:mine = כפתור אחד בלבד «🌍 עקוב אחרי העולם שלי». לא ארבעה. המשתמש לא רואה world:numbers/gematria/research — רק שליטה/תצוגה בתוך מרכז-העדכונים (🔢 מספרים · 🔤 גימטריות · 🔬 מחקרים · 👑 כתבים · 📜 חידושים · 🧩 צפנים). המערכת בונה את העולם מההתנהגות הקיימת.

== 🌱 חוק «העולם נבנה מהחיים, לא מטופס» (v7) ==
לעולם לא להציג «🌍 עקוב אחרי העולם שלי» כשהעולם ריק. משתמש חדש כמעט בלי פעילות → מסך-התחלה במקום כפתור: «🌍 בנה את העולם שלך — חפש מספר, גימטריה או מחקר שמעניין אותך, ומכאן נתחיל לזהות מה רלוונטי לך.» ה-World אינו טופס-הרשמה נוסף — הוא נבנה מ-research_items (חיפוש→שמירה→נעיצה→מחקר→מעקב).

== 🚦 הוראת-ביצוע נוכחית (v7) ==
מתחילים אך ורק מ-(א) PostFollowBox → WatchButton. לא מרכז · לא רזיאל · לא world:* · לא Email · לא Push. אחרי ההמרה: בדיקת אחידות בכל נקודות-המעקב (פוסט/מספר/קטגוריה/זרם), ורק אחרי שהאחידות מאומתת עוברים ל-(ב) מרכז-העדכונים. לא לפרוס את מנת-הפריסה הגדולה עד «תעלה» מפורש בסיום סבב ה-UX.

== ✂️ v8 (אישר צוריאל 9.8.2026) — מעקב אחרי קטגוריה בלבד + מיקום כפתור-הזרם ==
1. ⛔ אין «מעקב אחרי כתב» (author:<name>) — הוסר לגמרי. הסיבה: מי שעוקב אחרי כתב מסוים בלי הקטגוריה שובר את «העץ האחד» (למשל לעקוב אחרי אלון לוי בלי «תיעוד אירועים»). המעקב בתחתית-פוסט הוא **תמיד על הקטגוריה הראשית** (cat:<שם>); אם אין קטגוריה → אין כפתור. FollowWriter נמחק ו-«עקבו» הוסר מדף-הכתב (נשאר «שלח הודעה» + וואטסאפ). משפחה A (ישות) בשלב זה: number/thread/topic בלבד — author מושהה.
2. 🌊 כפתור «עקוב אחרי הזרם» (stream:reality): **קומפקטי, ממורכז, שורה אחת** — לא בלוק שתופס מקום, לא צמוד-ימין. מוצג **גם בעמוד הבית וגם בארכיון** (מחוץ ל-hideHeader). paletteMode תואם forceDark כדי שלא יהיה כפתור-בהיר בזרם-כהה.

== 🚪 v9 (נעל צוריאל 9.8.2026) — «Follow הוא שער, לא המנוי» + מסע-המשפך ==
עיקרון: Follow = פעולה ראשונה בחיכוך-מינימלי (מותר אנונימי, בלי לחסום, בלי לדרוש הרשמה לפני). מרגע ה-Follow המערכת מזהה אם האדם עדיין לא רשום → מכניסה אותו למשפך בהדרגה, בלי פופאפ אגרסיבי. קודם ערך, אחר-כך הצעד הבא.
הפרדה קדושה (לא מערבבים, מובילים ביניהם בהדרגה): Follow ≠ Newsletter ≠ Subscription ≠ Push.
חוק-ברזל: Follow יכול להיות אנונימי/לפני-הרשמה, אבל **מרכז-העדכונים המלא שייך רק למשתמש רשום/מנוי**.

מצב אחרי Follow — שונה לפי זהות (הצעד-הבא-אחד בלבד):
• מחובר/רשום → «✓ אתה במעקב» → «רוצה גם התראה מיידית?» (Push) · «פתח את מרכז העדכונים שלך».
• לא-רשום → «✓ עקבת» → «כדי לנהל את כל העדכונים שלך במקום אחד — הצטרף לסוד 1820».

מסע-המשפך (איפה נפתח / מה מקבלים):
0. אורח — רואה תוכן (פוסט/מספר/זרם/כתב). ערך מיידי, בלי חסימה, בלי הרשמה.
1. Follow (השער) — כפתור-מעקב קטן בכל נקודת-תוכן. לחיצה אחת → «נעקוב עבורך». המנוי נשמר מיד (אנונימי=visitor_id · מחובר=user_id).
2. הסתעפות אחרי-Follow — הצעד-הבא לפי זהות (ראה למעלה). לא אגרסיבי.
3. הרשמה (כניסה למשפך) — נפתחת מהצעד-הבא של לא-רשום. הרשמה+אימות-מייל (subscribe_gate_law). ה-visitor_id נתבע (claimVisitorPrefs) — המעקבים שנעשו כאורח עוברים למשתמש. מקבל: זהות + גישה למרכז.
4. מרכז-העדכונים שלי (היעד — רשומים בלבד) — נפתח מהפעמון/תפריט/«פתח מרכז». מקבל: «מה חדש בשבילי» (Feed מאוחד) · «אחרי מה אני עוקב» · «ערוצים פעילים» · ניהול הכל במקום אחד.
5. Push / Email (ערוצים, הסלמה) — נפתח מתוך המרכז או מהצעת «רוצה התראה מיידית?». מקבל: אותן התראות In-App גם כ-Push (send-push) וגם כ-Email (Resend). ערוץ נבחר במפורש, לא אוטומטי.
6. WhatsApp (עתיד, ערוץ-הפצה) — נפתח מתוך המרכז / אתר→Follow→הצעת-WA. מקבל: עדכונים גם בוואטסאפ (Green API). ערוץ-הפצה בלבד, לא מאגר-תוכן.

עיצוב-כפתורים (v9, בכפוף לאישור לפני קוד): תחתית-פוסט = שתי פילים קטנות ממורכזות (📁 הקטגוריה · 📄 הפוסט), לא כרטיס-ענק. זרם-המציאות = כפתור-מעקב **בתוך שורת-הסינון**. דף-כתב = «🔔 עקבו» מוחזר (מעקב-כתב הגיוני בדף-הכתב עצמו; רק בתחתית-פוסט אין מעקב-כתב).

== 🎯 v10 (נעל צוריאל 9.8.2026) — post:<id> יורד לגמרי · פוסט = שער, לא יעד ==
מגביר על כל אזכור קודם של post:/thread: כיעד-מעקב (כולל v6 «ישות» ו-v9 «הפוסט»).
• ⛔ אין מעקב אחרי פוסט בודד. post:<id>/thread:<id> **יורדים כליל** ממשפחת-המעקב. **אין fan-out על עדכוני-פוסט.**
• שלושת יעדי-המעקב היחידים בכל האתר: (1) 🔔 author:<name> — «עקוב אחרי הכתב» (מה חדש אצל כתב) · (2) 🔔 cat:<name> — «עקוב אחרי הקטגוריה» (מה חדש בתחום) · (3) 🌍 world:mine — «העולם שלי» (עתיד: שכבת-רלוונטיות דרך רזיאל שמחברת מספרים/גימטריות/מחקרים/פעילות).
• פוסט = **שער ליעדים**, לא יעד. בתחתית-פוסט שתי פעולות קטנות וברורות: **📁 הקטגוריה · ✍️ הכתב** — המשתמש בוחר Follow לאחת/שתיהן. (מגביר על v8 «קטגוריה בלבד בתחתית-פוסט» — עכשיו קטגוריה + כתב.)
• עדכון משמעותי לפוסט **לא מייצר מנוי חדש**: עוקבי-הכתב/הקטגוריה מקבלים אותו דרך הזרם שלהם. אם בעתיד יידרש «המשך מחקר» ספציפי לפוסט — יוגדר בנפרד, לא כמשפחת-מעקב.
• Follow של אורח מותר תמיד. אחרי Follow: אורח → «✓ עקבת · הצטרף כדי לנהל את כל העדכונים שלך במקום אחד» · רשום → «✓ אתה במעקב · רוצה Push? / פתח מרכז».
• מסלול-המשתמש הפשוט: פוסט → כתב/קטגוריה → Follow → הרשמה → מרכז העדכונים.

== 🌍 v11 (נעל צוריאל 9.8.2026) — Future-Proof + סיגנל≠מנוי + סדר שלב ב' ==

【Future-Proof — 5 בדיקות + כלל-על】 המנוע חייב לחשוב ידע→ישות→ערוץ→עולם, לא עברית/אנגלית/דףX.
1. Identity: number:<value> קנוני (מזהה-עצמו). cat:/author: היום שם-מבוססים (categories=text[] בלי id; author=display_name) — לא יציבים.
2. Topic: יציבים = number:/stream:reality/codes:new. שבירים-בתרגום = cat:<name>/author:<name>.
3. Source: ✅ נכון כבר — subscribe_events.source נפרד; ה-topic הוא הזהות; dedup=recipient|kind|source_ref (topic לא במפתח).
4. Language: אין i18n עדיין. כלל: העדפת-שפה על המשתמש (profile locale); טקסט-התראה נפתר לפי-נמען בזמן fan-out — לא צרוב. היום notify_topic צורב עברית — לשנות לייצוג-לפי-locale כשאנגלית נכנסת.
5. Extensibility (זורם בלי מנגנון חדש): כתב→author: · קטגוריה→cat: · התכנסות→topic: · תמונת-מציאות→stream:reality · צופן→codes:new · מספר→number:. השובר היחיד: תרגום-תוכן (cat:/author: שם-מבוססים מפצלים עולם).
⭐ כלל-על: **ה-Dispatcher חייב לנתב כל topic דרך פונקציית «מפתח-קנוני» (normalize representation→stable key)**, גם אם היום המפתח==השם. כך תרגום עתידי (HE+EN) ממופה לאותו מפתח בלי לשנות פורמט-topic ובלי לאבד מעקבים. **המלצת-תזמון:** לבנות את ה-resolver הזה **בתוך ה-Dispatcher בשלב ב'** (זה ה-chokepoint היחיד שצורך זהות-topic); הגירה פיזית ל-cat:<id>/author:<id> — רק כשאנגלית באמת נכנסת, דרך map שם→id + כתיבה-כפולה.

【סיגנל ≠ מנוי — מקומות שבהם אין צורך בכפתור, הסיגנל כבר קיים】 מזינים את «העולם שלי», לא יוצרים מנוי:
• research_items.searched (חיפוש חוזר) · link_contribution («מצאתי קשר» — הסיגנל הכי עשיר) · reactions (👍) · QuickActions add/save (אחרי איחוד-מאגרים) · אירוע-נדירות · היסטוריית-קריאה · ספירת-התכנסות (CollectiveBadge). **אלה סיגנלים לרזיאל/world:mine — אסור להפוך אותם ל-Follow.**
תגובה-אליי (Discourse/פורום/צופן) = **התראה אישית** (הפאנל קיים), לא Follow. StudyCard מספרים לא-clickable = **תיקון-drill** (/number), לא משפך.

【סדר שלב ב' (נעול)】 א. Dispatcher — שהמעקבים הקיימים יעבדו: author:+number:+cat:+codes:new+stream:reality (עם resolver מפתח-קנוני). ב. מרכז-העדכונים — «מה חדש · אחרי מה אני עוקב · למה קיבלתי · העדפות-ערוצים». ג. חשיפת codes:new — כולל צפני-מערכת (לא רק community). ד. רגעי-ערך — ELS Gate + CollectiveBadge (+הרחבה לצפנים/התכנסויות) + שמירת-אורח→הרשמה. **ואז** איחוד research_items+ResearchProvider+ELS-saves. **ורק אחרי איחוד נקי** world:mine. **ורק אז** רזיאל כשכבת Relevance.

【world:mine — ניסוח】 לא ארבעה כפתורים. המשתמש לא מבין world:numbers/gematria/research (מודלים פנימיים). כלפי חוץ: **🔔 העולם שלי** אחד, ורזיאל מחבר מאחוריו מספרים/גימטריות/מחקרים/התכנסויות/נושאים. שלושת המצבים לא מתערבבים לעולם: **🔔 אני עוקב** (בחירה מפורשת) · **🟢 רלוונטי אליך** (סיגנל שזוהה) · **✨ רזיאל מציע** (המלצה).

== 🪪 v12 (אישר צוריאל 9.8.2026) — חוק-הזהות + סדר-11 + מפת «נשמר-מקומית» ==

【חוק-על מחייב: «Identity ≠ Language ≠ URL ≠ Display Name»】 המערכת לעולם לא מזהה ידע לפי השם שמוצג למשתמש. דף-אנגלית / תרגום-קטגוריה / תרגום-כתב / URL חדש / משטח חדש שמציגים את **אותו ידע** = אותו אובייקט, אותו topic, אותו מנוי. השם (בכל שפה) = label/representation בלבד. התראה מצביעה על **הישות הקנונית**; כותרת/טקסט/קישור נפתרים לפי שפת-המשתמש והמשטח.
• מאושר: **`cat:<stable_id>` / `author:<stable_id>`** (לא שם). מיושם כך: (1) עכשיו — ה-Dispatcher לא-תלוי-בשם (עובר דרך resolver מפתח-קנוני); (2) **לפני אנגלית בפרודקשן** — migration מסודר ל-ID קנוני של קטגוריות/כתבים + שכבת representations/locales; (3) במהלך ה-migration — לא לאבד אף Follow קיים (map שם→id + כתיבה-כפולה); (4) אחרי — עברית ואנגלית מצביעות לאותו topic. יעד: 10 שפות ו-100 כתבים חדשים בלי לפתוח מחדש את חוק-המנויים. **לא מכניסים i18n עכשיו — רק לא נתלים בשם.**

【סדר שלב ב' — 11 צעדים נעולים】 1.Dispatcher · 2.מרכז-העדכונים · 3.author:+number: הקיימים באמת מתריעים · 4.חשיפת codes:new · 5.תיקון fan-out של codes לכלול צפני-מערכת · 6.חיבור רגעי-ערך להרשמה · 7.איחוד מאגרי-מחקר/שמירות (עולם-שלי אחד). ורק אחרי בסיס יציב: 8.world:mine · 9.רזיאל (Relevance) · 10.Collective/Signals רחבים. ולפני אנגלית: 11.migration ל-stable IDs + representations/locales.

【מפת «נשמר-מקומית» — חייב להתאחד בצעד 7】 Intent שנלכד ונשאר ב-localStorage (מתאדה לאורח, לא מגיע ל-world:mine): els_saved/els_findings (ELS) · sod_notes_v1 (הערות-מחקר ב-ResearchCenter) · maftech_history (היסטוריית מפתח) · collections+journeys (ResearchProvider «אוספים»/«מסעות»). כולם מסתנכרנים-לענן רק בהתחברות דרך auth-blob — נפרד מטבלת research_items. צעד 7 מאחד את שלושתם למקור-אמת אחד.

【שערי-הרשמה שכבר קיימים — לא לבנות חדשים, לחבר אליהם】 [עדכון 11.11.2026: מתוך הרשימה שלהלן קיימים ב-2029 רק MaintenanceLock ו-SubscribeGate; CollectiveBadge, ForumThreadPage, Discourse, SubmitChidush, RecentSearches, JoinPage, ProfilePage ו-Navbar הוסרו עם Legacy ב-5.11.2026 — אין לחבר אליהם.] CollectiveBadge(/login, בדף-מספר וגם ForumThreadPage) · Discourse(«התחברו לפרופיל קבוע») · MaintenanceLock(אזורים נעולים) · SubscribeGate(code/els-research/verified-posts/beit-midrash/convergence) · SubmitChidush · RecentSearches(«הירשמו לראות עוד») · JoinPage · ProfilePage · Navbar. רגעי-הערך של צעד 6 = לחבר את הפעולות לשערים האלה, לא להמציא.

【3 מצבים שלא מתערבבים】 🔔 Follow=בחירה מפורשת · 🟢 Signal=המערכת למדה שמעניין אותי · ✨ רזיאל=המלצה. world:mine = כפתור **אחד** «העולם שלי» (world:numbers/gematria/research = מודלים פנימיים, המשתמש לא רואה). עיקרון-על: עץ-ידע אחד · זהות אחת · מנוע-Follow אחד · שפה = שכבת-תצוגה בלבד.

== 👤 v13 (ממופה, נעל צוריאל 9.8.2026) — משפחת «הכרה בתורם» (contributor-recognition) — נפרדת מ-Follow ==
בקשה: מי שתרם מידע שנכנס לעץ דרך WhatsApp (כמו שמעון חיימוב) יקבל התראה כשהתרומה נכנסה/עלתה. זה **לא Follow** (התורם לא עוקב — הוא תרם) → משפחה חדשה, קרובה ל-approve_chiddush, **לא** ל-fan-out של המנוי.
מצב בפועל (מבוסס-קוד+נתונים): WhatsApp = צינור-התוכן הראשי (1,384 עדכונים מזוכים, 56 תורמים). wa-webhook→wa-process כותבים ל-gematria_words(+word_aliases), ול-VIP+התכנסות → channel_updates (הרגע שצף לאתר). הייחוס נשמר **כשם-טקסט בלבד** (credit / p_note «מאת X» / sender_name) — לעולם לא user_id. user_id **ניתן להשגה** דרך wa_account_links(טלפון↔חשבון, OTP של רזיאל) או contributors.wa_names/user_id, אבל פונקציות-הקליטה לא מפעילות אותו. שמעון חיימוב = contributor עם user_id → ניתן להתריע In-App; אבל רק ~3 contributors עם wa_names / ~10 טלפונים מקושרים → **רוב התורמים בלי חשבון = לא ניתן In-App** (צריך קישור-חשבון או outbound-WhatsApp שלא בנוי).
מה חסר (MVP): (1) לפתור user_id ברגע-ההכנסה (credit/sender_name→contributors.wa_names/display_name→user_id); (2) Notifier על insert ל-channel_updates ממקור-WA → user_notifications kind=contribution_live (In-App, אותו sink); (3) ללא-מקושרים: «קשר וואטסאפ כדי לקבל הכרה» (עתיד).
מיקום מומלץ בסדר: **אחרי הליבה (צעדים 3–5), כשערוץ Email/WhatsApp פתוח** — כי לרוב התורמים ההתראה תגיע בוואטסאפ. MVP קטן In-App למקושרים (שמעון-וכמותו) אפשרי מוקדם אם צוריאל יבקש.
עוד פערים שנמצאו: (א) משפחת-ההכרה רחבה גם ל-research_contribution שאושר/הודגש/נענה/קושר ול-community_hints שאושר — היום רק חידוש מתריע. (ב) ייחוס-WA=string-match → אותה בעיית «Identity≠display name» של v12 (contributors.id יציב, שורות-WA שומרות שם). (ג) word_aliases (תעתיק אנגלי) כבר קיים — חלק מתשתית representations/i18n בנוי. (ד) קישור-חשבון = משפך-שימור בפני עצמו ל-46 התורמים הלא-מקושרים.
משמעת: לא לבנות בלי אישור מפורש + מיקום בסדר. לא להפוך את זה ל-Follow ולא לערבב עם המנויים.

== 🧬 v14 (נעל צוריאל 9.8.2026) — עיקרון-זהות: כתב ≠ תרומת-ידע; contributor = spine ==
עיקרון ארכיטקטוני חקוק: **«כתב הוא זהות ציבורית; תרומת-ידע היא אירוע/ישות נפרדת; contributor הוא ה-spine שמחבר ביניהם.»**
• contributor (contributors.id) = הזהות/spine של האדם.
• dossier (דף-הכתב) = הפנים-הציבוריות שלו ככתב.
• Contribution = פעולה/תרומה ספציפית (source + target + מה נוצר), מצביעה ל-spine — **בלי להפוך אוטומטית לתוכן-דף-הכתב.**
תיקון-מוצא: **וואטסאפ אינו «תורמים אנונימיים» כברירת-מחדל.** רוב הכתבים הראשיים מחוברים ל-WA; לרוב אותו אדם הוא **גם כתב וגם תורם-ידע דרך WA**. ההפרדה נשארת (כתב≠תרומה), אבל הזהות משותפת דרך ה-spine.

מפת-הזהויות הקיימת (לתעד כדי לא לאבד את הקשר כתב↔חשבון-WA↔תרומות):
• spine: contributors.id · contributors.user_id→חשבון · contributors.wa_names[]/phone→זהות-WA. מצב: 17 contributors, 12 עם חשבון, רק 3 עם wa_names/phone (חלש — להעשיר).
• phone↔account↔contributor: wa_account_links(phone,user_id) → contributors.user_id. מצב: 10 מאומתים, **7 תואמים contributor** (השרשרת המלאה עובדת ל-7).
• תרומות: research_contributions.author_contributor_id→contributors.id (75) · author_user_id→contributors.user_id (206, ניתן-לפתירה) · **131 עם user_id בלי contributor_id = פער** (spine לא backfilled) · 75 אנונימיות-בשם. els_records.owner_user_id→user (66). community_hints.reporter_user_id (0 בשימוש).
• ייחוס-WA לעץ: channel_updates.credit / gematria_words.notes«מאת X» / wa_vip_inbox.sender_name → contributors.wa_names/display_name = **string-match שביר** (reporters.js). זה הפער שיש לחזק ל-spine בעתיד (אותה בעיית «Identity≠שם» של v12).

שני כיוונים עתידיים לשמור (לא לבנות עכשיו):
1. **Collective Discovery לכל ישות** — «X חוקרים/תורמים סביב הישות» על מספר/צופן/מילה/התכנסות (לא רק מספר). תשתית entity_collective_count כבר קיימת.
2. **שרשרת Contribution → Knowledge → Discovery** — מי תרם→מה→לאיזו ישות התחבר→איזה קשר/מחקר/גילוי נוצר. חומר-ליבה ל-world:mine ולרזיאל.

משמעת: **לא לבנות** Knowledge-Contribution / Collective-Discovery / UI עכשיו; לא לגעת ב-Follow/מרכז. חוזרים לצינור הקיים (סדר-11). זה עיגון-עיקרון בלבד.

== 🧱 v15 (נעל צוריאל 9.8.2026) — גבול בין-סוכני + חוק Batching לערוצים חיצוניים ==

【A. גבול בין-סוכני — source-of-truth, בלי כפילויות】
• **סוכן ההתראות (אני):** Follow / WatchButton / Dispatcher / resolve_topics / notification_prefs / user_notifications / subscribe_events / notification_events / מרכז-העדכונים / ערוצי-התראה.
• **הסוכן השני:** בוט / WhatsApp ingestion / Knowledge Contribution / contributors (spine) / graph (nodes+edges) / gematria_words+ידע / דפי-כתבים (dossiers) / רזיאל.
• **כלל-ברזל:** פעולה בתחום הסוכן השני שצריכה להתריע — **פולטת אירוע ל-Dispatcher הקנוני שלי, לא בונה מנגנון-התראה משלה.** הסוכן השני **לא יבנה Dispatcher/Notification/Follow משלו.** ואני **לא אבנה** contributors/graph/Knowledge-Contribution/מודל-ידע/בוט — אם אני צריך מידע משם, נקודת-ממשק ברורה (קריאה), בלי לשכפל טבלה/מנוע/לוגיקה.
• נקודות-ממשק (כבר מתועדות ביומן «🔀 ממשק בין-סוכני»): contributors.id=spine (שלו, אני צורך) · els_records=מודל שלו, אני מחזיק רק את trigger-ההתראה · אירועי-פרסום שלו→התראה שלי · resolve_topics/topicLabel=אני ממפה entity↔topic, הוא מגדיר entities.

【B. חוק Batching/Digest לערוצים חיצוניים — «אירוע-משתמש רב-פריטי ≠ ריבוי הודעות»】
עיקרון: **הרבה פריטי-ידע שנכנסים באותה פעולת-העלאה/חלון-פעילות → לא מייצרים הרבה התראות חיצוניות.** במיוחד העלאות-בכמות דרך הבוט/WhatsApp (גימטריות, ממצאים, נתונים, וגם צפנים/תמונות/חידושים/עדכונים).
דוגמה: 30 גימטריות/ממצאים ברצף → **לא 30 הודעות WhatsApp** אלא אחת מרוכזת: «🔢 נוספו 30 גימטריות/ממצאים חדשים» + קישור למקום-הצפייה. זהה ל-10/30/100 פריטים.
ארכיטקטורה (כשנבנה בעתיד — לא עכשיו): **ה-Dispatcher נשאר מקור-האירוע ברמת-הפריט** (In-App יכול להישאר per-item להיסטוריה/audit/מרכז). **שכבת-הערוץ** (WhatsApp/Email/Push) היא שמחליטה **מיד מול מאוחד**: מקבצת אירועים לפי (נמען + ערוץ + סוג/משפחת-topic + חלון-זמן) ל-**digest אחד**. Batching = אחריות שכבת-הערוץ, **לא** של ה-Dispatcher. **אסור** one-event-one-message בערוץ חיצוני. **אין מנוע-WhatsApp נפרד** — הכל דרך ה-Dispatcher הקנוני + adapter-ערוץ.
מצב: לא בונים עכשיו. עיגון-עיקרון בלבד כדי שפתיחת-WhatsApp עתידית לא תשבור את ה-Dispatcher ולא תדרוש מנוע שני.

== 📜 v16 (נעל צוריאל 9.8.2026) — חוזה-הממשק הבין-סוכני (source-of-truth + מה אסור לבנות) ==
【בעלות】
• **הסוכן השני:** בוט · WhatsApp ingestion · gematria_words · contributors · research_contributions · graph/edges · Knowledge Contribution · רזיאל.
• **אני (Funnel):** Follow · WatchButton · Dispatcher · resolve_topics · Notifications (user_notifications) · מרכז-העדכונים · ערוצי-התראה · notification_prefs/subscribe_events/notification_events.
• **משותף — רק דרך ממשק:** ELS (els_records) · Collective/Collective-Discovery · world:mine · «אירועי-ידע שצריכים להפוך להתראה».
【כלל-על: אין שכפול מקור-אמת】
• הסוכן השני יוצר Knowledge Event שצריך להתריע → **פולט אירוע ל-Dispatcher הקנוני שלי** (לא בונה Notifications/Follow משלו).
• ה-Funnel צריך מידע מהידע → **קורא דרך הממשק** (contributors.id, entities, אירועי-פרסום), **לא משכפל** טבלה/מנוע/לוגיקה.
• אני לא אבנה: research_contributions/edges/link_contribution/CollectiveBadge/gematria_words/els_records-content/ELS-unify/רזיאל/world:mine-לבד. הוא לא יבנה: Dispatcher/WatchButton/Notifications/Funnel.
【אימות-נתונים שביסס את הגבול】 research_contributions כבר מוזן מהבוט (origin: whatsapp_group/broadcast/auto-core/auto-post) · edges=5,097 · gematria_words מ-WA=348 · research_items = client-only (אין עמודת-מקור). לכן contributions/graph/knowledge = שלו; research_items/ResearchProvider/notes = שלי.

== 🔭 v16 — 4 סיגנלים טהורי-אתר (צעד 4 מותר), עם יעד-עתידי ל-World אחד ==
כולם client-side, בעלים=Funnel, נכנסים בעתיד ל-world:mine (משותף) **דרך קריאה בלבד — בלי לשנות מנגנון**:
1. QuickActions (הוסר ב-5.11.2026) שמור/הוסף-למחקר → research_items + ResearchProvider → שער: SubscribeGate/login → יעד: world:mine (cart/library).
2. הערות-מחקר (sod_notes_v1 + saveCloudNotes) → שער: login → יעד: world:mine (notes).
3. אוספים/מסעות (ResearchProvider) → שער: login (cloud-sync) → יעד: world:mine (collections).
4. research_items.searched → שער: RecithSearches «הירשם לראות עוד» → יעד: world:mine (המספרים/החיפושים שלי → דירוג רזיאל).
עיקרון: לשמור אותם עכשיו בצורה יציבה-לקריאה (research_items + זרם-סיגנלים) כך ש-world:mine/רזיאל (בעתיד, משותף) פשוט יקראו — אפס migration. צעד 4 = פעולה→signal קיים→רגע-ערך→שער-הרשמה קיים. **בלי world:mine, בלי Follow חדש, בלי נגיעה בשטח המשותף/השני.**

== ✉️ v17 (Human-Gate ZURIEL 7.9.2026) — Newsletter per-recipient extension, no second mail system ==
Newsletter/Email remains an existing channel under this Funnel owner. Future broadcast delivery must reuse newsletter_campaigns + newsletter_sends; newsletter_sends is the per-recipient lifecycle extension point (token, queued/sent/failed/opened/clicked). Internal SOD1820 links in future newsletters are auto-tagged src=nl + nlid and may use the canonical newsletter tracking endpoint for first-open/first-click. Welcome-email tracking through email_events remains valid historical/current behavior and is not rewritten. Legacy MailPoet re-engagement (active/inactive cohorts) must use this same pipeline, in controlled batches, preserving opt-out/reactivation semantics. No new table/store/owner. Historical campaigns are not backfilled with invented per-recipient outcomes.

== v18 — SHARED FOLLOW → VERIFIED IDENTITY → CONSENTED CHANNEL (Human-Gate ZURIEL, 7.9.2026) ==
בקשת המשתמש: «אותו מנגנון עץ אחד לכולם» — להשלים את המעקב שנחשף במימד חמש, ולחייב שימוש באותו מסלול בכל הרחבה עתידית. OWNER CHECK: EXTEND_EXISTING. זהו המשך של חוק זה ושל subscribe_gate_law; לא חוק/מנוע/מאגר מקביל.

1. כל תצוגת WatchButton — inline/gate/compact/mini/checkbox — חולקת את אותה לוגיקת הצלחה, כישלון והצעד הבא. variant משנה תצוגה בלבד; אינו רשאי לדלג על השלמת ההרשמה. מימד חמש הוא Golden Case ראשון, לא חריג ולא מערכת חדשה. אורח שכבר עקב וחזר יקבל כניסה עדינה להשלמה גם בלי לבטל ולעקוב מחדש. אין פופאפ או חסימת קריאה כפויים.
2. אותו topic קנוני ואותו source נפרד בכל משטח. category: הוא alias legacy של cat:, לא קטגוריה חדשה. נרמול דרך בעלי-הבית הקיימים, ללא registry חדש או כתיבה היסטורית הממציאה מקורות. זהות הנושא אינה תלויה בכותרת/שפה/URL/variant.
3. FOLLOW_INTENT ≠ VERIFIED_IDENTITY ≠ CHANNEL_OPT_IN ≠ DELIVERY_READY ≠ SENT ≠ DELIVERED. שמירת topic אינה הרשמת מייל; קוד שנשלח אינו מייל שאומת; הצלחת ספק אינה הוכחת מסירה. channels=['email'] ברשומה היסטורית אינו כשלעצמו הסכמה או נמען שמיש. אנליטיקה מפרידה את השלבים ואת כישלונותיהם תחת Traffic Intelligence והאירועים הקיימים, ללא מונים כפולים.
4. השער הקנוני הוא EmailVerify/OTP הקיים. מסלול זה לא מוסיף לרשימת תפוצה ולא מסמן completed-signup conversion לפני אימות מוצלח. הרשמה לחשבון ומעקב אינם opt-in אוטומטי לניוזלטר כללי. ערוץ Email/Push/WhatsApp דורש בחירה מפורשת נפרדת; אין להפעיל/להרחיב/להחזיר הסכמה שבוטלה מתוך כניסה רגילה, Follow, קריאה, חיפוש או המלצה. שליחת OTP היא פעולה נפרדת הנדרשת לבקשת ההתחברות.
5. העדפות אורח מתחברות לאותה זהות דרך מסלול הזהות הקיים לאחר אימות, בלי אובדן topics שכבר היו בחשבון ובלי יצירת חשבון/מאגר שני. חייבים לבדוק גם חשבון ותיק + אורח, ריבוי מכשירים, race/retry, opt-out/mute וניתוק. אין לעקוף RLS ואין לתבוע שורת אורח לפי visitor_id גלוי בלבד; הוכחת הקישור והכתיבה לבעל החשבון הן שער אבטחה מחייב. כישלון קישור נשאר גלוי/ניתן לניסיון מחדש ואינו מוצג כ'הכל נשמר'.
6. פרסום/אירוע של כל תחום נכנס ל-Dispatcher הקיים בלבד. נמען אחד מקבל הודעה אחת לאותו אירוע גם אם הוא עוקב מכמה מקומות/נושאים. נשמרים batching/digest, muted/opt-out, permission checks ו-audit של המסלול. אין מיילים מתוכן מקומי או מנגן בנפרד. לא מבטיחים עדכון אוטומטי לישות שאין לה producer מחובר: מציגים את מצב ההעדפה בכנות ומסמנים את fan-out כפתוח.
7. כל משטח חדש שמשלב מעקב חייב בבדיקת קבלה לפני שחרור: subject/topic קנוני; source אמיתי; reuse WatchButton + EmailVerify; מה מקבלים ומאיפה מגיע האירוע; שמירה/ביטול/idempotency; אורח חוזר; OTP שגוי/כישלון רשת; קישור לחשבון חדש וגם קיים; ערוץ במפורש; מרכז עדכונים אחד; dedupe/opt-out; telemetry ללא PII; בדיקת mobile/dark/light. הרחבה עתידית נתלית באותה תשתית ולא מעתיקה קוד Follow/Signup/Dispatcher.
8. מצב באישור: GOVERNANCE APPROVED, IMPLEMENTATION IN PROGRESS ON ISOLATED BRANCH. יישום != מיזוג != פריסה != אימות חי. ליקויי RLS/identity וערוצי-delivery נשארים שער סגירה מפורש; נדרש challenge עצמאי לפני שחרור. אין אישור לשלוח לקוראים, להמיר שלושת העוקבים האנונימיים להרשמות מייל, לשכתב היסטוריה, לבנות world:mine/Raziel או לפרוס ללא הוראת תעלה.
Provenance: work_log 197e6bdc-ed5c-4b5e-bda6-b6c0415db992; prior owner subscription_funnel_law v17 preserved inactive. This section supersedes older contradictory automatic-email/variant-bypass behavior only; all unrelated historical decisions remain preserved.

== v19 — FOLLOW NEXT STEP BY IDENTITY (Human-Gate ZURIEL, 7.9.2026) ==
מגביר על כל ניסוח קודם שבו אחרי Follow אורח מקבל הצעת Push/Email/התראות. ההחלטה החדשה: אחרי Follow, המערכת בודקת זהות לפני הצעת ערוץ.
1. אורח/לא-רשום: Follow נשמר כ-interest/follow intent; הצעד הבא היחיד הוא בקשת הרשמה/אימות זהות כדי לשמור ולנהל את המעקב. אין הצעת Push/Email/WhatsApp בשלב זה.
2. משתמש רשום/מזוהה: אחרי Follow אפשר להציע ערוץ התראה (Push/Email ובהמשך WhatsApp) לפי consent מפורש ומדיניות הערוצים הקיימת.
3. אין חסימה של עצם ה-Follow לאורח. אין המרה אוטומטית לניוזלטר ואין opt-in אוטומטי לערוץ.
4. המטרה היא לצמצם שלב מיותר במשפך: Guest: Content→Follow→Signup/Verify→Center/Channels. Registered: Content→Follow→Channel Offer/Center.
5. אותו כלל חל על כל WatchButton variants ועל כל משטח עתידי; מימד חמש הוא Golden Case בלבד. אין מנגנון מיוחד למימד חמש.
6. אנליטיקה מפרידה follow_saved, signup_prompted, signup_started, identity_verified, channel_prompted, channel_opted_in; אין לספור channel prompt לאורח כהמרה.
7. זהו שינוי Governance בלבד עד שינוי הקוד. אין לשלוח התראות, לשנות מנויים קיימים או לפרוס בלי אימות שחרור.


—— v20 · 27.10.2026 · ZURIEL — מעקב ושיתוף בהקשר יחידת תוכן ——
לצד שיתוף בממצא או מקור ציבורי ניתן להציע מעקב קומפקטי אחר נושא קנוני רלוונטי, עם שם יעד ברור ומצב עקוב/עוקב ואפשרות ביטול. אין להציג מעקב אחרי הממצא עצמו כשהיעד הוא נושא. משתמשים ב-WatchButton, בזהות ובהעדפות הקיימות; מרכז העדכונים הקיים מנהל מעקבים, ו-Push או Email דורשים בחירה מפורשת. מעקב מפורש, רלוונטיות והצעת רזיאל נפרדים. לכל יעד נדרשים מפת יעד ומסלול עדכונים אמיתי מאומת לפני הבטחת התראות; אחרת אין להבטיח משלוח. הרשאות ופרטיות נשמרות. שיתוף אינו יוצר מעקב. התמונה היא הדמיה והסעיף אינו הוכחת מימוש או אישור לפריסה.


—— הבהרת ZURIEL 27.10.2026 — תחולת מעקב ——
מעקב מוצג רק במקומות מתאימים: יעד קנוני בעל משמעות מתמשכת ועדכונים רלוונטיים שניתן לספק בפועל, כמו נושא מתאים. אין להציג פעמון או אפשרות מעקב אוטומטית בכל ממצא, קטע או יחידת תוכן. שיתוף ומעקב הם פעולות עצמאיות; קיום האחד אינו מחייב את השני. התאמה נבדקת לפי מפת יעד המעקב והמסלול הקיים לפני מימוש.


== v22 — NEW VERIFIED ACCOUNT DEFAULT SITE UPDATES (ZURIEL, 3.11.2026) ==
החלטת צוריאל, 3.11.2026 — עדכוני אתר כברירת מחדל לחשבון חדש בלבד: לאחר הפעלת המדיניות, הרשמה חדשה לאתר כוללת עדכוני אתר במייל (`site-updates`), לאחר אימות כתובת המייל ב־Auth ותוך הצגת הודעה ברורה לפני ההרשמה. ההצטרפות היא ברירת המחדל של הרשמה חדשה, ולא תירשם כאילו נבחרה תיבת opt-in. בכל הודעת עדכון נשמר קישור הסרה פעיל.

התחולה היא רק לחשבון Auth חדש שנוצר לאחר זמן הפעלה קבוע ומתועד. כניסה לחשבון קיים, רענון חיבור, אישור חשבון שנוצר לפני ההפעלה, החלפת כתובת, קריאה, חיפוש, Follow והמלצה אינם מצרפים לעדכוני האתר. שליחת קוד אינה אימות. מקור האימות הוא `auth.users.email_confirmed_at`, לא טענה ב־metadata.

משתמשים ב־`subscribers` ובמטרה `site-updates` הקיימים. לכתובת חדשה תירשם רק המטרה הזאת; אין הרחבה ל־general, site-openings או ערוצים אחרים. כאשר הרשמה חדשה ומאומתת שייכת לכתובת שכבר רשומה ופעילה, אפשר להוסיף רק site-updates תוך שמירת כל ההסכמות, המקור והזמנים הקודמים. רשומה לא פעילה או בעלת `unsubscribed_at` אינה מופעלת מחדש, גם אם נוצר חשבון חדש; הסרה קודמת קודמת לברירת המחדל.

`subscribe_events` הקיים מתעד הצטרפות שנשמרה בפועל במקור `site-signup-default-updates-v1`, עם מזהה Auth מאומת וזמן האימות. אין הסקת Follow, מיזוג visitor, ציון עניין, שיווק, acquisition, הפניה, קרדיטים, חיוב או שליחת קמפיין. הרשמה, אימות, הצטרפות למטרה, מוכנות למשלוח, משלוח ומסירה נשארים מצבים נפרדים.

זהו חריג מצומצם להוראות ההיסטוריות על אי־צירוף אוטומטי בעקבות הרשמה חדשה, רק לגבי מטרה זו והחלטה זו. כל גבולות v18–v21 האחרים נשמרים: Follow וכוונת המשתמש נפרדים מערוץ דיוור, אין הרחבת קהל מכניסה רגילה ואין הרחבה או חידוש של הסרות קודמות. אין backfill. אין שינוי בתפקידים, בחשבונות קיימים, בנתונים פרטיים או במנוע הקרדיטים.

מצב ההחלטה: PRODUCT DECISION APPROVED; הצעת SQL נבדקה בנתונים סינתטיים בלבד. יישום משותף, קבלה אמיתית של ספקי כניסה/מייל והעלאה לחי הם שלבים נפרדים. הפעלה מחייבת את תשתית המטרה הקיימת והסרה פעילה; היא אינה אישור למשלוח קמפיין.

[v23 · 11.11.2026 · יישור להסרת Legacy — EXTEND_EXISTING] רכיבים שהוסרו עם Legacy ב-5.11.2026 סומנו במקומם (UserCenter, ToolActions/QuickActions, CollectiveBadge, ForumThreadPage, Discourse, SubmitChidush, RecentSearches, JoinPage, ProfilePage, Navbar). SubscribeGate, MaintenanceLock, WatchButton, ShareActions ו-ResearchProvider (כיום src/lib/research/) קיימים. סמנטיקת המשפך, המעקב, ההסכמה והערוצים לא שונתה.$sod_txt$, $sod_meta${"compaction_v1": {"canonical_owner": "subscription_funnel_law", "classification": "OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "subscription_follow"}, "follow_next_step_v19": {"approved_at": "2026-09-07T12:26:54.929701+00:00", "approved_by": "ZURIEL", "guest_channel_offer_disabled": true, "guest_next_step": "signup", "principle": "Follow first; if guest ask to register, if registered offer notification channels", "registered_next_step": "channel_offer", "release_state": "governance_approved_not_implemented_not_deployed"}, "g3_disposition_v1": {"classification": "KEEP_CANONICAL_OWNER", "classified_at": "2026-09-15", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "canonical owner survives into G3 unless explicitly superseded through owner gate"}, "locked_at": "2026-08-09", "locked_by": "zuriel", "new_account_default_site_updates_v22": {"activation": "fixed_future_cutoff_after_exact_shared_approval_B_D_notice", "approved_by": "ZURIEL", "approved_date": "2026-11-03", "before_work_log": "951a982f-6d23-4d1f-8a1e-cf4131320545", "future_verified_accounts_only": true, "new_owner": false, "ordinary_login_enrolls": false, "previous_optout_preserved": true, "release_state": "product_decision_approved_exact_shared_proposal_tested_not_applied"}, "newsletter_tracking_v17": {"approved_at": "2026-09-07", "approved_by": "ZURIEL", "forward_only": true, "implementation_branch": "gpt/product-traffic-forward-attribution-v1", "legacy_reengagement_same_pipeline": true, "release_state": "branch_only_not_live", "reuse_tables": ["newsletter_campaigns", "newsletter_sends", "email_events", "subscribers"]}, "owner_routing": {"canonical_owner": "subscription_funnel_law", "confidence": "high", "domain": "subscription_follow", "normalized_at": "2026-09-08", "resolution": "RESOLVED", "source": "SOD1820_MASTER_OWNER_INDEX/project_codex._index/existing_owner_contracts", "version": 1}, "reuses": ["notification_prefs", "user_notifications", "subscribers", "push_subscriptions", "send-push", "notify-approval", "FollowWriter", "PostFollowBox"], "shared_follow_completion_v18": {"all_variants": true, "approved_at": "2026-09-07", "approved_by": "ZURIEL", "guest_follow_is_not_email_consent": true, "owner_check": "EXTEND_EXISTING", "previous_description_md5": "b85cc967e4accbdea67b62738e61d716", "release_state": "approved_in_progress_not_deployed", "security_identity_gate": "required_not_closed", "work_log": "197e6bdc-ed5c-4b5e-bda6-b6c0415db992"}, "v23_legacy_removal_alignment": {"human_gate": "ZURIEL 2026-11-10 (§4 shared contracts)", "owner_check": "EXTEND_EXISTING", "removed_components_marked": ["UserCenter", "ToolActions", "QuickActions", "CollectiveBadge", "ForumThreadPage", "Discourse", "SubmitChidush", "RecentSearches", "JoinPage", "ProfilePage", "Navbar"], "semantics_changed": false}}$sod_meta$::jsonb, true, 'subscription_funnel_law', 23,
          v_base.depends_on, 22, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '8aa41d4d766fce0381e02776c4fbe78f' then
    raise exception 'S23 subscription_funnel_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='subscription_funnel_law' and is_active) <> 1 then
    raise exception 'S23 subscription_funnel_law: active version count is not 1';
  end if;
end
$sod_blk$;

-- ── experience_governance_foundation_v1_law: v10 → v11 ───────────────────────────────────────────────
do $sod_blk$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='experience_governance_foundation_v1_law' and is_active for update;
  if not found then raise exception 'S23 experience_governance_foundation_v1_law: no active version (drift)'; end if;
  if v_base.rule_version <> 10 then raise exception 'S23 experience_governance_foundation_v1_law: active version is v% (expected v10)', v_base.rule_version; end if;
  if md5(v_base.description) <> '6c92025b2ce47c82cb7ba4df8f04942b' then raise exception 'S23 experience_governance_foundation_v1_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> '36d65ee96e2ca7bbea569f98da0939ba' then raise exception 'S23 experience_governance_foundation_v1_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='experience_governance_foundation_v1_law' and rule_version > 10) then
    raise exception 'S23 experience_governance_foundation_v1_law: a version above v10 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$Experience Governance v11 — Focused Loading, Fresh Core, On-Demand + Legacy removal alignment$sod_lbl$, $sod_txt$Closes the Experience Governance Foundation domain per foundation_closure_protocol_v1 (Human-Gate ZURIEL, 2026-08-29, work_log id f4811264). Scope: documentation/naming-convention + ownership-assignment only. 0 new schema/table/engine/ledger. Full body in project_codex.slug='experience_governance_foundation_v1' and audits/experience_governance_foundation_v1/EXPERIENCE_GOVERNANCE_V1_FOUNDATION_CONTRACT.md.

Canonical Ownership Matrix (summary): Decision = the Human-Gate outcome represented in the canonical artifact it produces (never work_log, which is provenance-only per work_log_authority_law). Rule/Law = nodes type='rule' (this table). Long-form Contract = project_codex (live once INSERTed) or audits/<slug> (canonical only once merged to main / registered in project_codex — never a bare unmerged branch). Project State = SOD1820_MASTER_STATE.md (pointer/index to ratified state, not a duplicate of full rule/contract bodies -- restated explicitly, does not change the standing authority hierarchy: live DB + origin/main + Master State > Roadmap > conversation). Navigation = SOD1820_MASTER_ROADMAP.md. Implementation = origin/main (git). Acceptance Evidence = work_log narrative today; decision_ledger reuse remains PROPOSED for this domain (0 rows exist yet), not activated by this closure. Release State = git merge + Vercel deploy per deploy_on_request.

Experience Law lifecycle (PROPOSED -> HUMAN-GATE APPROVED -> ACTIVE -> IMPLEMENTATION CONSUMES -> ACCEPTANCE VERIFIED -> RELEASE ELIGIBLE -> SUPERSEDED) maps onto existing nodes columns (rule_version/supersedes_version/depends_on/metadata) with zero schema change -- proven via the mobile_acceptance_law worked example, which required no changes to fit this model.

Eight Human-Gate decisions ZURIEL approved 2026-08-29 (work_log f4811264), applied by this closure: (1) identity_architecture_law promoted to nodes (this pass, rule_id='identity_architecture_law'), meaning preserved verbatim. (2) 16px-font/44px-touch-target accessibility principles APPROVED but NOT folded into mobile_acceptance_law until an owning law is decided -- kept as a named Extension Point, not activated as enforcement. (3) BrandTicker.jsx's duplicate marquee gets no grandfathering [closed 5.11.2026: BrandTicker.jsx and Marquee.jsx were removed with Legacy] -- decided it must be corrected to reuse the canonical Marquee.jsx; the code fix itself is a separate, not-yet-scheduled implementation task, out of scope for this docs-only closure. (4) Date/number formatting (formatDateHe/HumanDateInput) stays Hebrew-first by design; locale-parameterization remains an Extension Point, not built. (5) research_contributions.author_contributor_id is preserved (not dropped from selects); wiring it in is deferred to a future Public Identity Projection decision. (6) Reality Stream attribution: underlying source-field provenance is preserved as-is; whether to render a visible "by" credit is deferred as a Projection-layer (UI) choice, not a Foundation blocker. (7) Master State §0 governance wording clarified additively (SOD1820_MASTER_STATE.md, this pass) to state Master State indexes/points to canonical owners rather than duplicating full rule/contract bodies, while explicitly preserving the standing authority hierarchy. (8) UI-copy localization confirmed EXTENSION POINT NOW under one Localization/Representation Governance shared with content_translation_law (distinct domains, not parallel systems, not built now).

Verdict: FOUNDATION SUFFICIENT (contract-level). All prior MUST-FOUNDATION-NOW items are closed or reclassified per the above; none remain open pending an unresolved architecture question. Implementation of specific flagged items (BrandTicker fix — moot since its removal on 5.11.2026, any future accessibility law, any future locale-parameterization) remains OPEN/FUTURE and does not block this Foundation closure, matching precedent (research_intake_foundation_contract_law, person_foundation_contract_law, corpus_admission_foundation_v1 all close at contract-level while implementation details remain open).

What was explicitly NOT done: no Experience Center UI, no Design System, no i18n engine, no identity-table rewrite, no mass CSS refactor, no BrandTicker code fix, no schema/migration, no merge, no deploy.

[UPDATE v2 · Human-Gate ZURIEL · 15.9.2026 — G2 FINAL COMPACTION, additive; EXTEND_EXISTING]
1. EXPERIENCE IS PROJECTION. A surface/lens renders existing canonical identities, capabilities, research state and truth/access semantics; it does not create a second owner or truth. The historical `lens_law` principle “same information, different lenses” is absorbed here.
2. LEGACY PRESENTATION DOES NOT BIND G3. Old Home/ticker/floating/share-placement/direction-lens/3D/room/gallery/layout recipes are archive/migration evidence only unless a capability is independently required by its owner. Preserve capability, not legacy geometry.
3. CURRENT DIRECT CHILDREN SHOULD BE FEW. `canonical_ui_components_law` remains the reusable primitive owner; `mobile_acceptance_law` remains the release acceptance child. Visual language/naming/tokens route to the active Design Contract. Adaptive Research layout routes to Research Workspace/Layout owners.
4. LENS/DIRECTION IS CONTEXTUAL. Experience may offer focused, overview, compare, reading, research, spatial or other projections as needed. No fixed “show everything” direction law, no hard-coded lens list and no lens-specific truth.
5. NEW GLOBAL EXPERIENCE LAW BURDEN. A new active Experience rule is justified only when it introduces a reusable cross-surface semantic/acceptance invariant that cannot live in this owner, Design or an existing primitive. Page-local composition belongs in implementation/design, not the global rule tree.
OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1_law. No Experience Center/store/registry.

[UPDATE v3 · Human-Gate ZURIEL · 17.9.2026 — ONE VOICE / ADAPTIVE DEPTH · EXTEND_EXISTING]

1. ONE VOICE, ADAPTIVE DEPTH. SOD1820 has one public product voice across surfaces. World, Heichal, Journey, Raziel, Inspector/Trace and public content may change depth, vocabulary and action-density according to the user's task, but they do not become separate personalities or separate truth systems. The base voice is natural Hebrew, calm, curious, accessible, discovery-oriented and compatible with wonder/spiritual resonance. As depth increases, language becomes more precise — not colder or more bureaucratic.

2. SURFACE ROLE GRAMMAR — same Reality/Research OS, different question:
- WORLD = “מה מתחבר?” Discovery/context/story around the active Anchor. Prefer connections, picture, sources, people, verses, events, hints, what opens next. Do not make laboratory/research-dashboard vocabulary the default opening language.
- HEICHAL = “איך בודקים?” Action-first deep research. Exact verbs such as calculate, compare, inspect source, run method, search text/ELS, open Trace and add to research are appropriate. Deep capability is explicit, but backend/governance jargon is still not default user copy.
- JOURNEY = “לאן זה מוביל?” Continuity, path, why this transition, what opened from here, exact return and next meaningful branch.
- RAZIEL = “מה כדאי לעשות עכשיו?” One continuous companion voice governed by raziel_voice_law across every surface/channel. Personality stays fixed; context changes the proposed research action and depth.
- INSPECTOR / TRACE / EXPLAIN-WHY = “למה ואיך בדיוק?” This is the proper place for precise research/technical vocabulary when it materially helps verification, provenance, replay, uncertainty or a decision.
- POST / PUBLIC CONTENT = narrative/wonder/redemption-hint language under publishing_conventions; the public story remains warm and readable while exact truth/provenance stays underneath.

3. PROGRESSIVE LANGUAGE DISCLOSURE. Default public surfaces lead with ordinary human language. Research terminology appears when the user enters research action or asks for depth. Internal terms such as Result Bundle, Evidence Independence, epistemic state, adapter/read-model/runtime and similar implementation/governance vocabulary must not dominate ordinary headings, badges or explanatory prose. They may appear in deep inspectors, Trace, Explain-Why, Admin/audit or another decision-relevant advanced context.

4. SIMPLE DOES NOT MEAN VAGUE; DEEP DOES NOT MEAN COLD. User-facing copy may simplify wording but may not erase a decision-relevant distinction. Deep surfaces may expose exact states and uncertainty while still speaking in SOD1820's calm, curious voice.

5. TRUTH-SAFE AT EVERY DEPTH. Beautiful/spiritual language never upgrades a hint, interpretation or connection into fact/verification/canonicality. Conversely, technical/research language never gives an item extra truth weight merely because it sounds rigorous. Semantic state continues to come only from Truth/Research/domain owners.

6. ONE SEMANTIC ACTION, CONTEXTUAL COPY. A shared capability/action keeps one semantic identity across surfaces even when its visible wording adapts to context. Example: a canonical inspect/deepen action may be expressed more invitationally in World and more operationally in Heichal, without creating duplicate actions or behavior.

7. NO VOICE SILOS / NO NEW LANGUAGE ENGINE. Do not create world_voice_law, heichal_voice_law, Journey voice store, copy registry, style engine or parallel localization system from this decision. Extend this Experience owner, the active Design Contract, publishing_conventions where content-specific, and raziel_voice_law for Raziel personality.

8. IMPLEMENTATION DIRECTION. World copy should foreground discovery/connection rather than “research map/lab” framing. Heichal may intentionally use more research/action language because entering Heichal is an explicit deep-work choice. Inspector/Trace holds the densest precision. This lock changes governance only; runtime copy changes require their normal scoped implementation/review/release gates.

OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1_law. Dependencies remain Research Workspace/Strategy, Truth Axes, Design, publishing_conventions and raziel_voice_law. No new owner/system/store/engine/schema.


[UPDATE v4 · Human-Gate ZURIEL · 17.9.2026 — CONTEXTUAL MULTILINGUAL VOICE · EXTEND_EXISTING]

1. SAME VOICE ACROSS LOCALES. Every supported locale carries the same SOD1820 product personality and the same contextual depth model. Translation/localization may adapt grammar, idiom, reading direction and culturally natural phrasing, but it must not turn one locale into a colder research product, a more mystical product, a more promotional product or a different personality. Language changes; semantic role and voice intent do not.

2. CONTEXT SETS TONE, NOT LOCALE. World remains discovery-first in every language; Heichal remains research/action-first; Journey remains path/continuity; Raziel remains the same calm curious companion; Inspector/Trace remains the precision layer. A locale never overrides the current surface/task role.

3. AUTHORED/PUBLIC STORY MAY GO FURTHER INTO WONDER. In authored posts, essays, teaching/storytelling and other intentionally narrative public content, SOD1820 may use a more wondrous, spiritual, mystical or poetic register when it fits the content and authorial intent. This is a contextual narrative choice, not the default UI voice and never a truth upgrade. publishing_conventions remains the content-specific owner.

4. UI DEFAULT = CLEAR DISCOVERY. General product chrome, World landing, navigation, empty/error states and ordinary calls-to-action should prefer clear, natural, inviting language over laboratory jargon or mystical abstraction. The user should understand what can be seen or done before being asked to understand internal research vocabulary.

5. DEPTH ESCALATES PRECISION. Deliberate research entry may increase technical/research vocabulary progressively. The deepest precision belongs in Inspector/Trace/Explain-Why/Admin/audit. Precision may increase; personality remains calm, curious and readable.

6. TRUTH-SAFE IN EVERY LANGUAGE. Translation, poetic language, mystical language and technical language are all presentation. None may alter epistemic type, verification, governance, publication/access, evidence independence or Research Strength. If a distinction is decision-relevant, every locale must preserve it even when wording is simpler.

7. ONE GOVERNANCE, NO PARALLEL COPY SYSTEM. This decision extends Experience Governance and composes with content_translation_law, publishing_conventions and raziel_voice_law. It authorizes no world_voice/heichal_voice laws, no locale-specific personality owners, no copy registry/style engine and no second localization system.

OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1_law. No new store/engine/registry/schema.


[UPDATE v5 · Human-Gate ZURIEL · 17.9.2026 — UNIFIED EXPERIENCE PROJECTION · EXTEND_EXISTING]
ONE EXPERIENCE CORE → MANY RENDERERS. Audio, narration, captions, interactive motion, Canvas/2.5D/3D, Remotion, AI media and future XR are projections of the same SOD1820 identity and research semantics. MAXIMUM CAPABILITY BELOW · SELECTIVE ACTIVATION ABOVE.
MASTER VOICE PROFILE is canonical; TTS provider/model is not. Canonical speech is calm, warm, intelligent, curious, natural, clear and context-aware. Substantive speech should preserve readable source text/transcript and timed captions when available. Ordinary pages do not surprise-autoplay long narration; immersive/Journey speech starts after explicit user start.
Canonical motion vocabulary: REVEAL · PRESENCE · ORBIT · TRAVEL · FOCUS · SETTLE. Spatial ladder: S0 static 2D → S1 micro-light → S2 layered depth → S3 Canvas/2.5D → S4 true GPU 3D → S5 future XR. Fallback preserves identity, meaning, provenance, access and return context.
3D may add camera, depth, lighting, material, fog, particles, spatial transitions/audio and interaction, but visual prominence never creates truth. Master Crown and protected Hebrew wordmark remain exact assets; any 3D derivative must be faithful, not AI-invented.
Surface defaults: WORLD living discovery; HEICHAL fast research-first; JOURNEY/PORTAL strongest immersive/narrated projection after explicit start; RAZIEL primary conversational voice; ELS/spatial research 2.5D/3D when geometry helps; POSTS reading-first + optional listen; SHARE static-first + optional short motion; REMOTION export renderer of the same context.
OWNER CHECK: extend Experience + Design + Raziel + Publishing + Translation only. Archived spatial_gematria_law stays historical and is not reactivated. No new Audio/3D/Motion/XR owner, store, registry or truth system.

[UPDATE v6 · Human-Gate ZURIEL · 17.9.2026 — WORLD HUMAN PROJECTION / HUMAN-FIRST DISCOVERY · EXTEND_EXISTING]

1. THE IMPORTANT FIRST. A World centered on an Anchor leads with a bounded “העיקר סביב…” projection: the few strongest decision-/understanding-changing items for this context (typically 4–7), composed from existing governed dimensions. It may include a central connection, strong gematria relation, verse/source, person/researcher, event or other materially relevant item. This is contextual prominence, not a truth tier and not a new store.

2. TYPE-SPECIFIC HUMAN RENDERING. World does not render all material as generic rows. Gematria should show Expression + Method + Value + honest verification state when available; Verse should show exact reference + readable verse text + why it is here; Book/Source should show human title + exact locator when known; Person/Contributor should show human identity + the bounded relevance/count/context that brought them here. Same semantic object, renderer by type; no duplicated truth.

3. HUMAN FIRST -> STRUCTURE SECOND -> RAW LAST. Default World/public projection uses natural human language. Raw statements, technical English, adapter names, UUIDs, source_ref strings, internal keys and backend/governance jargon do not dominate the opening layer. They remain preserved and addressable in Inspect / Trace / Explain-Why / Admin when useful. Hiding raw from the opening layer is presentation, never deletion or historical rewrite.

4. HUMAN SOURCE LABELS. Public World renders provenance through a human source label when resolvable (book title, researcher/person, WhatsApp/channel/source name, post, date/locator), while the exact technical source_ref remains intact below for replay/inspection. A renderer may explain a ref; it may not replace or fabricate its provenance authority.

5. PEOPLE / RESEARCHERS ARE A LENS OVER EXISTING IDENTITY + ATTRIBUTION. World may surface “אנשים וחוקרים” when materially relevant, including bounded counts/reasons. Contributor/person aliases should resolve through existing identity/attribution owners; do not create Zvi-specific or researcher-specific content stores. Attribution relevance never upgrades truth.

6. DEFAULT WORLD INFORMATION ORDER. When the active Anchor has the material, the preferred human scan order is: עיקר -> גימטריות וביטויים -> פסוקים ומקורות -> אנשים וחוקרים -> חיבורים -> מחקר נוסף -> זמן. Empty/irrelevant families collapse rather than creating filler. This is a presentation default, not a rigid lifecycle or universal section mandate; context may reorder when Research Strength / contradiction / active task requires it.

7. TIME LABELS MUST MATCH TEMPORAL SEMANTICS. research/provenance created_at alone must not be presented as if it were the real-world occurrence time. Use real occurred/published/discovered/admitted semantics when owned and available. If only research-ingestion provenance exists, label it honestly as “נוסף למחקר” / equivalent, not “ציר הזמן” of the event. Unknown temporal role stays unknown.

8. “RECOMMENDED HERE” MUST CONSUME THE EXISTING CONTEXTUAL PROMINENCE OWNER. Recommended ordering should compose available Context Relevance, Research Strength, Human Curation, source/provenance quality, Relation Directness, Information Gain, temporal/task context and negative/contradictory decision-changing material under research_gold_hints_law. No universal truth score, no fixed Gold weight, no popularity=truth. Explain-Why must remain reconstructable.

IMPLEMENTATION BOUNDARY. This lock changes Experience governance only. It authorizes no separate World content store, translation store, ranking engine, contributor store, timeline truth, mass data rewrite or publication/canonicalization. World consumes existing canonical readers / Universal Finding / Result Bundle / Research Context.

OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1_law, consuming research_gold_hints_law v3, reality_graph_law v8, truth_axes_foundation_law v3, content_translation_law and canonical UI/Design owners.

[UPDATE v7 · Human-Gate ZURIEL · 18.9.2026 — GLOBAL 2029 CUTOVER FOUNDATION · EXTEND_EXISTING]
6. WHOLE-SITE CUTOVER IS ONE FOUNDATION, NOT PAGE-LOCAL PRESERVATION. The 2029 replacement program inherits one global cutover contract for route identity, SEO/indexability, OG/share, semantic telemetry, Research Context/history/exact-return, access/site state, canonical readers and inbound/deep-link continuity. A redesigned surface consumes these owners; it does not recreate them locally.
7. RENDERER MAY CHANGE; SEMANTIC IDENTITY MUST NOT DRIFT. Legacy geometry/components/chrome are not protected. Canonical identity, URLs/redirect semantics, access, provenance, truth/governance/publication distinctions and durable research/personal state are protected unless explicitly superseded by Human Gate.
8. CAPABILITY PARITY BEFORE RETIREMENT. A legacy renderer may be retired only after each unique capability is classified as PRESERVE THROUGH EXISTING OWNER, REHOME, REPLACE PRESENTATION, RETIRE LEGACY-ONLY PRESENTATION or BLOCKED. Deleting old UI is never itself proof that capability can disappear.
9. SEO/ROUTE/SHARE/TELEMETRY ARE SHARED CROSS-SURFACE OWNERS. 2029 surfaces must extend existing route/SEO/OG/share/telemetry owners and preserve canonical addresses/inbound value. No page-local SEO registry, share system, analytics family or route identity may be created merely because the renderer is new.
10. RESEARCH/PERSONAL CONTINUITY IS LOSSLESS WITHIN AUTHORIZATION. Subject/root, selection, dimensions/lens, Journey/exact-return, history, saved/personal research and authorized context survive renderer transitions through existing Research OS owners. No 2029 Context/Workspace store.
11. SURFACE CUTOVER MAY SHIP INDEPENDENTLY BUT MUST CONSUME ONE ACCEPTANCE GATE. Number, World, Heichal, Books, ELS, Posts, Community and future surfaces may reach readiness at different times; they do not define different preservation laws. Each public cutover must pass identity, route, SEO, sitemap, OG/share, telemetry, Research continuity, access, data-owner, deep-link, mobile/accessibility, failure-state, capability-parity, isolation and exact-head regression gates.
12. NUMBER IS FIRST CONSUMER, NOT A SPECIAL ARCHITECTURE. /number preservation work proves the shared mechanism and must not become a Number-only layer.
OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1_law. No new router/SEO registry/analytics store/share system/context store/graph/engine.

[UPDATE v8 · Human-Gate ZURIEL · 2.10.2026 — CONTEXTUAL SIDECAR + UNIFIED SPATIAL METHOD STAGE · EXTEND_EXISTING]

1. ONE CONTEXTUAL SIDECAR, NOT A SECOND CONTENT COLUMN. The left-side contextual area is a projection of the active Research Context / semantic focus. On Post, Topic, Home, Number and other 2029 surfaces it may show the local map/context while idle and temporarily become an inspector for the selected semantic object. It creates no content store, graph, calculator, topic system or page-local truth owner.

2. REST / FOCUS / EXPLORE. REST shows a bounded map of the current surface/context at S0–S1. FOCUS is entered by selecting a meaningful object (gematria expression, number, verse/source, person, topic, ELS finding, etc.) and reuses the same sidecar area for a bounded inspector, normally S2 and at most one active S3 renderer. EXPLORE is explicit depth escalation to the owned destination such as Number/World/Heichal; the sidecar is never a miniature replacement for those destinations.

3. MAP + INSPECTOR DO NOT FULLY COMPETE. The full context map and full rich inspector are not displayed simultaneously. When focus opens, the map collapses to a compact return/orientation affordance. Closing focus restores the map. This preserves orientation without visual overload.

4. RESPONSIVE IDENTITY. Desktop projects the capability as the left Context Rail/Sidecar. Mobile projects the SAME focus/context as a Bottom Context Sheet, not as a second mobile system. Mobile REST is a compact cue; FOCUS opens a partial-height sheet by default while preserving the source context above; explicit deepen/drag may expand toward full height or navigate to the destination. Narrow/mobile never attempts to preserve desktop left-column geometry.

5. ONE ACTIVE RICH RENDERER. Only the selected focus may run a rich spatial renderer. Inactive contexts remain static/cheap and may be unmounted. Trace/data required only by the focus is loaded lazily. Reduced-motion, low-power and unsupported-device fallbacks preserve meaning and actions without requiring Canvas/WebGL.

6. UNIFIED SPATIAL METHOD STAGE. Gematria explanation has one reusable Experience capability across Number Method Inspector, Post focus, Context Sidecar, mobile Bottom Sheet and bounded Golden surfaces. The stage consumes canonical expression + method identity + canonical method trace/result/provenance and selects a method projection adapter. It does not calculate numeric truth locally and does not create per-surface calculators.

7. METHOD PHYSICS / ONE LANGUAGE. Regular projects visible-letter value/body; Milui projects internal letter-name expansion; Mistater projects adjacent-letter relation/tension; Kadmi/משולש projects letter-potential triangle; משולש מילה projects cumulative-prefix formation. Other methods may add adapters only through the same stage and canonical method/engine owners. A method adapter changes representation, not truth identity.

8. CANONICAL DATA BEFORE RICHNESS. Method-semantic data displayed as factual calculation detail must come from the canonical engine/method registry/trace contract. UI-local fixtures may exist only as explicitly transitional representation metadata and must not become a second source of method truth. For Milui specifically, displayed canonical letter-name spelling should ultimately come from the engine/registry trace contract; a local Hebrew-letter spelling map is not the final authority.

9. CURRENT MILUI IMPLEMENTATIONS ARE INPUTS TO ONE TARGET, NOT TWO PRODUCTS. NumberCore2029/MethodInspector is the stronger interaction/home shell because it already consumes canonical trace, tabs, Raziel, Worlds and deep actions. LetterAnatomyGolden2029 is the stronger visual/anatomy proof because it exposes the intended letter-opening language. Neither remains a separate canonical Milui renderer after the shared stage exists. The target combines the Number Method Inspector shell with the richer anatomy renderer, fed only by canonical method data.

10. DEPTH POLICY. Ordinary inline gematria in Posts/Topics remains S0–S1. Opening the calculation in Sidecar/Bottom Sheet defaults to S2 layered depth. Deliberate inspect/explore may reach S3 interactive 2.5D. S4 true GPU 3D is reserved for Heichal/Journey/ELS/spatial cases where geometry materially explains structure; it is not the default for every gematria.

11. SAME OBJECT, MANY PROJECTIONS. A verified semantic object such as Expression + Method + Result remains one object while projected as inline text, sidecar focus, mobile sheet, Number inspector, Golden or Heichal depth. Navigation between these projections preserves identity, provenance, selection and exact return context.

12. NO NEW OWNER. This decision extends Experience Governance + active Design Contract + canonical UI component discipline and consumes existing Research Context, gematria engine/method registry and Truth owners. Archived spatial_gematria_law remains historical and is not reactivated. No Sidecar Law/System/Store, Spatial Method Engine, calculator registry or second graph is created.

OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1_law. Dependencies: SOD1820_DESIGN_CONTRACT_V2.md (active 2029 web visual contract; V1 remains historical/Legacy provenance and all Brand Core protections remain in force), canonical_ui_components_law, Research Context/Workspace, canonical_methods_registry_law, gematria_engine_law, Truth Axes. No new owner/system/store/engine/schema.


[UPDATE v10 · Human-Gate ZURIEL · 16.10.2026 — FOCUSED LOADING / FRESH CORE / ON-DEMAND ARCHIVE · EXTEND_EXISTING]
The canonical detailed policy lives only in project_codex.slug='experience_governance_foundation_v1' (id=30), section "V10 — טעינה ממוקדת ותוכן טרי ב־2029". Consume that section before 2029 performance or new-surface work. It ratifies bounded first-content loading, new/relevant content priority, on-demand archive/depth and change-driven reuse under the existing owners. Source/provenance: project_codex id=37, slug='sod1820_reality_stream_os_master_v3_20261016_draft', §§17,25,28.1,29.3,29.5 plus ZURIEL's 16.10.2026 chat authorization to fix this policy in the existing laws. Only this scoped loading policy is adopted. The remaining V3 product/UX, shared meter design/formula, new source mapping/pilots and release remain DRAFT or separately gated. This governance amendment makes no implementation, product data, access, score, Legacy, merge or deployment change. All preceding semantics remain unless explicitly scoped here; current owners/gates still apply.

[v11 · 11.11.2026 · Legacy removal alignment — EXTEND_EXISTING] The BrandTicker/Marquee open item is closed by the removal of both components on 5.11.2026. No ownership, lifecycle, loading or cutover-gate semantics changed; §8 CAPABILITY PARITY BEFORE RETIREMENT stays in force.$sod_txt$, $sod_meta${"audits_path": "audits/experience_governance_foundation_v1/EXPERIENCE_GOVERNANCE_V1_FOUNDATION_CONTRACT.md", "branch": "claude/experience-governance-foundation-v1-1ki2s6", "compaction_v1": {"canonical_owner": "experience_governance_foundation_v1_law", "classification": "OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "experience_ui"}, "contextual_sidecar_v1": {"date": "2026-10-02", "desktop_projection": "left_context_sidecar", "human_gate": "ZURIEL", "mobile_projection": "bottom_context_sheet", "no_new_system": true, "owner_check": "EXTEND_EXISTING", "single_active_rich_renderer": true, "states": ["REST", "FOCUS", "EXPLORE"]}, "experience_projection_v1": {"human_gate": "ZURIEL 2026-09-17", "master_voice_profile_canonical": true, "maximum_capability_selective_activation": true, "motion_vocabulary": ["REVEAL", "PRESENCE", "ORBIT", "TRAVEL", "FOCUS", "SETTLE"], "no_new_system": true, "principle": "ONE_EXPERIENCE_CORE_MANY_RENDERERS", "spatial_ladder": ["S0_static_2d", "S1_micro_motion_light", "S2_layered_depth", "S3_canvas_2_5d", "S4_true_gpu_3d", "S5_future_xr"], "tts_provider_canonical": false}, "focused_loading_v10": {"adoption": "SCOPED_LOADING_POLICY_ONLY", "canonical_body_project_codex_id": 30, "canonical_body_section": "V10 — טעינה ממוקדת ותוכן טרי ב־2029", "human_gate": "ZURIEL — focused-loading policy only; explicit governance/passive-log write confirmation received in chat after auto-review rejection", "implementation": "NOT_IMPLEMENTED", "owner_check": "EXTEND_EXISTING", "remaining_v3": "DRAFT", "source_body_md5": "b4b728fdbe6d25f7f4569c25bacf75aa", "source_project_codex_id": 37, "source_slug": "sod1820_reality_stream_os_master_v3_20261016_draft", "task_key": "GPT_2029_FOCUSED_LOADING_POLICY_ADOPTION_20261016"}, "g1_routing_amendment": {"application_claim": "0426ca7e-03fc-4140-804f-8b366bf1bf66", "applied_at": "2026-10-09T01:22:35.992707+00:00", "approved_sha": "e3fb40f936036e54e67be8938861aeece6100498", "human_gate_approval": "a05e003f-8cb4-40bb-adf9-84bd9a5abe7c", "independent_main_review": "47652361-5bc2-4d3d-a591-366b9508c75b", "scope": "2029_web_design_dependency_only", "source_node_id": "c98f173c-49a6-4219-bbf4-ef52f9b30681", "source_rule_version": 8, "status": "APPLIED", "task_key": "SOD1820_PRO_SESSION_2_G1_ROUTING_ACCEPTANCE_V1"}, "g3_disposition_v1": {"classification": "KEEP_CANONICAL_OWNER", "classified_at": "2026-09-15", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "canonical owner survives into G3 unless explicitly superseded through owner gate"}, "human_gate": "ZURIEL, 2026-08-29, work_log id f4811264-b47e-4020-b14f-bbfd187c1d04", "human_gate_v8": "ZURIEL 2026-10-02", "language_context_v2": {"date": "2026-09-17", "human_gate": "ZURIEL", "owner_check": "EXTEND_EXISTING", "principle": "ONE_VOICE_CONTEXTUAL_DEPTH_ACROSS_LOCALES"}, "language_depth_v1": {"date": "2026-09-17", "human_gate": "ZURIEL", "owner_check": "EXTEND_EXISTING", "principle": "ONE_VOICE_ADAPTIVE_DEPTH", "work_log_before": "7ca5a708-eace-4864-923f-5ce8119dd4f5"}, "owner_routing": {"canonical_owner": "experience_governance_foundation_v1_law", "confidence": "high", "domain": "experience_ui", "normalized_at": "2026-09-08", "resolution": "RESOLVED", "source": "SOD1820_MASTER_OWNER_INDEX", "version": 1}, "pr": "https://github.com/zuriel337/sod1820/pull/234", "project_codex_slug": "experience_governance_foundation_v1", "promotes_rule": "identity_architecture_law", "unified_spatial_method_stage_v1": {"canonical_inputs": ["expression", "method_identity", "canonical_trace", "provenance"], "default_open_tier": "S2", "explore_tier": "S3", "local_numeric_truth_forbidden": true, "milui_target": "Number Method Inspector shell + Letter Anatomy visual grammar + canonical spelling data", "principle": "ONE_METHOD_STAGE_MANY_SURFACES", "s4_reserved_for_material_geometry": true}, "v11_legacy_removal_alignment": {"closed_items": ["BrandTicker duplicate marquee (component removed 2026-11-05)"], "human_gate": "ZURIEL 2026-11-10 (§4 shared contracts)", "owner_check": "EXTEND_EXISTING", "semantics_changed": false}, "v7_global_2029_cutover_2026_09_18": {"contract_path": "docs/g3-2029-global-cutover-foundation-v1.md", "human_gate": "ZURIEL", "no_new_analytics_store": true, "no_new_context_store": true, "no_new_router": true, "no_new_seo_registry": true, "no_new_share_system": true, "number_is_first_consumer_only": true, "owner_check": "EXTEND_EXISTING", "preserve": "capability_identity_provenance_access_continuity", "replace": "legacy_presentation_geometry", "strategy": "WHOLE_SITE_ONE_CUTOVER_FOUNDATION"}, "work_log_chain": ["b26475aa (BEFORE)", "c3ce5850 (pass1 AFTER)", "86daaade (GPT review pass1)", "5a4b6756 (pass2 AFTER)", "f4811264 (ZURIEL approval)"], "world_human_projection_v1": {"audit_work_log": "bdc8132f-857e-472a-9ce4-fc2aa503757f", "date": "2026-09-17", "human_gate": "ZURIEL", "no_new_system": true, "owner_check": "EXTEND_EXISTING", "principle": "HUMAN_FIRST_STRUCTURE_SECOND_RAW_LAST", "recommendations_locked": 8}}$sod_meta$::jsonb, true, 'experience_governance_foundation_v1_law', 11,
          v_base.depends_on, 10, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '478a4514b6263900ec06ab697c88eba0' then
    raise exception 'S23 experience_governance_foundation_v1_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='experience_governance_foundation_v1_law' and is_active) <> 1 then
    raise exception 'S23 experience_governance_foundation_v1_law: active version count is not 1';
  end if;
end
$sod_blk$;

-- ── identity_architecture_law: v1 → v2 ───────────────────────────────────────────────
do $sod_blk$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='identity_architecture_law' and is_active for update;
  if not found then raise exception 'S23 identity_architecture_law: no active version (drift)'; end if;
  if v_base.rule_version <> 1 then raise exception 'S23 identity_architecture_law: active version is v% (expected v1)', v_base.rule_version; end if;
  if md5(v_base.description) <> '22d333a0e2546de45a3a29773fb2b5e8' then raise exception 'S23 identity_architecture_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> '15296d723d6fa8bb386fd494019bfd2a' then raise exception 'S23 identity_architecture_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='identity_architecture_law' and rule_version > 1) then
    raise exception 'S23 identity_architecture_law: a version above v1 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$ארכיטקטורת זהות v2 — UGC + קהילה: אנונימי → מזוהה-רך → חשבון → חוקר → תורם (יישור להסרת Legacy)$sod_lbl$, $sod_txt$Sod1820 = ויקיפדיה חיה של רמזים ומספרים. לא לחייב הרשמה בהתחלה.
פרטים מלאים: select what_we_did from work_log where topic='ארכיטקטורת זהות — אנונימי → חוקר (UGC Layer)' limit 1;

מסלול הזהות:
אנונימי (visitor_id)
  ↓ [דיווח רמז / חיפושים / מסעות]
מזוהה רך (visitor_id עם היסטוריה)
  ↓ [הצעה רכה: "שמור תגליות"]
חשבון (Supabase Auth)
  ↓
חוקר (פרופיל, ציון, תגיות)
  ↓
תורם (רמזים מאושרים, Collective Discovery)
  ↓
יוצר מסעות

הפיצ'ר הראשון (נבנה — ReportHint.jsx + טבלת community_hints): ➕ דווח רמז
- טבלה: community_hints (visitor_id, image_url, number, description, source_url, status=pending)
- UI: כפתור בזרם המציאות + בדפי מספר
- Admin: טאב אישור ב-AdminPage (community_review) — [מסוף הניהול הישן הוסר ב-5.11.2026; מסלול האישור ב-2029 לא אומת בסבב זה]
- אחרי אישור: עובר ל-gallery_images עם source='community'

[v2 · 11.11.2026 · יישור להסרת Legacy] מסלול הזהות והמשמעות לא שונו.$sod_txt$, $sod_meta${"compaction_v1": {"canonical_owner": "person_foundation_contract_law", "classification": "CHILD_OF_OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "person_identity"}, "foundation_contract": "audits/experience_governance_foundation_v1/EXPERIENCE_GOVERNANCE_V1_FOUNDATION_CONTRACT.md", "g3_disposition_v1": {"classification": "KEEP_SCOPED_SEMANTIC", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "live community/public identity/contributor flows and current G3 community runtime still consume the anonymous-to-contributor identity semantics", "revalidated_at": "2026-09-30"}, "governs_live_code": ["src/lib/publicIdentity.js", "src/lib/authors.js", "src/lib/community.js", "src/pages/ContributorPage.jsx", "src/components/ReportHint.jsx", "src/pages/EntityPage.jsx", "src/pages/WelcomePage.jsx"], "human_gate": "ZURIEL, 2026-08-29, work_log id f4811264-b47e-4020-b14f-bbfd187c1d04", "owner_routing": {"canonical_owner": "person_foundation_contract_law", "confidence": "high", "domain": "person_identity", "normalized_at": "2026-09-08", "resolution": "RESOLVED", "source": "SOD1820_MASTER_OWNER_INDEX/project_codex._index/existing_owner_contracts", "version": 1}, "promoted_by": "work_log id 5a4b6756 (pass 2) -> f4811264 (approval) -> this closure pass", "promoted_from": "CLAUDE.md prose (verbatim transcription, meaning preserved per ZURIEL instruction — not rewritten)", "v2_legacy_removal_alignment": {"human_gate": "ZURIEL 2026-11-10 (§4 shared contracts)", "owner_check": "EXTEND_EXISTING", "semantics_changed": false}}$sod_meta$::jsonb, true, 'identity_architecture_law', 2,
          v_base.depends_on, 1, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '9c45502d5cc58c1a90d36c95c2ab56bf' then
    raise exception 'S23 identity_architecture_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='identity_architecture_law' and is_active) <> 1 then
    raise exception 'S23 identity_architecture_law: active version count is not 1';
  end if;
end
$sod_blk$;

-- ── project_codex #1 _index ────────────────────────────────────────
do $sod_blk$
declare v_body text;
begin
  select body into v_body from public.project_codex where id=1 and slug='_index' for update;
  if not found then raise exception 'S23 codex _index: row missing'; end if;
  if md5(v_body) <> 'fd0ac4629412ea51965cf9213fda18e2' then raise exception 'S23 codex _index: body drift (md5 %)', md5(v_body); end if;
  update public.project_codex set body=$sod_txt$טבלה זו (project_codex) היא ספריית מפרטים/הקשר ותיעוד של SOD1820. היא אינה bootstrap חובה, אינה Owner Index ואינה מקור-אמת מקביל. ברירת-המחדל: פתור owner קודם דרך `SOD1820_MASTER_OWNER_INDEX.md` + הבעלים החיים, ואז קרא רק את ה-slug/המפרט שאליו אותו owner מפנה. אין לקרוא את כל project_codex לפי הסדר בתחילת משימה.

מקורות ידע משלימים בתוך ה-DB (לא רק כאן):
- `work_log` — Coordination/Provenance Ledger בלבד. לבוטסטרפ קוראים רק רשומות CURRENT ורלוונטיות לסקופ (`work_log_current` או שאילתה שקולה), לא dump היסטורי מלא.
- `nodes where type='rule' and is_active` — חוקי המערכת הפעילים (מנוהלי-גרסאות, לא נמחקים).
- `nodes where type='entity' and metadata->>'source'='entity_seed_v1'` — גרף ישויות הגימטריה (+ `edges`, + `gematria_words`).
- בריפו: `CLAUDE.md` (הנחיות פרויקט) ו-`docs/`.

עקרון-על של הפרויקט: "אני הכי למטה בעץ ותמיד אפשר להרחיב" — ליבה קטנה, מדויקת ומקובעת, שכל תוספת נתלית עליה. מעדיפים עומק על פני כמות. הרחבות = batch קטן ובדוק, לא מרוץ למספרים.

━━━━━━━━━━━━━━━━━━━━━━━━
■ G1 AUTHORITY SPLIT / LIVE-FIRST (עודכן 12.9.2026)\nהקודקס הוא pointer/context בלבד. אין startup chain קבוע של Roadmap + Master + CLAUDE + כל rules.\nAuthority נשמר לפי תפקיד: live DB + `origin/main` + Production הרלוונטי = live reality; owner דומייני פעיל = semantics; Master State = documented state; Roadmap = navigation/priority; work_log = coordination/provenance; adapters/codex/memory = pointers/context.\nאם pointer בקודקס סותר owner/live state — מדווחים DRIFT וה-owner/live state גוברים. Master/Roadmap נטענים רק כשהמשימה דורשת documented-state/navigation או reconciliation.\n\nשורות מסומנות ⚠️ STALE אינן משקפות מצב נוכחי. שורה בקטגוריה pointer היא שלט-הפניה בלבד.

━━━━━━━━━━━━━━━━━━━━━━━━
■ AGENT GOVERNANCE OWNER ROUTER v1 — קרא לפני יצירת חוזה/חוק/מערכת (ZURIEL Human-Gate, 7.9.2026)

מטרה: זהו Router/Index בלבד — לא Source of Truth חדש, לא חוזה נוסף, לא טבלה חדשה. הוא מפנה כל סוכן לבעל-הבית הקנוני הנכון לפני עבודה.

BOOTSTRAP / G1 TASK START (pointer-only):\n1. natural-language task → intent/capability/domain (Task Profile רק כשמועיל).\n2. resolve current canonical owner from Owner Index + live owner infrastructure.\n3. load owner + smallest direct dependencies under Read Budget.\n4. read recent relevant CURRENT work_log/assignment context בלבד.\n5. verify the live source appropriate to the claim, then execute/verify/handoff.\nFull Master State, full Roadmap, all active rules, all project_codex, broad branch archaeology and unrelated contracts are NOT default startup reads.\n\nOWNER CHECK חובה לפני Contract/Law/System/Store/Engine/Registry/global UI owner חדש:
- בדוק owners קיימים ב-nodes/project_codex/main.
- החזר verdict אחד בלבד: EXTEND_EXISTING / SUPERSEDE_EXISTING / GENUINELY_NEW_DOMAIN.
- ברירת-מחדל = EXTEND_EXISTING. GENUINELY_NEW_DOMAIN דורש הוכחה שאף owner קיים אינו מתאים.
- שמות דומים אינם הוכחה לכפילות; בודקים אחריות/סמכות/צרכנים.

ROUTING MAP — בעלי-בית מרכזיים:
- One Tree / Reality Graph / identity-vs-representation / contextual center → reality_graph_law (unified_graph_law is inactive — history only).
- Research intake/source/provenance/orchestration → research_intake_foundation_contract_law / project_codex research_intake_foundation_contract.
- Research OS / Context / Finding / Journey / Workspace composition → docs/research-studio-v1-contract.md + docs/research-universal-finding-contract.md + existing ResearchProvider/Workspace owners.
- Truth / verification / governance / publication-access separation → truth_axes_foundation_law.
- Experience ownership/lifecycle/localization/design crosswalk → experience_governance_foundation_v1_law.
- Public product language/visual language/typography/icons → SOD1820_DESIGN_CONTRACT_V2.md (2029 active; V1 = historical/Legacy provenance).
- Global navigation/context rail/bottom controls → docs/sod1820-system-frame-contract-v1.md.
- Traffic/analytics measurement truth → traffic_intelligence_law. Product experiments consume it; they do not create a second analytics truth owner.
- Follow/notifications/channels → subscription_funnel_law.
- Gematria method identity/registry/lifecycle/execution-scan governance → canonical_methods_registry_law + method_lifecycle + engine_governance_registry_authority_law; no local method truth.
- ELS → els_single_engine_law + els_research_layer_law; one engine, many projections.
- Person/personal-data identity foundation → person_foundation_contract_law + identity_architecture_law where applicable.
- Inter-agent scope/owner/specialist coordination → inter_agent_coordination_law (current active version).
- Release/merge/deploy → deploy_on_request (active version) + live git/deploy state; every merge and every Production deployment needs ZURIEL's explicit approval for the specific action (10.11.2026).
- Product plan and dated decision record («מסמך 37») → project_codex id 37 (sod1820_reality_stream_os_master_v3_20261016_draft): dated records — a later explicit ZURIEL decision supersedes an earlier one; not proof of live state and not release authorization (CLAUDE.md §0.1).

STATE CHECK — לעולם לא לערבב:
PROPOSED ≠ APPROVED ≠ IMPLEMENTED ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED. Branch-only ≠ missing; work_log claim ≠ implementation; canonical ≠ published.

PRESERVATION / NO-LOSS:
- אין מחיקת היסטוריה כדי 'לנקות'. supersede/archive/deprecate עם provenance.
- לפני איחוד: שמור כל משמעות ייחודית, identity, truth, provenance, decisions ו-release evidence; מותר להחליף interface/wording/legacy owner.
- work_log נשאר provenance/coordination ויכול להיארכב מאוחר יותר; הוא אינו Product SSOT.
- Codex/Rule ישן שסותר owner מאוחר יותר מסומן HISTORICAL/STALE/SUPERSEDED — לא נשאר בעל-בית פעיל במקביל.

Agent mantra: FIND OWNER → VERIFY LIVE → EXTEND FIRST → PRESERVE HISTORY → HUMAN GATE → IMPLEMENT → VERIFY RELEASE STATE.


■ FOLLOW COMPLETION ROUTER — 7.9.2026
לכל בניית משטח תוכן עם מעקב, גם עתידי: קרא את הגרסה הפעילה של subscription_funnel_law, במיוחד סעיף v18 SHARED FOLLOW → VERIFIED IDENTITY → CONSENTED CHANNEL, ואת subscribe_gate_law (כיום לא פעיל — היסטוריה בלבד; השער הקיים SubscribeGate.jsx מתועד ב-subscription_funnel_law). WatchButton (כל variants) + EmailVerify + notification_prefs + Dispatcher הקיימים הם אותו מנגנון; אין פתרון מיוחד למימד חמש. טבלת-קבלה למשטח חדש וגבולות identity/consent/delivery מפורטים בחוק, לא משוכפלים כאן. יומן התיאום: SHARED_FOLLOW_SIGNUP_COMPLETION_V1. GOVERNANCE APPROVED אינה הוכחת יישום/מסירה; מצב שחרור נבדק מול main/DB/tests. זהו pointer בלבד.

━━━━━━━━━━━━━━━━━━━━━━━━
■ LAW TREE / CLASSIFICATION ROUTER v1 — 8.9.2026 (ZURIEL Human-Gate)

מטרה: למנוע Law Sprawl ובלבול-סוכנים. החוקים מסודרים לפי אחריות, לא לפי עמוד/feature/שפה. Feature חדש אינו מקבל אוטומטית חוק חדש.

שרשרת הקריאה המחייבת:
0. META / OWNER ROUTER → project_codex._index + SOD1820_MASTER_OWNER_INDEX.md
1. FOUNDATION / GOVERNANCE → בעל-הבית הארכיטקטוני של התחום
2. DOMAIN STATE OWNER → חוק אחד שמחזיק את הסמנטיקה של התחום
3. CONFIG / DATA → רשומות מצב/קונפיגורציה תחת אותו owner; אינן חוקים
4. PROJECTION OWNERS → שפה/ייצוג/עיצוב/ניווט; צורכים את ה-state ואינם משכפלים אותו
5. IMPLEMENTATION CONSUMERS → routes/components/readers/writers/SEO adapters

CLASSIFICATION PATHS מרכזיים:
- governance/agents/owners → inter_agent_coordination_law + live_state_sync_law
- foundation/reality → reality_graph_law
- experience/governance → experience_governance_foundation_v1_law
- experience/access/availability → site_flags_lock_law (ACTIVE v3)
- experience/localization/content → content_translation_law
- experience/ui/components → canonical_ui_components_law
- experience/frame/navigation → docs/sod1820-system-frame-contract-v1.md
- research/* → Research OS owners listed above

INHERITANCE RULE: חוק-על אינו משוכפל בחוקי-ילד. הילד מצביע לבעל-הבית ומוסיף רק סמנטיקה ייחודית לתחום שלו. Feature-specific state (למשל lock_forum) הוא DATA תחת site_flags_lock_law, לא forum_lock_law. שפה היא Projection: אין lock_forum_en/ru ואין availability נפרד לכל locale.

AGENT DECISION: לפני חוק חדש, מצא classification_path + owner קיים. אם ניתן לתלות את השינוי ב-owner קיים → EXTEND_EXISTING. מסך/שם/שפה/feature חדשים לבדם לעולם אינם GENUINELY_NEW_DOMAIN.

GLOBAL CHANGE EXAMPLE: "סגור פורום" → update אחד ב-site_flags.lock_forum → resolver קנוני → כל routes/home/community/post/entity/cipher/nav/feed/counters/write-actions וכל locale מציגים אותו מצב. תרגום משנה copy בלבד, לא access semantics.


━━━━━━━━━━━━━━━━━━━━━━━━
■ AGENT MEDIA UPLOAD CAPABILITY POINTER — 9.9.2026

Current live capability: GPT can upload real image binaries to canonical Supabase Storage through the existing AGENT_MEDIA_UPLOAD_BRIDGE_V1 / agent-upload Edge path. The release is recorded in work_log AFTER id 0010c1de-aebd-4051-90ef-c2a5a6c6052a (MERGED · EDGE LIVE · E2E real PNG verified). Base64 mode exists specifically for GPT runtime and supports image uploads up to 8 MiB; larger binaries use the bridge raw/signed modes.

ROUTING RULE: when ZURIEL asks GPT to upload a generated/selected image to the site, do NOT infer inability merely because the GitHub connector cannot write binary files. Resolve the live media-upload capability first and use the existing bridge if still live. This is a runtime-capability pointer, not a permanent guarantee: freshness-check the bridge/live project before write. Reuse only; no second upload system. Canonical project remains linswmnnkjxvweumprav.


━━━━━━━━━━━━━━━━━━━━━━━━
■ AGENT MEDIA STORAGE / INGRESS 2029 — Human-Gate ZURIEL · 17.9.2026

OWNER CHECK=EXTEND_EXISTING. Transport owner remains AGENT_MEDIA_UPLOAD_BRIDGE_V1 / agent-upload; media/source/provenance semantics remain under the live Research Intake / Representation owners. No new media registry/store/graph/truth owner. `media_map` is not repurposed as a 2029 registry.

FORWARD-ONLY PHYSICAL STORAGE CONVENTION for all NEW AGENT-ORIGINATED 2029 media:
- bucket: `media`
- root: `sod1820/agent/2029/<kind>/YYYY/MM/<asset-id>/...`
- kind: image | video | audio | document
- asset-id: UUID generated once; title/slug is not identity.
- original source binary: `original.<ext>`
- derivatives: `derivatives/<role>.<ext>` (hero/card/thumb/og/poster/preview etc.)
- captions: `captions/<lang>.vtt` under the same video asset-id.
- immutable default: no overwrite of original; preserve original separately from web derivatives.

CURRENT VERIFIED CHATGPT MOBILE IMAGE INGRESS:
ChatGPT attachment/generated file → Dropbox temporary file → Dropbox single-use temporary download URL → live `agent-upload?mode=url` → canonical Supabase `media` path → read-back size/MIME/SHA/public-URL verification. Dropbox is transport only and may be cleaned after verified persistence.

VIDEO: storage location is already locked to the same tree (`.../video/...`). Large-video transport is NOT yet declared implemented: do not push large video through the buffered image URL relay. Build/use resumable/direct TUS/signed/multipart transport as a separate bounded implementation that lands in this SAME tree.

LEGACY: do not move/rename/backfill historical paths merely for cleanliness (`gallery/sod1820/videos`, `media/uploads/*`, `gallery/posts/*`, `media/sod1820/videos`, etc.). They remain compatibility/provenance until an explicit migration gate.

Repo implementation convention candidate: `docs/sod1820-media-ingress-storage-convention-v1.md` + `scripts/agent-media-path.mjs` on task G3_MEDIA_INGRESS_STORAGE_CONVENTION_2029_V1. Until merged, exact repo state remains BRANCH-ONLY; this Codex block records the Human-Gate storage decision and routing only.
$sod_txt$, updated_at=now() where id=1;
  if (select md5(body) from public.project_codex where id=1) <> 'a409c228c4e561282d42659f87449807' then raise exception 'S23 codex _index: new body md5 mismatch'; end if;
end
$sod_blk$;

-- ── project_codex #30 experience_governance_foundation_v1 ────────────────────────────────────────
do $sod_blk$
declare v_body text;
begin
  select body into v_body from public.project_codex where id=30 and slug='experience_governance_foundation_v1' for update;
  if not found then raise exception 'S23 codex experience_governance_foundation_v1: row missing'; end if;
  if md5(v_body) <> 'db2d0806e3a10df6b25a04f5388dac16' then raise exception 'S23 codex experience_governance_foundation_v1: body drift (md5 %)', md5(v_body); end if;
  update public.project_codex set body=$sod_txt$STATUS: FOUNDATION SUFFICIENT (contract-level). APPROVED — Human-Gate ZURIEL, 2026-08-29, work_log id f4811264-b47e-4020-b14f-bbfd187c1d04. Full document: audits/experience_governance_foundation_v1/EXPERIENCE_GOVERNANCE_V1_FOUNDATION_CONTRACT.md (branch claude/experience-governance-foundation-v1-1ki2s6, PR #234, head 633c709a at approval time -- pass 3 correction commit follows this closure). nodes.rule_id='experience_governance_foundation_v1_law' carries the machine-readable summary. This entry is the project_codex home for the architectural reasoning.

PURPOSE: answer, for any future Experience-layer decision (mobile acceptance, locale, identity display, design tokens, accessibility) -- who owns this kind of truth today, who may write it, how implementation discovers it applies, what counts as acceptance proof, and how a v2 supersedes a v1 without losing history -- reusing existing primitives (nodes, project_codex, decision_ledger, work_log, Master State, Roadmap, git/main), never inventing a parallel store.

CANONICAL OWNERSHIP MATRIX (see full table in the contract doc, section 3): Decision=Human-Gate outcome in its produced artifact (never work_log, which is provenance-only per work_log_authority_law) · Rule/Law=nodes type='rule' · Long-form Contract=project_codex (live on INSERT) or audits/<slug> (canonical only once merged to main / registered here -- an unmerged branch file is PROPOSED, not canonical) · Project State=Master State (pointer/index, not a duplicate of full bodies -- authority hierarchy unchanged: live DB + origin/main + Master State > Roadmap > conversation) · Navigation=Master Roadmap · Implementation=origin/main · Acceptance Evidence=work_log narrative today, decision_ledger reuse PROPOSED not yet live for this domain · Release State=git merge + Vercel deploy per deploy_on_request.

EXPERIENCE LAW LIFECYCLE: PROPOSED -> HUMAN-GATE APPROVED -> ACTIVE -> IMPLEMENTATION CONSUMES -> ACCEPTANCE VERIFIED -> RELEASE ELIGIBLE -> SUPERSEDED, mapped onto existing nodes columns (rule_version/supersedes_version/depends_on/metadata jsonb) with zero schema change. Proven via mobile_acceptance_law worked example: it already fits this model with no changes needed.

EIGHT HUMAN-GATE DECISIONS (ZURIEL, 2026-08-29, work_log f4811264), applied by the closure pass:
1. identity_architecture_law promoted to a locked nodes rule (this pass), meaning preserved verbatim from CLAUDE.md -- governs publicIdentity.js/authors.js/community.js/ContributorPage.jsx/ReportHint.jsx/EntityPage.jsx/WelcomePage.jsx [11.11.2026: ContributorPage.jsx, EntityPage.jsx and WelcomePage.jsx were removed with Legacy on 5.11.2026].
2. 16px-font/44px-touch-target accessibility principles APPROVED as principles, but NOT folded into mobile_acceptance_law until an owning law is decided -- named Extension Point, not enforced yet.
3. [closed 5.11.2026 — BrandTicker.jsx and Marquee.jsx were removed with Legacy] BrandTicker.jsx's duplicate marquee (violates ticker_marquee_law/canonical_ui_components_law) gets no grandfathering -- must be corrected to reuse canonical Marquee.jsx. Decision made; the code fix itself is a separate future implementation task, out of scope for this docs-only closure.
4. Date/number formatting (formatDateHe/HumanDateInput, human_date_input_law) stays Hebrew-first by design; locale-parameterization remains an Extension Point.
5. research_contributions.author_contributor_id preserved (not dropped); wiring deferred to a future Public Identity Projection decision.
6. Reality Stream attribution: source-field provenance preserved as-is; visible "by" credit is a deferred Projection/UI choice, not a Foundation blocker.
7. Master State section 0 governance wording clarified additively (applied this pass, section 23.17 + section 0 item 16): Master State indexes/points to canonical owners rather than duplicating full rule/contract bodies -- standing authority hierarchy explicitly preserved, not altered.
8. UI-copy localization confirmed EXTENSION POINT NOW under one Localization/Representation Governance shared with content_translation_law (distinct domains and consumers, sharing a locale-identity concept -- not parallel systems, not built now).

LOCALE/DIRECTION CROSSWALK (live findings, contract section 8): index.html's <html dir="rtl"> is the sole document-direction owner. Physical CSS (marginLeft/right:/border-left, 147+543 occurrences) coexists with CSS logical properties already adopted in newer components (marginInlineStart/End, 40+ instances) -- logical properties declared canonical for new/touched Experience-layer components, Navbar.jsx's absolute-positioned dropdowns named as highest-risk specimen for a future locale, not fixed retroactively. dir="ltr" islands (Marquee.jsx, HumanDateInput.jsx, theme.js .sgx-date) are the correct, sanctioned pattern for numeric/Latin content inside the RTL document.

BRAND/IDENTITY CROSSWALK (contract section 10): confirmed a clean, already-correct "one canonical identity per role" pattern in live code -- users.display_name=account handle, profiles.full_name=private Raziel-only personalization, posts.author (free text, resolved via publicIdentity.js/authors.js)=public byline, contributors.display_name=curated public contributor, research_contributions.author_user_id/author_name=research provenance (documented precedence). No new Person/Identity store needed.

DESIGN CROSSWALK (contract section 11): [11.11.2026: lib/palette.js, lib/themeMode.js and src/components/ui.jsx were removed on 5.11.2026; the 2029 token system is lib/paletteTokens2029.js + lib/palette2029.js + lib/themePreset2029.js under SOD1820_DESIGN_CONTRACT_V2.md; theme.js is a documented removal residue] theme.js + lib/palette.js (usePalette) + lib/themeMode.js confirmed as the real, working, route-aware light/dark token system -- canonical, assign don't rebuild. src/components/ui.jsx is a partial (dark-only, no Card/Modal/Drawer) canonical primitive kit -- extending it is Extension Point Now. No shared 320/360/390 breakpoint utility exists yet -- mobile_acceptance_law works today by per-component convention, a shared constant is Extension Point Now once a 2nd component needs it.

ACCESSIBILITY CROSSWALK (contract section 12): foundation already sound -- Navbar.jsx's useAccessibleMenu() hook, real semantic <button>/<a> elements throughout (div-as-button appears only 6 times total in src/), prefers-reduced-motion correctly handled where custom animations exist. Gaps (dialog semantics on NumberDrawer/modals, reduced-motion as a systemic convention) are targeted Extension Points, not a redesign.

WHAT WAS EXPLICITLY NOT DONE: no Experience Center UI, no Design System build, no i18n/UI-translation engine, no identity-table rewrite or rename, no mass CSS refactor, no BrandTicker code fix, no new schema/migration/table, no merge, no deploy. All of it stays docs/DB-governance-level, per foundation_closure_protocol_v1's own anti-patterns list (no building UI to prove Foundation, no bulk backfill to test a contract).

PROVENANCE: work_log chain (all 2026-08-29) -- b26475aa (BEFORE) -> c3ce5850 (pass 1 AFTER) -> 86daaade (GPT cross-verification, CHANGES_REQUESTED) -> 5a4b6756 (pass 2 AFTER, 7 corrections applied) -> f4811264 (ZURIEL Human-Gate approval, 8 decisions) -> this closure pass (pass 3: DB writes + Master State/Roadmap reconciliation + final AFTER memo for GPT). PR #234 remains open, not merged, not deployed -- per explicit ZURIEL instruction to stop before merge/deploy.


—— EXPERIENCE PUBLIC LANGUAGE / ADAPTIVE DEPTH 2029 · Human-Gate ZURIEL · 17.9.2026 ——
Owner: experience_governance_foundation_v1_law v3. EXTEND_EXISTING only.

ONE VOICE, ADAPTIVE DEPTH: SOD1820 speaks in one calm, curious, natural, accessible voice. Surfaces alter depth and vocabulary by task, not personality or truth. Precision increases as the user goes deeper; it must not become cold or bureaucratic.

ROLE GRAMMAR:
• World = “מה מתחבר?” — discovery, context, picture, story, connections, sources, events, people, verses and hints. Research-lab language is not the default opening.
• Heichal = “איך בודקים?” — explicit deep research/action language: calculate, compare, inspect source, run method, search, Trace, add to research. Backend jargon still stays behind the user-facing layer unless decision-relevant.
• Journey = “לאן זה מוביל?” — path, continuity, why-transition, next branch and exact return.
• Raziel = “מה כדאי לעשות עכשיו?” — one fixed companion personality under raziel_voice_law; context changes action/depth, not voice identity.
• Inspector / Trace / Explain-Why = “למה ואיך בדיוק?” — home of the densest verification/provenance/replay/uncertainty vocabulary.
• Post/Public content = narrative/wonder/hint language under publishing_conventions with truth-safe substrate preserved.

PROGRESSIVE DISCLOSURE: ordinary public Hebrew first; research language on deliberate depth; internal implementation/governance terms only in advanced/inspection/admin contexts where useful. Simple copy must not erase meaningful uncertainty/state. Technical wording does not create truth weight; beautiful wording does not upgrade truth.

ONE SEMANTIC ACTION, CONTEXTUAL COPY: shared actions keep one capability identity even when visible wording adapts between World/Heichal/etc. No page-specific voice law, copy engine, registry or parallel localization system is authorized.

Implementation consequence: World should foreground discovery/connection; Heichal may intentionally sound more research/action-oriented; Inspector/Trace carries maximum precision. This decision itself changes governance only, not runtime UI.


—— CONTEXTUAL MULTILINGUAL VOICE 2029 · Human-Gate ZURIEL · 17.9.2026 ——
Owner: experience_governance_foundation_v1_law v4. EXTEND_EXISTING.

Same SOD1820 voice across every locale; locale adapts natural phrasing/direction, not product personality or semantic depth. Context controls tone: World=clear discovery/connection; Heichal=research/action; Journey=path/continuity; Raziel=same calm curious companion; Inspector/Trace=maximum precision. Authored/public narrative such as posts may intentionally use a more wondrous, spiritual, mystical or poetic register when fitting, while Truth semantics remain unchanged. General UI defaults to clear discovery rather than laboratory jargon or mystical abstraction. No locale-specific voice owner, copy engine/registry or parallel localization system.


—— WORLD HUMAN PROJECTION / HUMAN-FIRST DISCOVERY · Human-Gate ZURIEL · 17.9.2026 ——
Owner: experience_governance_foundation_v1_law v6. EXTEND_EXISTING.

Locked implementation direction from live World audit: (1) bounded “העיקר סביב…” first; (2) type-specific human rendering for Gematria/Verse/Book-Source/Person; (3) Human first -> structure second -> raw last; (4) human source labels with exact raw provenance preserved below; (5) people/researchers as a lens over existing identity/attribution, never a contributor store; (6) preferred scan order עיקר -> גימטריות וביטויים -> פסוקים ומקורות -> אנשים וחוקרים -> חיבורים -> מחקר נוסף -> זמן, collapsing empty families; (7) temporal labels must distinguish real occurrence/publication/discovery from research-ingestion created_at; (8) “מומלץ כאן” consumes research_gold_hints contextual prominence dimensions and Explain-Why, never a universal truth score. No new Store/Engine/Graph/Truth/Ranking owner.

Hebrew/raw presentation is governed jointly with content_translation_law v4: original source/provenance remains intact; public/default Hebrew is a human representation, not a rewrite of historical evidence.


—— COMMUNITY CORE 2029 · ONE COMMUNITY / AI-NATIVE SOCIAL LAYER · Human-Gate ZURIEL · 23.9.2026 ——
OWNER CHECK: EXTEND_EXISTING. Public composition owner = experience_governance_foundation_v1_law. Data/identity/truth remain with their existing domain owners: identity_architecture_law, research_intake_foundation_contract_law, research_workspace_law, raziel_companion_layer_law, research_strategy_layer_law, truth_axes_foundation_law. No Community Law, Chat System, Forum System, Community Store, second graph or second truth owner is created.

HUMAN-GATE PRODUCT DECISION:
1. ONE PUBLIC SURFACE. Public product name is "הקהילה". "צ׳אט" and "פורום" are legacy presentation concepts, not separate future products. /community/chat and /forum remain compatibility addresses until a separately authorized cutover; no route change is authorized by this decision.
2. ONE FREEFORM INPUT. The visitor writes naturally and submits one message/reply. No public taxonomy chooser (question/source/observation/idea/correction/etc.). This ratifies and extends work_log 36f4ca42-dd54-4a1b-bdb4-3638d1752ffb.
3. CLASSIFICATION BEHIND THE SCENES. System/AI may infer zero/one/multiple semantic roles, links, numbers, sources, entities, questions, observations and candidate relations after submission. Classification is routing/research metadata only and never approval, moderation, verification, governance, publication or canonicality.
4. COMMUNITY MEMORY. The OpenWeb export for spot sp_OVtajBTj (reported by OpenWeb as 41,080 messages) is treated as the historical community conversation corpus. Historical homepage article_url values are not interpreted as semantic attachment to Home merely because the widget lived there. Only real internal links/source context supported by the record or message content may create site relationships.
5. LOSSLESS HISTORY. Preserve source-native message identity, author identity, timestamps, parent/reply lineage, original text, original moderation status, likes/dislikes when present, and source provenance. Deleted/blocked/hidden history never becomes public merely because it was imported. Missing values stay unknown/null; do not invent zeros or statuses.
6. IDENTITY BRIDGE. Existing verified email matches may link historical identity to an existing SOD1820 account. Never auto-create auth accounts from export email. Unmatched legacy identities remain private/soft/claimable; future verified account proof may attach history. Email/PII never appears in public message projections.
7. ONE COMMUNITY CORE, MANY PROJECTIONS. The same semantic message/conversation may be projected in Community, under a Post, around a Number/Expression, on a Researcher/Person surface, in World, or inside a contextual Raziel flow. Projection references the same underlying identity/context; it is not copied into parallel stores.
8. REALTIME IS A CAPABILITY, NOT A SECOND STORE. Future live chat behavior uses the existing governed contribution/conversation substrate with RLS-aware realtime/fanout. No live_messages/chat_messages parallel truth store is authorized.
9. RAZIEL AS ACTIVE PARTNER, NOT NOISE. Raziel may notice useful links, retrieve prior community conversations, summarize long threads, verify calculable claims through canonical engines, suggest next actions and answer when invoked/valuable. It does not respond to every message, does not dominate the room, and does not convert popularity into truth.
10. AI-NATIVE COMMUNITY CAPABILITIES. Target end-state includes semantic search across historical/current community; conversation resurrection when context becomes relevant again; "what changed since I was here"; contextual people/topic expertise; thread summaries; internal-link/entity extraction; voice/transcript as another representation of the same interaction; notifications/presence where privacy-safe; and adaptive suggestions through existing owners.
11. SITE-WIDE SOCIAL LAYER. Community is allowed to become the live social layer across SOD1820 and may eventually participate in the Home experience ("עכשיו ב-SOD1820") as an Experience projection over existing events/content/community sources. This decision does not itself cut over Home or replace existing routes.
12. PUBLIC LANGUAGE. Outside language stays ordinary, warm and simple. Avoid forcing research/governance vocabulary on visitors. Internal precision remains exact under Truth/Intake/Workspace/Inspector layers.
13. LEGACY research_contribution_law. Do NOT reactivate it as the future product owner. Existing research_contributions/contribution_links and their useful semantics may remain implementation substrate/legacy compatibility under active 2029 owners until migration/supersession is proven. Preserve capability/history; do not preserve the legacy public taxonomy/interface merely because it exists.
14. BUILD ORDER (hidden first): Foundation runtime -> real archive audit/identity map -> idempotent import dry-run -> privacy/security/RLS challenge -> realtime-ready core -> AI classification/extraction -> Raziel partner seam -> semantic search/history -> Shadow Preview -> Human Gate -> optional cutover. OpenWeb remains untouched until a separate Human Gate.
15. RELEASE SAFETY. No live DB import, no public UI/route change, no OpenWeb removal, no merge/deploy/cutover is authorized by this architecture decision alone. Each destructive/public transition remains separately gated.

ACCEPTANCE PRINCIPLE: simple like a familiar chat on the outside; one deeply connected, AI-native, truth-safe, identity-aware, replayable Community Core on the inside.


—— COMMUNITY HISTORICAL MODERATION CARRY-FORWARD · Human-Gate ZURIEL · 23.9.2026 ——
For historical Community migrations, source moderation visibility is preserved as source history, not reinterpreted as research governance. WordPress status=publish and OpenWeb moderation=approved may project as historically visible community content. OpenWeb/legacy blocked/deleted remain non-public/hidden; pending remains pending. This carry-forward is a migration/visibility decision only: it does NOT mean research approved, engine verified, canonical, factual or promoted. AI/classification has no authority to change these states. Missing moderation stays unknown/pending rather than invented.



—— EXPERIENCE PROJECTION — «העת עכשיו» ACROSS HOME / POST / WORLD / AXIS · Human-Gate ZURIEL · 24.9.2026 ——
Owner: experience_governance_foundation_v1_law. EXTEND_EXISTING.

PUBLIC EXPERIENCE CONTRACT:
- Home = DISCOVER: surfaces a bounded «עכשיו ב-SOD1820» / temporal discovery when materially important. It is not a raw chronological feed.
- Post = SIGNAL: may show a compact Temporal Spark near the top only when the post has a direct material connection to the current temporal context. It must not displace the source/story.
- World = EXPLORE: canonical deep public projection for the temporal family. The user can open «העת עכשיו», «העת של המקור», and «ציר ההתגלות» around the same anchor/context.
- Revelation Axis = NARRATE: historical/temporal story across stations.
- Journey = TRAVERSE: moves between stations while preserving why the transition occurred and exact return.

POST ORDER WHEN TEMPORAL RELEVANCE IS STRONG:
Hero → Post Pulse (what changed in the post) → Temporal Spark (what reality-now connects to the post) → original source/media → authored story → later additions → deeper «מה מתחבר לעת הזאת?» → exits to World/Revelation Axis/Topic/Journey.
Post Pulse and Temporal Spark are distinct semantics and must not be merged.

PROMINENCE RULE:
Do not place «העת עכשיו» prominently in every Post/World. Promote it only when there is material current-time relevance. Empty/weak temporal families collapse quietly. Temporal prominence never upgrades truth.

COPY PRINCIPLE:
Home מגלה אותה · Post רומז עליה · World חוקר אותה · ציר ההתגלות מספר אותה לאורך הזמן.


---

## 2029 CURATION MARKS / TREASURE DISCLOSURE · Human Gate ZURIEL · 2026-09-24

SCOPE: 2029 ONLY. Legacy Number/Research/Post/UI surfaces are explicitly out of scope and receive no migration work from this decision.

### 1. ONE MARK LANGUAGE
Every 2029 projection that surfaces a Human-curated Core identity or curated Number Anchor must expose its curation mark consistently:
- Diamond Core → diamond mark.
- Gold Core → gold mark.
- Gold Number Anchor → gold anchor mark/variant from the same curation-mark family.
- Crown Anchor 1820 → crown-anchor presentation; it is not a third Diamond Core.

The mark is presentation over canonical tier/role metadata. Surfaces never infer tier from numeric equality, match count, phrase wording or local code.

### 2. MARK IS INTERACTIVE, NOT DECORATION
Pressing/tapping the mark opens a lightweight contextual explanation:
- what this mark means;
- whether the current item is Diamond Core, Gold Core, Gold Number Anchor or Crown Anchor;
- why this item was Human-curated;
- the active Number Anchor(s) / core relation(s);
- a bounded set of strongest relevant witnesses;
- a deeper action such as “ראה את כל הזהב”, “ראה את כל היהלומים”, “פתח את העוגן”, or Explain-Why.

The first interaction must remain light. Full provenance/Trace belongs behind deliberate deepen/Explain-Why.

### 3. WITNESS DOES NOT INHERIT CORE ICON
A calculation/finding/source that merely supports or equals a Diamond/Gold Anchor does not receive the Diamond/Gold Core mark unless the underlying stable identity itself is curated at that tier.
Examples:
- עת=1820 במשולש is a Diamond Witness around the 1820 Crown; עת does not become Diamond by inheritance.
- a new phrase=604 may be Gold Witness; it does not become Gold Core automatically.

Witness projection may show a secondary relation hint such as “מחובר ל־Diamond 1820” / “עד בציר Gold 604”, without mislabeling the witness as Core.

### 4. NUMBER PAGE MUST STAY LIGHT
2029 Number Page default composition must not dump all curation data.

Default local view:
- current number identity;
- if curated: one compact Anchor/Crown mark beside the number;
- at most the strongest 1–3 local Core identities / curation connections when contextually useful;
- a compact count/entry point for the rest;
- ordinary gematria/results remain readable without a permanent curation dashboard.

No giant “all Gold / all Diamond / all Anchors” block inside every Number Page.

### 5. GLOBAL “TREASURES” DISCLOSURE
A single canonical 2029 disclosure surface/action may show the full curated collection on demand. It is a projection over existing nodes/relations, never a new store.

It must separate:
- Diamonds — Core Signature identities.
- Gold — Core semantic identities.
- Number Anchors — Gold Number Anchors + Crown Anchor, presented as numeric research centers rather than semantic entities.
- Witnesses — only when the user deliberately deepens into a selected Core/Anchor; not as one global noisy master list.
- Silver — hidden from this public collection until Silver semantics are explicitly decided.

The same disclosure can be opened from a curation mark or another 2029 “Treasures” entry point.

### 6. LOCAL LIST ROWS
Whenever a curated identity itself appears in a 2029 gematria/result/search/topic/world/post list, its mark appears directly beside that row/name.
Whenever the current numeric result is a curated Number Anchor, the numeric anchor mark may appear beside the value.
Do not duplicate both entity and anchor marks if that creates visual noise; use one primary mark and reveal the relationship on interaction.

### 7. PROGRESSIVE DISCLOSURE / MOBILE
Mobile-first:
- mark target remains accessible/tappable;
- explanation uses compact popover/sheet/drawer according to existing 2029 primitive patterns;
- first view is human-language, not governance jargon;
- lists collapse by default and preserve scanability;
- no horizontal overflow and no dense badge stacks.

### 8. ONE CANONICAL COMPONENT FAMILY
Implementation must extend canonical UI primitives rather than page-local icons. Conceptually this is one shared CurationMark/TreasureDisclosure family consuming canonical tier/role state. Surface-specific layout is allowed; semantic mark logic is not duplicated.
Use semantic theme roles/palette; no independent per-page Gold/Diamond hex system.

### 9. 2029 SURFACE COVERAGE
The invariant applies wherever relevant in the new system: Number 2029, World, Search, Topic/Post 2029 projections, Heichal result lists, Journey, Raziel result projections and future 2029 consumers.
It does not authorize a bulk legacy retrofit.

### 10. TRUTH BOUNDARY
Visual prominence and the Diamond/Gold mark communicate Human curation, not stronger calculation truth. Verification/provenance remain separately inspectable.

OWNER CHECK: EXTEND_EXISTING Experience + canonical UI primitives + golden_entity_law. No Treasure Store, Badge Registry, curation graph or parallel truth/ranking system.


—— READING SURFACE / GLOBAL FRAME COMPOSITION V1 · Human-Gate ZURIEL · 24.9.2026 ——

This is a cross-surface Experience composition decision under the existing System Frame / Research Workspace / Raziel owners. It creates no new shell, panel system, context store, navigation owner, AI companion or truth layer.

1. ONE GLOBAL FRAME. Every native 2029 surface consumes the same System Frame semantics: global orientation/navigation, one Bottom Command Island action surface, one Raziel presence, one transient Panel Host and one Research Context continuity model.

2. BOTTOM COMMAND ISLAND = CONTROL, NOT NAVIGATION. The island remains the global action surface. Its semantic slots are contextual command/action/Raziel/attention/tools. It must not be duplicated inside a page-local side rail.

3. ONE RAZIEL. Raziel stays anchored globally in the System Frame. A reading surface may expose a contextual trigger such as “שאל את רזיאל על החלק הזה”, but that trigger opens the same Raziel companion with the active Reading Focus. No post-Raziel, world-Raziel or surface-specific conversation system.

4. ONE TRANSIENT PANEL HOST. Deep inspect, capability detail, tools and Raziel expand through the existing Panel Host. A page-local rail is preview/orientation only; it is not a second inspector/dashboard.

5. SURFACE GEOMETRY FOLLOWS ROLE, NOT FORCED VISUAL SAMENESS.
- Reading Surfaces (Post, Book/Source and comparable long-form reading) may use Source/Reading Canvas + Context Spine + bounded Context Rail/Living Margin.
- World/Topic/Number are already rich Hub/Explorer/Detail canvases and do not receive a permanent Reading Rail by default; deepen through contextual actions/Panel or transition to the correct product home.
- Heichal/ELS and similar tools are Workbench/Focus surfaces and do not receive a permanent Reading Rail.
This preserves one system while allowing different surface geometry.

6. CONTEXT RAIL = INTELLIGENCE PREVIEW. It answers only “what is worth noticing here?” for the active reading region: one primary connection plus a small bounded set of signals (verified calculation/source/time/curation/etc.) and continuation actions. Contextual Prominence + Silence Gate apply. If nothing materially improves the reading, the rail stays quiet.

7. CONTEXT SPINE = READING-TO-SYSTEM SEAM. A thin non-intrusive spine/marker may indicate that a source region has relevant depth without injecting system prose into authored paragraphs. Markers are projection affordances, never source text or truth state.

8. DEPTH MODEL = READ → PEEK → DEEPEN.
- READ: source text remains primary.
- PEEK: Context Rail shows bounded context.
- DEEPEN: existing Panel Host or the correct product home (World/Number/Source/ELS/Heichal/Journey) opens with exact Research Context and exact-return state.
No new page-specific depth engine.

9. MOBILE EQUIVALENCE. On mobile, the permanent side rail disappears. The same Reading Focus may surface as a small marker/count and opens through the existing bottom-sheet Panel Host. Bottom Command Island and Raziel remain globally consistent.

10. EXACT RETURN. Transition from a reading region to World/Number/Source/ELS/Heichal/Journey preserves Post/source identity, exact reading locator/region, why-transition and returnTo so “חזרה” returns to the exact reading context, not merely the top of the post.

11. VISUAL OWNER. Placement, typography, motion and rail/spine styling consume the active Design Contract / semantic palette. This decision owns semantics and surface-role composition only, not hard-coded colors or page-local design systems.

OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1_law + research_workspace_law + raziel_companion_layer_law. No new global UI owner.


—— HEICHAL RESEARCH-LAB ENVIRONMENT PROJECTION · Human-Gate ZURIEL · 24.9.2026 ——

OWNER CHECK: EXTEND_EXISTING. This is a visual/environment projection under the existing Experience + SOD1820_DESIGN_CONTRACT_V1 / Visual Foundation tree. It creates no Heichal theme owner, no second palette system and no new product identity.

1. HEICHAL = RESEARCH_LAB ENVIRONMENT.
The existing Experience Context already classifies Heichal as RESEARCH_LAB. The visual projection now intentionally differentiates Heichal from narrative/discovery surfaces while preserving the same SOD1820 System Frame, typography, component family, Raziel identity, semantic status colors and capability owners.

2. DARK PROJECTION — MIDNIGHT LAB.
Heichal dark mode uses a colder deep navy/indigo/graphite laboratory atmosphere, restrained scenery, precise glass/data surfaces, research-blue interaction and Raziel indigo continuity. Sacred gold remains brand/curation accent only and must not become truth/status ranking.

3. LIGHT PROJECTION — PEARL LAB.
Heichal light mode uses pearl/silver/off-white laboratory surfaces, deep ink, cool blue-gray structure, research-blue interaction and restrained gold brand accents. It is the daylight counterpart of the same Heichal, not a separate brand.

4. TRANSITION, NOT TELEPORT.
Entering/leaving Heichal may use a short restrained environment transition so the user senses “entered a workbench” while global identity/orientation remains stable. Motion is optional/ambient, respects reduced-motion, and carries no information.

5. GEOMETRY / DENSITY.
Heichal may use more precise grids, separators, instrument-like spines, denser inspector surfaces and lower scenery than Home/Post/World. Global System Frame components remain the same owners; surface-local visuals may adapt to the RESEARCH_LAB role.

6. SCOPE BOUNDARY.
Do not recolor the whole site blue. Do not hard-code page-local hex values when semantic palette/environment tokens already exist or can be extended. Do not create HeichalTheme.js. Extend the existing palette/environment projection cleanly for both dark and light.

7. CONNECTED GOLDEN ACCEPTANCE.
The Connected Golden must visibly demonstrate the transition from ordinary 2029 discovery environment into Heichal in both dark and light modes, with no capability/context/Raziel discontinuity and no readability/accessibility regression.


—— COMMUNITY HISTORY SEARCH INDEX GATE · Human-Gate ZURIEL · 24.9.2026 ——
Historical/community retention and research/search indexing are separate capabilities.

1. ALL community history may be retained for chronological/thread continuity.
2. SEARCH / RESEARCH INDEX eligibility is opt-in by signal, not default-by-message.
3. A message enters the research/search index only when it contains a material Remez/Research signal: an actual numeric/gematria relation or claim, method/cipher/ELS operation, source-text/verse/name/entity relation, explicit interpretive connection, or another research-bearing statement that can be routed into the canonical Research Intake/engines.
4. Mere presence of a number is NOT sufficient. Mere presence of a URL is NOT sufficient.
5. VIDEO/LINK-ONLY/SOCIAL CHAT/REACTION/SMALL TALK content is NOT indexed and is NOT searchable through the research/search layer. It remains accessible only through its original conversation chronology/thread unless a separate human-authored research statement exists.
6. Video/media itself is never indexed into Community research merely because it was shared. If accompanying authored text independently contains a material Remez/Research signal, only that text/derived research object may become index-eligible; the media remains source/provenance.
7. Popularity, likes, replies, author identity, or historical visibility never make a message index-eligible.
8. Classification is candidate-only. It may propose index_eligible=true/false with reasons, but cannot promote to Canonical/Fact/Published. Existing Truth/Human-Gate boundaries remain unchanged.
9. Performance intent: non-indexed social history must not participate in search/retrieval/semantic indexing jobs, embeddings, or Raziel research retrieval. It should impose only normal storage/thread-access cost.
10. ONE TREE: extend existing Research Intake/Search/Strategy owners; do not create a parallel Community search store.



—— COMMUNITY SEARCH INDEX GATE · CORPUS CALIBRATION · Human-Gate ZURIEL · 24.9.2026 ——
REAL-CORPUS CALIBRATION OVERRIDES OVER-BROAD HEURISTIC ELIGIBILITY.

1. Regex/keyword detection is PRE-FILTER ONLY. It may produce scan_candidate=true + candidate_reasons, but MUST NOT by itself set index_eligible=true.
2. index_eligible=true requires at least one reconstructable research-bearing unit, e.g.:
   - explicit numeric/gematria relation with operands/relation (not a number appearing in prose/URL/timecode);
   - canonical method/cipher/ELS application with identifiable operation/input;
   - source-text/verse/name/entity relation together with an authored interpretive/research connection;
   - another structured research claim/finding that can route into existing Research Intake / canonical engines.
3. Before any numeric/source heuristics, strip/segregate URL payload/query strings from authored-text analysis. URL query parameters, article ids, timestamps, video offsets, etc. are never numeric-relation evidence.
4. Hebrew book/entity names require contextual disambiguation. Substrings such as "שמות" inside ordinary language ("השמות") MUST NOT qualify as Biblical-source evidence.
5. Internal SOD links must be hostname/relative-route validated. An external URL whose path happens to contain /world/, /person/, etc. is NOT an internal research-object reference.
6. Mere mention or rejection of research vocabulary ("גימטריה לא תופס אצלי", bibliographic "רמז ע״ו", etc.) does not automatically create a research finding.
7. Default remains FALSE. When uncertain, preserve the message only in chronological Community history and do not index.
8. One-time historical scan may cheaply prefilter candidates, but only structured extraction/classification under existing Research Intake/Search Strategy may promote a candidate to index_eligible.
9. No new Community search store. Eligibility remains derived metadata / decision candidate under existing owners.

Real-corpus evidence triggering this calibration: current PR #636 heuristic marked 2,860/41,080 rows eligible; 2,196 were eligible solely via broad verse/entity keyword matching. Observed false positives included ordinary "השמות" matching ספר שמות and external news URLs with /world/... matching the internal-route regex.



—— SOURCE-FIRST DISCOVERY HANDOFF · Human-Gate ZURIEL · 24.9.2026 ——

SOD HASHMAL / סוד החשמל is an approved future calibration consumer of the existing Research Strategy / Discovery capability fabric.

1. PIPELINE TARGET.
source intake → authored headings / Reading Regions → region-bounded Research Context → existing Research Plan chooses relevant capabilities → canonical engines/readers verify/extract → normalize/dedup/dependency grouping → Truth/Provenance classification → contextual prominence + Silence Gate → bounded projections to Living Margin / mobile cue / Raziel / World / Number.

2. NO NEW “HINT ENGINE”.
Do not create a Post-specific hint engine. Reuse research_strategy_layer_law v15 capability planning, canonical Gematria/method registry, Reality Graph relations, Research Gold Hints contextual prominence and existing source/provenance owners.

3. REGION IS CONTEXT, NOT IDENTITY INVENTION.
A Reading Region is a bounded source locator/context. The discovery pass may return Findings/Connections/Evidence/verified calculations associated with that region, but a region label itself is not automatically a new canonical Topic/Claim/Fact.

4. DISCOVERY ≠ PRESENTATION.
A full scan may discover many candidates. Source-first UI shows only bounded, decision/useful connections after filtering, verification, dedup and prominence. The rest may remain available in World/Research depth without polluting the reading surface.

5. SOD HASHMAL TARGET BEHAVIOR.
After the full scan is wired, each authored section (for example תשפ״ז; “שכר האדם לא נהיה” / AI; יתמו חטאים; השיר; צפנים) should automatically receive a contextual result bundle appropriate to that region. Verified gematria remains clickable and explainable; source text remains visually calm. Raziel receives the exact active region + bounded result bundle; World receives the same context for deep exploration; exact return restores the source position.

6. AUTOMATION GOAL.
For future eligible source-first publications, this scan/handoff should run by default through the governed intake/publishing workflow rather than requiring ZURIEL to ask separately each time. Automatic discovery does not auto-canonicalize, auto-publish claims, or rewrite the source.



[UPDATE · Human-Gate ZURIEL · 24.9.2026 — CALCULATOR 2029 INTERACTION CONTRACT V1 · EXTEND_EXISTING]

PURPOSE
Calculator 2029 is the fast public calculation surface over the existing Gematria Capability Fabric. It is not a second Gematria system, not a Heichal clone and not a reduced Research OS.

1. INSTANT CALCULATION IS A PRODUCT INVARIANT.
Typing a word/expression MUST surface its method profile immediately without requiring a “Calculate” button. The primary surface stays fast, direct and low-friction. Deeper research capabilities must not make ordinary calculation feel like entering a workbench.

2. ONE CAPABILITY, MULTIPLE PROJECTIONS.
Calculator, Number, Heichal, Beit Midrash and Raziel consume the same canonical method identity/Registry/execution/Trace/Research Context. They may expose different depth, but MUST NOT own separate formulas, method catalogs or incompatible calculation state.

3. SELECTED CALCULATION IS THE INTERACTION UNIT.
Selecting a result creates/updates a bounded Calculation Selection carrying at minimum:
- exact expression;
- canonical method identity/version when available;
- computed result;
- calculation/engine provenance;
- relevant representation/context.
Selection != publication, research finding or canonical claim.

4. CLICK DOES NOT FORCE NAVIGATION.
Clicking a method/result in Calculator first MAY open a local contextual Panel/Inspector while remaining on the calculator. A user MUST NOT be forced into Heichal merely to inspect מילוי, ריבוע, a Trace, letter breakdown or another ordinary calculation explanation.

5. LOCAL EXPLANATION VS DEEP RESEARCH.
Calculator may show bounded in-place calculation detail: Trace, transformed letters/text, per-letter/per-word decomposition, method status, Hebrew-number display and equivalent calculation explanation.
“Open in Heichal” is an explicit deep-research action. Heichal receives the SAME Calculation Selection and surrounds it with deeper capabilities; it does not open a different or “more authoritative” calculator.

6. ROLE SEPARATION.
- Calculator = Calculate → Select → Explore.
- Number = Explore the numeric result/identity and its governed connections.
- Beit Midrash = Understand the method.
- Heichal = Investigate deeply using the same context.
- Raziel = Explain/connect/assist over the same context.
No surface duplicates another surface’s semantic ownership.

7. RESULT / METHOD / EXPRESSION ARE DISTINCT TARGETS.
- Result click: selects the exact calculation; may then offer “Open Number”.
- Method click: method Trace/explanation/“Learn in Beit Midrash”.
- Expression click: expression-focused Research Context.
- Crossing click: crossing-focused research projection.
These targets must not collapse into “always go to number page”.

8. EXACT CONTINUITY.
When moving from Calculator to Number/Heichal/Beit Midrash/Raziel, preserve the originating expression + method + result + return context. Exact return should restore the Calculator state rather than dropping the user into a generic destination.

9. SAVE SEMANTICS.
A save affordance on a calculation should preserve the calculation identity (expression + method + result + provenance) when the receiving owner supports it, rather than silently reducing the saved object to a bare number. Calculation/save remains separate from publication/community/canonicalization.

10. ADVANCED COMPARE REMAINS, BUT ITS OPERATIONS ARE DISTINCT.
The useful legacy two-expression comparison capability is retained conceptually, rebuilt over canonical execution:
- Compare = inspect two calculations side-by-side.
- Crossing = two expressions/methods meeting at the same result, with dependency/equivalence checks before research significance is implied.
- Combine/Sum = a DERIVED_OPERATION with operand provenance, not a new Gematria method/result identity.
- Split = continue each calculation independently.
Do not overload one “combine” action with multiple incompatible meanings.

11. TRANSFORM / “SEND UP” PRESERVES PROVENANCE.
Using a method-transformed output as a new calculator input is allowed, but the transformation lineage must remain reconstructable. A transformed string/value is not silently treated as an unrelated fresh source expression.

12. OPENING / DECOMPOSITION.
Ordinary method opening/decomposition that directly explains the selected deterministic calculation may appear inline in Calculator when supported by canonical Trace/engine adapters. Derived operations (such as per-word prefix opening) remain explicitly labeled DERIVED_OPERATION and never become independent method identity/evidence merely because they are displayed in Calculator.

13. INTERPRETIVE LAB CAPABILITIES.
Interpretive features such as “שיטת המפתח”, AI interpretation or research hypothesis layers are NOT Calculator Core. Calculator may expose an entry/action into the appropriate Heichal/Raziel/Research surface while preserving the current Calculation Selection. Deterministic calculation facts and interpretive layers remain visibly distinct.

14. LANGUAGE / ENGLISH BOUNDARY.
Transliteration may remain a Language Router capability. English Gematria methods are not automatically admitted into the Hebrew canonical Gematria Registry merely because the legacy calculator implemented them. Any retained English method family requires its own canonical owner/registry/execution decision; no silent port.

15. HISTORY / COMMUNITY / TELEMETRY BOUNDARY.
Calculation does not inherently publish, add to a public wall, create community content or promote research truth. Telemetry, personal save/history, community contribution and publication are separate governed capabilities and must be reconnected explicitly if retained.

16. PERFORMANCE / PROGRESSIVE DISCLOSURE.
The initial calculator view prioritizes input + immediate method results. Deep details, Trace, crossings, research actions and interpretive tools are progressively disclosed after selection. The system must not load the full Heichal/World/Research experience merely to provide instant calculation.

17. OWNER CHECK.
EXTEND_EXISTING only. No Calculator Engine, Calculator Registry, Calculator Research Store, Calculator Context or parallel method system is authorized by this contract. Runtime implementation must consume existing Registry/Profile/Trace/Presentation/Research Context/Opening owners.



[UPDATE · Human-Gate ZURIEL · 24.9.2026 — CALCULATOR 2029 · RAZIEL PREMIUM INVOCATION]

Calculator 2029 preserves an AI-free instant typing path. Deterministic method results must appear without invoking Raziel, LLM, deep search or broad research retrieval.

After a stable Calculation Selection exists, the user may explicitly invoke “Ask Raziel / Analyze this Gematria”. That action consumes the SAME expression + method + result + provenance/context and routes to the existing Raziel/Research capability fabric.

Entitlement for this action is owned by active platform_tiers_law: raziel_gematria_analysis is PREMIUM-REQUIRED, server-gated before expensive I/O. Locked/non-entitled presentation must not execute hidden AI work.

Calculator Core remains calculate/select/explore; Raziel is optional deep intelligence, not part of the keystroke/render critical path. Premium depth never changes deterministic truth quality.

OWNER CHECK: EXTEND_EXISTING. No Calculator-specific Raziel, AI engine, context store or entitlement system.



[UPDATE · Human-Gate ZURIEL · 24.9.2026 — METHOD LENS 2029 · EVIDENCE-FIRST PROJECTION · EXTEND_EXISTING]

PURPOSE
Method Lens is a shared deterministic projection for Calculator 2029 and Number 2029 over a selected Calculation Selection / method result. It answers: “what is actually inside this method/result?” It is not an AI summary surface and not a second search engine.

1. SHOW THE EVIDENCE, NOT A SUMMARY OF THE EVIDENCE.
The primary Method Lens result MUST render the actual matching expressions/relations/items available for the selected method+value. If there are 11 independent connections, the user must be able to see/open the 11 connections themselves. A count such as “11 independent” may accompany the view but may never substitute for the list.

2. NEVER SUMMARIZE AWAY THE EVIDENCE.
Normalization, dependency collapse, rarity, ranking and relation classification may change labels/order/grouping/weight, but MUST NOT silently erase the underlying evidence from inspection. Hidden-by-default low-value/dependent items require an explicit “show dependent/all” affordance rather than permanent disappearance when they remain relevant to replay.

3. ENGINE NORMALIZATION IS UNDERLAY.
Dependency/equivalence/anagram/word-order normalization runs beneath the projection to prevent inflated significance. The default display should emphasize effective independent relations while preserving transparent access to dependent/raw matches.

4. ACTUAL ITEM FIRST.
Each visible item should lead with its real expression/entity/connection and exact deterministic relation to the selected method/value. Secondary badges may expose: method identity, additional independent method families, dependent/equivalent status, rarity/frequency, source/evidence presence, curation marks and relation type. Badges are metadata; they do not replace the content.

5. SELECTED-METHOD SCOPE.
The lens is anchored to a selected calculation: expression + canonical method + value + provenance. It must be able to answer specifically “what else is here in THIS method at THIS value?” rather than only returning root-wide or cross-method discovery.

6. CROSS-METHOD DISCOVERY IS ADDITIVE.
When an item also meets the active expression through additional methods, show those crossings as additional structure. Dependency-normalized independent-family count may be shown, but raw method count must not be mistaken for independent strength.

7. FREE DETERMINISTIC ANALYSIS.
Method Lens deterministic lookup, dependency normalization, relation-engine classification, canonical Trace and honest structured explanation are core engine/research projection capabilities and MUST NOT require Raziel/LLM merely to reveal what the engine/database already knows, subject to ordinary access policy for the underlying data.

8. HUMAN-READABLE STRUCTURED MESSAGE WITHOUT LLM.
The projection MAY generate concise deterministic sentences from structured engine facts (for example “2 independent method families; רגיל+גדול collapse under this input condition”), provided every statement is reproducible from canonical engine/Registry/relation outputs. This is presentation logic, not AI interpretation.

9. AI / RAZIEL IS A SEPARATE DEPTH.
Raziel may interpret significance, search broader governed context, synthesize sources or recommend next research steps after explicit invocation and entitlement. Raziel does not own the base matching list and must not be required to expose deterministic Method Lens results.

10. SHARED PROJECTION.
Calculator and Number consume the SAME Method Lens projection/semantics. Calculator may open it in an in-place Inspector/Panel; Number may render it inside its Method Inspector. No duplicate normalization logic, query semantics or separate “Calculator Method Lens” vs “Number Method Lens”.

11. PERFORMANCE.
Method Lens is NOT part of keystroke critical path. Instant Calculator typing remains Profile-only. Method Lens may load lazily after explicit result/method selection. Bounded reverse lookup and deterministic relation normalization are allowed at selection depth; LLM/deep search remains explicit-action only.

12. TRUTH BOUNDARY.
Match/equality is deterministic engine fact when verified. Independent-family count/dependency classification is relation-engine analysis. Rarity/rank is an attribute. Interpretation/significance remains separate. None of these automatically canonicalizes or publishes a research claim.

OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1 + gematria_engine + canonical_methods_registry + cross_vs_convergence_criteria. No new engine, Registry, Search Store, Method Store or AI system.



[UPDATE · Human-Gate ZURIEL · 24.9.2026 — GEMATRIA METHOD ACTION GRAMMAR 2029 · ALL SURFACES · EXTEND_EXISTING]

PURPOSE
Any 2029 surface that exposes a canonical Gematria method must reuse one interaction grammar over the SAME Calculation Selection. This is a presentation/transition invariant, not a new Calculator, Heichal, Beit Midrash, Registry or engine.

1. ONE CALCULATION SELECTION.
The stable interaction identity is exact expression + canonical method/version + deterministic result + provenance/context. Moving between Beit Midrash, Calculator, Number and Heichal preserves this identity and exact-return context.

2. CANONICAL USER ACTION GRAMMAR.
Where applicable, method surfaces should use these semantic actions:
- “נסה כאן” = bounded in-place single-method test using canonical Profile/engine only.
- “ראה פירוט” = deterministic calculation detail / Trace / decomposition for the selected method when available.
- “ראה פתיחה” = canonical Opening/decomposition projection when supported; derived totals remain DERIVED_OPERATION.
- “פתח במחשבון” = continue the SAME expression+method+result in Calculator 2029, where all methods / Method Lens / Compare may be available.
- “חקור בהיכל” = continue the SAME Calculation Selection into Heichal deep research.
Visible wording may adapt slightly to context/locale, but semantic action identity and handoff must remain the same.

3. BEIT MIDRASH ROLE.
Beit Midrash = learn one method and try one method. Its inline tester is a MINI METHOD TESTER, not another full calculator:
- one active method at a time;
- one expression input;
- canonical result only;
- optional bounded Trace/detail/opening;
- explicit exits to Calculator and Heichal with exact context.
It MUST NOT expand into all-method browsing, broad Method Lens discovery, Compare workspace, World scan or Raziel/deep-research orchestration merely because those exist elsewhere.

4. CALCULATOR ROLE.
Calculator = calculate/select/explore across canonical methods. Selecting a method/result first stays local and may reveal detail/opening/Method Lens/Compare progressively. It does not force navigation to Heichal.

5. HEICHAL ROLE.
Heichal = deep research over the SAME calculation identity. “חקור בהיכל” means deeper tools/context, not a more authoritative calculation and not a different formula. Calculator/Beit Midrash deterministic truth must match Heichal because all consume the same engine/Registry.

6. COMPLEX METHODS.
Rich methods (for example cumulative/triangle/square/miluy-depth families) may expose large decompositions locally through progressive disclosure: compact summary first, then “ראה פירוט/ראה את כל השלבים”. Large output alone is NOT a reason to force the user into Heichal.

7. INPUT IS AN ANCHOR.
Opening/detail MUST NOT silently replace the main input expression. The original expression stays the current anchor. A transformed output may become a fresh Calculator input only through an explicit user action and only when canonical transformed text/lineage is available; provenance must remain reconstructable.

8. NO DUPLICATE CALCULATORS.
A mini tester in Beit Midrash, Method Inspector in Number or local detail panel in Calculator are projections of the same engine capability. They MUST NOT own local formulas, copied method arrays, private method catalogs, alternate result truth or separate calculation history.

9. PROGRESSIVE DISCLOSURE.
Default public flow: result first → bounded detail/opening on demand → full Calculator if broader calculation work is desired → Heichal if deep research is desired. Deep research is not loaded merely to test or understand one method.

10. TRUTH / INTERPRETATION BOUNDARY.
Deterministic result/Trace/opening comes from canonical engine/Profile/Trace/Opening readers. Method meaning/“רעיון מחקרי” is shown only when canonically sourced. Missing interpretation stays missing; UI does not invent it.

11. SHARED ACTION IDENTITY ACROSS SURFACES.
The same semantic actions should route consistently from Beit Midrash, Calculator, Number Method Inspector and future method cards. Placement may differ by surface, but “Try / Detail / Opening / Calculator / Heichal” must not change meaning or lose context.

OWNER CHECK: EXTEND_EXISTING experience_governance_foundation_v1 + research_workspace_law + canonical_methods_registry_law + gematria_engine_law. No new method-interaction system/store/engine/context.




—— CONTEXTUAL PROJECTOR PLACEMENT LOCK · Human-Gate ZURIEL · 6.10.2026 ——
EXTEND_EXISTING only. This is an Experience placement decision, not a new Projector system/store/engine.

1. INTERNAL ROLE.
The contextual projector is an internal composition capability over existing canonical owners: Reality Graph + governed Findings/Claims + Time/Axis data + Explainable Prominence + Research Context. It does not own truth, identity, ranking, follow state, notifications, media or persistence.

2. PRIMARY DAILY PROJECTION = CONTEXTUAL SIDECAR.
Desktop primary projection is the shared left Contextual Sidecar / Contextual Inspector. Mobile projects the same state as the Bottom Context Sheet. This is where a user sees “what is connected now” while reading/browsing without leaving the current surface. Keep the visible set bounded and explainable.

3. DEPTH PROJECTION = WORLD.
World is the deep-expansion surface for the same context: full convergence neighborhood, timeline, typed relations, branches, media, sources, people/places, cross-time links and journey continuation. World does not fork identity from the Sidecar; it expands the same canonical context.

4. DISCOVERY PROJECTION = HOME.
Home receives only high-signal/prominent discovery cards selected through the existing explainable prominence/curation owners. Home is not the full graph and must not become a raw relationship dump. Examples: “new strong connection to 7.10”, “FZ1073 convergence strengthened”, “new connection in Lebanon/Hezbollah family”. Clicking preserves context into Sidecar/World/Post.

5. ENTITY/SURFACE PROJECTIONS.
Post, Number, Date, Event, Person, Place, Topic/Series and other eligible 2029 surfaces consume the same projector/result bundle, each through its own projection contract. A Number page emphasizes numeric relations; an Event/Date surface emphasizes occurred-time and event family; a Post emphasizes story/provenance; none creates a parallel semantic truth.

6. RAZIEL.
Raziel consumes the same Research Context + projector explanation payload. Raziel explains why something is relevant, can suggest a next action/follow choice, and may traverse governed relations. Raziel does not own or invent the graph/projector, cannot independently canonicalize, and cannot dispatch follow notifications.

7. FOLLOW.
Projector/prominence may recommend which durable identity is worth offering to Follow. Actual Follow identity resolution/state/dispatch remains under subscription_funnel_law and explicit user consent. “Worth showing” != “subscribed”.

8. ONE-WRITE PROPAGATION PRINCIPLE.
A new governed observation/finding is written once to its canonical owner/identity/provenance. Number/Event/Timeline/Post/World/Home/Raziel/Follow surfaces learn about it by projection/query; they are never manually synchronized with copies. If a new 1073 finding is added, no separate updates to 7.10, World or Raziel are required.

9. DISTANCE + CONTEXT.
Direct typed relations normally outrank distant paths. Distant “gates” may surface when contextual prominence supports them through independent evidence, specificity, cross-domain diversity or journey value. The projector must return the reason/path so UI can say “why this is connected”.

10. NO PROJECTOR PAGE.
There is no standalone public “Projector” destination. Users encounter its output in context:
- daily/current: left Sidecar / mobile Bottom Sheet;
- depth: World;
- discovery: Home;
- exact identity: entity/page surfaces;
- explanation/navigation: Raziel;
- continued attention: Follow/Personal Area.

Acceptance: one context, one identity tree, multiple projections; bounded Sidecar; World is depth not duplicate; Home is discovery not dump; Raziel/Follow consume but do not own; one governed write propagates by projection.


## V10 — טעינה ממוקדת ותוכן טרי ב־2029 · Human Gate ZURIEL · 16.10.2026

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
$sod_txt$, updated_at=now() where id=30;
  if (select md5(body) from public.project_codex where id=30) <> '1c95f7fdbeaf94b1b4f70a057574f304' then raise exception 'S23 codex experience_governance_foundation_v1: new body md5 mismatch'; end if;
end
$sod_blk$;

-- ── project_codex #15 convergence_law ────────────────────────────────────────
do $sod_blk$
declare v_body text;
begin
  select body into v_body from public.project_codex where id=15 and slug='convergence_law' for update;
  if not found then raise exception 'S23 codex convergence_law: row missing'; end if;
  if md5(v_body) <> '0b14ba287ad2c7bc2c8017b0c76f847d' then raise exception 'S23 codex convergence_law: body drift (md5 %)', md5(v_body); end if;
  update public.project_codex set body=$sod_txt$[2029 AUTHORITY NOTE · 20.9.2026] This document is historical architecture guidance. Where it says topic_cards is the source of convergence truth, that is superseded by reality_graph_law v8 + cross_vs_convergence_criteria v4 + writer_material_home_law v3. In 2029, topic_cards is legacy/projection/migration material; canonical semantics live under Reality Graph + Research OS + Truth/Human Gate. Preserve history, do not build new Topic truth from this document alone.

זהו הגזע של SOD1820. כל סוכן/מנוע חייב לקרוא זאת לפני שהוא נוגע בגלריות, מספרים, כרטיסים או כל פיצ׳ר. החומר כאן הוא זהב — וכשהוא מחובר יחד הוא יהלום. אסור לאבד חיבורים ואסור ליצור מערכות מקבילות.

■ עיקרון-העל: עץ ידע אחד.
כל האתר הוא גרף אחד (nodes + edges). אין "גלריות", "גימטריה", "פוסטים" כעולמות נפרדים — יש ישויות וקשרים. כל דבר הוא node: number, entity (כולל זהב), convergence (צירי התכנסות), event, year, post, word, phrase, image. כל עמוד באתר הוא רק "עדשה" על אותו גרף.

■ הכלל המעשי: מציירים פעם אחת, מפנים מכל מקום.
לכל ישות עמוד קנוני אחד: מספר → /number/:n · התכנסות → /topic/:slug · ישות/ביטוי → /number/:label. בכל מקום אחר (מגירת מספר, רצועת בית, שורה עליונה, /cross, ציר ההתגלות) מופיע רק תקציר/צ׳יפ שמקשר לעמוד הקנוני — לעולם לא עותק של התוכן. אסור לבנות מערכת שנייה לאותו דבר.

■ לא לאבד הצלבות (זה הלב).
לפני הוספת פיצ׳ר — לחבר אותו לגרף. number ↔ convergence ↔ /cross ↔ ישות זהב ↔ גלריה ↔ פוסט ↔ אירוע חייבים לראות זה את זה דרך edges. דוגמה חיה: 1820 ↔ שתי ישויות הזהב (=שתי החתימות) ↔ /topic/1820 ↔ תמונות מירון ↔ אירוע מירון.

■ מלמטה למעלה: שורשים → גזע → ענפים → עלים.
שורשים = נתון (OCR, gematria_words, ocr_numbers, nodes). גזע = הגרף (nodes/edges). ענפים = העדשות (/number, /topic, /cross, /timeline, בית המדרש). עלים = משטחי UI (רצועת הבית, השורה העליונה, מגירות). מתחילים תמיד מהשורש; משטח חדש = שאילתה על הגרף, לא טבלה חדשה.

■ שכבת ההתכנסות (convergence).
topic_cards = המקור הערוך של צירי ההתכנסות (כותרת, ממצאים, רמז משלים, הסתייגות, מספרים מובלטים, איכות, status). באישור — מוקרן לגרף כ-node type=convergence + edges (contains→number, related→entity, reveals→event). convergence_meter (0-100) מזין quality/weight. כל החלונות (שורה עליונה, רצועת הבית, מדור בית המדרש, /topic) קוראים אותו מקור.

■ כבוד לרמז + יושר מחקרי: תמיד להפריד גימטריה (עובדה) מפרשנות (רמז משלים).

■ SEO: לכל ציר URL קבוע (/topic/:slug) + meta/canonical/OG; חובה ב-sitemap (scripts/gen-sitemap.mjs) + JSON-LD.

[היסטורי — כל הקבצים ברשימה הוסרו עם Legacy ב-5.11.2026] קבצים: src/pages/TopicPage.jsx, src/components/ConvergenceAxis.jsx, src/lib/topicCards.js, src/pages/CrossMethodPage.jsx, src/pages/EntityPage.jsx, src/pages/BeitMidrashPage.jsx, src/components/layout/LiveActivityBar.jsx.$sod_txt$, updated_at=now() where id=15;
  if (select md5(body) from public.project_codex where id=15) <> '85e9ec4561efc3eea4c962ec2e2509f8' then raise exception 'S23 codex convergence_law: new body md5 mismatch'; end if;
end
$sod_blk$;

-- ── project_codex #5 gematria_engine ────────────────────────────────────────
do $sod_blk$
declare v_body text;
begin
  select body into v_body from public.project_codex where id=5 and slug='gematria_engine' for update;
  if not found then raise exception 'S23 codex gematria_engine: row missing'; end if;
  if md5(v_body) <> 'f4202db738aae4e67297eb673378e00a' then raise exception 'S23 codex gematria_engine: body drift (md5 %)', md5(v_body); end if;
  update public.project_codex set body=$sod_txt$G2 FINAL COMPACTION · Human-Gate ZURIEL · 15.9.2026

PURPOSE
`project_codex.gematria_engine` owns deterministic Gematria execution/verification routing. It is not the Method Registry and it no longer carries a fixed method count or duplicate method-definition catalog.

CURRENT OWNER TREE
- Method identity / labels / lifecycle-capable metadata: `public.gematria_methods`, governed by active `canonical_methods_registry_law` (current v5).
- Method lifecycle: `method_lifecycle`.
- Execution/scanning authority: `engine_governance_registry_authority_law`.
- Canonical execution/verification gate: active `gematria_engine_law` (current v2) + registered SQL/function execution path.
- System/ZURIEL numeric research operators that are not Gematria-method identity live under `project_codex.numeric_rule_family_index`, not in this engine body.

NO FIXED METHOD COUNT
The engine must resolve the live Registry; it must never assume “8 methods” or another hard-coded total. Registered != executable != engine_verified != active != scannable != published. The Registry owns those distinctions.

METHOD DEFINITION ONCE
Exact current method identity/behavior metadata comes from `gematria_methods` and canonical execution/Trace: `method_key`, `display_label`, mathematical family, word-boundary behavior, final-letter sensitivity, derived/dependency rules, execution kind/function/operator, source/provenance and verification state. Legacy `nodes` method-definition rules are historical provenance/on-demand evidence after their semantics are represented by the Registry/engine; they are not normal startup authority.

ALIASES / CONDITIONAL EQUIVALENCE
Use active `canonical_methods_registry_law` v5. Alias is one method identity; conditional equivalence is input-dependent projection, not method merge. Equivalence must not inflate evidence and must fail closed unless explicitly governed and engine/formula-proven.

EXECUTION TRUTH
When verification matters, use the canonical registered engine/functions/Trace. General-model arithmetic, memory or guessed formulas are NOT authoritative SOD1820 output. Source claim != engine verified.

RESEARCH / INTERPRETATION BOUNDARY
Mathematical/algorithmic result is engine truth. Method meaning, research priority, convergence and interpretation remain under their current Research/Truth owners and never rewrite deterministic results.

WRITE / GOVERNANCE
Adding a method identity, formula, dependency/equivalence or execution path must obey Registry/Method Lifecycle/Engine Governance/Human Gate. No local screen, post, calculator, AI agent or research session may create a parallel Gematria engine or private method catalog.

ARCHIVE
Pre-compaction body is preserved at `docs/archive/project-codex/GEMATRIA_ENGINE_PRE_G2_COMPACTION_20260915.md` on the G2 compaction branch and in repository history.

OWNER CHECK: EXTEND_EXISTING. One Registry, one execution authority, no parallel engine/store/registry.

G2 COMPACTION ADDENDUM · 15.9.2026
- ATOMIC CALCULATION IDENTITY: a deterministic Gematria result is preserved as exact Expression/operand + canonical method identity/version + value + Trace/provenance. Historical `bidim` view may remain an implementation/read model; it is not a separate truth owner.
- ANAGRAM DEPENDENCY: expressions with the same normalized letter multiset do not create independent novelty/convergence merely because order-insensitive additive methods return the same value. Order-sensitive/transform methods may still yield distinct results. Dependency/novelty classification belongs to the current Convergence/Research owners, not a second anagram law family.
- COMPUTE VS WRITE: canonical deterministic calculations may execute without per-calculation Human approval when the registered engine permits them. Calculation does not authorize DB/core mutation, method registration, canonicalization, publication, merge or deploy; those remain under current write/governance/Human-Gate owners.
- Source-specific interpretive method research (including historical Christina/key-method material) belongs in Research OS/provenance unless a method identity is admitted through the Method Registry.


[UPDATE · Human-Gate ZURIEL · 24.9.2026 — CALCULATOR 2029 CONSUMER-ONLY EXECUTION BOUNDARY]

Calculator 2029 is a CONSUMER of the canonical Gematria execution fabric. Its public interaction contract is owned by experience_governance_foundation_v1.

Execution invariants:
- Calculator 2029 MUST resolve live method identity/order/state from the canonical Registry.
- Authoritative calculation/verification uses the registered engine/Profile/Trace path.
- Calculator 2029 MUST NOT create or treat local screen formulas, legacy JavaScript method arrays or a copied method catalog as canonical authority.
- A fast UI may cache/project already-authoritative calculation results, but performance optimization never creates a second calculation truth source.
- Heichal, Number, Beit Midrash, Raziel and Calculator must converge on the same method/result identity and provenance.
- Legacy GematriaCalculator/GematriaCalculatorLegacy were compatibility/reference surfaces until the cutover and were removed with Legacy on 5.11.2026; Calculator 2029 is the active surface.
- No new RPC/engine is implied when existing fn_method_profile/registered execution is sufficient.

OWNER CHECK: EXTEND_EXISTING. No parallel engine/Registry/store.



[UPDATE · Human-Gate ZURIEL · 24.9.2026 — METHOD LENS NORMALIZATION / EVIDENCE BOUNDARY]

Method Lens consumes canonical execution plus existing relation/dependency normalization. Its normalization may group/label/order evidence but may not replace actual matching items with aggregate prose.

- Exact method/value matches remain inspectable.
- Dependency/equivalence normalization determines effective independence, not existence.
- Raw and effective counts must remain distinguishable when shown.
- fn_relation_candidate / dependency-group semantics may be consumed for deterministic relation classification; a UI must not reimplement those rules locally.
- General-model/LLM prose is not required for deterministic Method Lens output and is never calculation authority.

OWNER CHECK: EXTEND_EXISTING. No parallel relation engine/search engine.

$sod_txt$, updated_at=now() where id=5;
  if (select md5(body) from public.project_codex where id=5) <> 'e7bd907a3585c990bfac0c2805188f24' then raise exception 'S23 codex gematria_engine: new body md5 mismatch'; end if;
end
$sod_blk$;

-- ── project_codex #12 golden_entities ────────────────────────────────────────
do $sod_blk$
declare v_body text;
begin
  select body into v_body from public.project_codex where id=12 and slug='golden_entities' for update;
  if not found then raise exception 'S23 codex golden_entities: row missing'; end if;
  if md5(v_body) <> 'b523eba9b6b76085dd3452a37ac790d1' then raise exception 'S23 codex golden_entities: body drift (md5 %)', md5(v_body); end if;
  update public.project_codex set body=$sod_txt$ישות זהב (metadata.tier=gold) = הדרגה הגבוהה ביותר בתוצאות, מעל weight 1-5 הרגיל. החוק: nodes type=rule, rule_id=golden_entity_law.
סימון: כוכב/סמל זהב + מסגרת זהב, ומוקפצת לראש בכל מקום שמופיע המספר שלה (metadata.value).
מופעים נדרשים: /cross, /number/<value>, דף הישות, וגם פוסט/תגית שמכילים את המספר — בכולם צריך לראות את ישות הזהב.
שמורה אך ורק לפלאים חשבוניים סגורים שאי אפשר לסתור. דרגה עתידית שמורה: tier=diamond (מעל זהב).

חברת הזהב הראשונה: "סוד אלף שמונה מאות עשרים כי לה המלוכה" = 1820 ברגיל (חתימת המערכת; השם המלא של האתר עולה בדיוק למספר הופעות שם ה׳ בתורה). מקושרת ל-gematria_word source='sod1820' (החתימה המקורית של צוריאל). מטא: tier=gold, display='כי לה׳ המלוכה', world='חתימת המערכת', value=1820. בונוס: סידורי=326 (ממספרי ההתכנסות).
זיהוי ב-SQL: select * from nodes where type='entity' and metadata->>'tier'='gold';

ישויות-על / חתימות 1820 (role=signature, world="חתימות 1820", tier=gold): 👑 חתימת האתר "סוד אלף שמונה מאות עשרים כי לה המלוכה"=1820 · 📜 חתימת המחקר "מספר שמות יהוה בכל התורה"=1820 (גם גדול). מתכנסות לאותו מספר = "טבעת חתימות". אזהרת אמת: ערך הגימטריה=עובדה מחושבת; טענה היסטורית נלווית (מספר הופעות בתורה) טעונה מקור נפרד. חוק: golden_entity_law v2.

[היסטורי — goldTier.js, GematriaCalculator, GematriaCalculator3D, /cross ודף בית המדרש הישן הוסרו עם Legacy ב-5.11.2026; היישום הנוכחי של «זהב-ראשון» ב-2029 לא אומת בסבב זה] שכבת זהב משותפת: src/lib/goldTier.js (useGold + sortGoldFirst), מקור יחיד שמזהה tier=gold (labels + values). מוחל ל"זהב-ראשון + כוכב": /cross, דף המספר (מילים שוות), בית המדרש (עוגנים+תגית), GematriaCalculator. נותר להחיל גם על GematriaCalculator3D וחיפוש כללי.

---

## GOLD AXIS MODEL · 604 · Human Gate ZURIEL · 2026-09-23

EXTEND_EXISTING — no Gold store, graph, registry or scoring system.

Gold is not inherited by every numerical match. Gold is Human Curation attached to a qualified core identity/anchor. The surrounding verified calculation relations are witnesses of that Gold axis.

### First canonical example: 604
- Number 604 → tier=gold, role=anchor
- תדר → Gold core identity
- משיח בן דוד → Gold core identity
- canonical engine:
  - תדר = 604 in ragil
  - משיח בן דוד = 604 in misratar
  - משיח בן דוד = 424 in ragil
- existing typed graph edges equals_word and equals_by_depth carry the calculation identity and are curated as gold_witness.

### Growth rule
When new methods/engines/corpus work discover additional verified expressions that converge on 604, those results may automatically join the witness field through the canonical engine/graph/convergence flow. They do not become Gold identities merely by matching 604.

AI may:
- discover a new witness;
- explain which method produced it;
- compare evidence independence/dependency;
- recommend a witness for Human promotion.

AI may not:
- assign tier=gold;
- infer Gold from match count/popularity;
- turn every witness into a core identity.

Only ZURIEL/Human Gate promotes another stable identity/anchor to Gold.

### Projection meaning
A Gold Axis should render as:
core anchor / core identities first → bounded verified witnesses → why this axis matters → next research action.
Do not dump every equality by default. Contextual Prominence / Silence Gate chooses what is worth showing.

### David / Gold semantic calibration
Canonical engine verifies דוד=14 and זהב=14. This is a SOD1820 semantic calibration for the Gold vocabulary, not an automatic rule that every item mentioning David/redemption becomes Gold.


---

## GOLD CORE · דוד / גאולה · Human Gate ZURIEL · 2026-09-23

Approved Gold Core identities:
דוד · גאולה · משיח · בן דוד · משיח בן דוד · תדר · ביאת המשיח · גאולה שלמה · מלך הגאולה · גואל ישראל · שורש דוד בן ישי · התגלות משיח · תשועת יהוה · קיבוץ גלויות · בית המקדש השלישי · תחיית המתים.

These are Human-curated core identities, not automatic outcomes of numeric matching. Each retains its own canonical calculations, provenance, graph relations and truth axes.

Semantic calibration:
- דוד = 14
- זהב = 14
This supports the internal Gold vocabulary of the David/Geula family but does not auto-promote every David/Geula expression.

Witness rule remains:
method-specific equalities / discoveries / crossings may support a Gold identity or Gold Anchor without inheriting tier=gold.


---

## HUMAN CURATION v4 · DIAMOND CROWN / GOLD AXIS · Human Gate ZURIEL · 2026-09-23

### Active hierarchy
- DIAMOND CORE — exceptionally rare Crown Signature identities, Human Gate only.
- DIAMOND WITNESS — typed source/calculation/structure/time/corpus support around a Crown; no tier inheritance.
- GOLD CORE — Human-curated core identity/anchor.
- GOLD WITNESS — typed support around Gold; no tier inheritance.
- SILVER — preserved legacy curation; meaning TBD after census.
- REGULAR — all other qualified identities/findings remain fully valid in the One Reality Graph.

### Current Diamond Crown
Crown Anchor: 1820.
Exactly two Diamond Core identities:
1. סוד אלף שמונה מאות עשרים כי לה המלוכה
2. מספר שמות יהוה בכל התורה

The Number 1820 is Crown Anchor, not a third Diamond.

### Current 1820 Diamond Witness classes
- SOURCE — אהבת תורה, HebrewBooks 5635, p.6 / DS-01: book subtotals 165+398+311+396+550=1820.
- CALCULATION / STRUCTURE — סוד=70 and יהוה=26 → 70×26=1820, plus governed arithmetic relations.
- TIME / REVELATION — עת, המשיח בימינו, זה היום עשה יהוה at 1820 through canonical methods.
- CORPUS GEMATRIA CLUSTER — seven independently replayed regular-gematria expressions at 1820 from post 5009.
- SPATIAL STRUCTURE — Birkat Kohanim outer-frame sum = 1820 in regular gematria.

These Witnesses strengthen/explain the Crown but remain their native Source/Finding/Calculation identities. They do not become Diamond Core and do not inherit tier=diamond.

### Growth law
Future verified 1820 hits may join the Diamond Witness field through existing Engine/Graph/Research flows. They remain witnesses until ZURIEL explicitly promotes a stable identity to Diamond Core. No amount of match count automatically creates a new Diamond.


---

## GOLD NUMBER ANCHORS · CORE IDENTITY SPLIT · Human Gate ZURIEL · 2026-09-23

Semantic lock:
- Gold Entity = stable semantic core identity; role=core_identity.
- Gold Number Anchor = numeric research center; type=number, tier=gold, role=anchor.
- Witness = typed relation/finding that states how an identity reaches a Number Anchor, preserving exact method/source/provenance.
- Crown Anchor = higher presentation role currently used by 1820; the number itself is not a Diamond Core identity.

Approved Gold Number Anchors:
14 · 45 · 358 · 424 · 604 · 776 · 1202.

Current examples:
- דוד —[רגיל]→ 14
- גאולה —[רגיל]→ 45
- משיח —[רגיל]→ 358
- משיח בן דוד —[רגיל]→ 424
- משיח בן דוד —[מסתתר]→ 604
- תדר —[רגיל]→ 604
- ביאת המשיח —[רגיל]→ 776
- התגלות משיח / תשועת יהוה —[רגיל]→ 1202

Numbers 140 · 420 · 581 · 1192 · 1323 · 1516 remain ordinary Number identities for now even though a Gold Core Identity currently has that value. A Gold Entity does not automatically promote its numeric value to a Gold Number Anchor.

14 is explicitly anchored as 14 = דוד = זהב. Canonical engine replay verified דוד=14 and זהב=14 in regular Gematria.

One identity may connect to several Number Anchors through different methods. One Number Anchor may gather several identities. Number and identity never collapse into each other.


---

## 2029 PROJECTION CONTRACT · CURATION MARKS / TREASURES · Human Gate ZURIEL · 2026-09-24

This is presentation-only and 2029-only.

- Diamond Core identity: always exposes Diamond mark when the identity is surfaced.
- Gold Core identity: always exposes Gold mark when the identity is surfaced.
- Gold Number Anchor: exposes Gold Anchor mark when the Number itself is surfaced as a curated research center.
- Crown Anchor 1820: crown-anchor presentation; never counted/rendered as a third Diamond identity.
- Diamond/Gold Witness: does not inherit Core tier mark; may expose a secondary “linked to / witness of” hint.
- Clicking a curation mark explains the class, why it was curated, its Anchor/Core relation and a bounded witness preview.
- Full collection is on-demand and grouped separately: Diamonds / Gold Core / Number Anchors. Witnesses stay contextual under the selected item. Silver is omitted until its semantics are decided.
- Number2029 remains compact: local curation only + one disclosure entry; never dump the full global collection into the page.

Global projection reads the existing One Reality Graph and curation metadata. It creates no new store.
$sod_txt$, updated_at=now() where id=12;
  if (select md5(body) from public.project_codex where id=12) <> 'fd4711e2e78d330289bceaf297aff9f3' then raise exception 'S23 codex golden_entities: new body md5 mismatch'; end if;
end
$sod_blk$;

commit;
