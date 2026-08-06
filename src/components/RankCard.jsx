import React from "react";
import { F } from "../theme.js";

// 🎖️ כרטיס-דרגה מלא — חושף את מנוע-הגדילה (research_level_of) + סטטיסטיקת-החוקר (researcher_stats).
// דרגה 1-5 (🌱→👑), פס-התקדמות ל-XP הבא, ופירוט התרומה. מקור-אמת אחד — לא מחשב מחדש, מציג.
const THRESH = [0, 150, 600, 2000, 5000];         // ספי-XP לכל דרגה (מ-research_level_of)
const LABELS = ["מתחיל", "חוקר מתעורר", "חוקר", "חוקר בכיר", "חוקר היכל"];
const ICONS = ["🌱", "🌿", "🔬", "🎓", "👑"];

export default function RankCard({ level, stats, P }) {
  if (!level?.level) return null;
  const lv = Math.max(1, Math.min(5, level.level));
  const xp = level.xp || 0;
  const atMax = lv >= 5;
  const bandFloor = THRESH[lv - 1];
  const nextFloor = atMax ? null : THRESH[lv];
  const pct = atMax ? 100 : Math.max(4, Math.min(100, Math.round(((xp - bandFloor) / (nextFloor - bandFloor)) * 100)));
  const toNext = atMax ? 0 : Math.max(0, nextFloor - xp);
  const nextLabel = atMax ? null : LABELS[lv];   // תווית הדרגה הבאה (lv+1)

  const s = stats || {};
  const gemN = Array.isArray(s.gematrias) ? s.gematrias.length : 0;
  const cells = [
    (s.posts != null ? s.posts : level.posts) ? ["📝", s.posts != null ? s.posts : level.posts, "מחקרים"] : null,
    s.findings ? ["🔢", s.findings, "ממצאים"] : null,
    s.credited ? ["✍️", s.credited, "מיוחסים"] : null,
    gemN ? ["💎", gemN, "גימטריות"] : null,
    level.solved_challenges ? ["✔️", level.solved_challenges, "אתגרים נפתרו"] : null,
    level.whatsapp ? ["💬", level.whatsapp, "עדכונים"] : null,
  ].filter(Boolean);

  return (
    <div style={{ maxWidth: 470, margin: "12px auto 0", background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "14px 16px", textAlign: "start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 30, lineHeight: 1 }}>{ICONS[lv - 1]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 900 }}>{level.label}</span>
            <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>דרגה {lv}/5</span>
            {level.senior && <span style={{ color: "#3a2c00", background: "linear-gradient(135deg,#f6e27a,#d4af37)", borderRadius: 999, padding: "1px 8px", fontFamily: F.heading, fontSize: 10.5, fontWeight: 900 }}>👑 בכיר</span>}
          </div>
          <div style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 12, marginTop: 2 }}>
            {xp.toLocaleString("he-IL")} XP{s.points ? ` · ${Number(s.points).toLocaleString("he-IL")} נק׳` : ""}{s.rank ? ` · ${s.rank}` : ""}
          </div>
        </div>
      </div>

      {/* פס-התקדמות לדרגה הבאה */}
      <div style={{ marginTop: 11 }}>
        <div style={{ height: 8, borderRadius: 999, background: P.cardSoft, border: `1px solid ${P.border}`, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#d4af37,#f6e27a)", borderRadius: 999 }} />
        </div>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginTop: 5 }}>
          {atMax ? "🏆 הדרגה הגבוהה ביותר" : `עוד ${toNext.toLocaleString("he-IL")} XP ל«${nextLabel}»`}
        </div>
      </div>

      {/* פירוט התרומה */}
      {cells.length > 0 && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, paddingTop: 11, borderTop: `1px dashed ${P.border}` }}>
          {cells.map(([e, v, l]) => (
            <div key={l} style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
              <span style={{ color: P.accentText, fontFamily: F.mono, fontSize: 16, fontWeight: 900 }}>{e} {v}</span>
              <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11 }}>{l}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
