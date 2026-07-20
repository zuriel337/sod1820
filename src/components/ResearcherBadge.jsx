import React from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import ResearcherLink from "./ResearcherLink.jsx";
import { useResearcherLevel } from "../lib/researcherLevel.js";

// 👤 תג-כותב קנוני — אווטאר-ראשי + שם-לחיץ (ResearcherLink → דף-החוקר) + תג-דרגה (research_level_of).
// מקור-אמת אחד לזהות-כותב בכל האתר (פורום, מחקר-קהילה, חידושים). הדרגה מוצגת רק כשיש uid.
// theme-aware דרך usePalette. props: name (חובה) · uid (לדרגה) · size · showAvatar · nameStyle.
export default function ResearcherBadge({ name, uid, size = 20, showAvatar = true, style, nameStyle }) {
  const P = usePalette();
  const level = useResearcherLevel(uid);
  const nm = (name || "").trim();
  if (!nm) return null;
  const initial = nm.charAt(0);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", ...style }}>
      {showAvatar && (
        <span aria-hidden style={{ width: size, height: size, borderRadius: "50%", background: P.glow, border: `1px solid ${P.border}`, color: P.accentText, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: F.regal, fontWeight: 800, fontSize: Math.round(size * 0.5), flex: "0 0 auto" }}>{initial}</span>
      )}
      <ResearcherLink name={nm} style={{ color: P.accentText, fontWeight: 800, textDecoration: "none", ...nameStyle }} />
      {level?.label && (
        <span title={level.xp != null ? `${level.xp} XP` : undefined}
          style={{ background: P.glow, border: `1px solid ${P.border}`, color: P.accentDim, borderRadius: 999, padding: "1px 8px", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>
          🌱 {level.label}{level.level > 1 ? ` · דרגה ${level.level}` : ""}
        </span>
      )}
    </span>
  );
}
