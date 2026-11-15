#!/usr/bin/env python3
"""Builds the Hebrew bodies of the pull requests of the speed package from the generated tables (no hand transcription of numbers).
usage: pr_bodies.py <tables dir> <out dir> [budgets.json]
Placeholders written as @NAME@ come from the tables or from the budgets file; anything left unresolved is reported."""
import json, os, re, subprocess, sys
T, OUT = sys.argv[1], sys.argv[2]
BUD = json.load(open(sys.argv[3])) if len(sys.argv) > 3 and os.path.exists(sys.argv[3]) else {}
HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)
def prt(table, arm, *metrics):
    return subprocess.run(['python3', '-I', os.path.join(HERE, 'pr_tables.py'), T, table, arm, *metrics], capture_output=True, text=True, check=True).stdout.strip()
def server_table():
    p = os.path.join(T, 'server_he.md')
    return open(p, encoding='utf8').read().strip() if os.path.exists(p) else '(טבלת השרת תתווסף אחרי הסדרה הסופית)'
FOOT = '\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nhttps://claude.ai/code/session_01H7739NUDKHMTUARRWG8Kkw\n'
def bud(key, default='ראו מסמך הראיות'): return str(BUD.get(key, default))

bodies = {}

bodies['A_1360'] = f"""## חבילה A — קריאות מסמך הפוסט בשרת (ענף בלבד; לא ממוזג, לא נפרס)

חלק מבקשת שחרור מרוכזת אחת למהירות דפי הפוסט בנייד (`POST_MOBILE_SPEED_PACKAGE_20261115`; מסמך הראיות והבקשה: ענף `claude/perf-post-speed-evidence-20261115`). בסיס: `origin/main` `c2acc064b`; ראש: `1782b9f78`.

### הבעיה (נמדדה)
פוסט ותיק מוגש בכתובת המקורית `/<slug>` — 568 מתוך 968 טעינות פוסט ב־14 הימים האחרונים בנתוני השדה, והאיטיות שבהן (TTFB p50 1,265 ms / p75 2,371 ms מול 927 / 1,857 ב־`/post/<slug>`).
`api/og.js` ביקש את ה־slug המפוענח, המתין לתשובה ריקה (סבב מלא iad1→Tokyo), ורק אז ביקש את הצורה המקודדת באותיות קטנות שבה כל פוסט מיובא מ־WordPress נשמר (790 מתוך 1,323 רשומות). כלומר שתי קריאות עוקבות היכן שאחת מספיקה.

### השינוי (`api/og.js`, `resolvePostMetadata`)
שני הכתיבים של אותה כתובת הם חלופות, לא שלבים תלויים: הם נשאלים **בבקשה אחת** — `slug=in.(a,b)`, `limit=2` — ובחירת השורה שומרת על העדיפות הקודמת (הכתיב הראשון מנצח כששניהם קיימים, בכל סדר שהמסד מחזיר). אם הבקשה נכשלת, ההתנהגות הקודמת נשמרת במדויק: בקשה לכל כתיב, בזו אחר זו, עם הטיפול בכשל של כל אחת — כך ש־503/404 לא משתנים. כתובת עם כתיב יחיד (ASCII) וכתובת `?p=` נשארות בבקשה בודדת. כתיב שמכיל תו רשימה של PostgREST (`, ( ) " \\`) מצוטט.
**ביקורת בלתי־תלויה** על גרסה קודמת (שתי בקשות מקבילות; היא בהיסטוריית הענף) העלתה שהיא עלולה להיות איטית מהרצף כשבמאגר החיבורים יש שקע אחד פנוי בלבד (חיבור TCP+TLS שני ל־Tokyo ≈ שלושה סבבים), ושהבקשה השנייה מבוזבזת לפוסטים שנשמרו בכתיב המפוענח. הבקשה היחידה אינה תלויה במצב המאגר, ולכן הוחלפה.

### הוכחה — שרת, רשת אמיתית (סנדבוקס → Supabase Tokyo), 8 ריצות לכל זרוע, שלובות, תהליך קר וחם
זמן ה־handler של `api/og.js` (median [min–max] ms) על הקוד הסופי (`1782b9f78`) מול `main`, מכונה פנויה:

@SERVER@

(מדידת שרת בלבד, מהסנדבוקס; **לא** נטען שיפור TTFB לגולשים, ולא ניתן לראות אותו בטבלאות המעבדה של דף הפוסט, שבהן זמן המסמך קבוע בכוונה. אימות בשטח רק אחרי שחרור מאושר.)

### בדיקות
- `test/post-document-slug-variants-20261115.test.mjs` (חדש, 8 מקרים): בקשה אחת ששמה את שני הכתיבים (`limit=2`), העדפת הכתיב הראשון בכל סדר תשובה, קבלת שורה לפי המסנן בלבד (כמו קודם), אין ניסיונות חוזרים על תשובה ריקה, נפילה להתנהגות הקודמת בכשל (בקשה לכל כתיב, ברצף, 200/503/404), כתיב יחיד = `eq` אחד, `?p=` = קריאה אחת, ציטוט תווי רשימה. **מקרה "בקשה אחת" נכשל על הבסיס**; השאר נועלים התנהגות. אין טענת זמן-קיר (flaky).
- 190/190 בבדיקות הקיימות הרלוונטיות (SEO, canonical, sitemap, מועמד ציבורי, artifact) + `test-2029-server-seo-ai-parity` + `test-route-legitimacy-2029`. מוק אחד קיים (`public-wp-post-canonical-20261115`) למד את צורת הבקשה היחידה.
- חיווט ל־`live-contracts-2029.yml` בצעד נפרד, בעוגן ייחודי. CI על הראש: @CI@.
- חפיפה: PR #1358 (אב־טיפוס חוויית פוסט) עורך את `api/og.js` באזור אחר (מטא של יחידת תצוגה, אחרי לולאת הכתיבים); מיזוג ניסיוני נקי.

### סיכון ו־rollback
קבצים: `api/og.js` (+ בדיקות + צעד CI). בלי SQL, flag, secret או הגדרת פרויקט. rollback: alias לפריסה הקודמת (`dpl_J2wg6mqptCp8vFkfDbxz31dtHzoH` בעת כתיבת הבקשה; נקרא מחדש לפני הפעולה) או revert. פריסת מסמך בלבד.

### מה לא כלול (דורש החלטת ZURIEL)
בדיקת הקיום ב־middleware (≈130–230 ms לפני כל מסמך פוסט; ענף ישן F5), מטמון CDN למסמך, אזור הפונקציה מול Tokyo — ראו סעיף ההחלטות במסמך הראיות.{FOOT}"""

