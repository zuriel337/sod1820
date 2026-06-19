import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { openNumberDrawer } from "../lib/numberDrawer.js";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { worldColor, WORLD_FAMILIES } from "../lib/worlds.js";

// 🧬 מד ההתכנסות — כמה שכבות בלתי-תלויות מסכימות על המספר. ציון 0-100 + 🥉🥈🥇.
// תמה-מודע: ברירת מחדל = הפלטה הגלובלית (מתחלף עם המתג); prop `light` = override.
export default function ConvergenceMeter({ value, light: lightOverride }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null); // אינדקס שכבה פתוחה
  const [legend, setLegend] = useState(false); // מקרא צבעי העולמות
  const nav = useNavigate();
  const globalP = usePalette();
  const P = lightOverride == null ? globalP : PALETTES[lightOverride ? "light" : "dark"];
  const light = P.mode === "light";

  const T = { gold: P.accent, goldLight: P.ink, goldBright: P.accentText, goldDim: P.accentDim, muted: P.inkSoft, border: P.border, borderGold: P.borderStrong, surface: P.card, barBg: P.cardSoft };

  useEffect(() => {
    if (!value || value < 10) { setData(null); return; }
    let live = true; setOpen(null);
    supabase.rpc("convergence_meter", { p_n: value })
      .then(({ data }) => {
        if (!live) return;
        setData(data);
        const layers = data?.layers || [];
        const idx = layers.findIndex(l => l.name === "התכנסות מילים" && Array.isArray(l.evidence) && l.evidence.length);
        setOpen(idx >= 0 ? idx : null);
      })
      .catch(() => { if (live) setData(null); });
    return () => { live = false; };
  }, [value]);

  if (!data || !data.layers) return null;
  const score = data.score || 0;
  const tier = score >= 90 ? { e: "👑", c: T.goldBright }
             : score >= 50 ? { e: "🥈", c: light ? "#5b7a99" : "#cfd8e3" }
             : score >= 20 ? { e: "🥉", c: light ? "#a06a2e" : "#d49a6a" }
             :               { e: "·",  c: T.muted };

  return (
    <div className="cm" style={{ padding: "11px 13px", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <span className="cm-title" style={{ color: T.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>🧬 מד ההתכנסות</span>
        <span className="cm-score" style={{ marginInlineStart: "auto", color: tier.c, fontFamily: F.heading, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>{tier.e} {score}/100</span>
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        {data.layers.map((l, i) => {
          const ev = Array.isArray(l.evidence) ? l.evidence : null;
          const clickable = (ev && ev.length) || (l.name === "עוגן קדוש" && l.ok);
          const isOpen = open === i;
          return (
            <div key={i}>
              <div onClick={() => clickable && setOpen(isOpen ? null : i)}
                className="cm-row"
                style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: F.body, fontSize: 11.5,
                  color: l.ok ? T.goldLight : T.muted, opacity: l.ok ? 1 : 0.5,
                  cursor: clickable ? "pointer" : "default" }}>
                <span className="cm-icon" style={{ width: 16, textAlign: "center" }}>{l.icon}</span>
                <span style={{ flex: 1 }}>{l.name}</span>
                <span className="cm-detail" style={{ color: T.goldDim, fontSize: 10 }}>{l.detail}</span>
                <span>{l.ok ? "✅" : "—"}</span>
                {clickable && <span style={{ color: T.goldDim, fontSize: 9 }}>{isOpen ? "▴" : "▾"}</span>}
              </div>
              {isOpen && (
                <div style={{ margin: "4px 0 6px 23px", display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {l.name === "כרטיס התכנסות" && ev?.map(c => (
                    <button key={c.slug} onClick={() => nav(`/topic/${encodeURIComponent(c.slug)}`)}
                      className="cm-chip" style={chip(true, T)}>🧩 {c.title} →</button>
                  ))}
                  {(l.name === "התכנסות מילים" || l.name === "אקטואליה (חדשות)") && ev?.map((e, k) => {
                    const lbl = typeof e === "string" ? e : e.label;
                    const w = typeof e === "object" ? e.world : null;
                    return (
                      <button key={k} onClick={() => nav(`/number/${encodeURIComponent(lbl)}`)} className="cm-chip" style={chip(false, T)}>
                        {lbl}{e.method ? ` · ${e.method}` : ""}{w ? <> · <span style={{ color: worldColor(w), fontWeight: 700 }}>{w}</span></> : null}
                      </button>
                    );
                  })}
                  {l.name === "עוגן קדוש" && data.anchor && (
                    <button onClick={() => openNumberDrawer(value)} title={`פתח את מגירת המספר ${value}`}
                      className="cm-chip" style={{ ...chip(true, T), cursor: "pointer" }}>✨ {data.anchor} → {value}</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ height: 7, background: T.barBg, borderRadius: 999, overflow: "hidden", marginTop: 10 }}>
        <div style={{ width: `${score}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${T.gold}, ${tier.c})`, transition: "width .4s ease" }} />
      </div>

      {/* 🎨 מקרא צבעי העולמות — חוק גלובלי אחיד */}
      <button onClick={() => setLegend(v => !v)} style={{ cursor: "pointer", background: "none", border: "none", color: T.goldDim, fontFamily: F.heading, fontSize: 10, fontWeight: 700, padding: "8px 0 0", letterSpacing: 1 }}>
        🎨 מקרא צבעי העולמות {legend ? "▴" : "▾"}
      </button>
      {legend && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 11px", marginTop: 4 }}>
          {Object.values(WORLD_FAMILIES).map(fam => (
            <span key={fam.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.body, fontSize: 10.5, color: T.muted }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: fam.color, flexShrink: 0 }} />{fam.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const chip = (gold, T) => ({
  cursor: "pointer", textAlign: "right",
  background: gold ? "rgba(201,162,39,0.14)" : T.surface,
  border: `1px solid ${gold ? T.borderGold : T.border}`,
  borderRadius: 999, padding: "3px 10px", color: gold ? T.goldBright : T.goldLight,
  fontFamily: F.body, fontSize: 11, fontWeight: gold ? 700 : 400, maxWidth: "100%",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
});
