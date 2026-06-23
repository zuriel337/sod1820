import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { trendLabel } from "../lib/reality.js";

// ===== דופק המציאות — «המספרים החיים» =====
// מציג את המספרים החמים (לפי החלון שנבחר) + מונה + מגמה. לחיצה מסננת את הזרם.
// עדשה על החישוב הטהור (src/lib/reality.js) — אותו מקור משמש גם את דף המספר.

const PERIODS = [
  { key: "today", label: "היום", field: "hotToday", countKey: "today" },
  { key: "week", label: "השבוע", field: "hotWeek", countKey: "week" },
  { key: "month", label: "החודש", field: "hotMonth", countKey: "month" },
];

export default function RealityPulse({ pulse, period = "week", onPeriod, activeValue, onPick, max = 6, palette }) {
  const auto = usePalette();
  const P = palette || auto;
  if (!pulse) return null;
  const cur = PERIODS.find(p => p.key === period) || PERIODS[1];
  const list = (pulse[cur.field] || []).slice(0, max);
  const riser = pulse.topRiser;

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
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 17, fontWeight: 800 }}>🔥 חם עכשיו</span>
        <span style={{ flex: 1 }} />
        <div className="rp-seg" role="group" aria-label="חלון זמן">
          {PERIODS.map(p => (
            <button key={p.key} className={period === p.key ? "on" : ""} onClick={() => onPeriod?.(p.key)}>{p.label}</button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, padding: "6px 2px" }}>אין עדיין מספרים חיים בחלון הזה.</div>
      ) : (
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {list.map(r => {
            const tl = trendLabel(r.trend);
            return (
              <button key={r.value} className={`rp-chip${activeValue === r.value ? " on" : ""}`} onClick={() => onPick?.(activeValue === r.value ? null : r.value)} title={`${r[cur.countKey]} הופעות ${cur.label}`}>
                🔥 {r.value}
                <span className="rp-cnt">×{r[cur.countKey]}{tl ? ` · ${tl}` : ""}</span>
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
