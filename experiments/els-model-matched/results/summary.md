# EXP-17 — אותה בקשה, מודלים שונים: סיכום (תיאורי, n=1 לכל תא)

## 0. עלות, זמן וסיום
| חלון | זרוע | מודל | stop_reason | קלט | פלט | מהם חשיבה | שניות | USD (אצווה) |
|---|---|---|---|---|---|---|---|---|
| S2 | fable (saved) | claude-fable-5-1 | end_turn | 21355 | 58146 | 52452 | 593 | 1.560 |
| S2 | haiku-m | claude-haiku-5-5 | end_turn | 21355 | 6587 | 5236 | 145 | 0.003 |
| S2 | haiku-h | claude-haiku-5-5 | max_tokens | 21355 | 48000 | 47988 | 470 | 0.013 |
| S2 | sonnet-m | claude-sonnet-5-5 | end_turn | 21355 | 1975 | 0 | 127 | 0.031 |
| S2 | sonnet-h | claude-sonnet-5-5 | end_turn | 21355 | 14496 | 9658 | 239 | 0.094 |
| S4a | fable (saved) | claude-fable-5-1 | end_turn | 21334 | 45906 | 40613 | 923 | 1.254 |
| S4a | haiku-m | claude-haiku-5-5 | end_turn | 21334 | 11064 | 8571 | 133 | 0.004 |
| S4a | haiku-h | claude-haiku-5-5 | end_turn | 21334 | 27801 | 24457 | 202 | 0.008 |
| S4a | sonnet-m | claude-sonnet-5-5 | end_turn | 21334 | 1758 | 0 | 127 | 0.030 |
| S4a | sonnet-h | claude-sonnet-5-5 | end_turn | 21334 | 39760 | 33311 | 448 | 0.220 |
| S4b | fable (saved) | claude-fable-5-1 | end_turn | 21286 | 35896 | 29908 | 360 | 1.004 |
| S4b | haiku-m | claude-haiku-5-5 | end_turn | 21286 | 27571 | 23597 | 178 | 0.008 |
| S4b | haiku-h | claude-haiku-5-5 | max_tokens | 21286 | 48000 | 47992 | 254 | 0.013 |
| S4b | sonnet-m | claude-sonnet-5-5 | end_turn | 21286 | 1288 | 0 | 116 | 0.028 |
| S4b | sonnet-h | claude-sonnet-5-5 | end_turn | 21286 | 16903 | 11758 | 304 | 0.106 |
| V1 | fable (saved) | claude-fable-5-1 | end_turn | 21492 | 30998 | 25408 | 903 | 0.882 |
| V1 | haiku-m | claude-haiku-5-5 | end_turn | 21492 | 4906 | 3751 | 122 | 0.002 |
| V1 | haiku-h | claude-haiku-5-5 | max_tokens | 21492 | 48000 | 48000 | 297 | 0.013 |
| V1 | sonnet-m | claude-sonnet-5-5 | end_turn | 21492 | 1097 | 0 | 145 | 0.027 |
| V1 | sonnet-h | claude-sonnet-5-5 | end_turn | 21492 | 21660 | 16143 | 180 | 0.130 |

## 1. מה הוצע ומה אומת מול המנוע הקנוני
| חלון | זרוע | שימושית | הצעות | אומתו | ELS | ELS 5+ | ELS בלתי סבירים במקרה (E<1) | צפוי במקרה (E≥1) | טקסט רגיל | לא אומתו |
|---|---|---|---|---|---|---|---|---|---|---|
| S2 | fable (saved) | כן | 60 | 60 | 57 | 17 | 12 | 45 | 3 | 0 |
| S2 | haiku-m | כן | 9 | 9 | 2 | 2 | 2 | 0 | 7 | 0 |
| S2 | haiku-h | לא | — | — | — | — | — | — | — | — |
| S2 | sonnet-m | כן | 20 | 19 | 0 | 0 | 0 | 0 | 19 | 1 |
| S2 | sonnet-h | כן | 40 | 40 | 1 | 1 | 1 | 0 | 39 | 0 |
| S4a | fable (saved) | כן | 60 | 60 | 60 | 31 | 21 | 39 | 0 | 0 |
| S4a | haiku-m | כן | 22 | 22 | 2 | 1 | 1 | 1 | 20 | 0 |
| S4a | haiku-h | כן | 31 | 31 | 4 | 2 | 2 | 2 | 27 | 0 |
| S4a | sonnet-m | כן | 18 | 18 | 0 | 0 | 0 | 0 | 18 | 0 |
| S4a | sonnet-h | כן | 37 | 36 | 4 | 2 | 1 | 3 | 32 | 1 |
| S4b | fable (saved) | כן | 60 | 59 | 58 | 32 | 24 | 34 | 1 | 1 |
| S4b | haiku-m | כן | 35 | 34 | 1 | 0 | 0 | 1 | 33 | 1 |
| S4b | haiku-h | לא | — | — | — | — | — | — | — | — |
| S4b | sonnet-m | כן | 11 | 9 | 0 | 0 | 0 | 0 | 9 | 2 |
| S4b | sonnet-h | כן | 39 | 39 | 0 | 0 | 0 | 0 | 39 | 0 |
| V1 | fable (saved) | כן | 60 | 59 | 58 | 46 | 35 | 23 | 1 | 1 |
| V1 | haiku-m | כן | 8 | 7 | 0 | 0 | 0 | 0 | 7 | 1 |
| V1 | haiku-h | לא | — | — | — | — | — | — | — | — |
| V1 | sonnet-m | כן | 10 | 9 | 0 | 0 | 0 | 0 | 9 | 1 |
| V1 | sonnet-h | כן | 36 | 33 | 1 | 1 | 1 | 0 | 32 | 3 |

