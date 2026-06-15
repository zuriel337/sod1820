import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import { C, F } from "../theme.js";

// 🧬 מד ההתכנסות — כמה שכבות בלתי-תלויות מסכימות על המספר. ציון 0-100 + 🥉🥈🥇.
// מקור: פונקציית DB convergence_meter(n). מתעדכן לפי הערך הפעיל.
export default function ConvergenceMeter({ value }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!value || value < 10) { setData(null); return; }
    let live = true;
    supabase.rpc("convergence_meter", { p_n: value })
      .then(({ data }) => { if (live) setData(data); })
      .catch(() => { if (live) setData(null); });
    return () => { live = false; };
  }, [value]);

  if (!data || !data.layers) return null;
  const score = data.score || 0;
  const tier = score >= 90 ? { e: "👑", t: "התכנסות עליונה", c: C.goldBright }
             : score >= 50 ? { e: "🥈", t: "התכנסות חזקה",  c: "#cfd8e3" }
             : score >= 20 ? { e: "🥉", t: "התכנסות",        c: "#d49a6a" }
             :               { e: "·",  t: "חלשה",           c: C.muted };

  return (
    <div style={{ padding: "11px 13px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>🧬 מד ההתכנסות</span>
        <span style={{ marginInlineStart: "auto", color: tier.c, fontFamily: F.heading, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>{tier.e} {score}/100</span>
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        {data.layers.map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: F.body, fontSize: 11.5, color: l.ok ? C.goldLight : C.muted, opacity: l.ok ? 1 : 0.45 }}>
            <span style={{ width: 16, textAlign: "center" }}>{l.icon}</span>
            <span style={{ flex: 1 }}>{l.name}</span>
            <span style={{ color: C.goldDim, fontSize: 10 }}>{l.detail}</span>
            <span>{l.ok ? "✅" : "—"}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 7, background: "rgba(8,5,2,0.5)", borderRadius: 999, overflow: "hidden", marginTop: 10 }}>
        <div style={{ width: `${score}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${C.gold}, ${tier.c})`, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}