bodies['B_1361'] = f"""## חבילה B — קריאת מקור מוקדמת לפוסט בכתובת המקורית `/<slug>` (ענף בלבד; לא ממוזג, לא נפרס)

חלק מבקשת שחרור מרוכזת אחת (`POST_MOBILE_SPEED_PACKAGE_20261115`; מסמך הראיות: ענף `claude/perf-post-speed-evidence-20261115`). בסיס: `origin/main` `c2acc064b`; ראש: `0dea8b199`.

### הבעיה (נמדדה)
`/post/<slug>` מתחיל את קריאת המקור יחד עם הורדת קוד הדף (#1262, `PostEntry2029`). הכתובת המקורית `/<slug>` — האוכלוסייה הגדולה והאיטית (568/968 טעינות פוסט בנתוני השדה; LCP p75 6,269 ms) — לא: הקריאה מתחילה רק אחרי שכל גרף הדף (57 chunks, כ־330 KB gzip) ירד והורכב, כלומר קריאה שלמה *אחרי* הקוד. במעבדה (Slow 4G + 4× CPU) קריאת הנתונים של פוסט ותיק מסתיימת ב־7.3 s מול 3.5 s בפוסט חדש.

### השינוי
רכיב כניסה חדש `PublicPostAddressEntry2029` למסלול `/:slug` (`src/App2029.jsx`; `PostEntry2029` **לא נגע, בייט־לבייט**, כי בדיקות קיימות נועלות את הטקסט שלו): אותה קריאה route-owned (`beginPostReadingSource`), אותו ביטול בשינוי כתובת/זהות, בלי cache משותף; בקשת קוד הדף יוצאת כבר ברינדור הראשון ואינה ממתינה להכרעת החשבון; `PublicPostAddress2029Page` מקבל `sourceReader` ומעביר אותו לדף הקיים. כתובת `?p=` ללא שינוי. בבניות ללא השחרור הציבורי (גם תצוגה מקדימה מוגנת רושמת את המסלול) נשאר הדף הרגיל — בדיקת יחידה מריצה את הפונקציה האמיתית מול תחליפי hooks.
**מגבלה (RG10, גם ב־`/post/<slug>` היום):** מבקר שחשבונו עוד נקבע ממתין לכך לפני הקריאה; נמדדו אורחים בלבד.
גודל: ה־entry @B_ENTRY@; תקציבי first-load ו־built-graph עוברים ללא שינוי.

### הוכחת מעבדה — Slow 4G + 4× CPU, קר, זמן עד שהטקסט גלוי (median ms; בסיס n=10, B n=5)
הפוסטים החדשים הם בקרה: החבילה אינה נוגעת ב־`/post/<slug>`.

@B_TABLE@

בסבבים שלובים מוקדמים יותר (n=10 לזרוע, בניות לפני תיקוני הביקורת): O1 −392 ms (p=0.005), O3 −244 ms (p=0.034), בקרות N3 +46 ו־N5 +212 (לא מובהק): גודל התועלת משתנה בין סדרות (−244 עד −392), כיוונה לא. FCP וזמן חסימה ללא שינוי. מעבדה בלבד; **לא** הוכחה לשיפור אצל גולשים.

### בדיקות
- `test/post-root-address-early-read-20261115.browser.mjs` (חדש; דפדפן אמיתי, ה־artifact הבנוי וה־worker האמיתי; 390 ו־1280 px): הקריאה מתחילה לפני שהורדת קוד הדף הסתיימה, וקריאה אחת בלבד של אותו פוסט. **נכשל על הבסיס** (הקריאה מתחילה 2.2 s אחרי סוף הקוד תחת השהיה של 350 ms לבקשה).
- `test/post-root-address-entry-20261115.test.mjs` (חדש, 6 מקרים; מריץ את הפונקציה האמיתית): בלי שחרור ציבורי → הדף הרגיל (נכשל על הקוד שלפני הביקורת), קריאה אחת לכל כתובת וזהות, ביטול.
- קיימות ועוברות: `post2029-living-tree-infra` (נעילת הטקסט של `PostEntry2029`), `public-source-invitation-2029`, `post-reading-source-request-2029`; על עץ האינטגרציה גם `post-speed-page-analytics`, `ga-measurement-browser`, `marketing-browser`, `measurement-visit-once`.
- חיווט ל־`live-contracts-2029.yml` בשני צעדים נפרדים, בעוגנים ייחודיים. CI על הראש: @CI@.

### סיכון ו־rollback
קבצים: `src/App2029.jsx` (רכיב חדש + אלמנט המסלול `/:slug`), `src/pages/PublicPostAddress2029Page.jsx` (prop אחד). חפיפה עם #1357 של Codex: אין (הוא נוגע ב־`RouteEffects2029`). rollback: alias לפריסה הקודמת או revert. בלי SQL/flag/secret.{FOOT}"""

