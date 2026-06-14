import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { C, F, KEY_NUMBERS } from "../theme.js";
import { supabase } from "../lib/supabase.js";

// ===== הצלבת שיטות — "מסר מצטרף לפי מספר" =====
// מזינים מספר. המערכת שולפת את כל הביטויים *המאומתים* שנופלים על המספר הזה בכל שיטה,
// ומציגה אותם מקובצים לפי שיטה — כך שמתקבל מסר אחד שכל השיטות מתכנסות אליו.
// מקור: gematria_words (is_verified=true). השדות הם עמודות-השיטה במסד.

// סדר התצוגה + השמות התואמים לעמודות המסד.
const METHOD_COLS = [
  { col: "ragil",    name: "רגיל",   sub: "חיבור ערכי האותיות" },
  { col: "miluy",    name: "מילוי",  sub: "ערך שֵם האות המלא" },
  { col: "misratar", name: "מסתתר",  sub: "הפרשים בין אותיות" },
  { col: "kadmi",    name: "קדמי",   sub: "סכום מצטבר עד האות" },
  { col: "gadol",    name: "גדול",   sub: "סופיות 500–900" },
  { col: "siduri",   name: "סידורי", sub: "מיקום האות 1–22" },
  { col: "atbash",   name: "אתבש",   sub: "היפוך הא״ב" },
  { col: "albam",    name: "אלבם",   sub: "חצי מול חצי" },
  { col: "ribua",    name: "ריבוע",  sub: "ערך בריבוע" },
];
const SELECT = "phrase,category," + METHOD_COLS.map(m => m.col).join(",");
const TOTAL_METHODS = METHOD_COLS.length;

const SAMPLES = [1820, 313, 326, 322, 1234, 776, 86];

