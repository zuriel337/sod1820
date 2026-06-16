import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { openNumberDrawer } from "../lib/numberDrawer.js";
import { C, F } from "../theme.js";

// 🧬 מד ההתכנסות — כמה שכבות בלתי-תלויות מסכימות על המספר. ציון 0-100 + 🥉🥈🥇.
// שכבות לחיצות: נפתחות לראות את הראיות (ישויות / כרטיסי נושא / עוגן).
export default function ConvergenceMeter({ value }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null); // אינדקס שכבה פתוחה
  const nav = useNavigate();

  useEffect(() => {
    if (!value || value < 10) { setData(null); return; }
    let live = true; setOpen(null);
    supabase.rpc("convergence_meter", { p_n: value })
      .then(({ data }) => {
        if (!live) return;
        setData(data);
        // ברירת מחדל: פתוח על שכבת "התכנסות מילים" (ההצטלבויות) — שייראו מיד עם הכניסה
        const layers = data?.layers || [];
        const idx = layers.findIndex(l => l.name === "התכנסות מילים" && Array.isArray(l.evidence) && l.evidence.length);
        setOpen(idx >= 0 ? idx : null);
      })
      .catch(() => { if (live) setData(null); });
    return () => { live = false; };
  }, [value]);

  if (!data || !data.layers) return null;
  const score = data.score || 0;
  const tier = score >= 90 ? { e: "👑", c: C.goldBright }
             : score >= 50 ? { e: "🥈", c: "#cfd8e3" }
             : score >= 20 ? { e: "🥉", c: "#d49a6a" }
             :               { e: "·",  c: C.muted };

  return (
    <div style={{ padding: "11px 13px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>🧬 מד ההתכנסות</span>
        <span style={{ marginInlineStart: "auto", color: tier.c, fontFamily: F.heading, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>{tier.e} {score}/100</span>
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        {data.layers.map((l, i) => {
          const ev = Array.isArray(l.evidence) ? l.evidence : null;
          const clickable = (ev && ev.length) || (l.name === "עוגן קדוש" && l.ok);
          const isOpen = open === i;
          return (
            <div key={i}>
              <div onClick={() => clickable && setOpen(isOpen ? null : i)}
                style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: F.body, fontSize: 11.5,
                  color: l.ok ? C.goldLight : C.muted, opacity: l.ok ? 1 : 0.45,
                  cursor: clickable ? "pointer" : "default" }}>
                <span style={{ width: 16, textAlign: "center" }}>{l.icon}</span>
                <span style={{ flex: 1 }}>{l.name}</span>
                <span style={{ color: C.goldDim, fontSize: 10 }}>{l.detail}</span>
                <span>{l.ok ? "✅" : "—"}</span>
                {clickable && <span style={{ color: C.goldDim, fontSize: 9 }}>{isOpen ? "▴" : "▾"}</span>}
              </div>
              {isOpen && (
                <div style={{ margin: "4px 0 6px 23px", display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {/* כרטיסי נושא — לחיצים */}
                  {l.name === "כרטיס התכנסות" && ev?.map(c => (
                    <button key={c.slug} onClick={() => nav(`/topic/${encodeURIComponent(c.slug)}`)}
                      style={chip(true)}>🧩 {c.title} →</button>
                  ))}
                  {/* ישויות — לחיצות לדף המספר */}
                  {(l.name === "התכנסות מילים" || l.name === "אקטואליה (חדשות)") && ev?.map((e, k) => {
                    const lbl = typeof e === "string" ? e : e.label;
                    return (
                      <button key={k} onClick={() => nav(`/number/${encodeURIComponent(lbl)}`)} style={chip(false)}>
                        {lbl}{e.method ? ` · ${e.method}` : ""}{e.world ? ` · ${e.world}` : ""}
                      </button>
                    );
                  })}
                  {/* עוגן */}
                  {l.name === "עוגן קדוש" && data.anchor && (
                    <button onClick={() => openNumberDrawer(value)} title={`פתח את מגירת המספר ${value}`}
                      style={{ ...chip(true), cursor: "pointer" }}>✨ {data.anchor} → {value}</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ height: 7, background: "rgba(8,5,2,0.5)", borderRadius: 999, overflow: "hidden", marginTop: 10 }}>
        <div style={{ width: `${score}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${C.gold}, ${tier.c})`, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

const chip = gold => ({
  cursor: "pointer", textAlign: "right",
  background: gold ? "rgba(212,175,55,0.12)" : C.surface,
  border: `1px solid ${gold ? C.borderGold : C.border}`,
  borderRadius: 999, padding: "3px 10px", color: gold ? C.goldBright : C.goldLight,
  fontFamily: F.body, fontSize: 11, fontWeight: gold ? 700 : 400, maxWidth: "100%",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
});
