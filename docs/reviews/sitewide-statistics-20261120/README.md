# #1456 / #1461 — פעילות 2029 אחידה: מקור אמת, חבילה ומצב שחרור

**זה המסמך החי היחיד של החבילה.** מצב חי נקרא מ־Supabase, Vercel ו־`origin/main`, לא מכאן. גרסאות קודמות נשמרות בהיסטוריית Git: README של Codex ב־`cfb007e4e` וביקורת Claude ב־`8ae33b534`.

**סטטוס:** BRANCH-ONLY. ה־SQL **מוצע ולא הוחל**. אין מיזוג. אין שינוי Production. ה־Production החי (נקרא מחדש ב־20.11, 19:3x UTC): `dpl_2ngd15963rnFP1fGqtvxoGL3Pona` ממקור `7e7cc4b` (#1454). קודם לכן הוא היה `bacecaa`. החבילה אינה באף אחד מהם.
**החלטות בעל האתר:** תגובות ZURIEL ב־PR #1461 מ־20.11.2026, `#issuecomment-7047824946` ו־`#issuecomment-7047969421`.

## 1. מקור אמת אחד לכל תחום

| תחום | בעלים | קורא ציבורי | קורא מנהל |
|---|---|---|---|
| מדידת פעילות | Traffic Intelligence v11 → `events` דרך `ingest_event` | — | — |
| סיווג אדם/בוט/לא ידוע | `fn_ti_clean_classification` (צד שרת בלבד) | — | — |
| נחיתה ← ישות (מספר/נושא) | `fn_human_entrances` ← `fn_ti_entity_demand*` | — | — |
| דופק מחקר ציבורי | `fn_ti_activity_pulse2029` (TI, צד שרת) | `research_pulse_2029` (מעטפת אחת) | — |
| פעילות כל האתר | `admin_2029_analytics.site_activity` | — | `/2029/control` (מרכז ניהול יחיד) |
| ביקוש לרזיאל | `fn_raziel_research_intel` מעל TI | — | דרך `fn_raziel_research_intel_scoped` (ללא שינוי) |
| זכאות ביטוי לפרסום | `gematria_public_word_eligible(uuid)` (בעל הקורפוס) | RLS ‏`ti_public_word_floor` | — |
| מצב השקת מוצר (מסעות) | `publicReadingCapability()` ב־`publicReadingRelease2029.js` | — | — |

אין טבלת אירועים נוספת, אין מנוע סטטיסטיקה מקביל ואין מסך מנהל נוסף. `gematria_wall.hits`, `search_log` ו־`events` **לעולם לא מסוכמים יחד**.

## 2. פרישת מקורות ישנים — חוזה חד־משמעי

הסדר המחייב הוא: מעבר קוראים ← אימות ← עצירת כותבים ← סגירת גישה ← הסרת קוד מת. "אפס צרכנים" הוכח בכל אחד מהמקומות האלה:
- הענף, `origin/main`, ‏Production ‏`bacecaa` וגם Production החדש `7e7cc4b`. ב־`7e7cc4b` הקורא החי היחיד הוא `addWallWord` מ־`CommunityCalculatorPage` הישן, ולכן `add_wall_word` נשאר ABI ללא פעולה ולא נסגר;
- `supabase/functions`;
- תלויות ב־`pg_proc`;
- `cron.job`;
- `scripts`, `test` ו־workflows.

**מקורות (טבלאות):**

| מקור | טריות חיה (20.11) | כותבים | קוראים לפני | אחרי | מצב |
|---|---|---|---|---|---|
| `search_log` | אחרון 9.11; 0 שורות ב־7 ימים | מדיניות RLS פותחת INSERT ל־anon; `logSearch` ללא קורא | REST ציבורי (`USING true`), `fn_raziel_research_intel`, `live_stats`, `admin_research_map`, ארכיון ב־UI | קריאה מהלקוח `false` לכל תפקיד; INSERT חסום; רזיאל לא קורא; ה־UI הוסר | **PROPOSED** |
| `gematria_wall` | אחרון 4.11 | `add_wall_word` (הופך ללא פעולה), `save_wall_word_private` | REST ציבורי, `getWallRecent` | קריאה `false` לכל תפקיד; ‏`getWallRecent` קורא את הדופק המאושר | **PROPOSED** |
| `visitor_events` | 78 שורות ב־7 ימים; צפיות המספר נעצרו ב־9.11 | `track()` ב־`tracking.js` (בבנייה הציבורית ההכנסה מדולגת) | `fn_raziel_research_intel`, ‏`journey_pulse`, ‏`admin_research_map` | רזיאל עבר ל־TI; ‏`journey_pulse` ו־`admin_research_map` נסגרו; `trackResearch` הוסר | חלקי (ראו §8) |

**ממשקי RPC (נסגרים לצד השרת בלבד; לא נמחק דבר):**

| RPC | מה הוא קורא או עושה | מצב |
|---|---|---|
| `journey_pulse` | `visitor_events` | **PROPOSED** |
| `activity_pulse` | גודל קהל — אסור לפי TI v10 | **PROPOSED** |
| `site_pulse_today` | גודל קהל | **PROPOSED** |
| `live_stats` | `search_log` | **PROPOSED** |
| `admin_research_map` | `search_log` ו־`visitor_events` | **PROPOSED** |
| `save_wall_word_private` | הכותב האחרון לקיר | **PROPOSED** |

**קוד לקוח:**

| פריט | ראיה | מצב |
|---|---|---|
| `systemEvents.js` | אף קובץ לא מייבא אותו, גם לא דינמית; ללא בדיקות | **הוסר** |
| `getRecentSearchCount`, `getRecentNumbers`, `logSearch`, `addWallWord`, `saveWallWordPrivate`, `adminResearchMap`, `getJourneyPulse`, `getActivityPulse`, `getSitePulseToday`, `getPulse` | אפס קוראים, כולל ב־Production | **הוסרו** |
| `trackResearch` (6 קריאות ב־`ResearchProvider`) | כותב כפול לצד `emitJourney2029` ו־`activity_2029` | **הוסר** |
| `CommunityCalculatorPage.jsx`, `engine.js`, `VisitorSearchesBox.jsx`, `getRecentSearches`, `getWallRecent` | בשימוש פעיל דרך `App2029` | **נשמרו** ללא שינוי. ‏`getWallRecent` כבר קורא את הדופק |
| `recent_number_opens` | ABI; ‏Codex כתב אותו מחדש מעל הקורא הבטוח | נשמר; מועמד לפרישה (§8) |

## 3. מדורים — מה נמדד, מה מוצג, הוכחה

הוכחת "נשלח, נקלט ונספר פעם אחת" לכל מדור: `test/sitewide-statistics-sections-sql.mjs` (65/65). הבדיקה בונה את הבקשה בקוד הלקוח האמיתי (`readingMeasurementPath`, ‏`readingTelemetryPath`, ‏`readingMeasurementBody`), שולחת אותה ל־`ingest_event` המוצע **פעמיים**, ובודקת שדוח המנהל סופר אותה פעם אחת ובמדור הנכון. פעולה עם `operation_id` אינה נספרת פעמיים גם כשהיא נשלחת שוב. צפיית דף מנוכה בלקוח, ובדיקת הדפדפן `measurement-visit-once` מכסה זאת. אף מדור נמדד לא נופל ל"אחר".

| מדור | נמדד (Traffic Intelligence, `events`) | מוצג |
|---|---|---|
| בית | צפיית דף | מנהל · דופק ציבורי |
| עכשיו | פתיחת הלוח (`activity_2029/view`) | מנהל · דופק בלוח (compact) |
| עולם | צפיית דף | מנהל · דופק |
| מחשבון רגיל | צפייה · הקלדה (פעם אחת לכל רצף) · חישוב · בחירת תוצאה/שיטה | מנהל (לפי מחשבון ושיטה) · דופק |
| מחשבון מתקדם | הקלדה · חישוב (`calculator_advanced`) | מנהל · דופק |
| מחשבון קהילה | צפייה (מדור `calculator_community`) · הקלדה · חישוב; הגעה מקישור שיתוף אינה נספרת | מנהל · דופק |
| דפי מספר | צפייה ב־`/number/N` · חיפוש · בחירת ביטוי מאושר | מנהל (מספרים מובילים) · דופק (מספרים חמים) |
| צופן תנ״כי `/code` | צפייה · חיפוש והצלבה (משפחת `els`) | מנהל · דופק |
| ספריית צפנים `/codes` | צפייה · חיפוש | מנהל · דופק (וספירת צפנים שפורסמו) |
| פוסטים | צפייה | מנהל · **דופק: "נקרא עכשיו"** (פוסטים ציבוריים מעל הסף; כותרת ומצב פרסום נבדקים בכל קריאה) |
| ספרים · קהילה (צ'אט, פורום, חברים) | צפייה | מנהל |
| חיפוש כללי | הקלדה · חיפוש · בחירה (`site_search`) | מנהל |
| שמירה · שיתוף | `activity_2029/save` · משפחת `share` (לפי ערוץ) | מנהל |
| הרשמות | `auth.users` מאומתים (מקור Auth, לא אירוע לקוח) | מנהל |
| היכל · רזיאל · אזור אישי | פתיחה בלבד, ללא תוכן | מנהל מציג את **מצב המוצר** מבעל ההשקה (`publicReadingCapability`): "סגור זמנית · בבנייה" / "בבדיקה" |
| מסעות | `journey_2029/start` אחרי ההשקה | `0 · טרם הושק`. אחרי ההשקה, כשאין נתונים: `NO_DATA`, לא 0 |

**מרכז הניהול `/2029/control`** (`admin_2029_analytics.site_activity`, למנהל בלבד):
- **סיכום:** כניסות, צפיות, דפדפנים משוערים, חשבונות, דפדפנים אורחים, הרשמות, פעילים ב־5 דקות (דפדפנים וחשבונות), חדשים וחוזרים, ביקור בדף יחיד.
- **השוואה לתקופה הקודמת באותו אורך** (יום, שבוע או חודש, לפי החלון): כניסות, צפיות, דפדפנים, חישובים, חיפושים, שיתופים.
- **מדורים לפי שימוש**, ממוינים מהפופולרי ועד הכמעט לא בשימוש, עם האירוע האחרון בכל מדור.
- **פילוחים:** חישובים וחיפושים לפי מחשבון או מדור, לפי שעה (שעון ישראל) ולפי מקור ההגעה. שיטות גימטריה. שיתופים לפי ערוץ.
- **תוכן:** מגמה יומית, מספרים מובילים, ביטויים מאושרים, צפנים והתכנסויות שפורסמו.
- **איכות תנועה:** אדם, בוט ולא ידוע בנפרד. אירועים בלי זהות. טריות המדידה. מקורות היסטוריים שנעצרו מסומנים "לא מדד חי".
- **מה שכבר קיים בדוח המנהל נשמר:** מקורות תנועה, Google, ביצועים (RUM), שגיאות, ספקים ועלויות.

**דופק ציבורי** (`research_pulse_2029`):
- **רכיב:** אחד, טעון בעצלות ובגובה קבוע. מופיע בבית, ב"עכשיו", בעולם, בשלושת המחשבונים, בדף מספר, ב־ELS, בספריית הצפנים ובפוסט.
- **מה מוצג:** מספרים חמים, ביטויים כלליים מאושרים, "נקרא עכשיו", מגמה (מחצית מול מחצית), פעולות מחקר ופרסומים.
- **רצפת פרטיות:** 10 אירועים ו־5 sessions. אין שמות, אין חיפושים פרטיים, אין ביטויים מוסתרים ואין גודל קהל (TI v10).
- **כשה־SQL לא הוחל** (כמו ב־Preview): מוצג "נתוני הפעילות אינם זמינים כרגע". אין נתוני הדגמה.

**פרטים נוספים:**
- `/2029/number/N` ← הפניית 308 בשרת אל `/number/N`. המדידה קנונית בלבד. 53 הצפיות שנרשמו כתווית הן כתובות לא מספריות, ונשמרו כך בכוונה לצורך פרטיות.
- `fn_human_entrances` (נחיתת v2 לפי `measurement.page_path`) מתקן את ביקוש הישויות, מטטרון ורזיאל: 0 מספרים מאז 9.11 לפני התיקון. ‏`suspected_bot` זהה ב־6,207 מתוך 6,207 sessions חיים.

## 4. חוזים

- **TI v4:** כל `fn_ti_*` הוא צד שרת בלבד. המפיק `fn_ti_activity_pulse2029` ו־`fn_ti_surface2029` נשללים מלקוחות. ה־projection הציבורי (TI v9, System Pulse) עובר דרך מעטפת אחת: `research_pulse_2029(p_hours ∈ {24,168,720})`. השם נבחר כדי לא להתנגש ב־`activity_pulse()` הישן שנאסר בבית. ‏`realpg.sh` בודק שאחרי ההחלה אין `fn_ti_*` הנגיש ל־anon או ל־authenticated.
- **TI v9 ו־v10:** אין מונחי חיפוש של אחרים ואין גודל קהל בציבור. הדופק מציג פעולות עם הכיתוב "פעולות אינן מספר אנשים".
- **TI v11 (מסעות):** סופרים רק `journey_2029/start`, ומצב המוצר נשמר כמו שהוא.
- **תוספת חוק מוצעת**, לרישום ב־`rules_active` על ידי ZURIEL. כתיבה למסד לא בוצעה:
  > "Public projections of Traffic Intelligence are exposed only through a single non-`fn_ti_*` wrapper per projection (`research_pulse_2029`); the `fn_ti_*` family stays server-only. `search_log`, `gematria_wall` and `visitor_events` are frozen history and never a live metric."

## 5. פרטיות — הוכחות

| קביעה | הוכחה |
|---|---|
| ביטויים מוסתרים לא יוצאים מהדופק, מההצעות או מדף המספר, גם אחרי cache hit, ביטול אצירה או blocklist | `sitewide-statistics-20261120-sql.mjs`. הבדיקה כוללת את סאלי, סלי, ליאור מאס וסליחות |
| `latest_event` ו־`last_at` | מתפרסמים רק מעל הסף של 10 אירועים ו־5 sessions, ובדיוק של שעה. אירוע יחיד ← `no_data` |
| `search_log` ו־`gematria_wall` לא נגישים ללקוח | PGlite ו־PostgreSQL אמיתי |
| קוראי SECURITY DEFINER ישנים | `legacy-readers-hardening.psql`: 5 פונקציות ו־6 RPC שנסגרו |
| `privacy-floor/` | כל קורא ציבורי שדלף מקבל את הפרדיקט המשותף (21 פונקציות; הפירוט ב־`privacy-floor/README.md`). בחי 3,035 שורות מתוך 15,592 אינן זכאיות לפרסום. בין הקוראים: `fn_name_multi` ועוזריו (עד כל המוסתרים), `number_dossier_json`, `fn_en_search`, `strongest_crossings`, `fn_cross_research`, `fn_all_methods` ועוד. ‏`top_collective` ו־`entity_collective_count` מקבלים רצפה של 3 משתמשים ובלי כותרת פרטית. ‏`research_level_of`, ‏`fn_cohort_acceptance` ו־`fn_metatron_gaps` עוברים לצד השרת בלבד. **הרצפה חלה על כל קורא, כולל service_role** (למשל ה־Edge `research-extract` דרך `fn_all_methods`) |
| רזיאל לא חושף ביקור בודד | `legacy-readers-sql.mjs`: ‏`suppressed` / `unavailable` |

## 6. תוכנית שחרור אחת (כל שלב דורש אישור ZURIEL לקומיט מדויק)

אסור להחיל את `apply.psql` מ־`cfb007e4e`, כי `ON CONFLICT(event_id)` על `events` מחולקת שובר את כל הקליטה. מחילים רק את הקבצים מראש הענף הזה. כל שלב נעצר בעצמו כשיש סטייה (md5 ל־preimage או להרשאות), ולכל שלב יש rollback מדויק.

| # | פעולה | בדיקת קנרית מיד אחרי | rollback |
|---|---|---|---|
| 1 | `search-log-floor.standalone.psql` (קריאה וכתיבה של `search_log` נסגרות לכל לקוח) | REST כ־anon: `search_log` מחזיר `[]` ו־INSERT נדחה | `drop policy ti_search_history_server_only on public.search_log; drop policy ti_search_no_new_raw on public.search_log;` |
| 2 | `apply.psql` (preflight, RLS, `research_pulse_2029`, ‏`fn_human_entrances`, ‏`ingest_event`, ‏`admin_2029_analytics`) | (א) קליטה: `select count(*) from events where ts>now()-interval '5 min'` עולה, כלומר הקליטה לא נשברה. (ב) `research_pulse_2029(24)` מחזיר `version=1`. (ג) `fn_ti_entity_demand_clean_composition` מחזיר מספרים. (ד) `cf-connecting-ip` קיים ב־`request.headers` של בקשה חיה; אם אינו קיים, פעולות `activity_2029` לא נכתבות (נכשל סגור) ומדווחים | `rollback.psql` |
| 3 | `legacy-readers-hardening.psql` | רזיאל `_scoped` מחזיר `source_state`; ‏`number_cross_resonance` כ־anon בלי ביטוי מוסתר | `legacy-readers-hardening.rollback.psql` |
| 4 | `privacy-floor/apply.psql` | `privacy-floor/canary.sql` (קריאה בלבד; מסתיים ב־ROLLBACK) | `privacy-floor/rollback.psql` |
| 5 | פריסת הלקוח לפי נוהל הפריסה ב־CLAUDE.md (alias אחרי READY) | `post-deploy-canary`; ‏`/2029/number/104` ← 308; הדופק בבית מציג "במוקד המחקר"; ‏`/2029/control` כמנהל | `assign_alias` לפריסה הקודמת (נקראת לפני ההחלפה) |

הלקוח בלי ה־SQL בטוח: הדופק מציג "לא זמין" ודוח המנהל מציג "טרם זמינה במסד". לכן אין צורך לחכות עם הפריסה. אבל **מדידת הפעולות החדשות מתחילה רק אחרי שלב 2.**

## 7. בדיקות וביצועים

| בדיקה | תוצאה |
|---|---|
| `sitewide-statistics-20261120-sql.mjs` ‏(PGlite 0.5.16 = PostgreSQL 18.6) | 37/37: כולל "נקרא עכשיו", טיוטה שנעלמת גם אחרי cache, השוואה לתקופה קודמת ופילוחים |
| `sitewide-statistics-sections-sql.mjs` | 65/65: כל מדור, מקוד הלקוח ועד הספירה, פעם אחת |
| `sitewide-statistics-legacy-readers-sql.mjs` | 18/18; מוכיח גם את שורש הבאג של TI |
| `sitewide-statistics-20261120-realpg.sh` ‏(PostgreSQL 16.15, psql אמיתי, `events` מחולקת) | 18/18; מול ה־SQL המקורי: FAIL. כולל **הדמיית בקשת PostgREST** (`SET LOCAL ROLE`, ‏`request.jwt.claims`, ‏`request.headers`) עם `auth.uid()` ו־`rd_is_admin()` בהגדרתם החיה: anon בלי כותרת קצה לא כותב; כותרת ← נשמר פעם אחת כאורח; JWT מחתים חשבון; מנהל נדחה ללא הרשאה ומקבל דוח עם הרשאה; המפיק `fn_ti_*` חסום ל־anon |
| `sitewide-statistics-privacy-floor-realpg.sh` | 6/6: כל 21 ה־preimages זהים לבייט, ה־apply זהה לקבצים שנבדקו, ה־rollback מדויק, והגנת הסטייה עוצרת. **גופי ה־SQL לא הורצו מול טבלאות אמיתיות.** הקנרית רצה רק אחרי ההחלה |
| PostgreSQL 17.6 (גרסת המסד החי) | **UNKNOWN**. התקנת 17 נחסמה בסביבה; נבדק על 16 ו־18 |
| קובץ ההפעלה של PostgREST מול Cloudflare | **BLOCKED** (הרצת קובץ ההפעלה נחסמה בסביבה). הסמנטיקה ב־SQL הוכחה בהדמיה למעלה. שתי שאלות אפשר לבדוק רק במערכת החיה: האם Supabase מעביר את `cf-connecting-ip`, והאם Cloudflare דורס כותרת שהלקוח זייף. אלה בדיקות הקנרית בסעיף 6 |
| נפח ×10 מהחי (100 אלף אירועים, 17 אלף sessions) | 720 שעות: קר 0.30 שניות, חם 8–13ms; 24 שעות 84ms; 168 שעות 125ms |
| pgbench, ‏32 לקוחות, 20 שניות | 21,463 קריאות, 0 כשלים, ממוצע 30ms; חישוב מחדש אחד לכל חלון |
| מסד חי, ‏`EXPLAIN` (קריאה בלבד) | צבירת 30 יום 1.95 שניות; שרשרת TI לרזיאל (30 יום ועוד 30 קודמים) 3.9 שניות; ‏`statement_timeout` הוא 8 שניות |
| shell (node_modules נקי לפי ה־lockfile) | eager 203,189B (מגבלה 203,493), ‏frame 47,195B (מגבלה 47,338), ‏CSS ללא שינוי. השער עבר. מול `main` של 20.11 בבוקר: eager **‎+146B**, ‏frame **‎+50B** (היו ‎+266/‎+74). הגידול שנשאר: מפרט האימות של `activity_2029` ואירוע השמירה. השער עבר. הערה: התקנת `react-test-renderer` לבדיקות משנה את `node_modules` ומנפחת את ה־build בכ־710B; ב־`live-contracts-2029` בניות הקריאה הציבורית רצות אחריה |
| צילומי מסך סינתטיים 390/1440 | `screens/activity-390.png`, ‏`screens/activity-1440.png` |

CI: לפי ה־SHA בתיאור ה־PR.

## 8. נותר פתוח — רק מה שאינו פתיר בלי הרשאה או החלטה

- **אישורי שחרור** לשלבי סעיף 6.
- **בדיקות חיות** שאפשר לבצע רק אחרי שלב 2: כותרת `cf-connecting-ip` דרך Cloudflare ו־PostgREST, ו־PostgreSQL ‏17.6. בסביבה נבדק על 16 ועל 18; ההתקנה של 17 נחסמה.
- **החלטות בעלים** (לא חוסמות את החבילה):
  - העברת שישה קוראי מנהל ב־`visits.js` מ־`visitor_events` ל־TI. אלה קוראים ישנים במנהל, לא ציבוריים; הכותב `track()` כבר סגור בבנייה הציבורית.
  - סגירת `recent_number_opens` ו־`top_collective`, שאין להם קורא.
  - `fn_metatron_status`, שעדיין ציבורי.
  - רישום תוספת החוק ב־`rules_active` (§4).

**מחוץ לחבילה (תועד, ללא קשר לסטטיסטיקה):**
- `test/posts-public-reading-seo.test.mjs` עודכן לצפות ל־canonical עם מקף, כפי שקבע #1355. אין שינוי קוד.
- הענף המת `numberAlias` הוסר מ־`public-document.js`.
- **53 הצפיות של `/number/:value`** (שבעה ימים עד 20.11, מתוך 550; ‏497 קנוניות; 0 תחת `/2029/number/N`) הן כתובות לא מספריות שנשמרו כתווית לצורך פרטיות.
- **בדיקת HTTP חיה** (דפדפן ו־Googlebot זהים): ‏`/2029/number/N`, ‏`/2029/number/0N` ו־`/number/0N` ← הפניית 308 אחת אל `/number/N`. ‏canonical ו־og:url הם `/number/N`. במפת האתר 13,024 כתובות `/number/` ו־0 תחת `/2029/`.
