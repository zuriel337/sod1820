# Cloud First — תכנית מעבר מדורגת: שמירה ומעקב לענן כברירת מחדל

| שדה | ערך |
|---|---|
| סטטוס | הצעה לעיון צוריאל. **אינה מיושמת, אינה ממוזגת, אינה נפרסת.** לא שונה DB, פונקציה, policy, חוזה או Production. |
| תאריך | 27.11.2026 |
| מאגר | `zuriel337/sod1820` |
| ענף | `claude/cloud-first-plan` (מבוסס `origin/main`, ללא PR) |
| SHA בסיס | `66f4176a147b9abe6b2a0fc9fa81473616c60571` (תואם ל־Production הנוכחי `dpl_J1KXz94F8JW2K5TYUNSyTdfRgRsP`, נקרא מ־Vercel ב־27.11.2026) |
| נספח | [APPENDIX-STORAGE-MAP.md](APPENDIX-STORAGE-MAP.md) — מפת אחסון מקומי ונתיבי כתיבה (טבלה מלאה) |
| כיוון | החלטת צוריאל (337): שמירה בענן כברירת מחדל, ופישוט האחסון המקומי |
| בעלות | EXTEND_EXISTING בלבד. אין חוק, מערכת, מאגר או מנגנון מקביל. נוסח התיקונים בסעיף 8 הוא **הצעה לתיקון חוזים קיימים**; לא הוחל. |

---

## 1. תקציר מנהלים

1. **הכיוון תואם את המבנה הקיים, אבל סותר שני סעיפים כתובים.** `research_workspace_law v5` (בפועל גוף v2, אינבריאנט 6) קובע «LOCAL-FIRST WHERE ALREADY SUPPORTED, CLOUD SYNC WHERE AUTHORIZED», ו־`subscription_funnel_law v22` (מקור: v9 ו־v19) קובע «אין חסימה של עצם ה־Follow לאורח». שניהם דורשים תיקון מפורש לפני יישום (סעיף 8).
2. **כתיבה מקומית היא היום תנאי מקדים לכתיבת שרת במחקר האישי.** `researchSyncRuntime.js:250`: `if (!persist()) { notify(); return; }` — אם `localStorage` מלא או חסום, השמירה «לא נשלחה לחשבון» (הטקסט קיים ב־`personalSaveDecision.js`, `saveFailureNotice`). זה בדיוק הפער ש־Cloud First מבקש לסגור.
3. **מחקר לא־מסונכרן יכול לשבת רק מקומית:** (א) יומן המתנה `…:pending:<id>`; (ב) `…:localonly` (פריטים שהענן לא אישר); (ג) `collections` / `journeys` / `history` מ־`researchLocalOnly.js` — נשמרים (`EXTRA`) אך **אין להם נתיב שחזור לענן**; (ד) «הרמזים שלי» לאורח (`sod_my_hints_v1`) — מקומי בלבד בכוונה; (ה) רשימות המנוע `public/tzofen.html` (`elscode_saved_v2` ועוד) — מקומיות עד שהמשתמש שומר ידנית.
4. **מנגנון חזרה מדויקת קיים, אבל נושא כתובת בלבד, לא את הפעולה.** `AccountEntry2029` (`returnHref`), `/login?returnTo=…`, `safePreviewOAuthReturnPath`, `rememberPreviewOAuthReturn` (sessionStorage, 10 דקות). הקהילה פתרה את החלק החסר לעצמה (`communityGuestPost.js`: טקסט האורח נשמר עד 6 שעות ומפורסם פעם אחת בידי החשבון שהשלים הרשמה). **תגובה בפוסט, מעקב ושמירה אינם משתמשים בו.**
5. **תגובה 5144 — הסיבה לא נקבעה, אבל נקבע בראיה שלא הגיעה ל־`add_contribution` בקשה כושלת או כל בקשה לפוסט.** ב־`edge_logs` מ־25.11 22:00Z (הפוסט נוצר 22:10Z) ועד 27.11 02:45Z אין אף קריאה כושלת של משתמש אמיתי ואין OPTIONS יתום; חמש הקריאות האמיתיות הן הודעות קהילה שתואמות שורות קיימות והצליחו (200). אין שורה ב־`research_contributions` עם `target_type='post'` בכלל, בשום תאריך. פסלתי בראיות: RLS, constraints, triggers, rate limit, חסימת רשת, גודל גוף, parent_id. פירוט בסעיף 4.
6. **המלצה:** שבעה שלבים (0–6), כל אחד הפיך ובלתי־הרסני. שלב 1 (תגובה בפוסט) הוא הקטן והדחוף; שלב 2 (ניתוק הכתיבה לשרת מהכתיבה המקומית) הוא הליבה הארכיטקטונית; שלבים 4–5 (מיגרציה וצמצום) מתבצעים רק אחרי אישור־שרת לכל פריט.

---

## 2. חוזים קיימים וסעיפים רלוונטיים (נקרא חי מ־Supabase `linswmnnkjxvweumprav`, `nodes` שבהם `type='rule' AND is_active=true`)

