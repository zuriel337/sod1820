import React, { useEffect, useId, useRef, useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId } from "../lib/tracking.js";
import { supabase } from "../lib/supabase.js";
import { commitReactionMutation, isReactionBoostMap } from "../lib/reactionMutation.js";

// 👍 ReactionBar — ריאקציות לתרומת-מחקר. עמודת reactions jsonb: { "👍": ["uid|v:visitor", …] }.
// toggle דרך RPC (per-user/visitor), עדכון אופטימי. פתוח גם לאורח (v:<visitor>). מקור-אמת אחד.
// 👑 בוסט-אדמין: reaction_boosts jsonb { "👍": N } — מונה נוסף שרק אדמין מעלה (admin_boost_reaction).
//    סך-התצוגה = אורך-המערך + הבוסט → «רק אני כמנהל יכול לתת יותר מלייק אחד». האכיפה בשרת (role=admin).
// variant: undefined=בר מלא (5 אימוג'ים) · "compact"=סיכום קריא-בלבד · "row"=לייק-יחיד לחיץ לשורת-פיד.
const EMOJIS = ["👍", "💡", "🔥", "🙏", "✨"];

// Controlled design preview: never mount live auth/visitor/RPC behavior for fixtures.
export default function ReactionBar(props) {
  if (props.preview) {
    const { count, selected, onToggle, iconOnly = false } = props.preview;
    return <button type="button" className="sod29-community-like" aria-pressed={selected} aria-label={selected ? "ביטול לייק לדוגמה" : "אהבתי · לדוגמה"} onClick={onToggle}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 10H3v11h4M7 10l5-7c1.5 0 2 1 1.6 2.6L13 9h6a2 2 0 0 1 2 2.5l-1.7 7.9A2 2 0 0 1 17.3 21H7V10Z" /></svg>
      {!iconOnly ? <span>אהבתי</span> : null}{Number.isFinite(count) ? <span className="sod29-community-like-count">{count}</span> : null}
    </button>;
  }
  return <LiveReactionBar {...props} />;
}

function LiveReactionBar({ id, reactions = {}, boosts = {}, compact = false, variant, allowBoost = true, requireAccount = false }) {
  const P = usePalette();
  const { user, isAdmin } = useAuth();
  const myKey = user?.id || ("v:" + getVisitorId());
  const [rx, setRx] = useState(reactions || {});
  const [bx, setBx] = useState(boosts || {});   // 👑 בוסטים (אדמין)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const errorId = useId();
  const principal = useRef(null);
  const identity = `${id}:${myKey}`;
  principal.current = identity;
  useEffect(() => {
    principal.current = identity;
    setRx(reactions || {}); setBx(boosts || {}); setBusy(false); setError("");
    return () => { principal.current = null; };
  }, [identity]);

  const boostOf = (e) => Number(bx[e]) || 0;
  // OpenWeb's imported archive stores its historical 👍 count in reactions.likes.
  // New reactions keep using the canonical per-identity array. Both are displayed,
  // while the server continues to toggle only the canonical array.
  const historicalLikes = Number(rx?.likes) > 0 ? Number(rx.likes) : 0;
  const count = (e) => (Array.isArray(rx[e]) ? rx[e].length : 0) + (e === "👍" ? historicalLikes : 0) + boostOf(e);
  const mine = (e) => Array.isArray(rx[e]) && rx[e].includes(myKey);

  const toggle = async (e) => {
    if (busy || !id || requireAccount && !user) return;
    const owner = principal.current;
    const current = () => principal.current === owner;
    setBusy(true);
    setError("");
    const arr = Array.isArray(rx[e]) ? [...rx[e]] : [];
    const i = arr.indexOf(myKey);
    if (i >= 0) arr.splice(i, 1); else arr.push(myKey);
    const saved = await commitReactionMutation({
      previous: rx,
      optimistic: { ...rx, [e]: arr },
      request: () => supabase.rpc("toggle_contribution_reaction", { p_id: id, p_emoji: e, p_visitor: user ? null : getVisitorId() }),
      apply: value => { if (current()) setRx(value); },
    });
    if (current()) { if (!saved) setError("לא נשמרה התגובה. נסו שוב."); setBusy(false); }
  };

  // 👑 בוסט-אדמין — כל הקשה = עוד לייק (delta=+1) / הפחתה (delta=-1). נאכף בשרת ל-role='admin'.
  const boost = async (e, delta) => {
    if (busy || !id || !isAdmin || !allowBoost) return;
    const owner = principal.current;
    const current = () => principal.current === owner;
    setBusy(true);
    setError("");
    const saved = await commitReactionMutation({
      previous: bx,
      optimistic: { ...bx, [e]: Math.max(0, (Number(bx[e]) || 0) + delta) },
      request: () => supabase.rpc("admin_boost_reaction", { p_id: id, p_emoji: e, p_delta: delta }),
      apply: value => { if (current()) setBx(value); },
      isValid: isReactionBoostMap,
    });
    if (current()) { if (!saved) setError("לא נשמרה התגובה. נסו שוב."); setBusy(false); }
  };

  const feedback = error ? <span id={errorId} role="alert" style={{ flexBasis: "100%", fontFamily: F.heading, fontSize: 13, color: P.accentDim }}>{error}</span> : null;

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
  const adminBoost = (e) => isAdmin && allowBoost ? (
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
      <span style={{ display: "inline-flex", flexWrap: "wrap", maxWidth: "100%", alignItems: "center", gap: 4 }} onClick={(ev) => ev.stopPropagation()}>
        <button onClick={(ev) => { ev.stopPropagation(); toggle(e); }} disabled={busy || requireAccount && !user} aria-pressed={on} aria-describedby={error ? errorId : undefined} aria-label={requireAccount && !user ? "יש להתחבר כדי לסמן אהבתי" : on ? "בטל לייק" : "אהבתי"} title={requireAccount && !user ? "יש להתחבר כדי לסמן אהבתי" : on ? "בטל לייק" : "אהבתי"}
          style={{ ...pill(e, on), minWidth: 44, minHeight: 44 }}>
          <span style={{ fontSize: 14 }}>{e}</span>{c > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{c}</span>}
        </button>
        {adminBoost(e)}
        {feedback}
      </span>
    );
  }

  // בר מלא — 5 אימוג'ים לחיצים; לאדמין נוסף ＋/－ ל-👍 (הלייק המרכזי) לבוסט מרובה.
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {EMOJIS.map(e => {
        const c = count(e), on = mine(e);
        return (
          <button key={e} onClick={() => toggle(e)} disabled={busy} aria-pressed={on} aria-describedby={error ? errorId : undefined} title={on ? "בטל" : "הגב"} style={pill(e, on)}>
            <span style={{ fontSize: 14 }}>{e}</span>{c > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{c}</span>}
          </button>
        );
      })}
      {isAdmin && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginInlineStart: 2 }}>{adminBoost("👍")}</span>}
      {feedback}
    </div>
  );
}
