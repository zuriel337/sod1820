import React, { useMemo, useState, useEffect } from "react";

// 📅 Human Date Input — human_date_input_law (29.8.2026).
// חוזה-מוצר: תאריך שהאדם יודע (לידה / אירוע / תאריך היסטורי-אישי) — האדם צריך להיות
// מסוגל להזין אותו ישירות: יום / חודש / שנה, כל אחד בנפרד, בלי גלילה ארוכה דרך
// native <input type="date"> (על מובייל הופך ל-wheel-picker שמתחיל מהיום ולא מאפשר הקלדה —
// למי שנולד ב-1975 זו גלילה של עשרות "קליקים" בשנים בלבד).
//
// ה-UI לא משנה את מודל-הנתונים: value/onChange הם תמיד "YYYY-MM-DD" קנוני (או null),
// זהה למה שה-DB/RPC מצפים לו כבר היום — אין schema חדש בשביל UX.
//
// ⛔ Draft ≠ Canonical (חוזה קשיח, לא רק פרט-מימוש): y/m/d הפנימיים הם תמיד draft — כל מה
// שהמשתמש הקליד/בחר, כולל חלקי/לא-תקין. onChange כלפי-חוץ נורה רק בשני מקרים:
// (1) draft מרכיב תאריך שלם ותקין → onChange(iso).
// (2) שלושת השדות התרוקנו לגמרי (ניקוי מפורש) → onChange(null).
// בכל מצב-ביניים (שנה חלקית כמו "1"/"19"/"197", יום/חודש חסרים, או תאריך שלם-אך-לא-תקין
// כמו יום-31-בפברואר/תאריך-עתידי) — **אין קריאה ל-onChange בכלל**, לא אפילו עם null.
// null הוא ערך-נתונים אמיתי (מחיקת-תאריך), לא מצב-הקלדה-זמני — קריאת onChange(null) בזמן
// הקלדה-חלקית הייתה גורמת ל-parent (למשל setBdate(null)) לשנות את ה-value שחוזר לרכיב,
// וה-useEffect([value]) היה מאפס את ה-draft בחזרה באמצע ההקלדה (למשל: מקלידים "1" בשנה →
// מתאפס לפני שמגיעים ל-1975). ולכן: קלט לא-שלם/לא-תקין נשאר מקומי בלבד, מוצג כפי-שהוא
// (כולל שגיאה כשרלוונטי), ולא נוגע ב-parent state עד שיש ערך-שלם-ותקין-חדש או ניקוי-מפורש.
// אין הסתמכות על HTML min/max/type=number לאכיפה — אלה רמז-UX בלבד; האימות האמיתי לוגי, כאן.
//
// אין ברירת-מחדל ל-minYear/maxYear (אין floor/ceiling שרירותי בלי Human-Gate מפורש) —
// caller שלא מעביר אותם = אין הגבלת-שנה מלבד disableFuture (אם התבקש).
//
// EXTENSION POINT NOW (לא מומש): year-only / month+year / approximate-date. מודל-הפנים כאן
// (day/month/year נפרדים) לא חוסם הרחבה עתידית כזו, אבל היא לא נבנית עכשיו — value/onChange
// דורשים תאריך מלא כל עוד ה-DB דורש תאריך מלא.

const YEAR_RE = /^\d{4}$/;
const isCompleteYear = y => YEAR_RE.test(String(y ?? "").trim());

function daysInMonth(year, month) {
  // month: 1-12. שנה לא-שלמה (עדיין מוקלדת) → ברירת-מחדל סלחנית (לא חוסמת יום חוקי
  // בטעות רק כי המשתמש עוד לא סיים להקליד שנה) — לא מנחשת שנה אמיתית מספרה חלקית.
  if (!month) return 31;
  if (!isCompleteYear(year)) return month === 2 ? 29 : [4, 6, 9, 11].includes(month) ? 30 : 31;
  return new Date(Number(year), month, 0).getDate();
}

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function parseIso(value) {
  if (!value || typeof value !== "string") return { y: "", m: "", d: "" };
  const [y, m, d] = value.split("-");
  return { y: y || "", m: m ? String(Number(m)) : "", d: d ? String(Number(d)) : "" };
}

