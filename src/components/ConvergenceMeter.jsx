import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { openNumberDrawer } from "../lib/numberDrawer.js";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { worldColor } from "../lib/worlds.js";

// 🧬 מד ההתכנסות — כמה שכבות בלתי-תלויות מסכימות על המספר. ציון 0-100 + 🥉🥈🥇.
// תמה-מודע: ברירת מחדל = הפלטה הגלובלית (מתחלף עם המתג); prop `light` = override.
export default function ConvergenceMeter({ value, light: lightOverride }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null); // אינדקס שכבה פתוחה
  const [wordsAll, setWordsAll] = useState(false); // הצג-כל במילים המקובצות
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
                  {l.name === "התכנסות מילים" && (() => {
                    // 🌍 מקובץ לפי עולם + שורות מיושרות (במקום גלולות ברוחב משתנה)
                    const items = (ev || []).map(e => typeof e === "string" ? { label: e } : e);
                    const g = {};
                    for (const e of items) { const w = e.world || "ללא עולם"; (g[w] ||= []).push(e); }
                    const entries = Object.entries(g).sort((a, b) => (a[0] === "ללא עולם") - (b[0] === "ללא עולם") || b[1].length - a[1].length);
                    const CAP = 3;
                    const collapsedTotal = entries.reduce((a, [, arr]) => a + Math.min(arr.length, CAP), 0);
                    return (
                      <div style={{ width: "100%", display: "grid", gap: 8 }}>
                        {entries.map(([w, arr]) => {
                          const vis = wordsAll ? arr : arr.slice(0, CAP);
                          return (
                            <div key={w}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: worldColor(w) || T.muted }} />
                                <span style={{ color: T.goldDim, fontFamily: F.heading, fontSize: 10, fontWeight: 700 }}>{w} · {arr.length}</span>
                              </div>
                              {vis.map((e, k) => (
                                <button key={k} onClick={() => nav(`/number/${encodeURIComponent(e.label)}`)}
                                  title={`${e.label} = ${value} ב${e.method || "רגיל"}`}
                                  style={{ display: "flex", width: "100%", alignItems: "baseline", gap: 8, background: "transparent", border: "none", borderTop: k ? `1px solid ${T.border}` : "none", padding: "5px 2px", cursor: "pointer", textAlign: "right" }}>
                                  <span style={{ flex: 1, minWidth: 0, color: e.tier ? T.goldBright : T.goldLight, fontFamily: F.body, fontSize: 12.5, fontWeight: e.tier ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.tier === "gold" ? "👑 " : e.tier === "silver" ? "🥈 " : ""}{e.label}</span>
                                  <span style={{ flexShrink: 1, borderBottom: `1px dotted ${T.border}`, minWidth: 10, alignSelf: "center", height: 1 }} />
                                  <span style={{ flexShrink: 0, color: T.goldDim, fontSize: 10 }}>{e.method || "רגיל"}</span>
                                </button>
                              ))}
                            </div>
                          );
                        })}
                        {items.length > collapsedTotal && (
                          <button onClick={() => setWordsAll(v => !v)} style={{ background: "transparent", border: "none", color: T.goldDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 700, cursor: "pointer", padding: "3px" }}>{wordsAll ? "▴ הצג פחות" : `▾ הצג הכל (${items.length})`}</button>
                        )}
                      </div>
                    );
                  })()}
                  {l.name === "כרטיס התכנסות" && ev?.map(c => (
                    <button key={c.slug} onClick={() => nav(`/topic/${encodeURIComponent(c.slug)}`)}
                      className="cm-chip" style={chip(true, T)}>🧩 {c.title} →</button>
                  ))}
                  {l.name === "אקטואליה (חדשות)" && ev?.map((e, k) => {
                    const lbl = typeof e === "string" ? e : e.label;
                    return (
                      <button key={k} onClick={() => nav(`/number/${encodeURIComponent(lbl)}`)} className="cm-chip" style={chip(false, T)}>
                        {lbl}{e.method ? ` · ${e.method}` : ""}
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