| חוזה (id · גרסה פעילה) | סעיף | מה נקבע | יחס ל־Cloud First |
|---|---|---|---|
| `research_workspace_law` · v5 | אינבריאנט 4 (גוף v2) | «PERSONAL IS A PROJECTION … composes research items, saved state, Journeys…» | תואם: הענן הוא מקור האמת האישי |
| `research_workspace_law` · v5 | אינבריאנט 6 | «LOCAL-FIRST WHERE ALREADY SUPPORTED, CLOUD SYNC WHERE AUTHORIZED. Do not destroy or orphan existing personal research state during shell migration» | **סותר בחלקו** (שם «local-first»); החלק «לא להרוס ולא ליתם מצב קיים» נשמר ומחייב |
| `research_workspace_law` · v5 | v3 סעיף 8 | «RESEARCH CONTRIBUTIONS ARE AN INPUT PIPELINE … Existing research_contributions data may continue to store community/research input» | הבסיס היחיד לתגובות; **אין חוק פעיל נפרד לתגובות בפוסט** (ראו 9, החלטה 8) |
| `research_workspace_law` · v5 | v3 סעיף 9 | «historical sessionStorage AI-message guard remains implementation provenance» | sessionStorage מוגבל מותר כ־runtime guard |
| `research_workspace_law` · v5 | v4 סעיף 4, ועדכון 27.9 | «CONTEXT HANDOFF IS LOSSLESS WITHIN AUTHORIZATION … returnTo/exact-return»; `research_paths` הוא מצע ה־Journey | חזרה מדויקת — קיימת ומחייבת |
| `subscription_funnel_law` · v22 | v9 (שורות 99–111) | «Follow יכול להיות אנונימי/לפני־הרשמה … המנוי נשמר מיד (אנונימי=visitor_id · מחובר=user_id)»; `claimVisitorPrefs` | **סותר** את הכיוון «כל Follow לחשבון» |
| `subscription_funnel_law` · v22 | v19 (שורות 235–241) | אורח: «Follow נשמר כ־interest/follow intent; הצעד הבא היחיד הוא הרשמה/אימות … אין חסימה של עצם ה־Follow» | **סותר חלקית**; מבנה «intent» הוא הבסיס ל־pending intent המוצע |
| `subscription_funnel_law` · v22 | v18 סעיף 3, 5 | `FOLLOW_INTENT ≠ VERIFIED_IDENTITY ≠ CHANNEL_OPT_IN`; «אין לתבוע שורת אורח לפי visitor_id גלוי בלבד» | נשמר במלואו |
| `subscription_funnel_law` · v22 | שורה 152 | «מפת נשמר־מקומית — חייב להתאחד בצעד 7»: `els_saved/els_findings`, `sod_notes_v1`, `maftech_history`, `collections+journeys` | מקור היסטורי לאיחוד; חלקם עדיין מקומיים (נספח A) |
| `subscription_funnel_law` · v22 | v22 (שורות 253–262) | הוספה אוטומטית של חשבון מאומת חדש ל־site-updates — חריג מצומצם | לא נוגעים |
| `canonical_ui_components_law` · v13 | v12 (31.10.2026) סעיפים 1, 4 | «ONE canonical AccountEntry2029 … Preserve the exact authorized local return context, current session and refresh/account-switch behavior» | **הבסיס** להצעת כניסה בנקודת הפעולה עם חזרה מדויקת |
| `canonical_ui_components_law` · v13 | v12 סעיף 3 | כל הספקים חולקים מדיניות origin/return מאומתת | נשמר |
| `person_foundation_contract_law` · v6 | PERSONAL REALITY / PRIVACY BEFORE COMPOSITION / PRIVATE→PUBLIC EXPLICIT | הקשר אישי הוא הקרנה מורשית; פרטי מסונן לפני הרכבה; מעבר לציבורי מפורש ובשער אנושי | תואם; מתאים להוספת סעיף «מצב מקומי אינו מאגר אישי» |
| `traffic_intelligence_law` · **v13** (האינדקס עדיין מציג v11 — drift קטן) | סעיף Visitor (שורה 7), Journey telemetry (146) | מבקר אנונימי מזוהה «באמצעים הזמינים (Cookies/Storage)»; props ללא תוכן אישי | מזהים מקומיים (`sod_id`, `sod_vid`, …) מוגדרים כאן; כל צמצום דורש החלטה בבעלות חוק זה |
| `project_codex.publishing_conventions` (id=4) | שורות 530–531 | «תגובה מקורית שנכתבה בקהילה מתפרסמת דרך החשבון של מי שכתב אותה» | תומך: תגובה = חשבון |
| `docs/2029-data-placement-retention-crosswalk.md` | שורת `research_contributions` | «KEEP_OWNER … contribution input, never replacement Truth store» | נעדכן שורה אחת בלבד לאחר אישור |
| `docs/reviews/auth-storage-resilience-20261110/STORAGE-WRITERS-AUDIT.md` | כולו | ביקורת קודמת של כל כותבי `localStorage`; מצאה כותב אחד לא־חסום (יומני pending) | הפרט שנפתר בינתיים: `researchJournalLifecycle.js` («claimed lazily»). **בסיס למיפוי הזה**, לא כפילות |

**סתירה שנמצאה ולא נפתרה (לפי CLAUDE.md 0.1 סעיף 6):** הנחיית צוריאל מ־18.11.2026 «פתוח לכולם, גם לאורחים» — `WatchButton.jsx:35-37`: מעקב `stream:reality` ו־`series:*` פתוחים לאורחים בגרסת הקריאה הציבורית (`publicFollow`). זו החלטה מאוחרת מ־v22. ביצוע «Follow רק לחשבון» הופך אותה. **הוחלט כאן להציג כהחלטה פתוחה (סעיף 9, החלטה 2), לא להניח.**

---

## 3. ממצאי המיפוי (הטבלה המלאה בנספח)

נסרק `src/`, `public/tzofen.html`, `public/sw.js`, `public-reading-deploy/transport.js`. סוגי אחסון: `localStorage` (≈ 75 מפתחות/משפחות), `sessionStorage` (≈ 12), cookie אחד (`sod_id`, שנה). **IndexedDB: אין בקוד המקור** (הוזכר רק בהערה ב־`authRecovery.js`). **Service worker: Push בלבד, ללא מטמון** (`public/sw.js`: «אין fetch handler ואין caching בכוונה»). `readDedupe` בזיכרון בלבד.

### 3.1 ארבעה ממצאים מרכזיים

**א. מחקר אישי של משתמש מחובר — local-first בפועל.** `ResearchProvider.saveItem` → `commitAction` → `runtime.commit` כותב את המצב ל־`sod_research_v2:user:<id>` ולמקבץ `…:pending:<id>`; רק אז `flush()` (350ms) שולח `apply_ops`. `flush()` מחזיר בלי לשלוח אם `persist()` נכשל (שורה 250). סיבות לכשל: quota, `SecurityError` (מצב פרטי), מצב פגום. **תוצאה: משתמש מחובר שהדפדפן שלו מלא לא יכול לשמור לענן בכלל.** (ההודעה הנכונה כבר קיימת; ההתנהגות היא העניין.)

**ב. אורח ב־Production לא יכול לשמור מחקר**, אבל מחקר ישן של אורח יכול להישאר. `personalActionsLocked(auth)` (`publicLaunch2029.js:19`) → `PersonalSaveButton2029.jsx:41`: «יש להתחבר לחשבון קיים, ואז ללחוץ שוב על שמירה» — **בלי חזרה מדויקת ובלי שמירת הכוונה**. מחקר שנוצר בעבר כאורח (`sod_research_v2:guest`, `sod_research_v1`) נשאר מקומי; `hydrate()` שומר אותו ב־`:localonly` כשחשבון נכנס (לעולם לא מוחק ולא מסנכרן אוטומטית).

**ג. כתיבות שרת שאינן תלויות באחסון מקומי (טוב):** תגובה בפוסט (`PostCommentComposer2029` — אפס אחסון), הודעת קהילה של חשבון, `saveMatrix` של חשבון (`TzofenEmbed`), `add_contribution`. **אורח**: `saveMatrixAnon` ו־`follow` כותבים לשרת לפי `visitor_id` שמקורו `localStorage` (`getVisitorId`); בלי `localStorage` — `visitorId=null` ואין כתיבה.

