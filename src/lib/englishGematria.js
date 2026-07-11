// 🇺🇸 מנוע הגימטריה האנגלית — כל שיטה עם **תג-מקור** (יושר מחקרי) ו**הסבר סגור**.
// עיקרון SOD1820: לא מערבבים מסורת עתיקה עם צופן מודרני. המשתמש תמיד רואה מאיפה השיטה באה.
// גימטריה אנגלית אינה מסורת עתיקה כמו העברית — לכן «אמיתי» כאן = דטרמיניסטי, עקבי ומתועד.

// ── תגי-מקור (מעמד היסטורי/מחקרי) ──
export const EN_TAGS = {
  hebrew:       { icon: "✅", label: "מסורת עברית" },
  latin:        { icon: "📜", label: "מסורת לטינית (Agrippa)" },
  modern:       { icon: "🔷", label: "מודרני מקובל" },
  experimental: { icon: "🧪", label: "ניסיוני" },
};

// ── עזרי-חישוב בסיסיים ──
const ord = (ch) => { const c = ch.charCodeAt(0); return (c >= 97 && c <= 122) ? c - 96 : 0; }; // a=1..z=26
const reduce9 = (n) => { if (n <= 0) return 0; const r = n % 9; return r === 0 ? 9 : r; };        // שורש דיגיטלי 1-9
const sumMap = (text, f) => { let s = 0; for (const ch of String(text || "").toLowerCase()) s += f(ch); return s; };

// 📜 מפת אגריפה הלטינית (23 אותיות היסטוריות) + התאמת-אנגלית מוצהרת ל-J/U/W.
// היסטורי: A=1…I=9, K=10…S=90, T=100, V=200, X=300, Y=400, Z=500.
// התאמה מודרנית (לא חלק מהשיטה המקורית): J≡I(=9), U≡V(=200) — מיזוגים היסטוריים אמיתיים;
// W = VV (=400) — מוסכמה מוצהרת בלבד («double-V»), לא ערך היסטורי. מודגש במסך ההסבר.
const AGRIPPA = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 9,                                   // ← I (מיזוג היסטורי)
  k: 10, l: 20, m: 30, n: 40, o: 50, p: 60, q: 70, r: 80, s: 90,
  t: 100, u: 200 /* ← V */, v: 200, w: 400 /* VV — התאמה מודרנית מוצהרת */,
  x: 300, y: 400, z: 500,
};

// 🧪 צופן «יהודי» רשתי (gematrix) — מוגדר אך כבוי. ערכי J/V/W שרירותיים ולא-עקביים.
const JEWISH = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 600,
  k: 10, l: 20, m: 30, n: 40, o: 50, p: 60, q: 70, r: 80, s: 90,
  t: 100, u: 200, v: 700, w: 900, x: 300, y: 400, z: 500,
};

// ── תאימות-לאחור (בשימוש בקוד קיים) ──
export function englishSimple(text) { return sumMap(text, ord); }
export const hasLatin = (t) => /[a-z]/i.test(String(t || ""));

// ── מרשם השיטות: key · label · תווית עברית · תג-מקור · פעיל · fn · note · הסבר-סגור ──
export const EN_METHODS = [
  {
    key: "ordinal", label: "English Ordinal", he: "אורדינלי (רגיל)", tag: "modern", active: true,
    fn: (t) => sumMap(t, ord), note: "A=1 … Z=26",
    explain: "כל אות מקבלת את מיקומהּ באלף-בית האנגלי: A=1, B=2, ועד Z=26 — וסוכמים. זוהי שיטת-הבסיס המקובלת של הגימטריה האנגלית המודרנית.",
  },
  {
    key: "reduction", label: "Full Reduction", he: "רדוקציה (פיתגורי)", tag: "modern", active: true,
    fn: (t) => sumMap(t, (ch) => reduce9(ord(ch))), note: "כל אות → 1-9",
    explain: "כל אות מוקטנת לספרה בודדת בין 1 ל-9 («שורש דיגיטלי»): A=1…I=9, ואז J חוזר ל-1, K=2 וכן הלאה. שיטה פיתגורית מקובלת בחישוב האנגלי המודרני.",
  },
  {
    key: "reverse", label: "Reverse Ordinal", he: "אורדינלי הפוך", tag: "modern", active: true,
    fn: (t) => sumMap(t, (ch) => { const o = ord(ch); return o ? 27 - o : 0; }), note: "A=26 … Z=1",
    explain: "האלף-בית במהופך: A=26, B=25, ועד Z=1 — וסוכמים. «המראה» של השיטה הרגילה — הצד ההפוך של אותו ציר.",
  },
  {
    key: "reverse_reduction", label: "Reverse Reduction", he: "רדוקציה הפוכה", tag: "modern", active: true,
    fn: (t) => sumMap(t, (ch) => { const o = ord(ch); return o ? reduce9(27 - o) : 0; }), note: "הפוך → 1-9",
    explain: "כמו Reverse Ordinal (הא-ב במהופך), אך כל ערך מוקטן לספרה בודדת 1-9. חיבור של ההיפוך עם השורש הפיתגורי.",
  },
  {
    key: "agrippa", label: "Agrippa / Latin", he: "לטיני (אגריפה)", tag: "latin", active: true,
    fn: (t) => sumMap(t, (ch) => AGRIPPA[ch] || 0), note: "A=1…I=9 · K=10…T=100 · V=200…Z=500",
    explain: "הגימטריה הלטינית ההיסטורית של קורנליוס אגריפה (המאה ה-16): A=1…I=9, K=10, L=20, … T=100, V=200, X=300, Y=400, Z=500 (23 אותיות לטיניות). ⚠️ התאמה לאנגלית מודרנית (אינה חלק מהשיטה ההיסטורית המקורית): J מזוהה עם I (=9) ו-U עם V (=200) — מיזוגים היסטוריים אמיתיים; ו-W מחושב כ-VV (=400) לפי מוסכמה מוצהרת בלבד. כך משמרים את השורש ההיסטורי בלי להמציא ערכים.",
  },
  // 🧪 מוגדרות אך כבויות (active:false) — לא ברירת-מחדל. יתווספו בעתיד רק עם תווית «מודרני/ניסיוני».
  {
    key: "sumerian", label: "English Sumerian", he: "שומרי", tag: "experimental", active: false,
    fn: (t) => sumMap(t, (ch) => ord(ch) * 6), note: "Ordinal ×6",
    explain: "כל אות = מיקומהּ הרגיל כפול 6 (A=6, B=12, ועד Z=156). צופן מודרני שמקורו בחוגי-צפנים בני-זמננו — מסומן «ניסיוני», ואינו מסורת עתיקה.",
  },
  {
    key: "jewish", label: "Jewish (gematrix)", he: "«יהודי» (רשתי)", tag: "experimental", active: false,
    fn: (t) => sumMap(t, (ch) => JEWISH[ch] || 0), note: "נפוץ ברשת, לא-עקבי",
    explain: "צופן פופולרי מאתר gematrix.org: A=1…I=9, J=600, K=10, … U=200, V=700, W=900. ⚠️ הערכים של J/V/W שרירותיים ולא-עקביים פנימית — מסומן «ניסיוני/מודרני», ואינו מסורת עתיקה.",
  },
];

// עזר: כל השיטות הפעילות → [{key,label,he,tag,value,note,explain}] לביטוי נתון.
export function englishAll(text) {
  return EN_METHODS.filter((m) => m.active).map((m) => ({
    key: m.key, label: m.label, he: m.he, tag: m.tag, note: m.note, explain: m.explain,
    value: m.fn(text),
  }));
}