export default function CrossMethodPage() {
  const [input, setInput] = useState("1820");
  const [num, setNum] = useState(1820);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = `הצלבת שיטות · ${num} · סוד 1820`; }, [num]);

  useEffect(() => {
    let live = true;
    if (!num || num <= 0) { setRows([]); return; }
    setLoading(true);
    const orFilter = METHOD_COLS.map(m => `${m.col}.eq.${num}`).join(",");
    supabase.from("gematria_words").select(SELECT)
      .eq("is_verified", true).or(orFilter).limit(800)
      .then(({ data }) => { if (live) { setRows(data || []); setLoading(false); } });
    return () => { live = false; };
  }, [num]);

  // קיבוץ לפי שיטה — לכל שיטה רשימת הביטויים שנופלים על המספר בה.
  const groups = useMemo(() => {
    return METHOD_COLS
      .map(m => ({ ...m, phrases: [...new Set(rows.filter(r => r[m.col] === num).map(r => r.phrase))] }))
      .filter(g => g.phrases.length > 0)
      .sort((a, b) => b.phrases.length - a.phrases.length);
  }, [rows, num]);

  const allPhrases = useMemo(() => [...new Set(rows.map(r => r.phrase))], [rows]);
  const methodsHit = groups.length;
  const meaning = KEY_NUMBERS[num];

  function go(v) {
    const n = parseInt(String(v).replace(/[^\d]/g, ""), 10);
    if (n > 0) { setNum(n); setInput(String(n)); }
  }
  function submit(e) { e.preventDefault(); go(input); }

  return (
    <div style={{ direction: "rtl", maxWidth: 1040, margin: "0 auto", padding: "26px 16px 80px", color: C.muted }}>

      {/* כותרת */}
      <header style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>הצלבת שיטות</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, margin: "6px 0 8px", textShadow: `0 0 40px ${C.goldDeep}` }}>
          המסר המצטרף שמאחורי המספר
        </h1>
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, maxWidth: 640, margin: "0 auto" }}>
          כל הביטויים <b style={{ color: C.goldLight }}>המאומתים</b> שנופלים על אותו מספר — בכל שיטה ושיטה.
          כשמספר אחד הוא נקודת מפגש של שיטות רבות, הביטויים סביבו נקראים יחד כמסר.
        </p>
      </header>

      {/* קלט */}
      <form onSubmit={submit} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} inputMode="numeric"
          placeholder="הקלידו מספר…"
          style={{ background: C.surface, border: `1px solid ${C.borderGold}`, borderRadius: 999, color: C.goldBright, fontFamily: F.mono, fontSize: 18, padding: "10px 22px", outline: "none", textAlign: "center", width: 160, letterSpacing: 1 }} />
        <button type="submit" style={btn}>הצלב ✦</button>
      </form>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
        {SAMPLES.map(s => (
          <button key={s} onClick={() => go(s)} style={{ ...chip, ...(s === num ? chipOn : {}) }}>{s}</button>
        ))}
      </div>

      {/* המספר + סיכום */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: "clamp(44px,11vw,84px)", fontWeight: 800, lineHeight: 1, textShadow: `0 0 50px ${C.goldDeep}` }}>{num}</div>
        {meaning && <div style={{ color: C.gold, fontFamily: F.regal, fontSize: 16, marginTop: 6 }}>{meaning}</div>}
        <div style={{ marginTop: 12, display: "inline-flex", gap: 18, flexWrap: "wrap", justifyContent: "center", color: C.muted, fontFamily: F.body, fontSize: 13.5 }}>
          <span>מתכנס ב־<b style={{ color: C.goldLight, fontFamily: F.mono, fontSize: 16 }}>{methodsHit}</b> מתוך {TOTAL_METHODS} שיטות</span>
          <span>·</span>
          <span><b style={{ color: C.goldLight, fontFamily: F.mono, fontSize: 16 }}>{allPhrases.length}</b> ביטויים מאומתים</span>
          {methodsHit === TOTAL_METHODS && (
            <span style={{ color: C.goldBright, fontWeight: 700 }}>✦ התכנסות מלאה</span>
          )}
        </div>
      </div>

      {/* מצב */}
      {loading && <div style={{ textAlign: "center", color: C.goldDim, fontFamily: F.body, padding: 30 }}>טוען…</div>}
      {!loading && allPhrases.length === 0 && (
        <div style={{ textAlign: "center", color: C.goldDim, fontFamily: F.body, padding: 30 }}>
          אין ביטוי מאומת שנופל על {num} באף שיטה. נסו מספר אחר.
        </div>
      )}

      {/* טבלת השיטות */}
      {!loading && groups.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {groups.map(g => (
            <section key={g.col} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 10 }}>
                <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>{g.name}</span>
                <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 11.5 }}>{g.sub}</span>
                <span style={{ flex: 1 }} />
                <span style={{ color: C.gold, fontFamily: F.mono, fontSize: 13 }}>{g.phrases.length}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {g.phrases.map(p => (
                  <Link key={p} to={`/number/${encodeURIComponent(p)}`} style={phraseChip}>{p}</Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* רצועת המסר — כל הביטויים יחד */}
      {!loading && allPhrases.length > 1 && (
        <section style={{ marginTop: 26, background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`, border: `1px solid ${C.borderGold}`, borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>
            המסר המצטרף · {num}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", lineHeight: 2 }}>
            {allPhrases.map((p, i) => (
              <React.Fragment key={p}>
                <Link to={`/number/${encodeURIComponent(p)}`} style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 17, textDecoration: "none" }}>{p}</Link>
                {i < allPhrases.length - 1 && <span style={{ color: C.goldDim }}>·</span>}
              </React.Fragment>
            ))}
          </div>
        </section>
      )}

      <div style={{ textAlign: "center", marginTop: 26 }}>
        <Link to="/beit-midrash" style={{ ...chip, textDecoration: "none" }}>← לבית המדרש</Link>
      </div>
    </div>
  );
}

const btn = { cursor: "pointer", background: C.goldDeep, color: C.goldBright, border: `1px solid ${C.borderGold}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "10px 20px" };
const chip = { cursor: "pointer", background: C.surface, color: C.goldLight, border: `1px solid ${C.border}`, borderRadius: 999, fontFamily: F.mono, fontSize: 14, padding: "7px 16px" };
const chipOn = { borderColor: C.gold, color: C.goldBright, background: C.surface2 };
const phraseChip = { background: C.surface2, color: C.goldLight, border: `1px solid ${C.border}`, borderRadius: 999, fontFamily: F.body, fontSize: 13.5, padding: "5px 12px", textDecoration: "none" };