## 2. חפיפה עם הצעות ה־ELS של Fable באותו חלון (זהות: טקסט+התחלה+דילוג+כיוון)
| חלון | זרוע | ELS מאומתים (מופעים) | משותפים עם Fable | מתוך ELS של Fable | ארוכים ובלתי סבירים: שלו | מהם משותפים | היקף ELS ביחס ל־Fable |
|---|---|---|---|---|---|---|---|
| S2 | haiku-m | 2 | 1 | 57 | 2 | 1 | 4% |
| S2 | sonnet-m | 0 | 0 | 57 | 0 | 0 | 0% |
| S2 | sonnet-h | 1 | 1 | 57 | 1 | 1 | 2% |
| S4a | haiku-m | 2 | 0 | 60 | 1 | 0 | 3% |
| S4a | haiku-h | 4 | 2 | 60 | 2 | 1 | 7% |
| S4a | sonnet-m | 0 | 0 | 60 | 0 | 0 | 0% |
| S4a | sonnet-h | 4 | 1 | 60 | 1 | 1 | 7% |
| S4b | haiku-m | 1 | 0 | 58 | 0 | 0 | 2% |
| S4b | sonnet-m | 0 | 0 | 58 | 0 | 0 | 0% |
| S4b | sonnet-h | 0 | 0 | 58 | 0 | 0 | 0% |
| V1 | haiku-m | 0 | 0 | 58 | 0 | 0 | 0% |
| V1 | sonnet-m | 0 | 0 | 58 | 0 | 0 | 0% |
| V1 | sonnet-h | 1 | 1 | 58 | 1 | 1 | 2% |

## 3. יעדי ההערכה בקולומביה (נבדק רק אחרי שמירת התשובות; לא נכנס לשום בקשה)
| חלון | זרוע | ספינת | יכלאש |
|---|---|---|---|
| S2 | fable (saved) | exact_verified | none |
| S2 | haiku-m | none | none |
| S2 | sonnet-m | none | none |
| S2 | sonnet-h | none | none |
| S4a | fable (saved) | none | none |
| S4a | haiku-m | none | none |
| S4a | haiku-h | none | none |
| S4a | sonnet-m | none | none |
| S4a | sonnet-h | none | none |
| S4b | fable (saved) | none | none |
| S4b | haiku-m | none | none |
| S4b | sonnet-m | none | none |
| S4b | sonnet-h | none | none |
| V1 | fable (saved) | none | none |
| V1 | haiku-m | none | none |
| V1 | sonnet-m | none | none |
| V1 | sonnet-h | none | none |

## 4. הכלל שנקבע מראש: האם הזרוע מפיקה ELS בהיקף של לפחות 50% ממה ש־Fable הפיק באותו חלון, ב־3 מתוך 4 חלונות?
| זרוע | חלונות עם תשובה שמישה | חלונות עם ≥50% מ־Fable | הכלל מתקיים |
|---|---|---|---|
| haiku-m | 4 מתוך 4 | 0 מתוך 4 | לא |
| haiku-h | 1 מתוך 4 | 0 מתוך 4 | לא |
| sonnet-m | 4 מתוך 4 | 0 מתוך 4 | לא |
| sonnet-h | 4 מתוך 4 | 0 מתוך 4 | לא |

מה זה אומר ומה לא: ספירה תיאורית בלבד. כל הצעה אומתה ברצף ובמיקום מול המנוע הקנוני, אבל אימות אינו משמעות: באזורים אקראיים Fable הפיק אותות באותו גודל (EXP-16). n=1 לכל תא, בקשה אחת לכל חלון, והבדל בין זרועות כולל גם את כמות החשיבה ולא רק את המודל.
