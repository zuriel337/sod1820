import React, { useState } from "react";
import { recordFeedback, voteTranslit, alreadyAnswered, markAnswered } from "../lib/feedback.js";

// 🎯 משוב אוניברסלי — «מצאנו את מה שחיפשת?». רכיב אחד לכל האתר (חיפוש/תעתוק/AI/פוסטים/גלריה/דילוגים).
// staging (בקשת צוריאל): 2A שאלה עדינה 👍/👎 · 2B «למה התכוונת?» (אם יש אפשרויות) · 2C «איך היית כותב בעברית?».
// props:
//   context   — 'search' | 'translit' | 'number' | 'ai' | ...   (חופשי)
//   query     — מה חיפש (למפתח-זיכרון ולרישום)
//   target    — ישות-יעד אופציונלית (מספר/slug)
//   inputNorm — למידת-תעתוק: מפתח מנורמל להצבעה (confirm/reject/alt). אם null → משוב בלבד.
//   options   — [{label, hebrew}] להצגה ב-2B (אופציונלי)
//   tone      — 'light' (ברירת-מחדל, סביבת-מחקר) | 'dark' (דף-מספר זהב)
export default function FoundItFeedback({ context, query, target = null, inputNorm = null, options = [], tone = "light" }) {
  const key = `${context}:${(query || "").toLowerCase()}`;
  const [stage, setStage] = useState(alreadyAnswered(key) ? "done" : "ask"); // ask | why | write | thanks | done
  const [txt, setTxt] = useState("");

  if (stage === "done") return null;

  const C = tone === "dark"
    ? { fg: "#e8ddc0", sub: "#b9a877", line: "rgba(212,175,55,.35)", chip: "rgba(212,175,55,.10)", ok: "#7bbf7b", no: "#d98a92", accent: "#e9c86a" }
    : { fg: "#1b1d22", sub: "#5b6472", line: "#dfe3ea", chip: "#f6f7f9", ok: "#2e9e5b", no: "#c0566a", accent: "#2f6df6" };

  const wrap = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10,
    padding: "7px 11px", border: `1px solid ${C.line}`, borderRadius: 999, background: C.chip, fontSize: 13 };
  const btn = (bg) => ({ cursor: "pointer", border: `1px solid ${C.line}`, background: "transparent", color: bg,
    borderRadius: 999, padding: "3px 12px", fontSize: 13, fontWeight: 700, minHeight: 30 });

  const done = () => { markAnswered(key); setStage("thanks"); setTimeout(() => setStage("done"), 2600); };

  const yes = () => { recordFeedback(context, "found", { query, target }); if (inputNorm) voteTranslit(inputNorm, "confirm"); done(); };
  const no = () => {
    recordFeedback(context, "not_found", { query, target });
    if (inputNorm) voteTranslit(inputNorm, "reject");
    setStage(options.length ? "why" : "write");
  };
  const pick = (opt) => {
    recordFeedback(context, "partial", { query, target, detail: opt.hebrew || opt.label });
    if (inputNorm && opt.hebrew) voteTranslit(inputNorm, "alt", opt.hebrew);
    done();
  };
  const submitText = () => {
    const t = txt.trim(); if (!t) return;
    recordFeedback(context, "not_found", { query, target, detail: t });
    if (inputNorm && /[א-ת]/.test(t)) voteTranslit(inputNorm, "alt", t);
    done();
  };

  if (stage === "thanks") {
    return <div style={{ ...wrap, color: C.ok }}>✨ תודה! עזרת לשפר את מנוע השפה.</div>;
  }
  if (stage === "why") {
    return (
      <div style={{ ...wrap, borderRadius: 14 }}>
        <span style={{ color: C.sub, fontWeight: 700 }}>למה התכוונת?</span>
        {options.slice(0, 3).map((o, i) => (
          <button key={i} onClick={() => pick(o)} style={btn(C.fg)}>{o.label}</button>
        ))}
        <button onClick={() => setStage("write")} style={btn(C.sub)}>משהו אחר…</button>
      </div>
    );
  }
  if (stage === "write") {
    return (
      <div style={{ ...wrap, borderRadius: 14 }}>
        <span style={{ color: C.sub, fontWeight: 700 }}>איך היית כותב את זה בעברית?</span>
        <input value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === "Enter" && submitText()}
          placeholder="בעברית…" dir="rtl" style={{ flex: 1, minWidth: 120, fontSize: 16, padding: "5px 10px",
            border: `1px solid ${C.line}`, borderRadius: 10, background: "transparent", color: C.fg }} />
        <button onClick={submitText} style={{ ...btn(C.accent), borderColor: C.accent }}>שלח</button>
      </div>
    );
  }
  // 2A — השאלה העדינה
  return (
    <div style={wrap}>
      <span style={{ color: C.sub }}>🎯 מצאנו את מה שחיפשת?</span>
      <button onClick={yes} style={btn(C.ok)}>👍 כן</button>
      <button onClick={no} style={btn(C.no)}>👎 לא</button>
    </div>
  );
}
