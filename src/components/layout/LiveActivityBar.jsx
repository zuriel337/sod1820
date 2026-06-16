import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../../theme.js";
import { getTopicCards } from "../../lib/supabase.js";

// שורה עליונה: כשיש עדכונים בבית המדרש — מהבהב "עדכונים חדשים בבית המדרש" (קישור).
// אם אין עדיין — ברכות מתחלפות.
const FALLBACK = [
  "🛠️ האתר בהקמה — ייתכנו עדיין תקלות",
  "ברוכים הבאים לעולם החדש",
  "המסע כבר החל — ובכל יום מתווספים עולמות, כלים ותגליות",
];

export default function LiveActivityBar() {
  const [hasUpdates, setHasUpdates] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let live = true;
    getTopicCards({ approvedOnly: true })
      .then(cards => { if (live) setHasUpdates((cards || []).length > 0); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (hasUpdates) return;
    const t = setInterval(() => setIdx(i => (i + 1) % FALLBACK.length), 5000);
    return () => clearInterval(t);
  }, [hasUpdates]);

  return (
    <div style={{ direction: "rtl", background: "rgba(10,7,2,0.9)", borderBottom: `1px solid ${C.border}`, overflow: "hidden" }}>
      <style>{`@keyframes lab-blink { 0%,100% { opacity:1; } 50% { opacity:.35; } }
        @keyframes lab-dot { 0%,100% { opacity:.4; transform:scale(.8); } 50% { opacity:1; transform:scale(1.2); } }`}</style>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "7px 14px", display: "flex", alignItems: "center", gap: 9, justifyContent: "center" }}>
        {hasUpdates ? (
          <Link to="/beit-midrash" style={{
            display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
            color: C.goldBright, fontFamily: F.royal, fontSize: 15.5, fontWeight: 700,
            animation: "lab-blink 1.6s ease-in-out infinite", whiteSpace: "nowrap",
          }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffcf4d", boxShadow: "0 0 8px #ffcf4d", animation: "lab-dot 1.4s ease-in-out infinite" }} />
            ✦ עדכונים חדשים בבית המדרש →
          </Link>
        ) : (
          <span key={idx} style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 15, fontWeight: 500, animation: "activity-fade 5s ease-in-out", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90vw" }}>
            {FALLBACK[idx]}
          </span>
        )}
      </div>
    </div>
  );
}
