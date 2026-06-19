import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { findNameCross } from "../lib/nameCross.js";
import { shareCross } from "../lib/crossCard.js";

// 🔮 "מצא לי הצלבה" — לשם/ביטוי נתון, מוצא מילה קדושה שמתכנסת איתו בכמה שיטות.
// מנוע: findNameCross (gematria_engine_law — חישוב דרך METHODS בלבד). שיתוף ויזואלי: shareCross.
// עוגנים קדושים — אם הערך נופל על אחד מהם, מדגישים "עוגן קדוש".
const ANCHOR_SET = new Set([1820, 776, 358, 424, 604, 26, 86, 314, 543, 91, 13, 1237, 541, 137, 248, 611, 1202, 318]);

export default function CrossFinder({ term, value }) {
  const P = usePalette();
  const [status, setStatus] = useState("idle"); // idle · busy · done · none
  const [cross, setCross] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const engaged = useRef(false); // האם המשתמש כבר הפעיל — אז נרענן אוטומטית בכל שם חדש

  const find = useCallback(async () => {
    engaged.current = true;
    setStatus("busy"); setCross(null);
    try {
      const c = await findNameCross(term);
      if (c && c.matchCount >= 2) { setCross(c); setStatus("done"); }
      else setStatus("none");
    } catch { setStatus("none"); }
  }, [term]);

  // שם/ביטוי חדש → לנקות תוצאה ישנה; אם המשתמש כבר הפעיל פעם — לרענן לבד (בלי "עוד אחת")
  useEffect(() => {
    setCross(null);
    if (engaged.current) find();
    else setStatus("idle");
  }, [term, find]);

  const crossItem = cross ? {
    id: "cross-" + term,
    title: `${term} = ${cross.partner}`,
    method_tags: cross.methods.map(m => m.label),
    related_numbers: [cross.value],
    gematria_pairs: { members: [
      { phrase: term, ragil: cross.value, mistater: cross.mistater },
      { phrase: cross.partner, ragil: cross.value, mistater: cross.mistater },
    ] },
  } : null;
  const doShare = async () => { if (shareBusy || !crossItem) return; setShareBusy(true); try { await shareCross(crossItem); } finally { setShareBusy(false); } };

  const anchorMethod = cross && cross.methods.find(m => ANCHOR_SET.has(m.value));

  return (
    <div style={{ background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "16px 16px 18px", boxShadow: `0 4px 22px ${P.glow}` }}>
      <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>✦ ההצלבה הנסתרת</div>
      <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.65, marginBottom: 12 }}>
        איזו מילה או מושג קדוש מתחבא ב«{term}» — נופל על אותו ערך בכמה שיטות שונות?
      </div>

      {status === "idle" && (
        <button onClick={find} style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, padding: "11px 24px" }}>
          🔮 מצא לי הצלבה
        </button>
      )}

      {status === "busy" && (
        <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13.5, padding: "6px 0" }}>🔍 סורק את המאגר…</div>
      )}

      {status === "none" && (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7 }}>
          לא נמצאה הצלבה חזקה במאגר (עדיין). המאגר גדל כל הזמן — נסו במחשבון לחקור בעצמכם:
          <div style={{ marginTop: 9 }}>
            <Link to="/beit-midrash?tab=calc" style={{ textDecoration: "none", background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 999, color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "8px 16px" }}>🧮 חקרו במחשבון →</Link>
          </div>
        </div>
      )}

      {status === "done" && cross && (
        <div style={{ animation: "cf-rise .5s ease both" }}>
          <style>{`@keyframes cf-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ color: P.heroNum, fontFamily: F.regal, fontSize: "clamp(19px,4vw,26px)", fontWeight: 800 }}>{term}</span>
            <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 20, fontWeight: 800 }}>=</span>
            <Link to={`/number/${encodeURIComponent(cross.partner)}`} style={{ textDecoration: "none", color: P.heroNum, fontFamily: F.regal, fontSize: "clamp(19px,4vw,26px)", fontWeight: 800 }}>{cross.partner}</Link>
          </div>

          {anchorMethod && (
            <div style={{ textAlign: "center", color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>
              ✨ עוגן קדוש — {anchorMethod.value} ב{anchorMethod.label}
            </div>
          )}

          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
            {cross.methods.slice(0, 8).map(m => {
              const anc = ANCHOR_SET.has(m.value);
              return (
                <span key={m.col} style={{ fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, color: anc ? P.accentText : P.accentDim, background: anc ? "rgba(201,162,39,0.16)" : P.card, border: `1px solid ${anc ? P.borderStrong : P.border}`, borderRadius: 999, padding: "3px 10px" }}>
                  {anc ? "✨ " : ""}{m.label} = {m.value}
                </span>
              );
            })}
          </div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, textAlign: "center", marginTop: 8 }}>
            {cross.matchCount} שיטות מסכימות — עובדה גימטרית, לא פרשנות.
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
            <button onClick={doShare} disabled={shareBusy} style={{ cursor: shareBusy ? "wait" : "pointer", background: "linear-gradient(135deg,#e9c84a,#9a7818)", color: "#1a0e00", border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, padding: "11px 24px" }}>
              {shareBusy ? "מכין…" : "✦ שתפו את ההצלבה"}
            </button>
            <button onClick={find} style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 999, fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "11px 18px" }}>↺ עוד אחת</button>
          </div>
        </div>
      )}
    </div>
  );
}
