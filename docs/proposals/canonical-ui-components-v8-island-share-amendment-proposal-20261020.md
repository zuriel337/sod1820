# הצעת תיקון: canonical_ui_components_law v8 §1 · פעולת שיתוף קבועה באי התחתון

**מעמד:** `PROPOSED_ONLY` · לא חוק, לא מימוש, לא שינוי בדיקות. נדרש Human Gate נפרד של ZURIEL לפני כל שינוי בחוק, בכפתורי האי או בבדיקות.
**מקור הבקשה:** החלטת ZURIEL 20.10.2026 (בחירה A בתיאום PR #1137; סעיף `POST-SHELL-20261020-COMPANION-GLASS-RAZIEL-SHARE-A` ב-`project_codex id=37`).
**בעלים:** `canonical_ui_components_law` (EXTEND_EXISTING). אין בעלים, רכיב שיתוף, טבלה, URL או מערכת טלמטריה חדשים.

## 1. מה החוק הפעיל אומר היום (v8 §1, 20.10.2026)
> "שתפו בקהילה" is one in-app option within the canonical "שתף" action on all authorized public surfaces … **No duplicate persistent share button, no new bottom island action**, and honor canonical share placement.

המשמעות המעשית: היום שיתוף נגיש דרך פאנל "פעולה" (`ActionProjection`) ופאנל "בדיקה" (`InspectProjection`, `ShareActions` עם `native`/`copy`). אין כפתור שיתוף קבוע באי.

## 2. הנוסח המוצע (שינוי מינימלי, תוספת בלבד)
מחליף רק את הקטע המודגש; שאר §1–§7 ללא שינוי.

> … **A single persistent "שתף" action MAY appear in the one Command Island on every authorized public surface, at a fixed slot and with a fixed meaning. It opens the existing canonical `ShareActions` sheet (the "שתפו בקהילה" option stays inside it, per §2–§7). It is the same action as the one in "פעולה", not a second share system; the island carries no other new action.** No duplicate share control may exist elsewhere on the same surface, and canonical share placement (`share_placement_law`) is honored.

תנאים נלווים:
1. **רכיב:** `ShareActions` + Share Intent + `shareTelemetry` הקיימים בלבד (עם `force`, כמו היום בפאנל הבדיקה). אין ערוץ, סוג אירוע או URL חדשים; תת-סוגים `share`/`share_story` נשמרים.
2. **מקום ומשמעות קבועים:** המשבצת אינה מוחלפת ואינה נעלמת בין משטחים; במצב שאין מה לשתף היא מושבתת עם הסבר (לא מוסרת).
3. **יעד השיתוף:** הקישור הנוכחי המדויק כולל עוגן (`#…`) כשקיים; כשיש עוגן מוצעת גם שורה לשיתוף הדף כולו.
4. **שיתוף לקהילה** נשאר כפי שנקבע ב-v8 §2–§7 (טקסט אישי חובה, composer קהילתי קיים).
5. **Feature gate:** הפעלה רק דרך resolver היכולות הקנוני (`canonical_ui_components_law` v4: capability state consumption) ובפריוויו דרך דגל Vite ייעודי; ברירת מחדל כבוי. אין `live:true` מקומי.
6. **Rollback:** כיבוי הדגל מחזיר את האי למצבו היום (שיתוף נשאר ב"פעולה"); אין שינוי נתונים, סכמה או הרשאות.

## 3. השפעה לפי משטח
| משטח | מצב היום | עם התיקון |
|---|---|---|
| **פוסט / נושא / עולם** | באי: חיפוש · פעולה · כלים + מסלול + כדור + Now | משבצת "שיתוף" אחת נוספת; הכפתורים הקיימים נשארים. שיתוף עם עוגן המקטע. |
| **מספר** | כפתור "פעולה" ייעודי ליד מסלול ההקשר | משבצת שיתוף נוספת; ללא שינוי ב"פעולה". |
| **היכל** | באי "פקודה" במקום חיפוש | שיתוף נוסף; "פקודה" נשארת. |
| **ELS** | ה-island עובר ל"מצב כלי צופן" ומחליף את האזורים (`SystemToolDock2029`) | **החלטה נפרדת נדרשת**: בלי טיפול, השיתוף נעלם במצב כלי הצופן ויפר "מקום קבוע". אפשרויות: (א) שיתוף בקבוצת המערכת המתכווצת (הרעיון של "הכלים הראשיים והאי הרגיל מתכווץ"), (ב) שיתוף בתוך מגירת "כלים" בלבד ב-ELS (חריג מתועד). |

## 4. רוחב 320px (נמדד בפריוויו, פוסט 5107)
| רוחב | רוחב אי | כפתורים (רוחב) | סה"כ | מקום פנוי |
|---|---|---|---|---|
| 320 | 320 | חיפוש/פעולה/כלים/Now: 44 כ"א + כדור 48 | 224 | ≈96 (שיתוף 44 → נשארים ≈52) |
| 390 | 390 | אותם 44 + כדור 56 | 232 | ≈158 |
| דסקטופ 1366 | 1366 | 52–54 כ"א + כדור 62 + Now | רחב | מספיק |

המסקנה: משבצת נוספת נכנסת ב-320/390 בלי חפיפה, אך מצמצמת את המרווח ב-320; נדרשת בדיקה בדפדפן אמיתי (keyboard, safe-area, RTL).

## 5. בדיקות שיידרשו שינוי (רק אחרי Human Gate)
- `scripts/test-2029-system-frame.mjs`: נועל `surface === "heichal" ? "פקודה" : "חיפוש"`, `<small>פעולה</small>`, `<small>כלים</small>`, ומובדל שאין `<small>מספר</small>`/`<small>בדיקה</small>` באי. נדרש להוסיף במפורש את משבצת השיתוף ולא להחליש את שאר ההגבלות.
- `test/els-native-ui-browser.test.mjs`: ספירת `[data-tool-action]` ורישום/ביטול של `SystemToolDock2029`; מושפע רק אם נבחרת אפשרות (א) ל-ELS.
- בדיקות חדשות: שיתוף נפתח עם `ShareActions` קנוני; עוגן נשמר; מושבת כשאין יעד; כבוי כברירת מחדל; אין סרגל או שיתוף כפול.

## 6. אפשרות חלופית ללא תיקון חוק (B)
שיתוף נשאר שורה ראשונה בפאנל "פעולה" (תואם v8 §1 היום). חסרון: לחיצה נוספת, פחות גלוי. יתרון: אפס שינוי חוק/בדיקות.

## 7. מה אינו משתנה
`ShareActions`, `share_placement_law`, ההבחנה share/share_story, כללי "שתפו בקהילה" (v8 §2–§7), `razielLocked`, בעלי הרכיבים, RLS, ו-Production/Legacy.

## 8. החלטות מבוקשות
1. אישור הנוסח בסעיף 2 (או בחירה ב-B).
2. טיפול ב-ELS (א או ב) אם הנוסח מאושר.
3. אישור שהמשבצת הקבועה היא "שיתוף" בלבד ושחיפוש נשאר כפי שהוא.
