import React, { useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { trendLabel } from "../lib/reality.js";

// ===== דופק המציאות — «המספרים החיים» =====
// שני מצבי תצוגה: שבבים (ברירת-מחדל) ובועות אינטראקטיביות.
// לחיצה על מספר מסננת את הזרם; בועה גדולה = מספר חם יותר.

const PERIODS = [
  { key: "today", label: "היום", field: "hotToday", countKey: "today" },
  { key: "week",  label: "השבוע", field: "hotWeek",  countKey: "week"  },
  { key: "month", label: "החודש", field: "hotMonth", countKey: "month" },
];

const TREND_COLOR = { up: "#4ade80", down: "#f87171", flat: "#d4af37", fresh: "#8ab4f8" };

function trendColor(trend) {
  if (!trend) return TREND_COLOR.flat;
  if (trend.fresh) return TREND_COLOR.fresh;
  return TREND_COLOR[trend.dir] || TREND_COLOR.flat;
}

export default function RealityPulse({ pulse, period = "week", onPeriod, activeValue, onPick, max = 8, palette }) {
  const auto = usePalette();
  const P = palette || auto;
  const [view, setView] = useState("chips"); // "chips" | "bubbles"

  if (!pulse) return null;
  const cur = PERIODS.find(p => p.key === period) || PERIODS[1];
  const list = (pulse[cur.field] || []).slice(0, max);
  const riser = pulse.topRiser;
  const maxCount = list.length ? Math.max(...list.map(r => r[cur.countKey]), 1) : 1;

  return (
    <div style={{ direction: "rtl", background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "14px 16px", marginBottom: 16 }}>
      <style>{`
        .rp-chip { display:inline-flex; align-items:center; gap:7px; cursor:pointer; text-decoration:none;
          border-radius:999px; padding:6px 13px; font-family:${F.heading}; font-weight:800; font-size:14px;
          background:${P.card}; border:1px solid ${P.border}; color:${P.ink}; transition:transform .12s,border-color .12s; }
        .rp-chip:hover { transform:translateY(-2px); border-color:${P.accent}; }
        .rp-chip.on { background:${P.accentBtn}; color:${P.onAccent}; border-color:${P.accentBtn}; }
        .rp-cnt { font-family:${F.mono}; font-size:12px; opacity:.85; }
        .rp-seg button { cursor:pointer; background:none; border:none; font-family:${F.heading}; font-weight:700; font-size:12.5px;
          color:${P.inkSoft}; padding:3px 10px; border-radius:999px; }
        .rp-seg button.on { background:${P.card}; color:${P.accentText}; border:1px solid ${P.border}; }
        @keyframes bubble-float {
          0%,100% { transform:translateY(0) scale(1); }
          50%      { transform:translateY(-5px) scale(1.04); }
        }
        .rp-bubble { cursor:pointer; border-radius:50%; display:flex; flex-direction:column; align-items:center;
          justify-content:center; gap:1px; transition:box-shadow .18s, outline .1s; flex-shrink:0; }
        .rp-bubble:hover { box-shadow:0 0 22px currentColor; }
        .rp-bubble.on { outline:3px solid currentColor; outline-offset:2px; }
        .rp-bubbles-wrap { display:flex; flex-wrap:wrap; align-items:center; gap:12px; padding:6px 0; min-height:80px; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 17, fontWeight: 800 }}>🔥 חם עכשיו</span>
        <span style={{ flex: 1 }} />
        {/* toggle view */}
        <button onClick={() => setView(v => v === "chips" ? "bubbles" : "chips")}
          style={{ cursor:"pointer", background:P.card, border:`1px solid ${P.border}`, borderRadius:999, padding:"3px 11px", color:P.inkSoft, fontFamily:F.heading, fontSize:12, fontWeight:700 }}>
          {view === "chips" ? "🫧 בועות" : "📋 רשימה"}
        </button>
        <div className="rp-seg" role="group" aria-label="חלון זמן">
          {PERIODS.map(p => (
            <button key={p.key} className={period === p.key ? "on" : ""} onClick={() => onPeriod?.(p.key)}>{p.label}</button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, padding: "6px 2px" }}>אין עדיין מספרים חיים בחלון הזה.</div>
      ) : view === "chips" ? (
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {list.map(r => {
            const tl = trendLabel(r.trend);
            return (
              <button key={r.value} className={`rp-chip${activeValue === r.value ? " on" : ""}`}
                onClick={() => onPick?.(activeValue === r.value ? null : r.value)}
                title={`${r[cur.countKey]} הופעות ${cur.label}`}>
                🔥 {r.value}
                <span className="rp-cnt">×{r[cur.countKey]}{tl ? ` · ${tl}` : ""}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rp-bubbles-wrap">
          {list.map((r, idx) => {
            const count = r[cur.countKey];
            const size = Math.round(44 + (count / maxCount) * 64); // 44–108 px
            const c = trendColor(r.trend);
            const isOn = activeValue === r.value;
            const delay = (idx * 0.22).toFixed(2);
            return (
              <button
                key={r.value}
                className={`rp-bubble${isOn ? " on" : ""}`}
                onClick={() => onPick?.(isOn ? null : r.value)}
                title={`${r.value} — ${count} הופעות ${cur.label}${trendLabel(r.trend) ? " · " + trendLabel(r.trend) : ""}`}
                style={{
                  width: size, height: size,
                  background: `${c}18`,
                  border: `2px solid ${c}`,
                  color: c,
                  fontSize: size > 72 ? 15 : 12,
                  animation: `bubble-float ${1.8 + idx * 0.15}s ease-in-out ${delay}s infinite`,
                }}
              >
                <span style={{ fontFamily: F.mono, fontWeight: 900, lineHeight: 1.1 }}>{r.value}</span>
                <span style={{ fontFamily: F.heading, fontSize: 10, opacity: 0.75 }}>×{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {riser && (riser.trend?.fresh || (riser.trend?.pct != null && riser.trend.pct >= 50)) && (
        <div style={{ marginTop: 11, color: P.inkSoft, fontFamily: F.body, fontSize: 13 }}>
          ⚡ מזנק: <Link to={`/number/${riser.value}`} style={{ color: P.accentText, textDecoration: "none", fontWeight: 800, fontFamily: F.mono }}>{riser.value}</Link>
          {riser.trend.fresh ? " — מתעורר עכשיו 🆕" : ` — עלייה של ${riser.trend.pct}%`}
        </div>
      )}
    </div>
  );
}
