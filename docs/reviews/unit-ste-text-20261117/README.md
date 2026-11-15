# Unit "ימין ושמאול תפרצי" — new wording (17.11.2026) — BRANCH-ONLY

Scope: the preview unit `yamin-smol-2026-5787-1237-1158` in post 5107. Branch `ccr-b8e8ab12-9hoamu`. Nothing merged, deployed or written to the DB.

## What changed
- `YAMIN_SMOL_APPROVED_TEXT` is now the 17.11.2026 wording (short, graded sentences in the spirit of ASD-STE100), word for word. The bracketed notes of the delivery are NOT text; they are places of existing components:
  - "here the canonical expansion / squares component appears" → the existing method trace opens under each `התוצאה:` line (2026 → c2026, 5787 → c5787).
  - "here more gematria of 1237 can be added" → the editor's existing "+ הוסף גימטריה".
- Parser: a text without symbol headings uses its short title lines as headings; `הביטוי: / השיטה: / התוצאה:` lines are data lines (`claim` kind, label bold); no subtitle is invented when the numbers row follows the title.
- Engine claims: c2026, c5787, c1158 (the 1237 claims and 787 left with the text that carried them).
- The 12.11.2026 wording is kept ONLY as a test fixture (`src/lib/research/fixtures/yaminSmolText20261112.js`) for the editor's source-protection tests.

## Checked
- Party values: 312 + 500 + 36 + 310 = 1158; "שש מאות אלף" = 600 + 447 + 111 = 1158 (arithmetic; the engine check of c1158 runs in the Engine panel).
- Engine breakdown of 2026 in the browser: 226 + 669 + 1131 = 2026 (ימין / ושמאול / תפרצי), "אומת מול מנוע הגימטריה הקנוני".

## Open points (decisions for ZURIEL)
1. **Attribution.** The text says "יניב לוי הציג שני חיבורים … " for 2026 and 5787. The public messages the unit reads (`channel_updates` 6d40048f… Yaniv, 8d30aba8… Shachar) hold only the 1237 connections. The sentence stays as written (editorial wording), no writer group is opened for it. Confirm the source (maybe the two private images) before a "דברי יניב לוי" group is added.
2. **Dropped from the old wording** (not in the new text): the Yaniv 1237 verse and 787 = תשפ״ז, Shachar's three 1237 lines (these still show as the public source messages under the unit), "השמאל גנבו הבחירות…", "זה לעומת זה" / Kohelet 7:14, Baal HaSulam "ששים רבוא נשמות" and the 600,000 = 60 ribo idea, the sources line.
3. **Post-level frame** (title, "מה אנחנו בודקים?" intro) is post content, not part of the unit; it is not written to the DB. Proposal text below.

### Post-level frame (proposal, as delivered)
הבחירות לכנסת ה־26 — כשהמספרים מתחילים להתחבר · מפת המציאות | סוד 1820

מה אנחנו בודקים? פוסט זה אוסף מספרים, פסוקים ואירועים שמופיעים סביב סיפור הבחירות לכנסת ה־26. הבדיקה כוללת גימטריות, תאריכים, סרטונים ודברים שהביאו חוקרים וכותבים. לכל חיבור יש מקור ושיטת בדיקה. בחלק מהמקרים מדובר בחישוב גימטריה מאומת. במקרים אחרים מדובר בפרשנות או ברמז להתבוננות. המטרה היא להציג את החיבורים באופן ברור, כך שכל קורא יוכל לבדוק אותם ולגבש מסקנה בעצמו.

## STE notes (suggestions only, not applied)
- One term per idea: the text uses "חיבור", "חישוב", "התאמה", "רמז" for related things. Suggest: "חיבור" = one connection (phrase + method + result); "חישוב" = the engine step.
- "הוא אינו הערך הרגיל של המשפט…" — consider naming the method: "בגימטריה רגילה, המשפט … שווה X" once the engine value of "ארבע המפלגות הערביות" is read.
- "ההתאמה המספרית נבדקת באמצעות המנוע" — active form: "המנוע בודק את ההתאמה המספרית".
