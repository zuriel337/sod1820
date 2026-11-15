#!/usr/bin/env python3
# Builds the passive AFTER journal row (to ZURIEL, no dispatch) from the final measured numbers. Prints SQL (dollar-quoted); does not execute it.
# Inputs written at the end of the run from live reads: data/live-state.json {"main": sha, "alias": text}, data/pr-state.json (see render_readme.py).
import json, sys, collections
D = 'data/'
T = json.load(open(D + 'tables-final.json'))
cls = json.load(open(D + 'class-final.json'))
S = collections.Counter(o['class'] for o in cls)
M = len(cls) - S['UNCHECKED']
live = json.load(open(D + 'live-state.json'))
pr = json.load(open(D + 'pr-state.json'))
flags = collections.Counter(f for o in cls for f in (o['flags'] or '').split(';') if f)
def ci(num):
    p = pr[num]
    ok = p['checks_failed'] == 0 and p['checks_pending'] == 0
    return f"#{num} {p['head'][:9]} (CI {p['checks_success']}/{p['checks_total']}{'' if ok else ' — לא ירוק במלואו'})"
pr_line = '; '.join(ci(n) for n in ('1349', '1350', '1351', '1352', '1353'))
all_green = all(pr[n]['checks_failed'] == 0 and pr[n]['checks_pending'] == 0 for n in ('1349', '1350', '1351', '1352', '1353'))
text = f"""AFTER (CLAUDE → ZURIEL, passive; ללא dispatch). BEFORE: 3c24730f-f0f7-40fb-bc56-7ba268a36afa. לא בוצע merge/deploy/שינוי DB/דגל/alias ולא שוחזר תוכן.
בסיס: origin/main {live['main']}; פריסה חיה נקראה בסיום: {live['alias']}. תיקון לרישום קודם: בקריאה הראשונה במשימה נרשמה הפריסה הקודמת dpl_89Men… (9c4cad137); הפריסה החיה היא dpl_C5DBLrWYhELPFDDUaVRJs5W1T6Wj (מקור 4b9a8687e = #1344, 14.11 23:39–23:40 UTC); כל המדידות בוצעו מולה.
מדידה חיה (קריאה בלבד): {M:,} כתובות נמדדו מתוך {T['universe']:,} ברשימה המאוחדת (מפה חיה/מפת 3.11/מלאי 3.11/GSC/posts/redirect_map). 200: {S['OK'] + S['OK_REDIRECT']:,}; 503 סגור זמנית מתועד: {S['TEMP_CLOSED']:,}; נסגר בכוונה (ראיה): {S['INTENTIONAL']:,}; לא ניתן להכריע (אין זהות): {S['UNDECIDABLE']:,}; שבור (זהות ידועה): {S['BROKEN']:,}; לא נבדק (חסימת פלטפורמה 403 x-vercel-mitigated): {S['UNCHECKED']:,}.
ממצאים מוכחים ותיקונים בענפים (טיוטות PR; {'CI ירוק על כל הראשים' if all_green else 'CI לא ירוק במלואו — ראו הפירוט'}): {pr_line}. (1) PR #1349 — canonical/og:url של פוסטי WP בשורש עם לוכסן+אותיות קטנות שהקצה מפנה בחזרה: {flags['canonical_slash']:,} דפים נמדדו, 98.1% מקליקי GSC על הצורה ללא לוכסן; מתאם הכתובות מחזיר את הצורה המוגשת; (2) PR #1350 — המפה פרסמה /community/researcher/panzer (404) והשמיטה israel-panzer (code≠slug; DEF-013), ובקומיט שני הערת DEF-002 מתוקנת (הערה בלבד); (3) PR #1351 — קטגוריה/תגית עם רווח = כפיל אינדקסבילי (31 קליקים); canonical = צורת מקף; (4) PR #1352 — 496 מ־589 כללי הפניה עוברים שתי חוליות; יעד ישיר (DEF-020/ביקורת 11.11 ממצא 2); (5) PR #1353 — הכינוי המתועד /WORLD → /world עונה 404 כי רשימת ההיתר בקצה רגישה לאותיות.
תוצאי לוואי שנבדקו (ביקורת בלתי־תלויה + מדידה חיה): hrefs שמורים בצורה ישנה בארבעה אתרים בתחום הכותבים — 0 מושפעים בשרת (contributor_content 20 שורות/0 הצמדות; research_items 18,306 שורות/0 ישויות contributorHref; user_research 171 שורות/0); לא נערך, הצעת תיקון בבקשת הביצוע (החלטה 12). GA page_path של פוסטי WP מתפצל בתאריך הפריסה (אין צירוף בקוד). מדיניות W0 שורה 175 — אישור #1349 הוא ההחלטה המפורשת (החלטה 13).
החלטות פתוחות (לא חוסמות): /?p=<wp_id> (תכנון מתועד: זהות מסמך), 503 ארוך (DEF-018), כתובות ללא זהות, כינויי שורש, 308 של /2029/*, ניקוד/0358, /sitemap_index.xml, תווי bidi בסלאג, הפניית panzer, חיווט בדיקות ל־CI (workflow), מעקב לקוח ב־Posts2029Page.jsx, גישת Search Console (DEF-006), בדיקת אירועי Firewall.
בעיה שדווחה: הפלטפורמה החלה להחזיר 403 deny אחרי ~10.8K בקשות + בדיקת דפדפן במקביל; עצרתי, הוצאתי את השורות המזוהמות, הוספתי מגן adaptive ל־crawl.py, חידשתי בקצב נמוך; לא נעשה ניסיון עקיפה.
בקשת ביצוע אחת: docs/reviews/url-continuity-seo-20261115/EXECUTION_REQUEST.md (ענף claude/sod1820-system-audit-no9qne, PR #{pr['audit_pr']}). PRs: #1349, #1350, #1351, #1352, #1353."""
sql = f"""insert into public.work_log (session_date, topic, what_we_did, status, open_threads, task_key, from_actor, to_actor, assignment_mode, assignment_scope, primary_owner, release_authorization_state)
values ('2026-11-15', $t$AFTER — CLAUDE: רציפות כתובות ו־SEO של האתר הוותיק — מדידה, חמישה תיקונים בענפים, בקשת ביצוע אחת$t$, $w${text}$w$, 'AFTER_BRANCH_ONLY_AWAITING_ZURIEL_DECISION', $o$החלטות ל־ZURIEL: מיזוג חמשת ה־PRs והפריסה לפי EXECUTION_REQUEST.md; ההחלטות הפתוחות המפורטות בו. אין הפעלה של אף סוכן; Codex ממשיך במהירות פוסטים ומדידה.$o$, 'URL_CONTINUITY_SEO_LEGACY_SITE_20261115', 'CLAUDE', 'ZURIEL', 'READ_ONLY', $s$ענפים מבודדים מ־origin/main; כתובות, הפניות, sitemap ומטא־נתונים בצד השרת בלבד$s$, $p$publicPostUrls.js + api/sitemap.js + api/og.js + public-reading-deploy/vercel.json + route-legitimacy.js$p$, 'BRANCH_ONLY_NO_MERGE_NO_DEPLOY_NO_DB_NO_RESTORE')
returning id;"""
open(D + 'journal-after.sql', 'w', encoding='utf8').write(sql)
print(len(text), 'chars')