bodies['C_1363'] = f"""## חבילה C — קוד צד שלישי בדף פוסט אחרי שהמאמר (והכריכה) גלויים (ענף בלבד; לא ממוזג, לא נפרס)

חלק מבקשת שחרור מרוכזת אחת (`POST_MOBILE_SPEED_PACKAGE_20261115`; מסמך הראיות: ענף `claude/perf-post-speed-evidence-20261115`). בסיס: `origin/main` `c2acc064b`; ראש: `2557c661e`.
**ההיסטוריה של הענף כוללת:** C1 (`fc77bd2c3`), שינוי ספריית המודעות C2 (`5911f8e9c`), תיקון סיווג (`eab8b8106`), **revert של C2** (`edd25bf66`), ו־C3 (`2557c661e`). התוכן נטו של ה־PR: **C1 + תיקון הסיווג + C3**. C2 הועבר ל־#1364 האופציונלי (החלטת הכנסות; אין לו הצדקת מהירות).

### הבעיה (נמדדה, מעבדה: Slow 4G + 4× CPU)
בדף פוסט תג גוגל ו־Pixel מתוזמנים ברגע שה־main thread פנוי — בפועל בזמן שגרף הדף (1.1 MB גולמי / 330 KB gzip) עוד יורד — ומתחרים עליו על אותו חיבור ועל ה־main thread:
- כשכולם חסומים התוכן גלוי **0.54–0.90 s מוקדם יותר** (נמדד בסדרה שאינה שלובה; ±0.25 s) ו־TBT נמוך ב־200–560 ms. תג גוגל לבדו +0.27–0.41 s, Pixel +0.16–0.24 s.
- זמן main thread של שלושת הצדדים השלישיים: 0.28–0.30 s תג גוגל, 0.10–0.32 s ספריית מודעות, עד 0.13 s Pixel — מול 0.37–0.39 s ל־entry עצמו.

### השינוי
- **C1** (`src/App2029.jsx`): `PostAddressMarker2029` מסמן את `<html>` ב־`data-post-address` כל עוד נפתחת כתובת פוסט (`/post/<slug>` או כתובת מקורית `/<slug>`, בסיווג ה־boundary הציבורי עצמו, כולל `isAdmin`/`search`), ב־layout effect — באותו commit, לפני ה־passive effect של `RouteEffects2029`. ה־effect הציבורי ממתין (כמו שהבית כבר ממתין ל־`data-home-primary`) לאלמנט שרק `Post2029Page` מציג אחרי שהמקור נקרא ואושר: `article[data-experience-surface="post-reading"]`; חסם עליון 10 שניות לשגיאה/כתובת שאינה פוסט. **אין שינוי בקוד מדידה** (`analytics.js`, `marketing.js`, `transport.js`, `visits.js`, אירועים ודוחות לא נגעו).
- **C3** (אותו effect, קומיט נפרד, ניתן להסרה לבדו): ממתין גם לתמונת הכריכה — התמונה בעלת `fetchpriority="high"` של הדף עצמו בתוך אלמנט הקריאה — רק כל עוד היא עדיין נטענת, פעם אחת, ועד 4 שניות. כריכה שנכשלה/לא עונה לא מעכבת מעבר לחסם; פוסט בלי כריכה לא ממתין.

### הוכחת מעבדה (כל הסדרות שלובות מול `main` טרי; מעבדה בלבד)
**העץ המוצע (A+B+D+C1+C3).** שורות הפוסטים החדשים N3/N5 מבודדות את חבילה C, כי A, B ו־D אינן פועלות על `/post/<slug>` בטעינה קרה.

Slow 4G + 4× CPU, קר (n=5 לזרוע): @FIN_COLD@

Regular 4G + 4× CPU, קר (n=6 לזרוע): @FIN_FAST@

Slow 4G, חלון 14 s (LCP לא מצונזר; n=4 לזרוע): @FIN_LCP@

**C3 עצמו, על גבי C1+C2** (Regular 4G, n=6, שלוב): LCP N5 −402 ms (p=0.002), O1 −170 (p=0.037), O3 −20, **N3 +148 (p=0.041)**; Slow 4G LCP לא מצונזר (n=3): N5 −2.8 s, O1 −0.9 s, O3 −0.9 s, N3 ללא שינוי. **המחיר:** זמן החסימה בחלון אחרי הטקסט גבוה יותר עם C3 ב־N3 (+214 ms, p=0.026) וב־O1 (+152 ms, p=0.093); התגים מתחילים 0.1–0.5 s אחרי הטקסט במקום 0.06–0.21 s. LCP הוא המדד שאוסף השדה של האתר רושם, ולכן C3 בסט המומלץ — אך הוא קומיט נפרד.

### מה זה משנה בנתוני המדידה — דורש אישור Codex/ZURIEL (`traffic_intelligence`)
1. ביקורים שנגמרים **לפני** שהמאמר (ובטעינה איטית — גם הכריכה) מוצג לא יירשמו עוד ב־GA4/Pixel/CAPI. לפני כן התג נטען מוקדם, ואירוע ה־page_view המתין ממילא ל־SEO של הפוסט (או נפל אחרי 5 שניות לזהות גנרית `SOD1820`) — כלומר ביקורים כאלה נרשמו רק אם נשארו ≥5 שניות. ביקור ראשוני (`site_visits`) ו־engagement נרשמים כמקודם אחרי 150 ms, ולכן ספירות GA/Meta וספירות first-party יתרחקו מעט בטעינות נטושות.
2. כתובת שאינה פוסט (שגיאה/404) — GA/Pixel מתחילים אחרי עד 10 שניות + idle.
3. **שיפור לוואי:** בטעינות איטיות לא תישלח עוד זהות גנרית לפני הזהות האמיתית.
4. קיים ב־main ולא נגע: ב־`/?p=<id>` הבית ממתין ללא תקרה ל־`data-home-primary` שפוסט לא מציג — התג/Pixel לא מתחילים שם כלל.

### בדיקות
- `test/post-third-party-after-article-20261115.browser.mjs` (דפדפן אמיתי + worker אמיתי; 8 מקרים: התג אחרי המאמר ב־390 וב־1280 px, כתובת מקורית, כתובת ללא פוסט, עמוד שאינו פוסט, **התג ממתין לכריכה איטית ואז מתחיל, כריכה תקועה מעכבת לכל היותר את החסם, כריכה שנכשלה לא מעכבת**). שבעה מתוך שמונה נכשלים על `main` (כולם פרט לנעילת "עמוד שאינו פוסט"); מקרים 6–7 נכשלים גם על העץ בלי C3. על העץ המוצע עוברים כולם, יחד עם הבדיקה של חבילה B (10/10).
- קיימות ועוברות (23/23 יחד עם #1357 לאחר פתרון הקונפליקט): `public-reading-observability`, `measurement-page-view-once-2029`, `measurement-package-scope`, `adsense-gating-2029`; על עץ האינטגרציה: `post-speed-page-analytics`, `ga-measurement-browser`, `marketing-browser`, `measurement-visit-once`.
- תקציבי גרף ראשוני עוברים; ה־entry @C_ENTRY@. CI על הראש: @CI@.

### חפיפה עם #1357 (Codex) — שורה אחת
שניהם נוגעים ב־`RouteEffects2029` ב־`src/App2029.jsx`; הקונפליקט הוא בשורת ה־cleanup בלבד (נבדק: מיזוג ניסיוני). פתרון: `return () => {{ stopped = true; stopPageview?.(); observer?.disconnect(); clearTimeout(timer); clearTimeout(capTimer); if (idle != null) window.cancelIdleCallback?.(idle); }};` (C מוסיף `capTimer`, #1357 מסיר `settle`). עם הפתרון 23/23 בבדיקות היחידה הרלוונטיות.

### rollback
alias לפריסה הקודמת או revert (C3 נפרד מ־C1). בלי SQL/flag/secret.{FOOT}"""

