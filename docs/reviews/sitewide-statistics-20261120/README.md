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

## 3. מדורים — לפני ואחרי

| מדור | לפני | אחרי |
|---|---|---|
| מנהל `/2029/control` | מדור "אחר" לא הוצג; ארכיון שקרא את `search_log` | מוצגים "אחר", "חיפוש כללי" ו"מחשבון הקהילה"; מסעות `0 · טרם הושק`; הארכיון הוסר; טריות המקורות הישנים מסומנת "נעצר" |
| בית, עולם, מספר, ELS, ספריית צפנים, מחשבון רגיל | צפייה ופעולות מדודות | ללא שינוי |
| עכשיו | `view` נשלח רק כשהרכיב אינו compact, ובפועל הוא תמיד compact, כך שלא נשלח אף פעם | נספר בפתיחת הלוח, פעם אחת לכל פתיחה |
| מחשבון קהילה | ללא אירוע compute; נספר כמחשבון רגיל | `compute` אחד לכל ביטוי שהוקלד והתייצב, ב־section `calculator_community`; הגעה מקישור שיתוף אינה נספרת |
| חיפוש כללי | נזקף לעמוד שבו נפתח | section `site_search` |
| מספרים | `/2029/number/N` נרשם כ־`/number/:value` ונעלם מהמספרים החמים | ממופה ל־`/number/N`; מקטע בעברית נשאר תווית, כי הוא עלול להיות שם |
| ביקוש למספרים ב־TI (מטטרון, רזיאל) | 0 מספרים מאז 9.11 (תווית במקום זהות) | `fn_human_entrances` מזהה את נתיב הנחיתה האמיתי: 51 נחיתות ב־30 יום חוזרות; ‏`suspected_bot` זהה ב־6,207 מתוך 6,207 sessions |
| מסעות | פיצ'ר סגור, 0 אירועים | `0 · טרם הושק` מבעל ההשקה. אחרי ההשקה: `journey_2029/start`, ואם אין נתונים — `NO_DATA`, לא 0 |
| היכל, קהילה (פורום, חברים) | page view בלבד; `/members` נספר כאזור אישי | מיפוי מעוגן: `/members`, ‏`/researcher` ו־`/forum` ← community |
| רזיאל | ביקוש מ־`visitor_events` ו־`search_log` (קפואים) | מקור אחד: TI מעל `events`. ‏human, unknown ו־bot נפרדים; `unique_users=null`; מתחת לסף: `suppressed`; מקור שקט: `unavailable` |

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

## 6. SQL — סדר שחרור (כל שלב דורש אישור ZURIEL לקומיט מדויק)

1. `search-log-floor.standalone.psql` — סוגר את קריאת `search_log` שפתוחה היום ל־anon (כ־96 אלף חיפושי טקסט חופשי). אפשר להחיל לבד ומוקדם.
2. `apply.psql` — כולל preflight עם md5 לחמש פונקציות, הרחבות RLS, את המעטפת, ואת `fn_human_entrances`, ‏`ingest_event` ו־`admin_2029_analytics`. ‏Rollback: ‏`rollback.psql`.
3. `legacy-readers-hardening.psql` — מחליף את רזיאל ואת `number_cross_resonance` וסוגר RPC מתים. ‏Rollback: ‏`legacy-readers-hardening.rollback.psql`.
4. `privacy-floor/apply.psql` — מוסיף את פרדיקט הזכאות לכל קורא ציבורי שדולף. ‏Rollback וקנרית נמצאים בתיקייה.
5. רק אחר כך: פריסת הלקוח לפי נוהל הפריסה ב־CLAUDE.md, ואז קנרית.

**אסור להחיל את `apply.psql` מ־`cfb007e4e`.** ‏`ON CONFLICT(event_id)` על `events` מחולקת שובר את כל הקליטה (הוכח ב־PostgreSQL אמיתי). Preview בלי SQL מציג "לא זמין", וזו אינה ראיה לפעילות.

## 7. בדיקות וביצועים

| בדיקה | תוצאה |
|---|---|
| `sitewide-statistics-20261120-sql.mjs` ‏(PGlite 0.5.16 = PostgreSQL 18.6) | 31/31 |
| `sitewide-statistics-legacy-readers-sql.mjs` | 18/18; מוכיח גם את שורש הבאג של TI |
| `sitewide-statistics-20261120-realpg.sh` ‏(PostgreSQL 16.15, psql אמיתי, `events` מחולקת) | 10/10; מול ה־SQL המקורי: FAIL |
| `sitewide-statistics-privacy-floor-realpg.sh` | 6/6: כל 21 ה־preimages זהים לבייט, ה־apply זהה לקבצים שנבדקו, ה־rollback מדויק, והגנת הסטייה עוצרת. **גופי ה־SQL לא הורצו מול טבלאות אמיתיות.** הקנרית רצה רק אחרי ההחלה |
| PostgreSQL 17.6 (גרסת המסד החי) | **UNKNOWN**. התקנת 17 נחסמה בסביבה; נבדק על 16 ו־18 |
| PostgREST, ‏JWT ו־`cf-connecting-ip` | **BLOCKED**. הרצת קובץ ההפעלה של PostgREST נחסמה בסביבה |
| נפח ×10 מהחי (100 אלף אירועים, 17 אלף sessions) | 720 שעות: קר 0.30 שניות, חם 8–13ms; 24 שעות 84ms; 168 שעות 125ms |
| pgbench, ‏32 לקוחות, 20 שניות | 21,463 קריאות, 0 כשלים, ממוצע 30ms; חישוב מחדש אחד לכל חלון |
| מסד חי, ‏`EXPLAIN` (קריאה בלבד) | צבירת 30 יום 1.95 שניות; שרשרת TI לרזיאל (30 יום ועוד 30 קודמים) 3.9 שניות; ‏`statement_timeout` הוא 8 שניות |
| shell מול `main` (node_modules נקי לפי ה־lockfile) | eager **‎+146B**, ‏frame **‎+50B** (היו ‎+266/‎+74). הגידול שנשאר: מפרט האימות של `activity_2029` ואירוע השמירה. השער עבר. הערה: התקנת `react-test-renderer` לבדיקות משנה את `node_modules` ומנפחת את ה־build בכ־710B; ב־`live-contracts-2029` בניות הקריאה הציבורית רצות אחריה |
| צילומי מסך סינתטיים 390/1440 | `screens/activity-390.png`, ‏`screens/activity-1440.png` |

CI: לפי ה־SHA בתיאור ה־PR.

## 8. נותר פתוח (דורש החלטה, אישור או סביבה)

- אישור SQL ו־Production לפי §6, וקנרית חיה (`privacy-floor/canary.sql`) אחרי ההחלה.
- PostgREST ו־PostgreSQL 17: ראו §7.
- כותבי `visitor_events` (`track()` ב־`tracking.js` בבנייה הלא־ציבורית) ושישה קוראי מנהל ב־`visits.js` עדיין קוראים ממנו. העברתם ל־TI היא מעבר נפרד: לא נמצא בהם קורא ציבורי.
- `recent_number_opens`, `top_collective` (`getTopCollective`): אין להם קורא בלקוח. מועמדים לסגירה בסבב הבא.
- `fn_metatron_status()` עדיין PUBLIC ומחזיר נתוני פערים: נדרשת החלטת בעלים.
- כמה מתוך 53 הצפיות של `/number/:value` היו `/2029/number/N` (שתוקן) וכמה מקטע בעברית (שנשאר תווית בכוונה): **UNKNOWN**.
- רישום תוספת החוק ב־`rules_active` (§4).
