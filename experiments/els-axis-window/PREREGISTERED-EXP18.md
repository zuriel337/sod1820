# EXP-18 — חלון סביב הציר (±10 שורות) והנחיה ממוקדת: עלות קריאה ומה נשמר (הגדרה מוקדמת, 29.10.2026; נכתבה לפני כל קריאה)

**שאלה.** ZURIEL רוצה קריאה רק בסביבת הציר שנבחר, ובחלון קטן כברירת מחדל. (1) כמה עולה ולוקחת קריאה אחת של Fable 5.1 בחלון של שורות הציר ±10, עם הנחיה שמבקשת רק מילים החוצות את המופע הנבחר או צמודות אליו ועד 25 הצעות? (2) האם ממצא ידוע שחוצה את הציר (קולומביה) עדיין נמצא? (3) מה מפיק המודל סביב ציר חסר משמעות (בקרה)?

**תכנון.** שלוש בקשות, מודל `claude-fable-5-1`, אותן הגדרות כמו EXP-16 (effort medium, חשיבה adaptive, max_tokens 64,000, אצווה): אותו מערכת ואותה סכמה כמו prompt v2; מה שמשתנה: הקטע, והמשימה (prompt v4: חוצה/צמוד בלבד, עד 25).
* `C1` — קולומביה: שורות הציר ±10 (נחתך בסוף התורה), 41 עמודות, הציר מסומן ובלי שם ובלי נושא.
* `K1` — בקרה: חלון אקראי (`w03`), ציר מדומה של 8 תאים באמצע העמודה 21 (אותיות אקראיות, מסומן ובלי שם), אותו גודל וצורה: ±10 שורות.
* `V1X` — הצופן השמור: שורות הציר ±10, הציר מסומן ובלי שם.
סדר ריצה: C1, K1, V1X; ריצה אחת בכל פעם. בלי ניסיון חוזר, בלי סבב 2.

**תקציב.** תקרת הניסוי $3.0 (נותרו $7.72 מתקרת $40). השומר מקצה את הגרוע ביותר של כל ריצה לפני שליחתה ולכן ייתכן שהריצה השלישית תידחה; אם כן, הדוח אומר זאת. ריצה שנגמרה ב־`max_tokens` נספרת ולא חוזרים עליה.

**מדדים (תיאוריים, n=1 לתא).** שימושיות; עלות, שניות, טוקני חשיבה; הצעות; אומתו; ELS; ELS 5+; ELS בלתי סבירים במקרה (E<1); כמה מההצעות באמת חוצות את המופע או צמודות אליו (נבדק גאומטרית); יעדי קולומביה (`ספינת`, `יכלאש`) רק בדוח אחרי שמירת התשובות; חפיפה עם ה־ELS של הריצה המלאה S2 שנמצאים בתוך ±10 שורות מהציר.

**כללי פרשנות שנקבעו מראש.**
* עלות הקריאה היא הנמדדת: ממוצע ושיא של שתיים או שלוש ריצות, כולל ריצה שנגמרה בלי תשובה.
* "הממצא הידוע נשמר" = `ספינת` מוצעת ומאומתת ב־C1. אחרת: "לא נשמר בריצה הזו" (לא ש"אינה נמצאת").
* אם הבקרה K1 מפיקה ELS בלתי סבירים במקרה בהיקף דומה ל־C1, נאמר זאת: אין בנתונים מה שמבדיל ציר בעל משמעות מציר מדומה.
* אין טענה לסטטיסטיקה; אימות אינו משמעות.

---

## Amendment 1 (29.10.2026, after ZURIEL's new instruction, before the second call; the first request C1 had already been sent)
ZURIEL approved up to three runs inside the remaining USD 7.72 with cost tracking and a stop before any excess, and asked: (1) test a +-10-row window but **do not make it the default**; (2) **do not turn crossing or touching into a condition that filters the other findings**: the system must still be able to find far or parallel things; (3) compare, as far as the budget allows, a small window with the previous instruction against a small window with a focused instruction, and report what remained, what was missed, how much noise, time and cost; (4) explain how EXP-14's 90-93% was computed; (5) if there is a limit of 25 proposals, say that it is an output cap and not proof that nothing else exists.

Design change: three runs on the **same Columbia window (rows of the selected occurrence +-10, cut at the end of the Torah, 23 x 41)**, same model and settings as EXP-16 (Fable 5.1, effort medium, adaptive thinking, max_tokens 64,000, batch):
* `C1` - FOCUSED instruction (v4: only words that cross or touch the selected occurrence), output cap 25. Already sent, request hash unchanged (`e9e5f546...`). This arm filters **by design**, as an experimental arm only; it is not a proposal for the product.
* `C2` - the PREVIOUS general instruction (v2, as it was), output cap 60, axis marked and unnamed, no topic.
* `C3` - the previous general instruction with the output cap changed to 25 (one number), so that the effect of the cap is separated from the effect of the focus.
The control window `K1` and the saved-cipher window `V1X` stay built in `data/windows` and are **not run** (they are what the amendment gives up). The budget cap is raised from USD 3.0 to USD 5.2 only so that the guard, which reserves the worst case of each run before sending it, does not drop the third run; the expected spend is about USD 2.5 and the worst case is below the approved USD 7.72.

Additional measures (descriptive, n=1 per arm): for each arm, the verified ELS split by geometric relation to the selected occurrence (crosses / touches / parallel column / far), including those **outside** what the focused instruction asks for; the findings of the full-window EXP-16 run `S2` that lie inside this window, and which of them each arm proposed ("remained"), did not propose ("not proposed"), and what each arm proposed that `S2` did not; noise = verified ELS that are expected by chance (E >= 1) and short ELS (<= 4 letters); cost, seconds, thinking tokens. Targets are read only in the report.

Reading rules: a cap of 25 or 60 is an **output cap**. A finding that an arm did not propose is not evidence that it is absent from the window, and with a cap of 25 a miss is expected. The +-10-row window is **not** declared a default by this experiment.
