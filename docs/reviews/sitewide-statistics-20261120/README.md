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
- **תוספת חוק מוצעת**, לרישום ב־`nodes` הפעילים (לא ב־view ההיסטורי `rules_active`) על ידי ZURIEL. כתיבה למסד לא בוצעה:
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
| `sitewide-statistics-20261120-sql.mjs` ‏(PGlite 0.5.16 = PostgreSQL 18.6) | 35/35 |
| `sitewide-statistics-legacy-readers-sql.mjs` | 18/18; מוכיח גם את שורש הבאג של TI |
| `sitewide-statistics-20261120-realpg.sh` ‏(PostgreSQL 16.15, psql אמיתי, `events` מחולקת) | 10/10; מול ה־SQL המקורי: FAIL |
| `sitewide-statistics-privacy-floor-realpg.sh` | 6/6: כל 21 ה־preimages זהים לבייט, ה־apply זהה לקבצים שנבדקו, ה־rollback מדויק, והגנת הסטייה עוצרת. **גופי ה־SQL לא הורצו מול טבלאות אמיתיות.** הקנרית רצה רק אחרי ההחלה |
| PostgreSQL 17 | PASS בסשן Codex המתואם: 17.11 מקומי, אותו major; אין טענה לבדיקה על patch 17.6 |
| PostgREST ו־JWT | PASS ב־16.6 מקומי, מול PG17 מחולק. כותרת IP חסרה נסגרת; אימות מקור הכותרת בקצה Supabase החי נשאר UNKNOWN |
| נפח ×10 מהחי (100 אלף אירועים, 17 אלף sessions) | 720 שעות: קר 0.30 שניות, חם 8–13ms; 24 שעות 84ms; 168 שעות 125ms |
| pgbench, ‏32 לקוחות, 20 שניות | 21,463 קריאות, 0 כשלים, ממוצע 30ms; חישוב מחדש אחד לכל חלון |
| מסד חי, ‏`EXPLAIN` (קריאה בלבד) | צבירת 30 יום 1.95 שניות; שרשרת TI לרזיאל (30 יום ועוד 30 קודמים) 3.9 שניות; ‏`statement_timeout` הוא 8 שניות |
| shell מול `main` (node_modules נקי לפי ה־lockfile) | eager **‎+146B**, ‏frame **‎+50B** (היו ‎+266/‎+74). הגידול שנשאר: מפרט האימות של `activity_2029` ואירוע השמירה. השער עבר. הערה: התקנת `react-test-renderer` לבדיקות משנה את `node_modules` ומנפחת את ה־build בכ־710B; ב־`live-contracts-2029` בניות הקריאה הציבורית רצות אחריה |
| צילומי מסך סינתטיים 390/1440 | `screens/activity-390.png`, ‏`screens/activity-1440.png` |

CI: לפי ה־SHA בתיאור ה־PR.

## 8. נותר פתוח (דורש החלטה, אישור או סביבה)

- אישור SQL ו־Production לפי §6, וקנרית חיה (`privacy-floor/canary.sql`) אחרי ההחלה.
- בדיקת הקצה החי של Supabase: אמינות cf-connecting-ip וקנרית לאחר החלה מאושרת עדיין פתוחות. PG17 ו־PostgREST מקומי עברו, ראו §9.
- הכותב הכפול ב־`track()` הוסר גם בבנייה הפנימית; `emit` הקיים נשמר. הוסרה גישת חמשת מתאמי המנהל הנטושים ו־`getNextActions` לנתונים הישנים; REST INSERT נחסם בהצעת RLS. אין הסקת אפס פעילות מההיסטוריה.
- `recent_number_opens`, `top_collective` (`getTopCollective`): אין להם קורא בלקוח. מועמדים לסגירה בסבב הבא.
- `fn_metatron_status()` נסגר ללקוחות בהצעת privacy-floor; `admin_command_center` ממשיך לקרוא כ־postgres דרך חוזה המנהל הקיים. נדרש אישור החלה.
- כמה מתוך 53 הצפיות של `/number/:value` היו `/2029/number/N` (שתוקן) וכמה מקטע בעברית (שנשאר תווית בכוונה): **UNKNOWN**.
- רישום תוספת החוק ב־`nodes` הפעילים (לא ב־view ההיסטורי `rules_active`) (§4).


## 9. אימות ברירת המחדל והשלמת Codex — 20.11.2026, 21:36–22:00 שעון ישראל