bodies['D_1362'] = f"""## חבילה D — כללי מטמון לקבצים סטטיים בקונפיג שמופץ בפועל (ענף בלבד; לא ממוזג, לא נפרס)

חלק מבקשת שחרור מרוכזת אחת (`POST_MOBILE_SPEED_PACKAGE_20261115`; מסמך הראיות: ענף `claude/perf-post-speed-evidence-20261115`). בסיס: `origin/main` `c2acc064b`; ראש: `15f14f2d7`.

### הבעיה
פרודקשן נבנה מ־`public-reading-deploy/vercel.json`, אבל כללי המטמון של 12 רקעי הפוסט ה"גרסתיים" (שם הקובץ כולל hash) קיימים רק ב־`vercel.json` שבשורש — שאינו מופץ — והבדיקה ששומרת עליהם (`test/post-backgrounds-2029.test.mjs`) קוראת את קובץ השורש, ולכן נשארת ירוקה. התוצאה (נמדדה חי ב־7.11 ב־`PERFORMANCE-RECOMMENDATIONS-20261107.md` §6.1 והייתה ההמלצה הראשונה, XS, שלא יושמה): ארבעת הגופנים שכל מסמך עושה להם preload (כ־73 KB), תמונות המותג ורקע הפוסט מוגשים `no-store` ונטענים מחדש בכל ביקור. בלייב הנוכחי ההשפעה היא על כל ביקור חוזר.

### השינוי
14 כללים ב־`public-reading-deploy/vercel.json`, אחרי ה־`/(.*)` (כך שהם גוברים): 12 הרקעים — `public, max-age=31536000, immutable` (שמותיהם נושאים את 12 הספרות הראשונות של ה־SHA-256 של הקובץ עצמו, והבדיקה מוודאת זאת); ארבעת הגופנים — `public, max-age=604800, stale-while-revalidate=86400`; ששת קבצי המותג — `public, max-age=86400, stale-while-revalidate=604800`. הכללים **שמות קבצים קיימים** ולא תבנית תיקייה, כך שנתיב חסר באותן תיקיות לא מקבל מטמון; מסמכים, ה־worker וכל כתובת אחרת נשארים `no-store`. **hash התצורה (`deploymentConfigSha256`) ישתנה — צפוי.**

### הוכחה — מבקר חוזר (המעבדה מפעילה מחדש את הדפדפן על אותו פרופיל בין שני הביקורים; Slow 4G + 4× CPU; n=5)
מנגנון (בדיקת `tools/warm_probe.mjs`, פוסט N3, ביקור שני): ב־`main` 65 הסקריפטים ו־12 גיליונות הסגנון מוגשים ממטמון ה־HTTP (כלל `/assets/` כבר immutable), אבל ארבעת הגופנים (73.9 KB), סימן המותג (16.2 KB) ורקע הפוסט (30.1 KB) — שש בקשות, 120 KB — יורדים מחדש בכל ביקור; עם D כולם מוגשים מהמטמון (0 בייט).

@D_TABLE@

קריאה: **80–109 KB פחות מועברים לפני שהטקסט מופיע** (p=0.008 בכל פוסט) והצבע הראשון (FCP) **44–140 ms מוקדם יותר** (p=0.008 בשלושה פוסטים; p=0.087 ב־O3). זמן הופעת הטקסט עצמו **אינו משתפר** מ־D לבדו (−257 עד +138 ms, p≥0.095): הטקסט ממתין לסקריפטים, לקריאת הנתונים ולפריסה — לא לגופנים. (שורות ה־LCP בטבלה אינן ניתנות לפירוש: המצב הדו־מודלי של מועמד ה־LCP בביקור חוזר.)
**הערת כלי מדידה:** סדרת ה"חם" הראשונה (ביקור שני באותו תהליך דפדפן) רצה ללא מטמון HTTP פעיל, כי דפדפן המעבדה הופעל עם `--ignore-certificate-errors` ו־Chromium אינו שומר במטמון תשובות של חיבור עם שגיאות תעודה; היא אינה מדד של D ומסומנת כך במסמך הראיות. התיקון (`--ignore-certificate-errors-spki-list`) מצוי ב־`tools/labserver2.mjs` ו־`tools/lab3.mjs`.

### בדיקות
- `test/public-static-asset-cache-20261115.test.mjs` (חדש, 6 מקרים) נועל את הקובץ **המופץ**: ה־catch-all עדיין `no-store` עם ה־CSP; 12 רקעים immutable אחרי ה־catch-all ושמם כולל את ה־hash של תוכנם וקיים ב־`public/`; גופנים/מותג בשמות מדויקים בתוקף מוגבל ולא immutable; נתיב חסר, מסמכים, ה־worker, `/api/og` ו־sitemap אינם מותאמים לאף כלל מטמון; `immutable` שמור לקבצים עם hash בלבד; ה־worker נשאר `no-store`. שני מקרים נכשלים על הבסיס.
- 64/64 (7 קבצים): הבדיקה החדשה + `public-reading-production-artifact`, `post-backgrounds-2029`, `public-launch-candidate-2029`, `public-reading-protected-review`, `public-reading-production-review`, `public-redirect-single-hop-20261115`. חיווט ל־`live-contracts-2029.yml` בצעד נפרד, בעוגן ייחודי. CI על הראש: @CI@.
- **אין בדיקה שמחילה את כותרות `vercel.json` על תשובה אמיתית**, וה־Preview המוגן דורש אישור ZURIEL; לכן אחרי הפריסה הראשונה חובה בדיקת כותרות חיה (בבקשת השחרור, סעיף אימות 2).

### סיכון ו־rollback
גופן/תמונת מותג שיוחלפו בשם זהה יישארו במטמון עד שבוע/יום (+SWR); הרקעים לא משתנים בלי שינוי שם. rollback: alias לפריסה הקודמת (או revert) — דפדפנים ששמרו נכסים מחזיקים אותם עד פקיעה, והם זהים בתוכן. בלי SQL/flag/secret; ללא שינוי בקוד.{FOOT}"""

