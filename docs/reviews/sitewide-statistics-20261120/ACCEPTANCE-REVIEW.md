# #1461 — ביקורת קבלה עצמאית (Claude, 20.11.2026)

**נבדק:** PR #1461 בקומיט `cfb007e4e71ed4b57f8ee5da439395de9cd5ce42`, על בסיס `origin/main` `1f01e246abfc25cfdaae2a64cfca9a5ac2992dbc`, מול המסד החי `linswmnnkjxvweumprav` (קריאה בלבד) ומול PostgreSQL 16 מקומי ומבודד.
**ענף התיקונים:** `claude/pr-1461-acceptance-review-28cnqo`, שנבנה מעל ראש ה־PR. ענף ה־Codex לא נדרס.
**לא בוצע:** מיזוג, החלת SQL, שינוי Production, פריסה או כתיבה למסד. כל ה־SQL בענף הזה הוא הצעה בלבד.

הקובץ הזה משלים את `README.md` ואת `acceptance.json` של Codex ואינו מחליף אותם. ה־sha256 של `extensions.sql` ושל `ingest_event.after.sql` ב־`acceptance.json` נוגעים לגרסה הקודמת; הגיבובים החדשים מופיעים בטבלה בסוף.

## סיכום החלטה

| # | תחום | לפני התיקון (`cfb007e4e`) | אחרי התיקונים בענף |
|---|---|---|---|
| 1 | אבטחה ופרטיות של קוראי SECURITY DEFINER | **FAIL** | PASS בבדיקה מבודדת; נדרשים אישור והחלה |
| 2 | ‏`latest_event` ושדות מצרפיים | **FAIL** | PASS |
| 3 | התאמה ל־Traffic Intelligence v11 | PARTIAL | PARTIAL; נותרו החלטות של צוריאל |
| 4 | תוכנית SQL, תאימות, rollback, הרשאות, קצב, ביצועים | **FAIL (BLOCKER)** | PASS בבדיקה מבודדת; PostgREST חי נשאר UNKNOWN |
| 5 | התוכנית מול המימוש | PARTIAL | ללא שינוי (פערי מוצר מפורטים בהמשך) |

**החבילה המקורית אסור שתוחל.** החלת `apply.psql` מ־`cfb007e4e` מפילה את **כל** קריאות `ingest_event`, ולכן כל מדידת האתר נעצרת (ממצא B1).

## ממצאים

סדר הממצאים לפי חומרה. שורות הקוד מתייחסות לקומיט `cfb007e4e`.

### B1 · BLOCKER · ‏`ON CONFLICT (event_id)` על `events` מחולקת ללא מפתח ייחודי
- **מיקום:** `supabase/proposed/sitewide-statistics-20261120/ingest_event.after.sql:116`. ההנחה שהובילה לכך מופיעה בשורה 26.
- **הראיה החיה:** `public.events` היא טבלה מחולקת (`relkind=p`, שבע מחיצות). אין עליה אף אילוץ `p` או `u`, ו־`event_id` מקבל `gen_random_uuid()` כברירת מחדל.
- **הכשל:** פקודת ה־INSERT משותפת לכל סוגי האירועים. לכן גם צפיית דף ישנה, גם צפייה בגרסה 2 וגם פעולת `activity_2029` נכשלות בשגיאה `there is no unique or exclusion constraint matching the ON CONFLICT specification`. הוכח ב־PostgreSQL 16 אמיתי: שלוש קריאות שונות נכשלו ונכתבו 0 אירועים.
- **למה ה־CI לא תפס:** רתמת PGlite הוסיפה `alter table events add primary key(event_id)`, שאינו קיים במסד החי (`test/sitewide-statistics-20261120-sql.mjs:15`).
- **אי אפשר פשוט להוסיף מפתח:** מפתח ייחודי על טבלה מחולקת חייב לכלול את `ts`, ובמקרה כזה הוא כבר לא מונע כפילות.
- **התיקון:** הסרתי את `ON CONFLICT`. במקומו נלקחת נעילה `pg_advisory_xact_lock` לכל פעולה, ואחריה נבדק `exists` בחלון של יומיים דרך האינדקס הקיים `events_surface_idx(surface,event_type,ts)`.
- **האימות:**
  - `test/sitewide-statistics-20261120-sql.mjs`: הוסר המפתח המלאכותי, ונוספו בדיקות לקליטה ישנה ולשליחה חוזרת. 31 בדיקות עברו.
  - `test/sitewide-statistics-20261120-realpg.sh`: מריץ את `apply.psql` ואת `rollback.psql` האמיתיים מול `events` מחולקת. 7 בדיקות עברו. מול ה־SQL המקורי אותה רתמה נכשלת.