**תשובה: לא ניתן לאשר 100%.** קוד ה־Production ונתיב הבנייה הם 2029; אין חזרה אוטומטית למוצר Legacy. אבל במסד החי עדיין קיימים קוראי ביקוש ו־API ישנים. התיקונים כאן הם **BRANCH ONLY**, לא מצב חי. הדומיין `www.sod1820.co.il` אומת מול Vercel כמפנה ל־`dpl_2ngd15963rnFP1fGqtvxoGL3Pona` / `7e7cc4b`. בדפדפן מסביבת הבדיקה כל 12 הנתיבים ב־390/1440 החזירו `403 Access denied`; זו בדיקה חסומה, לא PASS של המסכים, ולא הוכחה שהאתר חסום לגולשים רגילים. אין שינוי WAF כדי לעבור בדיקה.

תיקוני Claude עד `290556be6` שולבו כ־fast-forward, כולל `8ae33b534`, תיקוני הבעלים המאוחרים ו־main. תיקון הביקורת `613d55403` משולב כ־merge נוסף השומר את היסטוריית הענף. אין cherry-pick מאבד היסטוריה ואין PR נוסף. ראיות מצב מסד/Edge/cron/חוזים: [`runtime-audit.json`](runtime-audit.json). סריקת Edge כללה **94 חבילות קוד פרוסות**, לא רק עותקי ריפו; אין בהן הפניות ישירות לשלוש טבלאות המדידה הישנות. שימושים דרך SQL נבדקו בנפרד. אין טריגר אפליקטיבי על מקורות המדידה שנבדקו ואין cron פעיל שמזכיר אותם ישירות. קרון השימור הקיים קורא היסטוריה בעקיפין; לא שונה.

| רכיב | פעיל ב־Production / BEFORE | בעלים ומקור האמת | AFTER בחבילה | קבלה שנותרה |
|---|---|---|---|---|
| כניסה, routes, fallback | 2029 entry/build/router; Legacy runtime כבר הוסר | App2029 / public-reading-deploy | נשמר; לא חזר ניקוי ישן | דפדפן Production מסביבה מורשית, 403 בבדיקה זו |
| רזיאל — ביקוש | `fn_raziel_research_intel_scoped` → קורא `visitor_events/search_log` | Traffic Intelligence v11 / events | Claude העביר ל־TI מסווג, scoped ABI נשמר | SQL מאושר + קנרית |
| `tracking.js` | הציבור כבר משתמש ב־events; הבנייה הפנימית dual-write | emit / ingest_event | הוסר רק INSERT ל־visitor_events; נשמרו gate, debounce ו־emit; RLS מונע חזרת לקוח ישן | החלת SQL ופריסת לקוח |
| מתאמי מנהל/המשך | חמישה exports ב־visits ו־getNextActions ללא caller | Control / Workspace קיימים | הוסרו המתאמים הנטושים, לא רכיבי הניהול הפעילים | CI + סקירת diff |
| APIs ישנים נוספים | callable, אבל ללא צרכן runtime בלקוח/Edge/cron/SQL | Control / TI הקיימים | 10 APIs (arrival, AI, ambassadors, journey shares, research usage, audience, viral, community share, ELS) נסגרים ללקוחות ב־privacy-floor; ACL rollback מדויק | אישור SQL |
| `discover_anchor_families.n_traces` | API מחזיר ספירת journey_trace היסטורית | בעל הקורפוס; ביקוש רק TI | הוסר חישוב מ־visitor_events; ABI מחזיר NULL במקום מדד חי מדומה; תוצאות הקורפוס נשמרו | קנרית גוף SQL מול מסד מלא |
| `fn_metatron_status` | wrapper ציבורי סביב gaps | admin_command_center | סגירה לציבור משמרת קריאת postgres של המנהל | SQL מאושר |
| `search_log/gematria_wall` | REST ו־RPC ישנים עדיין חיים | היסטוריה בלבד; events למדידה | חסימות ו־privacy floor של Claude; אין מחיקת טבלאות | SQL לפני פריסת UI |
| `recent_number_opens`, cache והצעות | קוראים היסטוריים ו־SECURITY DEFINER | אותו פרדיקט זכאות + מעטפת public אחת | אין טקסט פרטי, בדיקה מחדש אחרי cache ו־blocklist | קנרית live לכל 21 הקוראים |
| מונה כניסות | תצוגת החבילה ספרה arrival גם ל־unknown | fn_ti_clean_classification | רק sessions עם page view שסווג human; שאר המחלקות נשמרות בפילוח | קבלה מול חלון חי |
| מסעות | טרם הושק; אין לפתוח פיצ'ר | בעל ההשקה + events/journey_2029 | `0 · טרם הושק` גם בלי דוח; לאחר השקה starts בלבד, UNKNOWN בכשל או בלי חיישן; resume/step/היסטוריה לא start | קנרית רק כאשר הבעלים יפתח את המוצר |
| דוחות/שימור היסטוריים | export_my_data, erasure, retention, admin_infra_load, ניסויי sidebar | בעל פרטיות/תפעול/ניסוי | נשמרו; אינם מקור מספרים חיים ב־Control. share_events מוגבל postgres/service_role | אין מחיקה או שינוי מדיניות שימור בחבילה |
| `fn_metatron_journey_seeds` | server-only, ללא caller אוטומטי שנמצא; גוף ישן עוד קיים | מטטרון, מוצר מסעות סגור | נשמר רדום; אין הפעלת המלצות ישנות | אם יופעל בעתיד, נדרש מעבר TI לפני הפעלה |
| Master וחוזים | TI v11, Methods v6, UI v13, Research Intake v14 מאומתים | nodes.is_active=true + Master | לא נוצר בעלים/מסמך חי שני | `project_codex.gematria_engine` עדיין מצטט v5; חמישה compaction pointers עדיין V1. תיקון רשומות חי דורש אישור; אין להחיל חוק דרך rules_active |

