import React, { useMemo, useState, useEffect } from "react";

// 📅 Human Date Input — human_date_input_law (29.8.2026).
// חוזה-מוצר: תאריך שהאדם יודע (לידה / אירוע / תאריך היסטורי-אישי) — האדם צריך להיות
// מסוגל להזין אותו ישירות: יום / חודש / שנה, כל אחד בנפרד, בלי גלילה ארוכה דרך
// native <input type="date"> (על מובייל הופך ל-wheel-picker שמתחיל מהיום ולא מאפשר הקלדה —
// למי שנולד ב-1975 זו גלילה של עשרות "קליקים" בשנים בלבד).
//
// ה-UI לא משנה את מודל-הנתונים: value/onChange הם תמיד "YYYY-MM-DD" קנוני (או null/""),
// זהה למה שה-DB/RPC מצפים לו כבר היום — אין schema חדש בשביל UX.
//
// EXTENSION POINT NOW (לא מומש): year-only / month+year / approximate-date. מודל-הפנים כאן
// (day/month/year נפרדים) לא חוסם הרחבה עתידית כזו, אבל היא לא נבנית עכשיו — value/onChange
// דורשים תאריך מלא כל עוד ה-DB דורש תאריך מלא.

function daysInMonth(year, month) {
  // month: 1-12. new Date(year, month, 0) = היום האחרון של month-1 → מספר-הימים הנכון,
  // כולל שנה מעוברת (28/29 בפברואר) בלי טבלת-קפיצה ידנית.
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
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
  if (!y || !m || !d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function HumanDateInput({
  value, onChange, minYear = 1900, maxYear = new Date().getFullYear(), disableFuture = false, required = false,
}) {
  const [y, setY] = useState(() => parseIso(value).y);
  const [m, setM] = useState(() => parseIso(value).m);
  const [d, setD] = useState(() => parseIso(value).d);

  // ערך חיצוני חדש (למשל טעינת פרופיל אחרי mount) → עדכן פנימה. לא לרוץ על כל הקלדה פנימית.
  useEffect(() => {
    const p = parseIso(value);
    setY(p.y); setM(p.m); setD(p.d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const maxD = useMemo(() => daysInMonth(Number(y) || null, Number(m) || null), [y, m]);
  const today = useMemo(() => new Date(), []);
  const isFuture = (yy, mm, dd) => {
    if (!disableFuture || !yy || !mm || !dd) return false;
    const cand = new Date(Number(yy), Number(mm) - 1, Number(dd));
    return cand > today;
  };

  function commit(nextY, nextM, nextD) {
    // חודש התקצר (לדוגמה מ-31-יולי ל-פברואר) → מהדקים את היום לטווח-החוקי, לא מוחקים בחירה.
    const bound = daysInMonth(Number(nextY) || null, Number(nextM) || null);
    let d2 = nextD && Number(nextD) > bound ? String(bound) : nextD;
    if (isFuture(nextY, nextM, d2)) { nextY = String(today.getFullYear()); nextM = String(today.getMonth() + 1); d2 = String(today.getDate()); }
    setY(nextY); setM(nextM); setD(d2);
    onChange?.(toIso(nextY, nextM, d2));
  }

  const sel = {
    padding: "9px 8px", borderRadius: 8, border: "1px solid var(--line,#e6e8ec)",
    background: "var(--card,var(--bg,#fff))", color: "var(--ink,#1b1d22)", fontFamily: "inherit", fontSize: 14.5,
  };
  const days = useMemo(() => Array.from({ length: maxD }, (_, i) => i + 1), [maxD]);

  return (
    <div dir="ltr" style={{ display: "flex", gap: 6 }} aria-required={required || undefined}>
      <select aria-label="יום" value={d} onChange={e => commit(y, m, e.target.value)} style={{ ...sel, flex: "0 0 66px" }}>
        <option value="">יום</option>
        {days.map(dd => <option key={dd} value={dd}>{dd}</option>)}
      </select>
      <select aria-label="חודש" value={m} onChange={e => commit(y, e.target.value, d)} style={{ ...sel, flex: "1 1 100px" }}>
        <option value="">חודש</option>
        {MONTHS.map((label, i) => <option key={i + 1} value={i + 1}>{label}</option>)}
      </select>
      {/* שנה = הקלדה ישירה (type=number) — לא select ענק, לא גלילה. אפשר להקליד "1975" ישר. */}
      <input
        aria-label="שנה" type="number" inputMode="numeric" placeholder="שנה" value={y}
        min={minYear} max={maxYear}
        onChange={e => commit(e.target.value, m, d)}
        style={{ ...sel, flex: "0 0 82px", textAlign: "center" }}
      />
    </div>
  );
}

export { toIso as humanDateToIso, parseIso as humanDateFromIso };