**ד. היסטוריה אישית והקשר מזהים (סיכון פרטיות):** (1) `history_add` נוסף אוטומטית לכל `addToResearch` ו־`saveItem` (`ResearchProvider.jsx:220,232`) ו־`logHistory` — **bucket «history» שנכנס לענן** (`user_research.data`); (2) מזהי מעקב מקומיים מתמשכים: `sod_id` (cookie+localStorage, שנה), `sod_vid`, `sod_visitor`, `sod_visitor_id`, `sod_sid*`, `sod_acq_first/last`, `sod_ref`, `ua_visit_<uid>_<date>` (אחד לכל משתמש ליום, לא נמחק); (3) `sod_entry_learn_2029_v1` — לומד «היכרות» לפי משטח/מושג, מקומי בלבד, מוגדר «presentation only». **לא הוכחתי איזה מהם פעיל ב־artifact הציבורי** (`PUBLIC_READING_RELEASE` מכבה חלק: `tracking.js` 7 אזכורים, `events.js` 3; `identity.js`, `visits.js`, `entryLearn2029.js` — 0 — לא אומת פר מפתח).

### 3.2 היקף נתונים חיים (SELECT בלבד, 27.11.2026)

| טבלה | שורות | הערה |
|---|---|---|
| `research_items` | 18,316 (132 משתמשים), אחרון 25.11 21:38Z | מחקר אישי בענן |
| `user_research` | 173, אחרון 25.11 22:46Z | blob אישי |
| `notification_prefs` | 22 לחשבונות; **107 לאורחים (`visitor_id`), אחרון 2.11.2026** | מעקבי אורח ישנים; אין כתיבה חדשה מאז 3.11 |
| `subscribe_events` | 94 חשבון / 252 אורח | append-only (חוק) |
| `els_records` | 143 (17 בעלים) | |
| `research_contributions` | `target_type='post'`: **0 שורות** (כל הזמנים); `home/community`: 183 | |

---

## 4. חקירה נפרדת: תגובה בפוסט 5144 לא נרשמה ב־DB

### 4.1 ראיות (כולן SELECT/לוגים, ללא כתיבה)