### P1 · HIGH · קוראי SECURITY DEFINER ציבוריים ישנים חושפים מידע מוסתר (קיים כבר במסד החי, לא נוצר ב־PR)

`execute` פתוח היום ל־anon. הספירות נמדדו בקריאה בלבד, בלי לשלוף ביטויים.

| פונקציה | מה נחשף | היקף במסד החי | שימוש בקוד 2029 | התיקון המוצע |
|---|---|---|---|---|
| `fn_name_research(text)` | ביטויים מאומתים אבל לא מפורסמים, מוצפנים או בדרג שלילי. אין בדיקת blocklist או קיר פרטי. | 115 שורות | אין | REVOKE מ־public, anon ו־authenticated; GRANT ל־service_role |
| `reality_scan(int,int)` | הציר כולל ביטויים לא מאומתים ולא מפורסמים (`sample`) | 397 ביטויים מוסתרים | אין | REVOKE, כמו בשורה הקודמת |
| `number_cross_resonance(text,jsonb,int)` | ‏`bidim` משקף את כל `gematria_words`, כולל ביטויים מוסתרים ופרטיים | 120 מוסתרים ועוד 23 מהקיר הפרטי | **כן** (`supabaseApi2029.js:1959`) | סינון `fn_ti_public_word_eligible`; ההרשאות נשמרות |
| `fn_raziel_research_intel(int,text,int)` | ספירות צפייה ומבקרים לכל מספר, וספירות חיפוש מ־`search_log`, **בלי סף**. עם `p_number` אפשר לחשוף צפייה בודדת. | — | דרך `fn_raziel_research_intel_scoped`, שמחזיר `v_public` לכל קורא, גם anon | סף של 10 צפיות ו־5 מבקרים; הסרת `search_log`; קריאה ישירה רק בצד השרת |
| `fn_name_research_stats(int)` | ספירות של חיפושי שם פרטיים, כולל `has_surname` ו־`has_birthdate`, לכל חלון, בלי סף | — | אין | REVOKE |

- **הקבצים החדשים:** `legacy-readers-hardening.psql` ו־`legacy-readers-hardening.rollback.psql`, יחד עם קובצי `*.before.sql` ו־`*.after.sql` לשתי הפונקציות שנכתבו מחדש. הם אינם מחוברים ל־`apply.psql`, ומריצים אותם רק אחריו.
- **preimage:** בדיקת md5 לכל אחת מחמש הפונקציות. סטייה עוצרת את ההרצה.
- **האימות:** `test/sitewide-statistics-legacy-readers-sql.mjs` עבר 13 בדיקות: preimage פגיע, תיקון, הרשאות, rollback ל־md5 המדויק. בנוסף הורץ psql אמיתי שעבר, ושומר הסטייה עצר על preimage שונה.
- **מה לא מכוסה:** הפונקציות שנקראות מתוך `fn_name_research` (`fn_name_neighbors`, `fn_name_in_tanach`) והקוראים האחרים שהבנדל מנה (`number_dossier_json`, `fn_en_search`, `strongest_crossings`) לא נבדקו לעומק: **UNKNOWN**. ‏`fn_log_name_research` מאפשר ל־anon להוסיף שורות יומן: LOW, הרעלת סטטיסטיקה. ‏`live_stats` מחזיר ספירות בלבד: OK.

