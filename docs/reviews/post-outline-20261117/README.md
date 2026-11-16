# עץ הפוסט בסרגל השמאלי — 17.11.2026 (ענף בלבד)

- **הוסר** ה־Companion השמאלי הניסיוני (`CompanionPanel2029`, `CompanionPreviewMount2029`, `useCompanionPreview2029`, `companionTabPolicy2029`, CSS) ופאנל ההקשר של היחידה שישב בתוכו (`UnitContextPanel2029`). נמחקו גם שתי בדיקות שנושאן היה הפאנל (`test/companion-2029-*`) ועודכנו שתי בדיקות אחרות. הרכיבים של רזיאל (`razielCompanion…`, `personal_area_companion`) לא נגעו.
- **עץ אחד, שתי רמות** (`postOutline2029.js` + `postOutlineDom2029.js`), נגזר מהפוסט המוצג: רמה 1 = כותרות (או ״מה התחדש״), רמה 2 = יחידות תחת ״מה התחדש״ או תתי־כותרות, מוצגות רק תחת ההורה הפעיל. רשימת אזורים כתובה ידנית (המטוס, `remzei-geula-ai-sod-hashir`) עדיין גוברת; בפוסט עם אזורים וגם יחידות (5107) מתווספים ״מה התחדש״ והיחידות לפניהם.
- **נבדק בדפדפן (דסקטופ, localhost):** 5112, 5107, 5137, 5135, 5136, 92 — אין Companion, העץ מוצג, הסימון עוקב אחרי הגלילה. ביחידות: 5107 = 7, 5136 = 8 תתי־כותרות.
- **לא נבדק:** פאנל ״הקשר״ במובייל (הלשונית ״כאן״ נעולה ״בבנייה״ בסשן אנונימי) — הוא מציג אותו רכיב עם אותם נתונים; פוסט בנט (טיוטה, לא נגיש); ערכות נושא בהירות.
- **פתוח:** מסגרת אחידה לשני הסרגלים (גובה, רווח, רדיוס) — ממתין לאישור ולקריאת חוזה המסגרת.

## Rails: size and Royal look (17.11.2026, branch only)
- Both side capsules run from 78px to 10px above the bottom, same edge gap (8px), same radius (28px); widths by role (62 / 286). This deviates from DESIGN_CONTRACT_V2 §11.7/§11.8 (rail rest height, left CompanionPanel) by ZURIEL's explicit decision: propose a contract addendum, not a silent edit.
- Royal look: three shared tokens (`--s29-rail-royal-border/-fill/-shadow`) = the personal area's sapphire recipe (sapphire-tinted panel, hairline sapphire border, faint gold top hairline, soft sapphire shadow); gold stays for the active dot and the kickers. Measured identical on both rails in dark, light and parchment (`shots/royal-rails-*-applied.jpg`).