bodies['DOCS'] = f"""## מסמך ראיות ובקשת שחרור מרוכזת — מהירות דפי פוסט בנייד (תיעוד וכלים בלבד; ללא שינוי קוד)

`POST_MOBILE_SPEED_PACKAGE_20261115` · בסיס `origin/main` `c2acc064b` · הייצור החי בעת הכתיבה: `dpl_J2wg6mqptCp8vFkfDbxz31dtHzoH` (אותו SHA) — **לא שונה** (אין merge, פריסה, alias, SQL, דגל או סוד).

### מה בפנים
`docs/reviews/post-speed-package-20261115/`:
- `README.md` — המסמך: תוצאה בטבלה אחת, שיטה ומידת האמון בה, נתוני שדה בנפרד מהמעבדה, ארכיאולוגיה של עבודות המהירות 14.10–15.11 (חי / נשחק / ענף בלבד / המלצה, ו־10 נסיגות), פירוק זמן הטעינה, בחירת צווארי הבקבוק, הוכחת כל חבילה מול הבסיס, **מה לא השתפר**, בקשת השחרור המרוכזת (סדר, תלות, rollback, אימות אחרי פריסה), המצב בסוף המשימה, מגבלות והחלטות פתוחות.
- `tools/` (המעבדה, שרת הניסוי, הניתוח, מדידות השרת), `tables/` + `data/runs.csv` (כל ריצה, ללא סינון), `data/` (דגימה, שדה, בסיס חי בשעון ישראל, תקציבים), `archaeology/` (שני דוחות הקריאה).

### החבילות (כל אחת PR טיוטה נפרד, על בסיס `c2acc064b`)
| סדר | PR | ראש | מה |
|---|---|---|---|
| 1 | #1360 A | `1782b9f78` | `api/og.js`: בקשה אחת לשני כתיבי הכתובת במקום שתי קריאות ברצף (מסמך פוסט ותיק) |
| 2 | #1362 D | `15f14f2d7` | `public-reading-deploy/vercel.json`: מטמון לגופנים, תמונות מותג ו־12 רקעי פוסט בקונפיג שמופץ בפועל |
| 3 | #1361 B | `0dea8b199` | קריאת מקור מוקדמת לפוסט בכתובת המקורית `/<slug>` |
| 4 | #1363 C | `2557c661e` | תג גוגל ו־Pixel מתחילים אחרי שהמאמר והכריכה גלויים |
| – | #1364 C2 | `3fd3634e1` | אופציונלי, **לא מבוקש**: ספריית המודעות כשהיחידה מתקרבת (אין הצדקת מהירות) |

מיזוג לפי הסדר הזה נותן בדיוק את העץ שנמדד: `2a10415e8bdcd8c6f1e7c258fd01e4ae4b1ef70f`.

### תוצאה בקצרה — מעבדה בלבד (Pixel 7 מדומה, Slow 4G + 4× CPU, שלוב מול `main` טרי)
זמן עד שהטקסט גלוי, העץ המוצע מול `main` (n=5 לזרוע):

@FIN_COLD_ONLY@

Regular 4G (n=6): תוכן −192 עד −519 ms, LCP −152 עד −512 ms; Slow 4G חלון 14 s (n=4): LCP −1.0 עד −2.8 s; ביקור חוזר: −88 עד −117 KB לפני הטקסט ו־FCP −60 עד −112 ms. FCP בטעינה קרה לא משתנה; זמן החסימה לא משתפר בעץ המוצע.
**אלה מספרי מעבדה, לא נתוני גולשים.** בשדה אין התקן, build או אלמנט LCP בשורות ה־RUM, ולכן אין מדד נייד; בדיקת השדה אחרי שחרור מאושר מוגדרת בסעיף 9.

### מה לא השתפר / מה נפסל (מופיע במלואו בסעיף 8)
FCP; זמן חסימה; חבילה B על `/post/<slug>` (כמתוכנן); חבילה D לבדה על זמן הופעת הטקסט; ניווט פנימי; LCP של N3 עם C3 (+148 ms מול C1+C2); C2 (אין שיפור, יותר חסימה — הועבר ל־#1364); טעינת גרף הנתיב או תמונת ה־LCP מראש (נדחה); סדרת "החם" הראשונה (פגם בכלי: ללא מטמון HTTP) — הוחלפה.

### מה נדרש
אישור מפורש של ZURIEL לפי CLAUDE.md 0.4 למיזוג הקומיטים המדויקים ולפריסה אחת של ה־SHA הממוזג (מיזוג אינו פריסה); מיזוג ופריסה מרוכזים אצל Codex לאחר ביקורת. החלטות פתוחות: סעיף 11 במסמך. שינוי מדידה (C): אישור Codex/ZURIEL.

### אירוע שקיפות
ראו סעיף 11: כתיבות סינתטיות ל־`events` בשני חלונות (ביקורת הדפדפן של משימת הכתובות ב־15.11 01:00–04:00 UTC, וריצת עשן אחת של משימה זו ~13:55 UTC לפני שהמעבדה קיבלה רשימת RPC מותרת); לא תוקן ולא נמחק דבר; החלונות מוחרגים מטבלאות השדה.{FOOT}"""