### P2 · HIGH · ‏`search_log` קריא וניתן לכתיבה ל־anon היום (קיים במסד החי)
- **מצב חי:** מדיניות `anyone read search` מוגדרת `USING true`, ומדיניות `anon insert search` מוגדרת `WITH CHECK true`. בטבלה כ־93,000 שורות טקסט חופשי.
- **הסתירה לחוזה:** TI v9, SEARCH ACTIVITY: ‏"MUST NOT expose another user's search terms".
- **מה ה־PR עושה:** `extensions.sql` סוגר את זה, אבל רק כחלק מכל החבילה.
- **מה הוספתי:** `search-log-floor.standalone.psql`, שמאפשר להחיל את הרצפה לבד ומוקדם. ב־`extensions.sql` נוסף `drop policy if exists`, כך ששני סדרי ההחלה בטוחים.
- **תאימות:** הלקוח הישן והחדש כבר בולעים שגיאת קריאה או כתיבה ל־`search_log` (`supabaseApi2029.js`, בלוקי `try/catch`).
- **האימות:** `realpg.sh` מוודא ש־anon מקבל 0 שורות.

### P3 · HIGH · ‏`latest_event` חושף את זמן הפעולה של אדם יחיד
- **מיקום:** `extensions.sql:107`. הערך `max(ts)` נלקח מכל האירועים הכשירים, גם כשאף קבוצה לא עברה את הסף, והוא מוחזר לציבור. גם `numbers[].last_at` (שורה 96) חושף בדיוק של מיקרו־שנייה את הצופה האחרון בקבוצה.
- **התיקון:** `latest_event` מתפרסם רק כשכל החלון עומד בסף של 10 אירועים ו־5 sessions, ובדיוק של שעה. `last_at` מעוגל לשעה. מתחת לסף המצב הוא `no_data`.
- **מה לא שונה:** ב־`admin_2029_analytics.after.sql:528` שדה `latest_event` נשאר מדויק, כי הוא מוגבל למנהל.
- **האימות:** ‏4 בדיקות חדשות ב־`sitewide-statistics-20261120-sql.mjs`, ועוד בדיקה ב־`realpg.sh`.

### R1 · HIGH · קריאת 30 יום חורגת מ־statement_timeout
- **המדידה החיה:** `EXPLAIN ANALYZE` על השאילתה הפנימית לחלון 720 שעות לקח **9.4 שניות**.
- **הסיבה:** המסווג מוערך ב־5 שורות אנושיות, ובפועל יש כ־1,700. התוצאה היא Nested Loop עם 16.7 מיליון השוואות.
- **החסם:** ל־`authenticator` מוגדר `statement_timeout=8s`. בלי תיקון, בקשת "חודש" נכשלת תמיד ולא נשמרת במטמון.
- **התיקון:** `SET enable_nestloop=off` ברמת הפונקציה בלבד. כך התקבל Hash Join שנמדד ב־**1.95 שניות**, ומתוכן כ־1.8 שניות הן `fn_ti_clean_classification` הקיימת.
- **סיכון שנשאר:** הנפח נמוך היום (כ־9,800 אירועים מאומתים בגרסה 2). בצמיחה של פי 4 החלון החודשי יתקרב שוב ל־8 שניות. מומלץ צבירה יומית קיימת במשפחת TI, בהחלטת צוריאל.
- **דוח המנהל:** אותו מבנה ב־30 יום לקח 1.2 שניות, כבר עם Hash Join.

### R2 · MEDIUM · מיפוי מדורים שגוי ב־`fn_ti_surface2029`
- **הבעיה:** הביטוי `^/(2029/)?me` לא מעוגן בסופו, ולכן `/members` ו־`/melech-hamisparim` נספרו כ־personal. הביטוי `(journey|life-journey|research)` הכניס את `/researcher` ואת `/research` ל־journey.
- **התיקון:** עיגון `(/|$)`. ‏`members`, ‏`researcher` ו־`forum` ממופים עכשיו ל־community.
- **מה לא שונה:** `/research`, ‏`/gallery` ו־`/beit-midrash` (24 צפיות ב־7 ימים) נשארים `other`, כי שיוך מדור הוא החלטת בעלים.
- **האימות:** בדיקה ב־`sitewide-statistics-20261120-sql.mjs`.