| בדיקה | תוצאה |
|---|---|
| הפוסט | `posts.id=5144`, `wp_id=37066`, slug `mah-kore-wild-animals-hyena-jackals-boar`, נוצר 25.11.2026 22:10Z. `publicPostCommentPostId` מחזיר `5144` (מזהה קנוני, מספר חיובי) |
| הגדרת `add_contribution` (חיה, `pg_get_functiondef`) | `SECURITY DEFINER`, `search_path=public`. אין בה בדיקת target/פוסט. כישלונות אפשריים בה: `empty body`, `invalid intent` (הלקוח שולח `תגובה` — תקין), `community_write_blocked`, `rate_limited` (גם כשאין `cf-connecting-ip` — «fails closed»). גוף נחתך ל־6000 (לא נדחה). `parent_id` ריק בפוסט |
| RLS | `research_contributions`: RLS פעיל; קיימים רק policies של SELECT (`rc_public_read`, `research_contributions_admin_read`). אין INSERT policy — לא נדרשת, כי הכתיבה דרך פונקציית `SECURITY DEFINER`. **RLS אינו חוסם כתיבה כאן** |
| Constraints | FK ל־`contributors`, `auth.users`, `nodes`, `research_contributions(parent)`, `insights`; `CHECK media` מערך. אין CHECK על `target_type`/`origin`. נבדק: ל־9 המשתמשים שכתבו ב־30 יום `rc_unique_contributor_for_user_v1` מחזיר מזהים קיימים — **0 יתומים** |
| Triggers (6) | `trg_00_rc_resolve_author_contributor`, `trg_00_zvi_standing_approve…`, `trg_community_thread_bump_v1`, `trg_rc_normalize_author`, `trg_rc_notify`, `trg_research_contribution_hint_media_exclusion` — הוגדרו כולם; **אף אחד אינו דוחה שורת תגובה רגילה** (media ריק; bump/notify מוחזרים בלי חריגה לפוסט ללא parent) |
| `edge_logs` — `/rest/v1/rpc/add_contribution` מ־25.11 22:00Z עד 27.11 ~02:45Z | **8 POST**: 3 מסביבת בדיקה (referer `127.0.0.1:4173`, כתובות מחוץ לישראל: 2 × 400 `empty body` ב־26.11 11:20/11:23, ו־1 × 200 ב־11:44 שיצר שורה ב־`anon_contrib_log` מס' 47 — השורה ב־`research_contributions` כבר אינה קיימת; ה־target שלה לא ניתן לקביעה) ו־**5 אמיתיים של משתמשים — כולם 200, וכל אחד תואם שורת קהילה קיימת** (`target_type=home`, 19:00, 21:41, 23:24, 23:35, 23:39 ב־26.11). **אין POST כושל של משתמש; אין OPTIONS בלי POST (כלומר גם preflight/CORS לא נחסם)**. כלי הלוגים אינו מציג גוף בקשה, לכן ההשוואה לשורות נעשתה לפי זמן |
| שורות | אין שורה עם `target_type='post'` בכלל; אין שורות `pending/hidden/deleted` של 5144; `anon_contrib_log` ללא ערך מתאים |
| `postgres_logs` | שגיאת FK על `author_contributor_id` ב־26.11 23:26:31Z, בין שתי הצהרות DDL של סשן אחר (`CREATE OR REPLACE rc_resolve_author_contributor` ב־23:26:25 ו־`guard md5` על `add_contribution` ב־23:26:53; ככל הנראה עבודת D4/D5). קריאות המשתמשים ב־23:35 ו־23:39 הצליחו אחריה — לא קשור לתגובה (ייתכן שבדיקה בתוך טרנזקציה). נרשם כחשד פתוח בלבד |
| טלמטריה | `events`: אין אירועי comment/contribution/error לא־בוט בשלושת הימים האחרונים; אין אירועים לא־בוט עם path התואם ל־slug של 5144 בארבעת הימים (ייתכן שהנתיב נרשם אחרת — לא אומת) |

### 4.2 מה נקבע

- **קביעה בראיה:** לא נמצאה בקשה של משתמש לפוסט שהגיעה ל־PostgREST/`add_contribution` (המקרה היחיד שה־target שלו לא ידוע הוא קריאת הבדיקה מ־11:44, שאינה של משתמש). לכן הסיבה אינה אחת מאלה: הרשאות/RLS, ולידציה בשרת, rate limit, חסימת רשת (`community_net_blocks`), גודל גוף, parent id, trigger, FK. כל אלה היו מייצרים POST ב־`edge_logs` (גם 400).
- **היכן שגיאה נבלעת:** `PostCommentComposer2029.jsx:23-25` — כל שגיאה פרט ל־`rate_limited` הופכת להודעה גנרית. **אבל** שגיאה כזאת הייתה מגיעה אחרי בקשה (ללא בקשה — אין שגיאת שרת). ולכן ה־swallow אינו ההסבר כאן; הוא ליקוי נפרד (4.3).
- **מה לא ניתן לקבוע מהראיות:** מדוע אין בקשה. השערות מדורגות עם הבדיקה שמבדילה ביניהן:

| # | השערה | ראיה בעד / נגד | איך מבדילים |
|---|---|---|---|
| H1 | הניסיון בוצע על build בלי כלי הכתיבה: Production לפני `9bf41e6a` (נפרס 26.11 10:44Z; הכלי הוכנס ב־`bd73ea681`, 25.11 22:29Z) או Preview/סביבה מבודדת (`site-qa-2029`) שאינה כותבת ל־Production | הפוסט נוצר 22:10Z ב־25.11; ב־Production עד 26.11 10:44Z לא היה כפתור כתיבה. סביבות מבודדות אינן מופיעות ב־`edge_logs` של הפרויקט | לשאול את צוריאל: מתי, באיזו כתובת, האם הופיע «רשום תגובה» ו«שלח תגובה» |
| H2 | הלקוח נתקע לפני הרשת (למשל נעילת Auth של ה־SDK, `supabase.rpc` ממתין ל־session); אין timeout בכלי | התצוגה «שולח…» נשארת; אין לוג שרת. לא ניתן להוכחה בלי לוג לקוח | הוספת timeout וקוד כשל מדווח (שלב 1) |
| H3 | הטקסט נכתב, אבל לא נשלח/אבד (מעבר דף, כניסה מחדש, רענון): הטקסט חי רק ב־`useState` | ההודעה «הטקסט נשמר כאן» נכונה רק כל עוד הלשונית נשארת | נוהל שלב 1: שמירת טיוטה/כוונה מוגבלת |
| H4 | חסימה ברשת הלקוח לפני שהבקשה יוצאת (תוסף, מסנן) | אין OPTIONS; סבירות נמוכה למשתמש יחיד שגם קורא תגובות | טלמטריית כשל לקוח (שלב 1) |
| H5 | התגובה נשלחה כאורח ונשארה `pending` ולכן «לא נראית» — **נפסל** | אורח יוצר שורה `pending` שהייתה נראית ב־SELECT של בעל־הפרויקט; לא נמצאה שורה | — |

### 4.3 ליקויים בנתיב הלקוח שנמצאו (לא הסיבה, אבל רלוונטיים ל־Cloud First)

1. **אין הצעת כניסה** בנקודת הפעולה; אורח רואה «שם (לא חובה)» ו«תגובת אורח מתפרסמת אחרי אישור». תגובת אורח אינה נראית לכותבה לעולם (RLS: `approved` או `author_user_id=auth.uid()`).
2. **הודעת rate limit מטעה:** `rate_limited` נזרק גם כשאין כתובת לקוח מהכותרת `cf-connecting-ip` (fail-closed ב־`add_contribution`), והלקוח אומר «נשלחו כבר כמה תגובות בשעה האחרונה».
3. **`community_write_blocked` והאחרים** מוצגים כגנריים; אין קוד כשל נראה למשתמש ולא לטלמטריה.
4. **אין timeout** על הקריאה; אין `AbortSignal`.
5. **אין שמירת טיוטה/כוונה** אל מעבר ללשונית.
6. הכלי מוצג אחרי «טוען תגובות…»; אם הטעינה נכשלת מוצג «לא הצלחנו לטעון את התגובות» אך כפתור הכתיבה נשאר.

---

## 5. תכנית מדורגת (Cloud First)

עקרונות מחייבים בכל השלבים (מההחלטה ומ־`research_workspace_law` אינבריאנט 6):
**(1)** כתיבה מקומית לעולם אינה תנאי מקדים לכתיבת שרת. **(2)** מחקר קיים ופעולות ממתינות נשמרים: מיגרציה = העלאה ← אישור שרת ← רק אז, באופן **אופציונלי**, צמצום מקומי; אין «ניקוי גורף». **(3)** אין איסוף היסטוריה אישית מיותרת. **(4)** אחסון מקומי נשאר רק במה שנחוץ ותחום (גודל, TTL, מפתח אחד לכל מטרה). **(5)** אין שינוי DB/פונקציה/policy בלי אישור צוריאל לפי 0.4. **(6)** בכל שלב: `npm run build` על העץ הסופי (חוק מהירות), ללא העלאת baseline.

### שלב 0 — החלטות ובסיס (מסמך בלבד; ללא קוד)
- קבלת החלטות 1–8 (סעיף 9) ואישור נוסח החוזים (סעיף 8). אין יישום לפני כן.
- **גיבוי לפני כל מיגרציה** (בלי כלי חדש): הנוהל הקיים «המחקר שלי» → יצוא; לא נוגעים ב־`…:localonly` ולא ב־`…:conflict:`.
- ספירת מצב בסיס לקריאה: כמה משתמשים מחוברים נכשלים כרגע ב־`quota/blocked` (דורש אירוע טלמטריה בשלב 1 — עד אז אין מספר; **לא אומת**).

### שלב 1 — תגובה בפוסט: כניסה בנקודת הפעולה, כוונה ממתינה, אבחון (קוד לקוח בלבד)
קבצים: `PostCommentComposer2029.jsx`, `PostComments2029.jsx`, `postComments2029.js`, שימוש ב־`communityGuestPost.js` (הרחבה, לא העתקה).
1. אורח ללא חשבון: במקום «שם (לא חובה)» בלבד — הצעה ראשית «להיכנס ולפרסם» דרך `AccountEntry2029` (`inline`) עם `returnHref = <נתיב הפוסט>#post-comments`.
2. הטקסט נשמר כ־**כוונה ממתינה אחת** (אותו דפוס כמו `stashGuestPost`: גרסה, `savedAt`, TTL 6 שעות, גוף ≤ 5000/6000, `kind:"post_comment"`, `postId`) ב־`localStorage` (ושוחזר גם אחרי מעבר OAuth/קישור־מייל); אחרי כניסה מאומתת הוא מפורסם **פעם אחת** ורק אחרי אישור־שרת נמחק (העלאה ← אישור ← מחיקה).
3. הצגת קוד כשל אמיתי (לא גנרי) והבחנה: `rate_limited` מול «אין כתובת לקוח» מול `community_write_blocked`; `AbortSignal.timeout`.
4. טלמטריית כשל מוגבלת דרך המנגנון הקיים (`ingest_event`/`events`): `surface`, `outcome_code`, ללא טקסט תגובה, ללא מזהה אישי.
5. אפשרות (החלטה 4): תגובת אורח נשארת `pending` כרגע; לא משנים שרת.
**לא נוגעים:** `add_contribution`, RLS, triggers.

### שלב 2 — ניתוק כתיבת השרת מהכתיבה המקומית (מחקר אישי של משתמש מחובר)
קובץ: `researchSyncRuntime.js` (`persist`, `flush`, `schedule`), בחסות החוזה הקיים של «יומנים ללא שינוי»: batch id, `expected_revision`, קבלות עמידות.
1. אם `persist()` נכשל מסיבת `quota/blocked/unavailable` ולמשתמש יש חשבון מאומת — `flush()` שולח **ללא יומן מקומי**: ה־batch נשמר בזיכרון בלבד (כבר `queue`/`inflight` בזיכרון), הסטטוס `syncing` ואז `synced` רק אחרי `applied_revision` תקף. כשל רשת → הפריט נשאר «ממתין» ומוצג כך; **לא** «נשמר».
2. סדר: כתיבת שרת ← (ניסיון) כתיבה מקומית כמטמון. `persist()` הופך לשיפור עמידות, לא שער.
3. אזהרת יציאה כשיש batch בזיכרון בלבד (`beforeunload`), כי זה המצב היחיד שבו כוונה עלולה לאבד.
4. `PersonalSaveButton2029`: ההודעה «השמירה לא נשלחה לחשבון עקב אחסון מלא» מוחלפת ב«נשמר בחשבון» כשהאישור הגיע, גם בלי אחסון מקומי.
**סיכונים (דורשים אישור):** שינוי בהתנהגות הקיימת של «יומן חייב להישמר לפני שליחה» (מוגדר בהערת הקוד ובמבחן החוזה «duplicated tabs own distinct durable pending journals»); פתרון: ההבחנה נשארת כשהאחסון תקין, ורק במצב כשל אחסון עוברים לזיכרון. נדרש מבחן חוזה חדש (סעיף 7).

### שלב 3 — כניסה בנקודת הפעולה עם חזרה מדויקת — שמירה ומעקב
1. הרחבת מנגנון החזרה הקיים (`rememberPreviewOAuthReturn`, `safePreviewOAuthReturnPath`) כך שיישא גם **כוונה ממתינה** `{kind: save|follow|post_comment, target, createdAt}` — עד 3 סוגים, רשומה אחת לכל סוג, TTL קבוע; בלי תוכן אישי חוץ מגוף התגובה.
2. `PersonalSaveButton2029.save`: במקום «יש להתחבר … ואז ללחוץ שוב» — פותח `AccountEntry2029 inline` עם חזרה לאותו פריט ופעולה מושלמת אוטומטית אחרי כניסה מאומתת.
3. `WatchButton`: אורח לוחץ מעקב ← מוצע כניסה; ה־topic/source נשמרים ככוונה ממתינה (ולא כשורה לפי `visitor_id`); אחרי אימות — `follow_subject_toggle` עם `user_id`. **תלוי בהחלטה 2.**
4. שורות אורח קיימות (107 ב־`notification_prefs`, 252 אירועים) **לא נגעים**: נשארות, והקישור לחשבון נשאר דרך המסלול הקיים (`claim_follow_prefs_from_identity`) לפי v18 סעיף 5.
5. אורח שכבר נכנס פעם בלי להשלים — אותו תהליך; כישלון קישור נשאר גלוי (v18 סעיף 5).

### שלב 4 — מיגרציה של מחקר מקומי קיים לענן (העלאה ← אישור ← אופציונלית צמצום)
1. **פריטים** (`saved`, `cart`, `pinned`): הנתיב קיים (`researchLocalOnly.list/sync`: «explicit, caller-confirmed commit of ordinary item_upsert ops»). מוסיפים מסך אחד בתוך «המחקר שלי» המציע «להעלות את כל מה שנשמר רק במכשיר» + קבלה ברמת פריט (קריאה חוזרת של `research_items`).
2. **`collections` / `journeys` / `history`:** היום «שמורים בלבד». נדרש נתיב שחזור: `collections` ← אותו מבנה ב־`user_research.data`; `journeys` ← `research_paths`/`research_path_revisions` דרך `fn_research_path_*` (חוק 27.9: `journey_saves` ו־`user_research.journeys` — תאימות בלבד). **דורש סקר משלים; לא מעריכים כאן.** `history` — החלטה 5 (אולי לא מעלים).
3. **רשימות המנוע** (`elscode_saved_v2`, `elscode_global_v1`, `elscode_proposals_v1`, `elscode_hidden_v1`, `elscode_cmt_*`): נקראות על־ידי `public/tzofen.html`. השלב: הצעה «העלה לחשבון» דרך `save_els_matrix` הקיים; אחרי אישור — סימון מקומי «הועלה» (לא מחיקה).
4. **«הרמזים שלי» לאורח** (`sod_my_hints_v1`): `hints.js` כבר מוכן להעלאה כשמחוברים (bucket `hint`); מוסיפים העלאה מפורשת בכניסה.
5. **אחרי אישור־שרת בלבד** — צמצום מקומי: לפי פריט, באישור המשתמש, עם תקופת ביניים (החלטה 6). אין סריקה גורפת; אין מחיקה של `…:conflict:`/`…:localonly` בלי החלטה מפורשת של המשתמש.

### שלב 5 — פישוט האחסון המקומי (עצירת כתיבה ← שמירת קריאה ← צמצום)
סדר קבוע לכל מפתח: (1) מסווגים (נספח A); (2) מפסיקים לכתוב (דגל/קוד) כשאין תוכן לא־מסונכרן; (3) קוראים ומיגרציה אם צריך; (4) רק אחר כך מצמצמים. סיווגים:
- **נשמר (K):** אימות (`sb-*`/`sod-public-reading-account`), `sod2029_oauth_return` (session), `…:pending` עם תוכן, העדפות תצוגה קטנות (ערכת נושא, מסילה, מצב מקרן, גלגל «ראיתי»).
- **הופך לענן (C):** מחקר אישי, מעקבים, רמזים, רשימות צופן, טיוטות קהילה של משתמש מחובר (החלטה 7).
- **מפסיק להיכתב (R, באישור):** `history` האוטומטי בכל שמירה; `sod_entry_learn_2029_v1` (החלטה 5); `ua_visit_<uid>_<date>`; מזהי legacy כפולים `sod_visitor`, `sod_visitor_id` (החלטה 3 — בבעלות `traffic_intelligence_law`).
- תקרה כללית מוצעת: כל מפתח לא־מחקרי ≤ 4KB ו־TTL מוגדר; נאכף במבחן build קיים־סגנון (בלי baseline חדש).

### שלב 6 — סגירה
- עדכון שורה אחת ב־`docs/2029-data-placement-retention-crosswalk.md` («personal client state»).
- קנרית/קבלה בדפדפן אמיתי, נייד ו־1440px, שני מצבי פרטיות; בדיקה חיה לפי `docs/site-check-2029.md` — **PASS של CI אינו הוכחת שימוש (0.6.6)**.

---

## 6. תכנית תיקון מאוחדת (איפה מתקנים מה)

| # | תיקון | קובץ / מקום | שלב | בעל חוזה |
|---|---|---|---|---|
| F1 | קוד כשל אמיתי, timeout וטלמטריית כשל בתגובה בפוסט | `PostCommentComposer2029.jsx` | 1 | `canonical_ui_components_law` (IssueReport/auto-context) |
| F2 | כוונה ממתינה `post_comment` + כניסה inline עם חזרה ל־`#post-comments` | `PostComments2029`, `communityGuestPost.js`, `AccountEntry2029` | 1 | `canonical_ui_components_law v13` §v12 |
| F3 | הצגת תגובת אורח `pending` לכותב/ת בלבד (מקומית, בלי שינוי שרת) | `PostComments2029.jsx` | 1 | `research_workspace_law` v3 סעיף 8 |
| F4 | `persist()` אינו שער ל־`flush()` | `researchSyncRuntime.js` | 2 | `research_workspace_law` אינבריאנט 6 |
| F5 | שמירה ללא «חבר/ה, התחבר/י ואז לחץ שוב» | `PersonalSaveButton2029.jsx` | 3 | `canonical_ui_components_law` |
| F6 | מעקב אורח ← הצעת כניסה + כוונה | `WatchButton.jsx` | 3 | `subscription_funnel_law v22` (דורש v23) |
| F7 | מסך «העלה את מה שרק במכשיר» + קבלה לכל פריט | `researchLocalOnly.js` + `PersonalHome` | 4 | `research_workspace_law` |
| F8 | נתיבי שחזור ל־collections/journeys/history | `ResearchProvider` + `fn_research_path_*` | 4 | `research_workspace_law` (27.9) |
| F9 | העלאת רשימות הצופן המקומיות | `public/tzofen.html` + `TzofenEmbed.jsx` | 4 | `els_research_layer_law` (לא נקרא כאן) |
| F10 | הפסקת `history_add` אוטומטי | `ResearchProvider.jsx:220,232` | 5 | `person_foundation_contract_law v6` |
| F11 | תיעוד: שורה אחת ב־crosswalk | `docs/2029-data-placement-retention-crosswalk.md` | 6 | — |
| F12 | **ללא שינוי שרת.** אם בהמשך יידרש שינוי ב־`add_contribution` (למשל הבחנה בין «אין כתובת» ל־rate limit) — זו הצעת SQL נפרדת בתיקיית `supabase/proposed/` עם אישור 0.4 | — | — | — |

---

## 7. בדיקות קבלה לפי שלב

**כללי:** כל בדיקה נרשמת בנפרד «CI» / «מקומי» / «דפדפן חי»; PASS של CI אינו קבלה (0.6.6). קבלה = שמירה, רענון, פתיחה מחדש ושחזור, בנייד ובמחשב, בשני מצבי פרטיות.

**שלב 1**
1. אורח כותב תגובה בפוסט, לוחץ «להיכנס ולפרסם», משלים כניסה (OTP וגם Google): חוזר ל־`/post/…#post-comments`, ההודעה מתפרסמת **פעם אחת**, השורה ב־`research_contributions` עם `target_type=post`, `target_id=<post id>`, `status=approved`, הכוונה נמחקת רק אחרי קריאה חוזרת של השורה.
2. כניסה בכרטיסייה אחרת/קישור־מייל — הטקסט עדיין משוחזר (TTL 6 שעות); אחרי TTL — לא משוחזר ולא מפורסם.
3. כשל רשת באמצע: הטקסט נשאר, הודעה עם קוד אמיתי, ללא פרסום כפול בלחיצה חוזרת (idempotency, `sending.current`).
4. שגיאות `rate_limited`/`community_write_blocked`/`empty body` — הודעות שונות; אין טקסט תגובה באירועי הטלמטריה.
5. תגובת אורח `pending` נראית ל־אותה כותבת בלבד (עד סגירת הלשונית).
6. `npm run build` + `scripts/test-2029-shell-budget.mjs` ללא שינוי baseline; הכלי נטען עצלות כפי שהיה.

**שלב 2**
1. `localStorage.setItem` מדומה כזורק `QuotaExceededError`: משתמש מחובר שומר פריט — הפריט מגיע ל־`research_items` (קריאה חוזרת), התווית «נשמר בחשבון».
2. אותו מצב + ניתוק רשת: הפריט מסומן «ממתין», לא «נשמר»; אחרי חזרה — נשלח פעם אחת (batch_id/CAS), ללא כפילות.
3. שני tabs: החוזה הקיים («duplicated tabs own distinct durable pending journals») עדיין עובר כשהאחסון תקין.
4. `beforeunload` נקרא רק כש־batch קיים בזיכרון בלבד.
5. אין מחיקה/דריסה של `…:pending:*`, `…:conflict:*`, `…:localonly` (מבחן חוזה קיים + מבחן חדש).

**שלב 3**
1. אורח לוחץ «שמירה» ← כניסה inline ← חוזר לאותו פריט ← נשמר אוטומטית בחשבון, ללא לחיצה שנייה.
2. אורח לוחץ מעקב (subject מותר) ← הצעת כניסה ← אחרי אימות: שורת `notification_prefs` עם `user_id`, **לא** `visitor_id`; `subscribe_events` נרשם פעם אחת.
3. שורות אורח היסטוריות (107) לא שונו ולא נמחקו (ספירה לפני/אחרי).
4. כוונה ממתינה פגה לפי TTL ואינה מוחלת אחריו. מי שמקבל אותה כשחשבון אחר מסיים כניסה באותו דפדפן — בהתאם להחלטה 3א (סעיף 9).
5. קישור־מייל שנפתח בדפדפן אחר: אין כוונה, והמשתמש מקבל הודעה ברורה (לא «הכל נשמר»).

**שלב 4**
1. בדפדפן עם `sod_research_v2:guest` ופריטים → כניסה → הצעת העלאה; אחרי אישור: `research_items` מכיל כל פריט (קריאה חוזרת זהה לפי `entityIdentity`).
2. בדיקת אי־אובדן: לפני/אחרי ספירת פריטים מקומיים ו־`…:localonly`; אף פריט לא נעלם לפני אישור שרת.
3. collections/journeys: משוחזרים ל־`user_research`/`research_paths` ונמצאים בקריאה חוזרת, ורק אז מופיעה אפשרות צמצום.
4. רשימת צופן מקומית → `save_els_matrix` → שורה ב־`els_records` אצל בעל נכון; הרשימה המקומית לא נמחקת.
5. כשל באמצע (רשת/התנגשות revision): אין העלאה חלקית שמוצגת כהצלחה; `conflict` מוצג.

**שלב 5**
1. לכל מפתח שמפסיק להיכתב: אין תוכן לא־מסונכרן קיים לפני הפסקה (בדיקה לפי משפחה).
2. אין כתיבה חדשה ל־`history` אך הקיים נשמר ונקרא.
3. כל מפתח לא־מחקרי ≤ 4KB וב־TTL; בדיקת build חדשה בלי העלאת baseline.
4. מדידת מהירות: אותו build, n ו־p זהים (חוק מהירות סעיף 7); אין העלאת בנדל־כניסה.

**שלב 6**
1. `/check-site` (אורח) + ריצה מבודדת קצה־לקצה; דוח מרוכז.
2. הוכחה מול האתר החי בכתיבה אחת בחשבון בדיקה ייעודי, באישור נפרד (0.6.4) ובמחיקה נפרדת באישור נפרד.

---

## 8. נוסח תיקון מוצע לחוזים קיימים (לא הוחל; כל אחד EXTEND_EXISTING, ללא חוק חדש)

> לכל סעיף: OWNER CHECK = EXTEND_EXISTING. מבקש החלטה של צוריאל (Human Gate). הנוסח בעברית; ניסוח מונחים לפי החוזה הקיים.

### 8.1 `research_workspace_law` — v5 ← v6 (תוספת, לא החלפה)

> **[UPDATE v6 · Human-Gate ZURIEL · <תאריך> — CLOUD FIRST, EXTEND_EXISTING]**
> 1. **החשבון בענן הוא מקום השמירה האישי ברירת־המחדל.** אינבריאנט 6 («LOCAL-FIRST WHERE ALREADY SUPPORTED, CLOUD SYNC WHERE AUTHORIZED») מוחלף ב: «CLOUD-FIRST. כל שמירה אישית (פריט, אוסף, מעקב, רמז, תגובה, מסע) נכתבת לחשבון המאומת של המשתמש. אחסון מקומי הוא מטמון תחום או כוונה ממתינה בלבד, ואינו מאגר מחקר.» החלק «אין להרוס או ליתם מצב אישי קיים בעת הגירה» נשמר במלואו.
> 2. **אין תלות.** כתיבה מקומית אינה תנאי מקדים לכתיבת שרת. כישלון אחסון מקומי (מלא, חסום, פגום) אינו מונע שמירה בענן; הסטטוס «נשמר בחשבון» ניתן רק לפי אישור שרת (`applied_revision`).
> 3. **כוונה ממתינה (pending intent).** משתמש לא־מחובר שמבצע פעולה אישית מוצע לו להתחבר או להירשם בנקודת הפעולה; הפעולה נשמרת כרשומה אחת, תחומה (סוג, יעד, חותמת זמן, TTL קבוע, גודל תחום), ומושלמת אוטומטית אחרי כניסה מאומתת באותו נתיב חזרה מדויק. הרשומה נמחקת רק אחרי אישור שרת. אין רשומה כזו שאינה פעולה מפורשת של המשתמש.
> 4. **הגירה = העלאה ← אישור ← (אופציונלי) צמצום.** פריט מקומי עובר לענן בפעולה מפורשת של המשתמש או כוונה ממתינה; הוא מוסר מהמכשיר רק אחרי קבלה חוזרת מהשרת, ורק באישור מפורש. אין ניקוי גורף. `:localonly`, `:conflict:` ויומני `:pending:` שיש בהם עבודה אינם נמחקים אוטומטית.
> 5. **אין היסטוריה אישית מיותרת.** `history`, מזהי מכשיר ומונים מקומיים אינם נאספים אלא אם הם משרתים יכולת שהמשתמש ביקש; כל איסוף כזה מתועד בחוק הבעלים שלו.
> 6. **סעיף 8 של v3 (תרומות מחקר כצינור קלט) מורחב:** תגובה בפוסט היא `research_contributions` עם `target_type='post'`, `target_id=<posts.id הקנוני>`, `origin='community_2029'`; חשבון מאומת — מאושרת מיד; אורח — `pending` ואינה ציבורית לפני אישור. זהו תיעוד של הקיים (ZURIEL 25.11.2026), לא משמעות חדשה.
> 7. **אין תקדים לחוק נפרד לתגובות.** אין להקים מערכת תגובות מקבילה.

### 8.2 `subscription_funnel_law` — v22 ← v23 (תוספת, מתקנת רק את הניסוחים הסותרים)

> **[UPDATE v23 · Human-Gate ZURIEL · <תאריך> — FOLLOW TO ACCOUNT, EXTEND_EXISTING]**
> 1. «Follow הוא שער» (v9) ו«אין חסימה של עצם ה־Follow לאורח» (v19 סעיף 3) מתוקנים: בשטחים שבהם Follow פתוח, לחיצה של אורח **מציעה כניסה/הרשמה בנקודת הפעולה** ושומרת כוונת Follow ממתינה (topic + source, TTL תחום). אחרי אימות מוחל Follow לחשבון. אין כתיבת שורת מנוי חדשה לפי `visitor_id` בלבד.
> 2. שורות אורח היסטוריות (`notification_prefs.visitor_id`, `subscribe_events` של אורח) נשמרות כפי שהן; הקישור לחשבון נשאר דרך המסלול הקיים (v18 סעיף 5). `subscribe_events` נשאר append-only.
> 3. `FOLLOW_INTENT ≠ VERIFIED_IDENTITY ≠ CHANNEL_OPT_IN ≠ DELIVERY_READY` נשמר; כוונה ממתינה אינה הרשמה, אינה opt-in לערוץ.
> 4. החלטת 18.11.2026 «פתוח לכולם, גם לאורחים» (`stream:reality`, `series:*`) — **[לבחירת צוריאל]** (א) נשארת כחריג מפורש לאורחים; (ב) מתבטלת לטובת סעיף 1.
> 5. שורה 152 («מפת נשמר־מקומית») מעודכנת: הפריטים שהוזכרו במפה זו מועברים לחשבון לפי `research_workspace_law v6`.

### 8.3 `canonical_ui_components_law` — v13 ← v14 (תוספת ל־v12 «CANONICAL ACCOUNT ENTRY»)

> **[UPDATE v14 · Human-Gate ZURIEL · <תאריך> — ACCOUNT ENTRY AT THE POINT OF ACTION]**
> 1. פעולה שמחייבת חשבון (שמירה, מעקב, תגובה, פרסום) תציע `AccountEntry2029` באותו משטח (inline) ולא תפנה לדף אחר ובלי «התחבר ואז לחץ שוב».
> 2. נתיב החזרה הקיים (`returnHref` / `/login?returnTo`) יישא גם מזהה **כוונה ממתינה** (סעיף 3 של research_workspace_law v6), כך שהפעולה מתבצעת אחרי הכניסה והמשתמש מגיע לאותה נקודה מדויקת.
> 3. הוודאות: מוצג «נשמר» רק אחרי אישור שרת; כישלון נשאר גלוי עם קוד אמיתי ועם IssueReport הקנוני; הודעה אינה מתיימרת «הטקסט נשמר כאן» כשהוא קיים רק בזיכרון הלשונית.
> 4. `sessionStorage`/`localStorage` של נתיב החזרה והכוונה הם כלי תחום (TTL, גודל), אינם מקור אמת, ולעולם אינם תנאי מקדים לשליחה.

### 8.4 `person_foundation_contract_law` — v6 ← v7 (תוספת קצרה, PRIVACY BEFORE COMPOSITION)

> **[UPDATE v7 · Human-Gate ZURIEL · <תאריך>]** מצב מקומי במכשיר (localStorage/sessionStorage/cookie) אינו רשומה אישית ואינו מקור לקביעת עניין, הקשר או זהות. מחקר אישי, מעקב והיסטוריה נשמרים ונקראים מהחשבון בלבד. איסוף היסטוריית צפייה או מונים אישיים דורש הצדקה מפורשת וגבול שמירה; ברירת המחדל היא אי־איסוף.

### 8.5 `traffic_intelligence_law` — v13 ← v14 (הפניה בלבד; **תלוי בהחלטה 3**)

> מוסיפים הערה: «מזהי מכשיר מקומיים (`sod_id` cookie+localStorage שנה, `sod_vid`, `sod_visitor`, `sod_visitor_id`, `sod_sid*`) הם מזהי מדידה אנונימיים בלבד; אינם נשמרים כמידע אישי, אינם משמשים לשמירת מחקר, ואין להוסיף חדשים בלי הצדקת מדידה. ניתן לצמצם לשני מזהים (מבקר + סשן) — [להחלטת צוריאל]».

### 8.6 עדכון אינדקס
`SOD1820_MASTER_OWNER_INDEX.md` מציג `traffic_intelligence_law v11` ואילו החי הוא **v13**. ליישר כשיוחל כל אחד מהסעיפים (תיקון pointer בלבד).

---

## 9. החלטות פתוחות — ממתינות לאישור צוריאל

| # | החלטה | המלצה | השלכה |
|---|---|---|---|
| 1 | לאשר את נוסח תיקון `research_workspace_law v6` (8.1), ובמיוחד «CLOUD-FIRST» במקום «LOCAL-FIRST» | לאשר | בלי זה אין יישום |
| 2 | Follow של אורח: לעבור ל«כניסה בנקודת הפעולה + כוונה ממתינה» (8.2), ומה לעשות בחריג 18.11 («פתוח גם לאורחים»: `stream:reality`, `series:*`) | לאשר את 8.2; להחזיק את החריג של 18.11 עד שתחליט | משנה את החוויה של אורחים בבית |
| 3 | מזהי מדידה מקומיים: לצמצם ל־`sod_id` + `sod_sid`; להפסיק לכתוב `sod_visitor`, `sod_visitor_id`, `sod_vid` (נשארים לקריאה/גשר). **3א:** כוונה ממתינה שנוצרה כאורח — האם מוחלת על כל חשבון שמסיים כניסה באותו דפדפן (כמו בקהילה) או רק אם זהה לחשבון שהתחיל | לאשר צמצום; ל־3א — כמו הקהילה (חשבון שמסיים כניסה) | נוגע בבעלות `traffic_intelligence_law` |
| 4 | תגובת אורח בפוסט: להשאיר `pending` ללא כניסה, או להציג כניסה כברירת מחדל ולהשאיר «המשך כאורח» כאפשרות משנית | כניסה ראשית + «כאורח» משנית | משפיע על כמות תגובות אורח |
| 5 | `history` אוטומטי והמונה `sod_entry_learn_2029_v1`: להפסיק לכתוב | להפסיק ל־`history`; `entryLearn` — להשאיר מקומי בלבד עם TTL | הפחתת איסוף |
| 6 | מדיניות צמצום מקומי אחרי העלאה מאושרת: לעולם אוטומטי? לפי בקשת משתמש בלבד? אחרי 30 יום? | בקשת משתמש בלבד + עדכון «הועלה» | בטיחות מחקר |
| 7 | טיוטות קהילה/הערות: טיוטת קהילה של משתמש מחובר — מקומית (כיום) או בענן | להישאר מקומית עם TTL 7 ימים (כיום) | החלטה על «טיוטה היא כוונה» |
| 8 | **אין חוק פעיל לתגובות בפוסט** (נמצא רק ב־research_workspace_law v3 ס' 8 + `publishing_conventions` שורות 530–531 + הערות קוד). האם להרחיב את ס' 8 (נוסח 8.1 סעיף 6) | להרחיב; לא חוק נפרד | סגירת חור תיעודי |
| 9 | אישור הפעלת טלמטריית כשל בתגובה בפוסט דרך `events` הקיים (בלי PII) | לאשר | תלות ב־`traffic_intelligence_law` |
| 10 | האם לברר מול צוריאל את נסיבות ניסיון התגובה 5144 (זמן, כתובת, מכשיר, צילום מסך) | כן — זו הדרך היחידה להכריע בין H1–H4 | חסם בסגירת החקירה |

---

## 10. מגבלות ומה לא נבדק

- **לא נקבעה סיבת כישלון התגובה 5144;** נקבע רק שהבקשה לא הגיעה לשרת (סעיף 4). לא נבדקו לוגי דפדפן, Vercel/Edge של האתר עצמו, או כתובת הבקשה. חלון הלוגים: 25.11 22:00Z – 27.11 ~02:45Z (סריקות של 24 שעות לפי כלי הלוגים).
- נתוני DB נקראו חי (`SELECT`/`pg_get_functiondef` בלבד); **שום כתיבה, DDL או הפעלת פונקציה לא בוצעה**.
- מיפוי האחסון הוא סריקת קוד סטטית על `66f4176a1`; **לא אומת פר מפתח אם הוא פעיל ב־artifact הציבורי** (`PUBLIC_READING_RELEASE`), ולא נבדק מה שמור בפועל בדפדפנים. `public/tzofen.html` נסרק לפי מפתחות בלבד (למעלה מ־6,300 שורות).
- חוק ELS (`els_research_layer_law`), `platform_tiers_law` ו־`raziel_companion_layer_law` לא נקראו; הסעיפים שנוגעים בהם (F9) מסומנים כממתינים לקריאה.
- ב־`subscription_funnel_law` יש סתירה פנימית היסטורית (שורה 23: «אין Follow אנונימי» לעומת v9/v19). נרשם, לא הוכרע כאן.
- רמת ההשפעה על מהירות לא נמדדה; כל שלב כפוף לחוק המהירות (מותר להוסיף רק מאחורי טעינה עצלה).

---

## 11. דוח מסירה (CLAUDE.md 0.5)

- **חוזה שחל:** `research_workspace_law v5` (אינבריאנטים 4, 6; v3 ס' 8, 9; v4 ס' 4), `subscription_funnel_law v22` (v9, v18, v19), `canonical_ui_components_law v13` (§v12), `person_foundation_contract_law v6`, `traffic_intelligence_law v13`, `publishing_conventions` (שורות 530–531).
- **בוצע:** מיפוי אחסון, חקירת 5144, תכנית ונוסח תיקונים. **לא בוצע:** שינוי קוד, DB, חוזים, מיזוג, פריסה, PR.
- **מאגר/ענף/SHA:** `zuriel337/sod1820` · `claude/cloud-first-plan` · בסיס `66f4176a1` · ראש — בדוח המסירה בשיחה.
- **קבצים שהשתנו:** `docs/reviews/cloud-first-20261127/PLAN.md`, `docs/reviews/cloud-first-20261127/APPENDIX-STORAGE-MAP.md` בלבד.
- **בדיקות/CI:** אין (מסמכים בלבד). לא הורצה `npm run build`.
- **Production שונה:** לא.
- **חסמים והחלטות ממתינות:** סעיף 9.
- **צעד הבא מומלץ:** החלטות 1, 2, 4, 10 ← יישום שלב 1 בענף נפרד מ־`origin/main`.
