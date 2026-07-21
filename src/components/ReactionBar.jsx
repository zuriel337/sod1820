import React, { useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId } from "../lib/tracking.js";
import { supabase } from "../lib/supabase.js";

// 👍 ReactionBar — ריאקציות לתרומת-מחקר. עמודת reactions jsonb: { "👍": ["uid|v:visitor", …] }.
// toggle דרך RPC (per-user/visitor), עדכון אופטימי. פתוח גם לאורח (v:<visitor>). מקור-אמת אחד.
const EMOJIS = ["👍", "💡", "🔥", "🙏", "✨"];

export default function ReactionBar({ id, reactions = {}, compact = false }) {
  const P = usePalette();
  const { user } = useAuth();
  const myKey = user?.id || ("v:" + getVisitorId());
  const [rx, setRx] = useState(reactions || {});
  const [busy, setBusy] = useState(false);

  const count = (e) => (Array.isArray(rx[e]) ? rx[e].length : 0);
  const mine = (e) => Array.isArray(rx[e]) && rx[e].includes(myKey);

  const toggle = async (e) => {
    if (busy || !id) return;
    setBusy(true);
    setRx(prev => {
      const arr = Array.isArray(prev[e]) ? [...prev[e]] : [];
      const i = arr.indexOf(myKey);
      if (i >= 0) arr.splice(i, 1); else arr.push(myKey);
      return { ...prev, [e]: arr };
    });
    try {
      const { data } = await supabase.rpc("toggle_contribution_reaction", { p_id: id, p_emoji: e, p_visitor: user ? null : getVisitorId() });
      if (data && typeof data === "object") setRx(data);
    } catch { /* משאירים אופטימי */ }
    setBusy(false);
  };

  // תצוגה קומפקטית (רשימת-פורום) — רק ריאקציות שקיימות, לא-לחיץ
  if (compact) {
    const active = EMOJIS.filter(e => count(e) > 0);
    if (!active.length) return null;
    return (
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center", color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>
        {active.map(e => <span key={e} style={{ display: "inline-flex", gap: 2 }}>{e}<span style={{ fontVariantNumeric: "tabular-nums" }}>{count(e)}</span></span>)}
      </span>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {EMOJIS.map(e => {
        const c = count(e), on = mine(e);
        return (
          <button key={e} onClick={() => toggle(e)} disabled={busy} aria-pressed={on} title={on ? "בטל" : "הגב"}
            style={{ cursor: busy ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, padding: "3px 10px",
              border: `1px solid ${on ? P.accent : P.border}`, background: on ? "rgba(212,175,55,0.15)" : "transparent",
              color: on ? P.accentText : P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
            <span style={{ fontSize: 14 }}>{e}</span>{c > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{c}</span>}
          </button>
        );
      })}
    </div>
  );
}