### C1 · MEDIUM · DRIFT מול חוזה TI: מענק ציבורי בתוך משפחת `fn_ti_*`
- **החוזה:** TI v4 קובע ש־`fn_ti_*` היא "Grants: postgres בלבד (server-only)".
- **ה־PR:** מעניק ל־anon ול־authenticated גם את `fn_ti_public_activity2029` וגם את `fn_ti_public_word_eligible`.
- **הצד השני:** TI v9 מתיר projection ציבורי מעל הבעלים, כך שזו סתירת שמות והרשאות ולא באג.
- **מה צריך:** החלטת צוריאל. האפשרויות הן לאשר חריגה רשומה בחוק, או לשנות שם או סכמה. לא שיניתי.
- **הערה:** ‏`fn_ti_public_word_eligible` חשופה כ־RPC ומחזירה true/false לכל uuid. זו סיכון נמוך, אבל היא נדרשת למדיניות RLS.

### N1 · LOW · ביצועי מדיניות RLS על `gematria_words`
- **המדידה החיה:** סריקה מלאה של 15,592 שורות עם תנאי הזכאות בשורה אחת לקחה כ־380ms. עם עלות קריאה ל־SECURITY DEFINER שאינה מוטמעת, ההערכה היא עד כ־1 שנייה.
- **ההשפעה:** שאילתות לפי `ragil` אינן מושפעות. חיפוש טקסט מלא ב־REST מושפע.
- **מה צריך:** מדידה ב־PostgREST חי לפני השחרור: UNKNOWN.

### N2 · LOW · חוק המהירות
- **ה־build על העץ הסופי:** PASS. ‏eager 203,335 ‏(מגבלה 203,493); ‏frame 47,193 ‏(47,338); ‏CSS 34,329 ‏(34,362).
- **מול `main`** (נבנה מאותו מקום): ה־PR מוסיף **+266B eager** ו־**+74B frame JS**. ה־CSS לא השתנה.
- **ההבדל מהנוסח:** השער עובר בתוך הסבולת, אבל נוסח החוק הוא "המסגרת לא גדלה". זו החלטת צוריאל אם 74B מקובלים.

### נסוג · הקבצים בלי `;` בסוף
`*.after.sql` מסתיימים ב־`$function$` בלי `;`. בדקתי ב־psql אמיתי: הוא מבצע שאילתה שנשארה פתוחה בסוף קובץ שנכלל ב־`\ir`, ולכן `apply.psql` ו־`rollback.psql` עוברים. **זה אינו ליקוי.**

## תחום 3 — Traffic Intelligence v11

| סעיף בחוזה | מצב |
|---|---|
| v4: UNKNOWN הוא מצב מלא; ‏bot מבוסס `is_bot` בלבד | PASS. בציבור נכלל human בלבד ומסומן; אצל המנהל human, bot ו־unknown נפרדים |
| v6: PAGE_VIEW נפרד מ־DOMAIN_VIEW | PASS. ‏`views` נפרד מ־`domain_views` |
| v6: אין ריכוז בוטים בציבור (BOT OBSERVABILITY) | PASS. מופיע ב־`limitations` |
| v9: CALCULATOR, ‏keystroke אינו compute | PASS. ‏`typing` הוא אירוע נפרד |
| v9: SEARCH, אין חשיפת מונחי חיפוש של אחרים | ה־PR: PASS. **המסד החי היום: FAIL** (ממצא P2) |
| v10: DEFER AUDIENCE-SIZE | PASS. ‏`ActivityPulse2029` מציג פעולות בלבד, עם הכיתוב "פעולות אינן מספר אנשים" |
| v11: Journey, ספירת `journey_2029/start` בלבד | הלוגיקה PASS. **בפועל 0 אירועים**: `ResearchProvider` לא שולח מסע בבניית `PUBLIC_READING_RELEASE` |
| v4: הרשאות `fn_ti_*` בצד השרת בלבד | DRIFT (ממצא C1) |
| RLS ומנהל: `admin_2029_analytics` בודק `rd_is_admin()` | PASS. ‏anon נדחה (נבדק) |
| מקורות החיפוש: ‏`search_log` ו־`wall.hits` אינם מוזנים לציבור | PASS ב־PR. ‏`fn_raziel_research_intel` החי עדיין מזין (ממצא P1) |
| ‏`fn_ti_clean_classification` | PASS. נקראת מתוך SECURITY DEFINER בלבד, וההרשאה שלה נשארת postgres |

## תחום 4 — SQL, תאימות, rollback, PostgREST, קצב

