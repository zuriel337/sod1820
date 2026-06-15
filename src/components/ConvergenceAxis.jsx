import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, F } from "../theme.js";
import { getTopicCards } from "../lib/supabase.js";

// ===== ציר ההתכנסות — הציר המשתקף מול ציר המספרים =====
// רשימת כרטיסי נושא (מאושרים) לפי עוצמה, עם כוכבים. לחיצה → עמוד הכרטיס (/topic/:slug).
// activeNumber: אם נמסר — נדלקים הכרטיסים שמכילים אותו (גשר לציר המספרים).
function stars(q) {
  const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export default function ConvergenceAxis({ activeNumber = null, onPickNumber, title = "✦ ציר ההתכנסות", max = 12 }) {
  const [cards, setCards] = useState(null);
  const nav = useNavigate();
  useEffect(() => {
    let live = true;
    getTopicCards({ approvedOnly: true }).then(c => { if (live) setCards(c || []); }).catch(() => setCards([]));
    return () => { live = false; };
  }, []);

  if (cards === null) return <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, padding: 14 }}>טוען…</div>;
  if (!cards.length) return null;

  const view = cards.slice(0, max);
  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, fontWeight: 700, textAlign: "center", marginBottom: 14 }}>{title}</div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
        <span aria-hidden style={{ position: "absolute", top: 6, bottom: 6, insetInlineStart: 14, width: 2, transform: "translateX(-50%)", background: `linear-gradient(${C.border}, ${C.gold}, ${C.border})`, borderRadius: 2 }} />
        {view.map(card => {
          const lit = activeNumber != null && (card.numbers || []).includes(Number(activeNumber));
          const dim = activeNumber != null && !lit;
          const hot = (card.highlight_numbers || [])[0];
          return (
            <button key={card.id} onClick={() => nav(`/topic/${encodeURIComponent(card.slug)}`)}
              title={card.subtitle || card.title}
              style={{
                cursor: "pointer", textAlign: "right", display: "flex", alignItems: "center", gap: 10,
                background: lit ? "linear-gradient(135deg, rgba(212,175,55,0.22), rgba(8,5,2,0.4))" : C.surface2,
                border: `1px solid ${lit ? C.gold : C.border}`, borderRadius: 12, padding: "10px 12px 10px 14px",
                opacity: dim ? 0.45 : 1, transition: "opacity .2s, border-color .2s",
                position: "relative", paddingInlineStart: 30,
              }}>
              <span aria-hidden style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translate(-50%,-50%)", width: 11, height: 11, borderRadius: "50%", border: `2px solid ${C.gold}`, background: lit ? C.gold : C.bg, boxShadow: lit ? `0 0 8px ${C.gold}` : "none" }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", color: lit ? C.goldBright : C.goldLight, fontFamily: F.regal, fontSize: 15.5, fontWeight: 700, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.title}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                  <span style={{ color: C.gold, fontSize: 10, letterSpacing: 1 }}>{stars(card.quality)}</span>
                  {hot != null && <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 11.5, fontWeight: 700 }}>{hot}</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
