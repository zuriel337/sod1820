import React, { useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId } from "../lib/tracking.js";
import { supabase } from "../lib/supabase.js";

// 👍 ReactionBar — ריאקציות לתרומת-מחקר. עמודת reactions jsonb: { "👍": ["uid|v:visitor", …] }.
// toggle דרך RPC (per-user/visitor), עדכון אופטימי. פתוח גם לאורח (v:<visitor>). מקור-אמת אחד.
// 👑 בוסט-אדמין: reaction_boosts jsonb { "👍": N } — מונה נוסף שרק אדמין מעלה (admin_boost_reaction).
//    סך-התצוגה = אורך-המערך + הבוסט → «רק אני כמנהל יכול לתת יותר מלייק אחד». האכיפה בשרת (role=admin).
// variant: undefined=בר מלא (5 אימוג'ים) · "compact"=סיכום קריא-בלבד · "row"=לייק-יחיד לחיץ לשורת-פיד.
const EMOJIS = ["👍", "💡", "🔥", "🙏", "✨"];

export default function ReactionBar({ id, reactions = {}, boosts = {}, compact = false, variant }) {
  const P = usePalette();
  const { user, isAdmin } = useAuth();
  const myKey = user?.id || ("v:" + getVisitorId());
  const [rx, setRx] = useState(reactions || {});
  const [bx, setBx] = useState(boosts || {});   // 👑 בוסטים (אדמין)
  const [busy, setBusy] = useState(false);

  const boostOf = (e) => Number(bx[e]) || 0;
  const count = (e) => (Array.isArray(rx[e]) ? rx[e].length : 0) + boostOf(e);   // סך = משתמשים + בוסט
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

  // 👑 בוסט-אדמין — כל הקשה = עוד לייק (delta=+1) / הפחתה (delta=-1). נאכף בשרת ל-role='admin'.
  const boost = async (e, delta) => {
    if (busy || !id || !isAdmin) return;
    setBusy(true);
    setBx(prev => ({ ...prev, [e]: Math.max(0, (Number(prev[e]) || 0) + delta) }));
    try {
      const { data } = await supabase.rpc("admin_boost_reaction", { p_id: id, p_emoji: e, p_delta: delta });
      if (data && typeof data === "object") setBx(data);
    } catch { /* משאירים אופטימי */ }
    setBusy(false);
  };

  // תצוגה קומפקטית (רשימת-פורום ישנה) — רק ריאקציות שקיימות, לא-לחיץ
  if (compact) {
    const active = EMOJIS.filter(e => count(e) > 0);
    if (!active.length) return null;
    return (
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center", color: P.accentDim, fontFamily: F.heading, fontSize: 12 }}>
        {active.map(e => <span key={e} style={{ display: "inline-flex", gap: 2 }}>{e}<span style={{ fontVariantNumeric: "tabular-nums" }}>{count(e)}</span></span>)}
      </span>
    );
  }

  // 🔘 מיני-כפתור בוסט-אדמין (➕/➖) — מוצג רק לאדמין, ליד הלייק
  const adminBoost = (e) => isAdmin ? (
    <>
      <button onClick={(ev) => { ev.stopPropagation(); boost(e, 1); }} disabled={busy} title="עוד לייק (מנהל)"
        style={{ cursor: busy ? "default" : "pointer", border: `1px solid ${P.border}`, background: "transparent", color: P.accentDim, borderRadius: 999, width: 22, height: 22, minWidth: 22, lineHeight: 1, fontFamily: F.heading, fontSize: 13, fontWeight: 900, padding: 0 }}>＋</button>
      {boostOf(e) > 0 && (
        <button onClick={(ev) => { ev.stopPropagation(); boost(e, -1); }} disabled={busy} title="הפחת לייק (מנהל)"
          style={{ cursor: busy ? "default" : "pointer", border: `1px solid ${P.border}`, background: "transparent", color: P.accentDim, borderRadius: 999, width: 22, height: 22, minWidth: 22, lineHeight: 1, fontFamily: F.heading, fontSize: 13, fontWeight: 900, padding: 0 }}>－</button>
      )}
    </>
  ) : null;

  const pill = (e, on) => ({
    cursor: busy ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, padding: "3px 10px",
    border: `1px solid ${on ? P.accent : P.border}`, background: on ? "rgba(212,175,55,0.15)" : "transparent",
    color: on ? P.accentText : P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700, lineHeight: 1,
  });

  // 🟨 variant="row" — לייק-יחיד (👍) לחיץ לשורת-הפיד, + בוסט-אדמין. קליל, לא פותח את השורה.
  if (variant === "row") {
    const e = "👍", c = count(e), on = mine(e);
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }} onClick={(ev) => ev.stopPropagation()}>
        <button onClick={(ev) => { ev.stopPropagation(); toggle(e); }} disabled={busy} aria-pressed={on} title={on ? "בטל לייק" : "אהבתי"}
          style={pill(e, on)}>
          <span style={{ fontSize: 14 }}>{e}</span>{c > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{c}</span>}
        </button>
        {adminBoost(e)}
      </span>
    );
  }

  // בר מלא — 5 אימוג'ים לחיצים; לאדמין נוסף ＋/－ ל-👍 (הלייק המרכזי) לבוסט מרובה.
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {EMOJIS.map(e => {
        const c = count(e), on = mine(e);
        return (
          <button key={e} onClick={() => toggle(e)} disabled={busy} aria-pressed={on} title={on ? "בטל" : "הגב"} style={pill(e, on)}>
            <span style={{ fontSize: 14 }}>{e}</span>{c > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{c}</span>}
          </button>
        );
      })}
      {isAdmin && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginInlineStart: 2 }}>{adminBoost("👍")}</span>}
    </div>
  );
}
