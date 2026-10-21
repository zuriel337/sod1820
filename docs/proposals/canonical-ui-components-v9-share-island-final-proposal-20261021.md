# הצעה סופית לאישור נפרד: canonical_ui_components_law v9 · שיתוף קבוע באי

**מעמד:** `PROPOSED_ONLY`. לא נכתב ל־`rules_active`, לא שונה חוק, לא הופעל שיתוף קבוע, לא שונה מסד. הנוסח בסעיף א׳ הוא הנוסח המדויק שיירשם אם יאושר.
**שיטת הגרסה:** "שינוי חוק = גרסה חדשה, לא מוחקים". v9 נוספת בסוף שדה "תיאור" של `canonical_ui_components_law`; v8 נשאר במלואו כהיסטוריה.
**בעלים:** EXTEND_EXISTING `canonical_ui_components_law` · ShareActions/ShareBar + `shareObject`/`shareTelemetry` הקיימים. אין בעלים, רכיב, טבלה, URL, ערוץ או אירוע חדשים.
**בסיס עובדתי (נמדד):** ב־5107 הפריסה בטלפון היא 2|אורב|2 ב־320 (אפס שארית לשלישי) ומ־360 יש שארית של כ־12–14px לכפתור שלישי; הגיליון המשותף "כלים ופעולות" כבר קיים בענף `claude/shell-mobile-island-5107-20261021`.

## א. הנוסח לרישום (אם יאושר)

```
—— v9 (Human-Gate ZURIEL · <תאריך האישור>) — PERSISTENT SHARE IN THE COMMAND ISLAND ——
Owner: EXTEND_EXISTING canonical_ui_components_law, ShareActions/ShareBar + existing shareObject/shareTelemetry; no new owner, share system, table, URL, channel or event type.
1. v9 amends ONLY the sentence in v8 §1 "No duplicate persistent share button, no new bottom island action, and honor canonical share placement." It is replaced by: "One persistent canonical 'שתף' control MAY appear in the single SystemFrame2029 Command Island, in its action group beside Search and Tools, on an authorized public surface when the viewport is at least 360 CSS px wide. Below that width the same action is the first row of the island's single Tools-and-Actions sheet. At any viewport width it is reachable, never absent, and never rendered twice on the same surface at the same time (the sheet row is not rendered while the island control is visible). The island gains no other new action. Canonical share placement is honored." All other v8 text (§1 first sentence, §2–§7) is unchanged.
2. The control opens the existing ShareActions sheet over the exact current location, including the hash anchor when present, with an additional whole-page row when an anchor exists. "שתפו בקהילה" stays one option inside that sheet under v8 §2–§7 (authored words required, existing community composer). It is the same action as the one in the Action panel, not a second share system.
3. Only ShareActions, shareObject and shareTelemetry are used. share and share_story subtypes, attribution and source identity are preserved. No new channel, event type, query string, storage or URL.
4. Availability: through the canonical capability resolver (v4); no local live/enabled flag. Behind a dedicated Vite preview flag, default off. When there is nothing to share the control is disabled with an accessible explanation, not removed. Target size at least 44x44 CSS px, accessible name "שתף", visible focus.
5. First scope: the Elections post 5107 preview shell only (data-shell-review="elections631"). Every other surface, the ELS tool dock, Heichal, Number, Legacy and Production are unchanged until a separate Human Gate names them.
6. Rollback: turning the flag off restores the island and the Action-panel share exactly as today. No data, schema, RLS or permission change.
Status: contract direction approved; implementation NOT_STARTED; no code, data, RLS, flag or release changed by this rule-version update.
```

## ב. שינוי מקביל שנדרש מחוץ לחוק (לא חלק מהרישום)
- `SOD1820_MASTER_OWNER_INDEX.md` שורה 193 מציינת `canonical_ui_components_law v7 ACTIVE`, בעוד המסד מחזיק v8 (20.10.2026 02:08) ו־v9 תהיה אחריה. זה DRIFT תיעודי; יתוקן רק בהוראה נפרדת.

## ג. בדיקות שיתווספו רק אחרי אישור (מעבר לאלה שכבר קיימות ב־`test/shell-mobile-island-5107-2029.test.mjs`)
1. כפתור השיתוף ב־JSX של האי: מותנה ב־`shellReviewActive` וב־flag ייעודי; לא קיים בלעדיהם; אין `shareOrCopy`.
2. ה־CSS: הכפתור מוצג רק ב־`@media (min-width: 360px)`; מתחת לכך שורה ראשונה בטאב "פעולות"; לעולם לא שניהם (בדיקת מקור על התנאים ובדיקת דפדפן ב־320/359/360/390).
3. נפתח `ShareActions` הקנוני עם הקישור כולל עוגן; שורת הדף כולו כשיש עוגן; "שתפו בקהילה" חסום עד דברי משתמש (v8 §2) נשאר.
4. כבוי כברירת מחדל; כיבוי הדגל מחזיר את הנעילות הקיימות במלואן.
5. מטרה ≥44px, שם נגיש, פוקוס נראה, ב־Day/Parchment/Night; אין גלישה ב־320.
6. לא נוגעים: ELS tool dock, היכל, מספר, שאר המשטחים (בדיקות "שאר המשטחים" הקיימות ממשיכות לעבור).

## ד. מה לא נכלל
לא נקבע מספר מילים ל"שתפו בקהילה" (נשאר כ־v8 §2); לא נקבעה קבוצת הפעולות של ELS/היכל/מספר; לא שונה ה־Owner Index; לא נרשם דבר ל־`rules_active`.