**גבולות ההוכחה:** ספירת browser אינה אדם. אפס אירועים אינו הוכחת חיישן תקין. אין חישוב מחדש של היסטוריה. קורא היסטורי מורשה אינו מוצר Legacy. לא הוסרו Supabase/Auth/הרשאות משותפות, קוד המנוע או CommunityCalculatorPage לפי שמם. כיסוי ערוצים מחוץ ל־Vercel/Supabase שאינם חשופים לכלים אינו מאומת.

בדיקות Codex נוספות: PostgreSQL **17.11** מחולק — 11 שערי apply/rollback; PostgREST **16.6** — anon/JWT/admin, זיוף זהות, היעדר IP, REST היסטורי ו־16 שליחות מקבילות (שורה אחת); privacy-floor — **7** שערי byte parity/ACL/rollback/drift. גוף 21 קוראי הקורפוס עדיין דורש קנרית מול מסד מלא: בדיקת wrapper אינה הוכחת תוצאותיהם. PGlite **35 + 18**. רכיבים בנייד ובמחשב והמסעות בכל ארבעת המצבים עברו; artifact + visit-once + Post חדש **7/7**. ה־CI ופריוויו המדויקים מופיעים בתיאור PR #1461 לאחר העלאת ראש החבילה.

הודעת פערי הגרסאות שהובאה בשיחה מתארת ביקורת ניתוב חוזים, לא תוצאה של איחוד הסטטיסטיקה. שני פערי Master אכן סגורים כעת; הפניית v5 ושאריות compaction עדיין קיימות במסד. אין ראיה שמאפשרת לייחס את ההודעה לסשן מסוים אחר.

בנייה סופית באותו lockfile ובאותה סביבה מול main `7e7cc4b`: eager 203158 מול 203104 (**+54B**), frame 47176 מול 47120 (**+56B**), CSS 34329 בשניהם. שערי הבנייה עוברים ללא שינוי ספים. זה אינו אפס גידול; מצוין במפורש לקבלה. 63 בדיקות החוזים הנבחרות עברו.

תיקון קבלה נוסף: `/היכל` ממופה במפורש ל־`/heichal` במדידה, במקום להיספר כפוסט עברי. בדיקת DEF-005 המעודכנת מוכיחה אפס כותבים ל־add_wall_word ואת ה־ABI ללא כתיבה, בלי לשנות את חבילת הרשאות DEF-005 ההיסטורית.

ה־merge המתואם כולל את תיקון DEF-005 האחרון של Claude ואת תיקון ציפיית הבדיקה הישנה ל־`/היכל`; 21 בדיקות הקבלה הישירות עברו לאחר השילוב. הבדיקה עדיין מגינה על כתובות פוסטים בעברית ועל הסתרת קלט פרטי.

### תזמון בדיקת ELS בנייד

על `8c12817` עברו יתר שערי CI, אך shard 3 נכשל פעמיים באותה קריאת מיקום מיד לאחר resize ל־320×568. מסך ELS והבדיקה היו זהים ל־main. התרחיש עבר מקומית גם עם Playwright 1.64.1 וה־Chromium המצורף; לכן אין טענה שהכשל הראשוני נעלם ללא תיקון. הבדיקה ממתינה כעת לאירוע resize ושני פריימי layout לפני מדידת גבולות. כל בדיקות הגאומטריה, הסתרה, clipboard, זהות המטריצה ונגישות נשארו; אין scroll כפוי מצד הבדיקה ואין שינוי בקוד המוצר. תוצאת CI הסופית קשורה ל־SHA בתיאור ה־PR.