# ---- fill
def fill(text):
    rep = {'@SERVER@': server_table(),
           '@FIN_COLD_ONLY@': prt('fin_cold', 'proposed tree', 'content') if os.path.exists(os.path.join(T, 'fin_cold.json')) else '(תתווסף)',
           '@B_TABLE@': prt('cold_final', 'B', 'content'),
           '@FIN_COLD@': '\n\n' + prt('fin_cold', 'proposed tree', 'content', 'tbt') if os.path.exists(os.path.join(T, 'fin_cold.json')) else '(תתווסף)',
           '@FIN_FAST@': '\n\n' + prt('fin_fast4g', 'proposed tree', 'content', 'lcp', 'tbt') if os.path.exists(os.path.join(T, 'fin_fast4g.json')) else '(תתווסף)',
           '@FIN_LCP@': '\n\n' + prt('fin_lcp', 'proposed tree', 'lcp', 'content') if os.path.exists(os.path.join(T, 'fin_lcp.json')) else '(תתווסף)',
           '@D_TABLE@': prt('returning', 'D (static headers)', 'kb_before_content', 'fcp', 'content'),
           '@B_ENTRY@': bud('B_ENTRY'), '@C_ENTRY@': bud('C_ENTRY'), '@CI@': bud('CI_PLACEHOLDER')}
    for k, v in rep.items(): text = text.replace(k, v)
    return text
for name, text in bodies.items():
    body = fill(text)
    if name == 'A_1360': body = body.replace('@CI@', bud('CI_A'))
    for key in ('B', 'C', 'D'):
        if name.startswith(key): body = body.replace('@CI@', bud('CI_' + key))
    left = sorted(set(re.findall(r'@[A-Z_0-9]+@', body)))
    open(os.path.join(OUT, name + '.md'), 'w', encoding='utf8').write(body)
    print(name, len(body), 'chars; unresolved:', left or 'none')
