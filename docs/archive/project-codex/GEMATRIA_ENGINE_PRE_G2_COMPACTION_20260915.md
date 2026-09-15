# ARCHIVE — project_codex.gematria_engine pre-G2-compaction

**Snapshot date:** 2026-09-15  
**Status:** HISTORICAL PROVENANCE ONLY · NOT CURRENT ROUTING AUTHORITY

This is the pre-compaction body preserved before replacing the stale “8 methods + method definitions live in nodes” routing model with the current Registry-first owner model.

---

מקור אמת יחיד: src/lib/gematria.js (משוכפל זהה ב-scripts/entities-seed.mjs לצורך הזרע). 8 שיטות, כולן אומתו מול bidim:
1. רגיל (ragil) — ערך אות סטנדרטי.
2. מילוי (miluy) — סכום מילוי שמות האותיות (א=אלף=111 וכו').
3. מסתתר (misratar) — סכום הערכים המוחלטים של ההפרשים בין אותיות סמוכות.
4. קדמי (kadmi) — ערך מצטבר/משולש של האותיות.
5. גדול (gadol) — כולל ערכי סופיות (ך=500...ץ=900).
6. סידורי (siduri) — מיקום האות (א=1..ת=22).
7. אתבש (atbash) — היפוך הא"ב (א↔ת).
8. אלבם (albam) — חלוקה לשניים והחלפה (א↔ל).

"נשמת השיטה" (קובעת את המשמעות הפרשנית, מקובע בקוד ובתצוגה):
- אתב"ש = מראה/היפוך (הצד הנסתר/ההפוך של הדבר).
- אלב"ם = בן-זוג/זיווג (השלמה/חיבור).
- מסתתר = המתח/הדינמיקה הפנימית בין האותיות.
- "מילוי הנעלם" = מילוי פחות רגיל (החלק הנסתר שמעבר לגוף האות).

⚠️ מקור ההגדרות הקנוני של השיטות הוא nodes WHERE type='rule' — חובה לקרוא לפני שמחשבים/מקודדים. חוקים נעולים (immutable, defined_by צוריאל פולייס):
- misratar_multi: מסתתר רב-מילים = סכום המסתתרים של כל מילה בנפרד; הרווח שובר את הרצף לחלוטין (משיח בן דוד=552+48+4=604). שיטה רציפה אסורה.
- ribua_definition: ריבוע = סכום הרגיל של כל הקידומות ההדרגתיות; רב-מילים = מילה-מילה (צוריאל פולייס=2172).
- method_hierarchy_ragil_foundation: רגיל(זהות) = היסוד; סופיות ברגיל = כערך הרגיל (ם=40), לא 500-900 (גדול הוא שיטה נפרדת).
- method_priority: דרגה1 רגיל/מסתתר/קדמי, דרגה2 מילוי, דרגה3 אתבש (אסור לבסס מסקנה מרכזית על אתבש לבד).
- שמות נרדפים: רגיל=זהות, מילוי=נשמה, קדמי=פוטנציאל=משולש.
- auto_compute_preapproved: חישוב=אוטומטי, אבל UPDATE/DELETE/ALTER לליבה דורש אישור מפורש של צוריאל. preserve_linked_row: לתקן שורה מחוברת במקום, לא להחליף.

חוקי-על נוספים (nodes type=rule): gematria_engine_law (מנוע רשמי בלבד — אסור זיכרון/ניחוש/ידני; מקור אמת = קוד+DB) · verified_value_is_system_data (חישוב שצוריאל הציג ואומת = נתון מערכת, לא לחשב מחדש ללא צורך).
