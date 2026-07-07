import React, { useState, useEffect } from "react";
import { getMyTreeStats } from "../lib/supabase.js";

// 🌳 "העץ שלי" — גיימיפיקציה (דרגה/xp/קרדיטים) + גודל האוסף האישי (research_items).
// הערך למשתמש-כוח (כמו שמעון): העץ שלו גדל מפעילותו. "המילים שלך במנוע" יידלק
// כשסוכן-2 יחווט submitted_by (חוזה = users.id).
export default function MyTreeCard({ profile }) {
  const [stats, setStats] = useState({ total: 0, searched: 0, words: 0 });
  useEffect(() => {
    let alive = true;
    getMyTreeStats().then(s => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, []);
  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const credits = profile?.credits ?? 0;
  const Stat = ({ label, val }) => (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#b8901f" }}>{Number(val).toLocaleString("he")}</div>
      <div style={{ fontSize: 11, opacity: 0.75 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.30)", borderRadius: 14, padding: "12px 14px", margin: "0 0 14px" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#b8901f", marginBottom: 8 }}>🌳 העץ שלי</div>
      <div style={{ display: "flex", gap: 8 }}>
        <Stat label="דרגה" val={level} />
        <Stat label="XP" val={xp} />
        <Stat label="קרדיטים" val={credits} />
        <Stat label="באוסף" val={stats.total} />
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
