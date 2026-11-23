# Copy and placement: Classic + Research inline guide

Status: approved user direction; implementation text and integration mapping. This file documents the **current** source UI and the target guide. Not implemented on a live surface.

## Source truth (verified 2026-11-23)

- `src/pages/Els2029Page.jsx`: `ElsMatrixProfileSwitch` is rendered in `.els29-mode-selector`. Non-Guided options are `CLASSIC` and `RESEARCH`; in the public release the `publicClassic` profile restricts privileged functions.
- `src/components/experience2029/ElsMatrixProfileSwitch.jsx`: labels are **קלאסי** and **מחקר**, title text describes "המטריצה הישירה והמוכרת — 2D ידני ומהיר" and "אותה מטריצה עם שכבות מחקר מתקדמות לפי הצורך". Use these existing terms, do not rename routes.
- `src/components/experience2029/ElsNativeClassic2029.jsx`: the classic/native search has **מונח**, search, results, matrix, verse/source inspection; Research adds **חיפוש רגיל**, **הצלבה בין צירים**, **חיפוש מתקדם** (and **חיפוש מורחב** affordance), plus research result and inspector controls. There is a single canonical iframe bridge, not separate engines.
- `src/components/experience2029/ElsAdvancedSearch2029.jsx`: advanced request uses **els-search-bridge**; form includes **term**, **scope (Torah/Tanakh)**, **spelling**, **skipMin/skipMax**, **pageSize**, and an optional **exact skip**. It can prepare/run form variants, paginate and stop. Do NOT advertise automatic research as part of the registered-user tier until it passes the gate.
- `src/lib/research/els2029MatrixMode.js`: switching profile preserves search/selection/finding state and does **not** automatically trigger expensive search or AI.
- `tools/els/README.md`: older `openOnboard`, `updateCoach` and `tzofen_onboarded_v1` exist in the legacy engine module; verify visual/operational integration, avoid a second mandatory blocking onboarding.

## UI placement (CLAUDE surface lane)

Put a small, quiet note under mode switch and above form, immediately visible without interaction:
- Heading "איך עובדים במצב הזה?"
- One-line mode-specific summary
- Three short numbered steps via a **collapsible details**, default collapsed (not modal, no full-screen walk-through).
- Optional "מה זה דילוג?" tooltip beside skip value.
- Separate top-of-page under-construction banner (not repeated per mode).
- Only active mode guide is rendered. Switching modes must not reset engine or run search.
- Mobile: first sentence visible, details expand under the active selector. No screenshot/gallery, static import, animation, AI, heavy JS or extra network call. Existing royal typography/icons/colors.
- Research mode may be visible under the existing public flags while advanced actions are locked; provide informative copy with an account gate, not a promise that every control is open.

## Exact product copy — CLASSIC (`קלאסי`)

**Heading:** מתחילים בצופן התנ״כי

**Always-visible summary:** מחפשים מילה, בוחרים מופע וקוראים אותו בתוך אותיות התנ״ך.

**Expand:** איך מבצעים חיפוש ראשון?

1. **כתבו מילה קצרה** — למשל "דוד" או "שלום", ולחצו על חיפוש.
2. **בחרו תוצאה** — ברשימת המופעים תוכלו לראות דילוג, כיוון ומיקום במקור. דילוג הוא מרווח קבוע בין אות לאות.
3. **פתחו את המטריצה** — האותיות יודגשו. לחצו על אות או על "מקור ופסוק" (כשהפעולה זמינה) כדי לראות היכן המופע נמצא בטקסט.

**Below the fold:** "לא מצאתם? נסו מילה קצרה או טווח דילוגים אחר. היעדר תוצאה בחיפוש מוגבל אינו קובע שאין מופע בתנ״ך."

**CTA:** `הבנתי, אתחיל בחיפוש` only scroll/focuses existing search input; never auto-submits.

## Exact product copy — RESEARCH (`מחקר`)

**Heading:** חוקרים קשרים בין מילים

**Always-visible summary:** מתחילים במילה אחת, בודקים מופעים, ואז בוחרים הצלבה או חיפוש מתקדם לפי הצורך.

**Expand:** מה עושים במצב מחקר?

1. **מצאו ציר ראשי** — הקלידו מילה בחיפוש רגיל ובחרו את המופע שרוצים לחקור.
2. **בדקו קשר** — בחרו "הצלבה בין צירים" והזינו מונח נוסף. בדקו את המפגש בתוך המטריצה ואת המקור; לא כל קרבה חזותית היא ממצא מאומת.
3. **העמיקו רק כשצריך** — "חיפוש מתקדם" מאפשר לבחור טווח דילוגים, היקף טקסט ופרמטרים נוספים, בכפוף להרשאה. השתמשו תחילה בטווח קטן; חיפוש רחב דורש זמן ומשאבים.

**Small disclosure:** "המחקר משתמש באותו מנוע של מצב קלאסי. מעבר בין המצבים אינו מפעיל חיפוש חדש ואינו מוחק את הבחירה."

**For signed-out user at gated advanced controls:** "רוצים לבחור טווחים וכלים מתקדמים? התחברו או הירשמו בחינם." Reuse the existing global auth entry and safe return path. Do not imply Guided/AI/admin are included.

**For registered user:** "חיפוש מתקדם זמין לחשבון רשום" only when validated by effective permission and server.
**For public-release where Research remains UI-visible but action-locked:** "חלק מכלי המחקר עדיין בפיתוח או מוגבלים בגישה." Do not claim unlocked operations.

## Terms help (microcopy)

- **דילוג:** מספר האותיות הקבוע בין אות אחת לבאה אחריה ברצף.
- **ציר:** המילה הראשית שהחיפוש מצא במיקום ובדילוג מסוימים.
- **מופע:** הופעה מסוימת של המילה בטקסט.
- **מטריצה:** פריסה של רצף האותיות לשורות כדי לראות את המילה והקשרים מסביבה.
- **הצלבה:** בדיקת מונח נוסף ביחס לציר שנבחר.
- **טווח דילוגים:** הגבולות שהמנוע יבדוק; תוצאה ריקה בתחום מוגבל אינה הוכחה להיעדר בכל הטקסט.

## Boundaries and tests

- No fake sample results. Example query words are illustrations, never asserted search hits.
- Keep current mode-switch labels and search state intact. Do not imply paid subscription.
- New public registered access requires verified auth+server boundary; do not loosen `publicReadingActionsLocked` globally, as it controls Guided/Research and other affordances.
- QA for anonymous, registered, admin; authenticated refresh; 390/1440 widths; keyboard/RTL; case of no results, empty query, cancelled search, pending verification. No new engine instance, repeated network requests, analytics leak, or shell budget growth.