- **preflight:** כל 9 ה־preimages זהים למסד החי בבדיקה מחודשת (20.11). ה־preimages מתקבלים byte-exact גם ב־PG16, ולכן `preflight.sql` עובר בבדיקה אמיתית. במסד החי עדיין אין `fn_ti_public_activity2029` ואין מדיניות `ti_*`.
- **rollback:** לאחר התיקון PASS. ‏`ingest_event` חוזר ל־md5 ‏`e7017ece…`, וה־API הציבורי נסגר. ה־RLS והעמודות נשארים בכוונה.
- **תאימות לאתר הקיים:**
  - `ti_wall_floor` מרוקן את הקיר הציבורי עד שתהיה אצירה. אין ביטוי מאושר כברירת מחדל, ו־`getWallRecent` וקוראי הקיר הישנים יחזירו `[]`.
  - הלקוח הישן מ־Production יקבל רשימה ריקה או 403 נבלע. זה צפוי, אבל זו **החלטת מוצר**.
  - ממצא B1 שובר את כל הלקוחות. הוא תוקן.
- **הגבלת קצב:** `cf-connecting-ip` מתוך `request.headers`. הכתיבה ישירה מהדפדפן ל־Supabase (`measurement2029.js:31`), כך שאין worker שמאחד IP. האימות ש־Supabase מעביר את הכותרת ושאי אפשר לזייף אותה דרך PostgREST החי: **UNKNOWN**. בלי הכותרת, הכתיבה של `activity_2029` נכשלת סגורה (נבדק).
- **PostgREST, JWT ותחרות בין חיבורים:** **UNKNOWN**. זו בדיקה מבודדת בלבד. ה־advisory lock של שליחה חוזרת נבדק בחיבור יחיד.

## תחום 5 — התוכנית (#1456) מול המימוש

ב־#1456 אין רשימת משימות לכל מדור. §5 מבקש "home/now/world/number/calculator where appropriate". היכל, מסעות וספריית הצפנים אינם בתוכנית.

| מדור | מצב | פער |
|---|---|---|
| מנהל `/2029/control` | PARTIAL | פילוח לפי יום בלבד. אין ספירות התאמה ושגיאות ב־`site_activity`. מדור `other` לא מוצג (`SiteActivity2029.jsx:23`) |
| בית | COMPLETE | — |
| עכשיו | **MISSING בפועל** | `NowPublications2029.jsx:248` שולח רק כשהרכיב לא compact, והרכיב נטען רק כ־compact (`SystemFrame2029.jsx:763`) |
| עולם | COMPLETE | `/gallery` נספר כ־`other` |
| מחשבון רגיל | COMPLETE | — |
| מחשבון מתקדם | PARTIAL | צפיות הדף מתכנסות ל־`/gematria`, כך שהענף `calculator-pro` אף פעם לא נבחר. ‏`typing` נשלח מחדש אחרי כל חישוב |
| מחשבון קהילה | PARTIAL | **אין אירועי compute, typing או search** |
| מספרים | PARTIAL | ‏`/number/:value` (כ־10% מצפיות המספרים ב־7 ימים במסד החי: 53 מתוך 550) חסר במספרים החמים |
| צופן ELS ‏`/code` | COMPLETE | — |
| ספריית צפנים `/codes` | COMPLETE | הכרטיס מציג ספירת פרסום, לא פעילות |
| היכל | PARTIAL | אין pulse ואין אירועים. ‏`/היכל` נספר כ־posts |
| מסעות | **MISSING בפועל** | בבניה הציבורית אין אירועי `journey_2029` |
| קהילה | PARTIAL | צפיית דף בלבד, אין pulse. התיקון ב־R2 משייך עכשיו `/members` ו־`/forum` |
| חיפוש כללי (`SiteSearch2029`) | PARTIAL | אין שדה `section`, ולכן החיפוש נזקף לדף שבו נפתח |

הפערים האלה הם פערי מוצר ומדידה בצד הלקוח. לא תיקנתי אותם בענף הזה: הם דורשים החלטת בעלים על הסמנטיקה, וכל שינוי במסגרת כפוף לחוק המהירות.

## בדיקות שהורצו (מקומית, על ראש ענף התיקונים)

