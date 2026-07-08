import React, { useState, useEffect } from "react";
import { getMyTreeStats } from "../lib/supabase.js";

// 🌳 "העץ שלי" — גודל האוסף האישי האמיתי (research_items) + מילים שנכנסו למנוע + חיפושים.
// דרגה/XP/קרדיטים הוסתרו עד שיהיה מנוע-הענקה אמיתי (platform_tiers_law) — לא מציגים מספרים ריקים.
// "המילים שלך במנוע" יידלק כשסוכן-2 יחווט submitted_by (חוזה = users.id).
export default function MyTreeCard() {
  const [stats, setStats] = useState({ total: 0, searched: 0, words: 0 });
  useEffect(() => {
    let alive = true;
    getMyTreeStats().then(s => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, []);
  return (
    <div style={{ background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.30)", borderRadius: 14, padding: "14px 16px", margin: "0 0 14px", textAlign: "center" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#b8901f", marginBottom: 8 }}>🌳 העץ שלי</div>
      <div>
        <span style={{ fontSize: 30, fontWeight: 800, color: "#b8901f" }}>{Number(stats.total).toLocaleString("he")}</span>
        <span style={{ fontSize: 13, opacity: 0.75, marginInlineStart: 6 }}>פריטים באוסף האישי שלך</span>
      </div>
      {stats.words > 0 && (
        <div style={{ fontSize: 12.5, fontWeight: 800, color: "#2f8f4e", marginTop: 8, textAlign: "center" }}>
          🌐 {stats.words.toLocaleString("he")} מהמילים שלך נכנסו למנוע!
        </div>
      )}
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8, textAlign: "center", lineHeight: 1.6 }}>
        {stats.searched > 0 ? `${stats.searched.toLocaleString("he")} מהחיפושים שלך בנו את העץ · ` : ""}כל גילוי מרחיב את המפה האישית שלך.
      </div>
    </div>
  );
}
