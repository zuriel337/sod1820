import React, { useState, useMemo, useEffect } from "react";
import { METHODS, DEPTH_METHODS, methodLabel, onlyHeb, methodResultText } from "../lib/gematria.js";
import { getGematriaByValue, getAiAnalysis } from "../lib/supabase.js";
import { emit, EVENTS } from "../lib/research/eventBus.js";

// 🔬 רכיב קנוני יחיד (canonical_ui_components_law): «נתח שיטה בודדת».
// בוחרים שם/ביטוי → בוחרים שיטה אחת מ-20 השיטות → ניתוח-AI שממוקד *רק* בערך של אותה שיטה
// ובמה שמתכנס עליו. מוטמע דרך props במחשבון, בדף-השם וב-name-lab — בלי לשכפל קוד.
// עובדה≠פרשנות, בלי נבואות (חוקי-הברזל של ai-analyze). ה-AI מפרש עובדות-מנוע בלבד.

const ALL_METHODS = [...METHODS, ...DEPTH_METHODS];

export default function MethodAnalyze({ word, defaultMethod = "רגיל", title = "🔬 נתח שיטה בודדת" }) {
  const term = String(word || "").trim();
  const heb = onlyHeb(term);

  // ערכי כל 20 השיטות למילה הנוכחית (חישוב-לקוח, זהה למנוע — משמש בכל האתר).
  const values = useMemo(
    () => ALL_METHODS.map(m => ({ key: m.key, soul: m.soul, value: m.fn(term) })).filter(r => r.value > 0),
    [term]
  );

  const [method, setMethod] = useState(defaultMethod);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [matches, setMatches] = useState([]);

  // מילה חדשה → איפוס הניתוח (לא נשארים עם טקסט של מילה קודמת).
  useEffect(() => { setText(""); setMatches([]); setBusy(false); }, [term]);

  if (!heb.length || values.length === 0) return null;

  const sel = values.find(r => r.key === method) || values[0];
  const selValue = sel.value;
  const transform = methodResultText(sel.key, term); // תמורת-אותיות (אתבש/מילוי/לפני/אחרי…) אם רלוונטי

  async function run() {
    if (busy || !selValue) return;
    setBusy(true); setText(""); setMatches([]);
    // ביטויים ששווים לערך-השיטה (גימטריה רגילה, מאגר מאומת) = חומר ההתכנסות לפרשנות.
    let phrases = [];
    try {
      const rows = await getGematriaByValue(selValue, { limit: 12 });
      phrases = (rows || []).map(r => r.phrase).filter(p => p && p !== term);
    } catch { /* נופל בחן */ }
    setMatches(phrases);
    const label = methodLabel(sel.key);
    const subject = `${term} — שיטת «${label}» (ערך ${selValue})`;
    const facts =
      `המשתמש בחר לנתח את «${term}» רק בשיטת «${label}». ` +
      `ערך ${label} של ${term} = ${selValue} (מאומת במנוע).` +
      (transform && transform !== heb.join("") ? ` התמורה: ${term} → ${transform}.` : "") +
      (phrases.length ? ` ביטויים ששווים ${selValue} בגימטריה רגילה (מאגר מאומת): ${phrases.join(" · ")}.` : ` ל-${selValue} אין ביטויים רבים במאגר — ערך «שקט».`) +
      ` נתח אך ורק את שכבת «${label}» (${selValue}) בהקשר לשם «${term}» — מה נפגש איתה. ` +
      `הפרד עובדה (הערכים) מפרשנות (רמז), בלי נבואות, בלי טענות על אדם חי.`;
    try { emit(EVENTS.AI_ANALYZE, { subject, method: sel.key, value: selValue }); } catch { /* noop */ }
    let out = await getAiAnalysis({ kind: "number", subject, facts, fast: true });
    if (!out) { await new Promise(r => setTimeout(r, 700)); out = await getAiAnalysis({ kind: "number", subject, facts, again: true, fast: true }); }
    setText(out || "לא התקבל ניתוח כרגע — נסו שוב עוד רגע.");
    setBusy(false);
  }

  return (
    <div className="method-analyze" style={{
      margin: "16px 0", padding: "14px 14px 16px", borderRadius: 14,
      border: "1px solid rgba(201,162,75,.35)", background: "rgba(201,162,75,.06)",
      color: "inherit", fontFamily: "inherit",
    }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{title}</div>
      <div style={{ opacity: .72, fontSize: 12.5, marginBottom: 10 }}>
        בחרו שיטה אחת מתוך {values.length} — הניתוח יתמקד רק בערך שלה.
      </div>

      {/* בורר-שיטה — צ׳יפים; כל צ׳יפ מציג את ערך השיטה למילה הנוכחית */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {values.map(r => {
          const on = r.key === sel.key;
          return (
            <button key={r.key} type="button" onClick={() => { setMethod(r.key); setText(""); setMatches([]); }}
              title={r.soul || ""}
              style={{
                cursor: "pointer", borderRadius: 999, padding: "5px 11px", fontSize: 12.5,
                fontWeight: on ? 800 : 600, fontFamily: "inherit",
                border: on ? "1px solid rgba(201,162,75,.9)" : "1px solid rgba(140,140,140,.35)",
                background: on ? "rgba(201,162,75,.9)" : "transparent",
                color: on ? "#1b1400" : "inherit",
              }}>
              {methodLabel(r.key)} <b style={{ opacity: on ? .95 : .6 }}>{r.value}</b>
            </button>
          );
        })}
      </div>

      {/* מידע על השיטה הנבחרת + כפתור ניתוח */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={run} disabled={busy}
          style={{
            cursor: busy ? "wait" : "pointer", borderRadius: 10, padding: "9px 15px",
            fontSize: 14, fontWeight: 800, fontFamily: "inherit", border: "none",
            background: busy ? "rgba(201,162,75,.45)" : "rgba(201,162,75,.95)", color: "#1b1400",
          }}>
          {busy ? "🤖 מנתח…" : `🤖 נתח רק את «${methodLabel(sel.key)}» (${selValue})`}
        </button>
        {sel.soul ? <span style={{ opacity: .7, fontSize: 12.5 }}>{sel.soul}{transform && transform !== heb.join("") ? ` · ${term} → ${transform}` : ""}</span> : null}
      </div>

      {/* ביטויים מתכנסים */}
      {matches.length ? (
        <div style={{ marginTop: 12, fontSize: 12.5, opacity: .85 }}>
          <span style={{ opacity: .7 }}>שווים ל-{selValue}: </span>{matches.join(" · ")}
        </div>
      ) : null}

      {/* הניתוח */}
      {text ? (
        <div style={{ marginTop: 12, padding: "12px 13px", borderRadius: 11, background: "rgba(120,120,120,.10)", lineHeight: 1.7, fontSize: 14.5, whiteSpace: "pre-wrap" }}>
          {text}
        </div>
      ) : null}
    </div>
  );
}