| בדיקה | תוצאה |
|---|---|
| `test/sitewide-statistics-20261120-sql.mjs` ‏(PGlite 0.5.16, זהה ל־CI) | 31/31 PASS. בגרסה המקורית: 24, ובלי המפתח המלאכותי נכשלת |
| `test/sitewide-statistics-legacy-readers-sql.mjs` | 13/13 PASS |
| `test/sitewide-statistics-20261120-realpg.sh` ‏(PostgreSQL 16.15, psql אמיתי) | 7/7 PASS. מול ה־SQL המקורי: FAIL |
| 10 קובצי חוזה (sitewide, rollout, preview, analytics-followups, rpc-deploy-order, m0a, measurement*) | 62/62 PASS |
| חוזי CI, ‏required-checks, ‏def001/def005, ‏p1, ‏push, ‏release, ‏ELS | 83/84. הכשל היחיד הוא `els-action-telemetry-sql` (initdb כ־root), וזהה בראש ה־PR ללא שינוי: סביבתי |
| `npm run build` ו־`build-public-reading-production.mjs` | PASS, כולל שער ה־shell |

**לא הורצו:** בדיקות הדפדפן של החבילה (Playwright) ו־CI של GitHub על ראש הענף הזה. לא שיניתי קוד לקוח, אבל זו אינה הוכחה.

## קבצים ששונו או נוספו בענף

| קובץ | sha256 | בייטים |
|---|---|---|
| `extensions.sql` (שונה) | `345e0cda027b3e2911fcb8f2789a8e641fb98f0eb24e82e2c9acb51fa7734a5e` | 11625 |
| `ingest_event.after.sql` (שונה) | `691a92845a01f1db36051f1160c80b6bcf14ca206b039472169d04012dd1ddc1` | 10629 |
| `fn_raziel_research_intel.before.sql` | `f48c1b6b294fc417c8929f09208315bfba966bf3cdc951df34bd744cfca6947b` | 5902 |
| `fn_raziel_research_intel.after.sql` | `00a35f9066e101ec624199ed773a1d7382d748868079997df152495dce9f0a17` | 6373 |
| `number_cross_resonance.before.sql` | `bb0869762aef0613b7f545781d3db7be30efee473ea4651ae02cf49576ad04ab` | 1523 |
| `number_cross_resonance.after.sql` | `6fc4eed50090a7c38a2d589edd3e3aad8f5cf4a4c56f272f697a85173a33fe4a` | 1910 |
| `legacy-readers-hardening.psql` | `05ff3c37a02f18644f4c8b5ecb0965476eca1f9a9dad5429b3f9ee86231ee364` | 2953 |
| `legacy-readers-hardening.rollback.psql` | `8df7b3e140a17779febcddaebf897f6c6e5cf282212f0f347b370b0b5e41ffa5` | 643 |
| `search-log-floor.standalone.psql` | `3da7d53927122535a8723ddb74dd5fd9e75cccfda14868ba1b7738e34218a811` | 817 |

ועוד: `test/sitewide-statistics-20261120-sql.mjs` (שונה), `test/sitewide-statistics-legacy-readers-sql.mjs`, `test/sitewide-statistics-20261120-realpg.sh` ו־`.github/workflows/sitewide-statistics-2029.yml` (נוסף צעד לבדיקת הקוראים הישנים).

## החלטות הממתינות לצוריאל (לפי 0.4)

1. **אישור SQL**, לכל קובץ בנפרד ובקומיט מדויק:
   - `search-log-floor.standalone.psql`: מומלץ ראשון ובנפרד, כי הדליפה חיה היום.
   - `apply.psql`.
   - `legacy-readers-hardening.psql`: אחרי `apply.psql`.
2. **הקיר הציבורי:** הוא מתרוקן עד שתהיה אצירה. צריך לאשר את זה, או להגדיר מדיניות אצירה ראשונית.
3. **C1:** אישור חריגה של מענק ציבורי בתוך `fn_ti_*`, או שינוי שם או סכמה.
4. **N2:** האם תוספת של 74B ל־frame מקובלת.
5. **פערי המוצר** בתחום 5: עכשיו, מסעות, מחשבון קהילה ו־section בחיפוש.
6. **מדידה ב־PostgREST חי** אחרי החלה מאושרת: כותרת `cf-connecting-ip`, ‏JWT, ומדידה תחת עומס.