function toIso(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// מחזיר { iso, error } — iso=null כש-הקלט חלקי/לא-תקין/עתידי (נחסם, לא מומר בשקט).
function validate(y, m, d, { minYear, maxYear, disableFuture }) {
  if (!isCompleteYear(y) || m === "" || d === "") return { iso: null, error: null }; // עדיין באמצע הקלדה — לא שגיאה, סתם לא-שלם עדיין
  const yy = Number(y), mm = Number(m), dd = Number(d);
  const bound = daysInMonth(y, mm);
  if (dd < 1 || dd > bound) return { iso: null, error: "היום שנבחר לא קיים בחודש הזה" };
  if (minYear != null && yy < minYear) return { iso: null, error: `השנה חייבת להיות ${minYear} ומעלה` };
  if (maxYear != null && yy > maxYear) return { iso: null, error: `השנה חייבת להיות ${maxYear} ומטה` };
  if (disableFuture) {
    const cand = new Date(yy, mm - 1, dd);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (cand > today) return { iso: null, error: "לא ניתן לבחור תאריך עתידי" };
  }
  return { iso: toIso(y, m, d), error: null };
}

export default function HumanDateInput({
  value, onChange, minYear, maxYear, disableFuture = false, required = false,
}) {
  const [y, setY] = useState(() => parseIso(value).y);
  const [m, setM] = useState(() => parseIso(value).m);
  const [d, setD] = useState(() => parseIso(value).d);
  const [error, setError] = useState(null);

  // ערך חיצוני חדש (למשל טעינת פרופיל אחרי mount) → עדכן פנימה. לא לרוץ על כל הקלדה פנימית.
  useEffect(() => {
    const p = parseIso(value);
    setY(p.y); setM(p.m); setD(p.d); setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ⛔ לעולם לא מהדקים/משכתבים y/m/d כאן — רק משקפים בדיוק מה שהמשתמש בחר/הקליד.
  function pick(nextY, nextM, nextD) {
    setY(nextY); setM(nextM); setD(nextD);

    // ניקוי-מפורש: שלושת השדות ריקים בו-זמנית → זו הפעולה היחידה שמייצרת onChange(null).
    if (nextY === "" && nextM === "" && nextD === "") {
      setError(null);
      onChange?.(null);
      return;
    }

    const { iso, error: err } = validate(nextY, nextM, nextD, { minYear, maxYear, disableFuture });
    setError(err);
    // draft חלקי/לא-תקין (iso===null, לא all-empty) → נשאר מקומי בלבד, לא נוגע ב-parent.
    if (iso) onChange?.(iso);
  }

  const sel = {
    padding: "9px 8px", borderRadius: 8, border: `1px solid ${error ? "#c0453c" : "var(--line,#e6e8ec)"}`,
    background: "var(--card,var(--bg,#fff))", color: "var(--ink,#1b1d22)", fontFamily: "inherit", fontSize: 14.5,
  };
  // רשימת-הימים תמיד כוללת גם את הבחירה-הנוכחית של המשתמש (גם אם היא כרגע מחוץ-לתחום) —
  // כדי שהתצוגה תישאר "מה שהמשתמש בחר", לא תיעלם/תוחלף בשקט.
  const days = useMemo(() => {
    const bound = daysInMonth(y, Number(m) || null);
    const base = Array.from({ length: bound }, (_, i) => i + 1);
    const dn = Number(d);
    if (dn && !base.includes(dn)) base.push(dn);
    return base;
  }, [y, m, d]);

  return (
    <div>
      <div dir="ltr" style={{ display: "flex", gap: 6 }} aria-required={required || undefined} aria-invalid={!!error}>
        <select aria-label="יום" value={d} onChange={e => pick(y, m, e.target.value)} style={{ ...sel, flex: "0 0 66px" }}>
          <option value="">יום</option>
          {days.map(dd => <option key={dd} value={dd}>{dd}</option>)}
        </select>
        <select aria-label="חודש" value={m} onChange={e => pick(y, e.target.value, d)} style={{ ...sel, flex: "1 1 100px" }}>
          <option value="">חודש</option>
          {MONTHS.map((label, i) => <option key={i + 1} value={i + 1}>{label}</option>)}
        </select>
        {/* שנה = הקלדה ישירה (type=number) — לא select ענק, לא גלילה. אפשר להקליד "1975" ישר.
            min/max כאן הם רמז-UX בלבד (רק אם caller סיפק) — האימות האמיתי ב-validate() למעלה. */}
        <input
          aria-label="שנה" type="number" inputMode="numeric" placeholder="שנה" value={y}
          {...(minYear != null ? { min: minYear } : {})} {...(maxYear != null ? { max: maxYear } : {})}
          onChange={e => pick(e.target.value, m, d)}
          style={{ ...sel, flex: "0 0 82px", textAlign: "center" }}
        />
      </div>
      {error && <div style={{ color: "#c0453c", fontSize: 11.5, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

export { toIso as humanDateToIso, parseIso as humanDateFromIso };
