import React from "react";
import { F } from "../theme.js";

// ❤️‍🔥 Header חי — סטטיסטיקות חיות מתחת לישות (Reality Graph Law · type-agnostic).
// stats = [{ e?:emoji, n:number|string, label:string }] — נגזר מ-entity_types.stats.
// אותו רכיב לכל Hub (מספר/אדם/פסוק…) — בלי Duplicate Code. מסנן ערכי-אפס.
export default function EntityLiveHeader({ stats }) {
  const items = (stats || []).filter(s => s && s.n != null && s.n !== 0 && s.n !== "");
  if (!items.length) return null;
  return (
    <div className="elh">
      <style>{ELH_CSS}</style>
      {items.map((s, i) => (
        <span key={i} className="elh-item">
          {s.e && <span className="elh-e">{s.e}</span>}
          <b>{typeof s.n === "number" ? s.n.toLocaleString("he") : s.n}</b>
          <span className="elh-l">{s.label}</span>
        </span>
      ))}
    </div>
  );
}

const ELH_CSS = `
.elh{display:flex;flex-wrap:wrap;gap:7px 9px;justify-content:center;align-items:center;margin:12px auto 0;max-width:560px;direction:rtl}
.elh-item{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line,rgba(196,154,46,.4));background:var(--card,rgba(196,154,46,.1));border-radius:999px;padding:4px 12px;font-family:${F.heading};font-size:12.5px;font-weight:700;color:var(--ink,inherit)}
.elh-e{font-size:13px}
.elh-item b{font-family:${F.mono};font-size:14px;font-weight:800;color:var(--acc,#c79a2e)}
.elh-l{opacity:.8;font-weight:600}
@keyframes elh-live{0%,100%{box-shadow:0 0 0 0 rgba(196,154,46,0)}50%{box-shadow:0 0 0 3px rgba(196,154,46,.12)}}
.elh-item:first-child{animation:elh-live 3.2s ease-in-out infinite}
`;
