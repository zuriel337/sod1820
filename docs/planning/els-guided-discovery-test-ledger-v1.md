# ELS Guided Discovery — יומן מבחנים v1

**Program:** `els-guided-discovery-program-v1.md`.  
**Rule:** תשובות של holdout אינן נכנסות למונחי הסיפור, למילון, ל־fixture או לענף runtime.

## סטטוסים

- `SPECIFIED` — תנאי הקבלה קבועים; היכולת טרם מומשה.
- `PASS` — מנוע, תקציב והצגה עברו.
- `FAIL` — הבדיקה התחומה נכשלה; נדרשת סיבת כשל ראשית.
- `BLOCKED_DATA` — חסר replay קנוני הנדרש לבדיקה.

## מצב החתך הראשון

- `PASS`: מקרן טהור קובע גל ראשון של 4 וגל המשך מפורש של 4.
- `PASS`: דילוג `4545` אינו מקבל קדימות מספרית.
- `PASS`: stale, duplicate ומופע מחוץ לגל אינם נכנסים לראיות.
- `PASS`: המלצה אחת ועד שתי חלופות בלבד.
- `PASS`: עדשת `matrix-discovery` עובדת בתוך אותו מנוע, בחלון מוגבל וללא מילון רחב.
- `PASS`: raw patterns מוצגים רק תחת „מתקדם”.
- `PASS`: `מקדש ירד` מחזיר 2 מופעי ציר, והכלל הכללי לכתיב חסר מזהה ומציג `ירושלם`
  שחזר פעמיים; אין תנאי לפי הצופן או הדילוג.
- `PASS`: Browser אמיתי ב־320px ובמחשב; עד ארבע בדיקות אוטומטיות וללא הוספת ממצאים.
- `PASS`: אפס קריאות AI ואפס שינויי DB/Provider/transport.
- `PASS`: ריצת החתך המלאה — 273 בדיקות, 270 עברו ו־3 דולגו רק בהיעדר PostgreSQL מקומי;
  שני ה־builds, חסם bundle/lazy ונעילת Legacy עברו.

## Goldens ו־holdouts

### GD-01 — ד׳ טראמפ: ביטוי מקומי בלתי צפוי

- **Status:** `SPECIFIED`
- **Input:** הציר השמור המאומת סביב דילוג `41865`.
- **Withheld:** `באשאטמינ`, החלוקה שלו ו־`שבררומי`.
- **Expected:** רמה 1 מגלה את האותיות מהחלון; רמה 2 רשאית להציע חלוקה תוך שמירת האותיות.
- **Boundary:** קשר ל„אש אטומית” הוא פרשנות פונטית בלבד, לא טקסט מאומת.
- **Primary failure:** טרם נקבע בהרצת holdout.

### GD-02 — קולומביה: הסיפור אינו כולל את התשובה

- **Status:** `SPECIFIED`
- **Input:** סיפור קולומביה והציר השמור סביב `4545`.
- **Withheld:** `ספינת`, `יכל אש`, `אש אכלה`.
- **Expected:** matrix-first מוצא את האותיות בחלון; רמה 2 מזהה צורות לשון בלי special case.
- **Primary failure:** צפוי להיקבע בין vocabulary, recognition/normalization או matrix bounds;
  החתך הראשון אינו טוען שכבר פתר זאת.

### GD-03 — אורניום: גיאומטריה קודמת למספר

- **Status:** `SPECIFIED`
- **Input:** ציר `אורניום` המאומת בדילוג `10101`.
- **Expected:** המקבילות בין איראן לארה״ב יכולה לדרג חזק גם בלי אות מספרי.
- **Negative:** שינוי אות מספרי בלבד אינו משנה את בחירת הגיאומטריה.

### GD-04 — צורות הפוכות

- **Status:** `SPECIFIED`
- **Input:** `סוד החשמל`.
- **Expected:** המקור ושלוש הצורות הקיימות ב־Advanced נשמרים עם provenance; `dir=-1` נפרד.
- **Negative:** אין הרצה אוטומטית ברמות 0–2 ואין registry נוסף.

### GD-05 — תוצאה ריקה כנה

- **Status:** `PASS` ברמת מקרן ו־UI; נדרש negative control קנוני קבוע.
- **Expected:** כיסוי גל ראשון, סיבת כשל והצעה אחת לבדוק עוד ארבעה.
- **Negative:** אין dump גולמי פתוח, AI, הרחבה שקטה או טענת היעדר כללית.

### GD-06 — חלוקה לשונית עמומה

- **Status:** `SPECIFIED`
- **Expected:** אותיות מדויקות ושתי קריאות עם provenance; אף קריאה אינה מחליפה את הממצא.

### GD-07 — מילה סיפורית רחוקה

- **Status:** `SPECIFIED`
- **Expected:** מילה שמתאימה לסיפור אך נמצאת מחוץ לחלון אינה מופיעה ברמה 1.
- **Negative:** היא יכולה להופיע רק לאחר הרחבה מפורשת עם כיסוי ומרחק גלויים.

### GD-08 — סמכות AI

- **Status:** baseline קיים; בדיקת planner עתידי `SPECIFIED`.
- **Expected:** פתיחה ובחירה = 0 קריאות; submit מפורש = קריאה אחת; אותה שיחה גלובלית; אין ערבוב
  בין שני מופעים; הצעה אינה ממצא עד replay קנוני.

## סט הרגרסיה הקבוע

| Golden | מינימום לשימור | מצב |
| --- | --- | --- |
| `מקדש ירד` | 2 מופעי ציר; `ירושלם` פעמיים באזור | `PASS` ב־Guided browser; להריץ בכל חתך |
| `יום שבת תשמור` | הבחנה בין ELS למקור; ראיית `שבת` נשמרת | נדרש כיול Guided |
| `משיח טבת עשירי` | ציר 1820 והקשר מקור עם provenance | נדרש כיול Guided |
| `קולומביה` | גילוי כללי של הצורות, בלי המילים בקלט | GD-02 |
| `בלעם הרשע` | לפחות 2 מופעים; מקור אינו מסתיר ELS | נדרש כיול Guided |
| `ד׳ טראמפ` | replay מדויק ו־holdout לשוני | GD-01 |
| `אורניום` | מקבילות חזקות בלי להפוך `10101` לשער | GD-03 |

## תבנית רישום ריצה

```text
Run ID / Date / SHA:
Case / status:
Research level:
Anchor / occurrenceRef:
Engine budget / matrix coverage:
Raziel calls + tokens:
Candidates and source:
Canonical evidence:
Language readings / ambiguity:
Ranking signals / rejects:
Source / verses:
Elapsed time:
Stop reason / next action:
Primary failure class:
Artifacts / human decision:
```
