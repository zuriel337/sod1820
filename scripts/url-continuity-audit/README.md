# url-continuity-audit — כלי הבדיקה של רציפות הכתובות (15.11.2026)

הכלים שהפיקו את `docs/reviews/url-continuity-seo-20261115/`. **אינם חלק מה־build, מה־CI או מ־Production**; הם נשמרים כדי שהמדידה תהיה ניתנת לשחזור.

- `crawl.py` — בקשת GET אחת לכל חוליה, בלי מעקב אוטומטי; UA מזוהה, קצב מוגבל, ו־`--adaptive`: תגובת הגנה של הפלטפורמה (`403`, `x-vercel-mitigated`) מסמנת את השורה "לא נבדקה", מקררת ומאטה — **לא מנסים לעקוף**.
- `build_unified.py`, `build_todo2.py`, `build_recip_todo.py`, `build_nav_todo.py`, `build_browser_sample*.py` — בניית הרשימה המאוחדת והמדגמים.
- `classify.py` — סיווג לפי ראיה בלבד (OK / OK_REDIRECT / TEMP_CLOSED / INTENTIONAL / UNDECIDABLE / BROKEN / UNCHECKED); לא נוצר יעד חלופי.
- `merge_crawls.py`, `family_table.py`, `make_tables.py`, `package_evidence.py`, `render_readme.py`, `journal_after.py` — עיבוד לא מקוון של התוצאות (ללא רשת).
- `pw_browser.cjs` — Chromium אמיתי (Playwright), analytics חסום, מצב ה־DOM אחרי הידרציה; `LIGHT=1` חוסם תמונות/גופנים/מדיה.
- `post-alias-check.mjs` — בדיקה מקומית (בלי רשת) של ה־canonical ש־`api/og.js` מצהיר עליו, מול עץ עבודה נתון.

**הרצה מול האתר החי:** רק בקצב נמוך (≈1 בקשה/שנייה), לא במקביל לדפדפן ולא עם `curl` ידני, ורק לאחר קריאת סעיף 11 של ה־README של הבדיקה (חסימת פלטפורמה). הנתונים (`data/`) אינם נשמרים כאן; הראיות המדודות ב־`evidence/`.
