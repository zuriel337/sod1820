import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { getChannelUpdates } from "../lib/supabase.js";
import { timeAgoHe } from "../lib/format.js";

// וידאו מהקבוצה? (mp4/webm/mov) → 🎬 ונגן במקום תמונה. נטען רק בהקשה — לא שורף תעבורה.
export const isVideoUrl = u => /\.(mp4|webm|mov)(\?|$)/i.test(u || "");

// 📡 טיקר ממותג — רצועת עדכונים חיה לערוץ מסוים («אור הגאולה» / «קוד המציאות»).
// אותו מקור נתונים של הטיקר הראשי (channel_updates, עדשה לפי channel — עץ אחד).
// עובד זהה במובייל ובדסקטופ: הודעה מתחלפת בדהייה, קרדיט ליד, תמונה נפתחת בהקשה.
export const BRANDS = {
  "or-geula":       { title: "אור הגאולה", emoji: "✨", accent: "#f2c94c", glow: "rgba(242,201,76,.35)", bg: "linear-gradient(90deg, rgba(63,48,10,.75), rgba(90,70,16,.85), rgba(63,48,10,.75))" },
  "reality-code":   { title: "קוד המציאות", emoji: "🎬", accent: "#9d7bff", glow: "rgba(157,123,255,.35)", bg: "linear-gradient(90deg, rgba(34,22,63,.8), rgba(52,33,96,.9), rgba(34,22,63,.8))" },
  "sod-hachashmal": { title: "סוד החשמל", emoji: "⚡", accent: "#5ec8ff", glow: "rgba(94,200,255,.32)", bg: "linear-gradient(90deg, rgba(8,38,58,.8), rgba(12,55,84,.9), rgba(8,38,58,.8))" },
};

export default function BrandTicker({ channel }) {
  const b = BRANDS[channel] || BRANDS["reality-code"];
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  const [lb, setLb] = useState(null);

  useEffect(() => {
    let live = true;
    const load = () => getChannelUpdates(8, channel).then(r => { if (live) setItems(r || []); }).catch(() => {});
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 90000);
    return () => { live = false; clearInterval(id); };
  }, [channel]);

  const cur = items.length ? items[i % items.length] : null;
  useEffect(() => {
    if (items.length < 2) return;
    const id = setTimeout(() => { if (!document.hidden) setI(x => x + 1); }, 9000);
    return () => clearTimeout(id);
  }, [i, items.length]);

  return (
    <div style={{ direction: "rtl", marginBottom: 10 }}>
      <style>{`@keyframes bt-fade { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:none;} }
        @keyframes bt-dot { 0%,100%{opacity:1;} 50%{opacity:.35;} }`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: b.bg, border: `1px solid ${b.accent}55`,
        borderRadius: 12, padding: "8px 12px", minHeight: 40, boxShadow: `0 4px 18px ${b.glow}` }}>
        {/* תג המותג */}
        <span style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 6, background: b.accent,
          color: "#191008", fontFamily: F.heading, fontWeight: 900, fontSize: 11, borderRadius: 999, padding: "3px 11px", whiteSpace: "nowrap" }}>
          <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#9c1322", animation: "bt-dot 1.4s infinite" }} />
          {b.emoji} {b.title}
        </span>
        {/* שידעו: זה מגיע אוטומטית, לייב, מקבוצות/ערוצי הוואטסאפ (בקשת צוריאל) */}
        <span title="העדכונים מגיעים אוטומטית — לייב מקבוצות הוואטסאפ" style={{ flex: "0 0 auto", display: "inline-flex",
          alignItems: "center", gap: 4, color: "#25d366", fontFamily: F.heading, fontSize: 9, fontWeight: 800,
          border: "1px solid rgba(37,211,102,.45)", borderRadius: 999, padding: "1px 7px", background: "rgba(37,211,102,.12)", whiteSpace: "nowrap" }}>
          💬 לייב מהוואטסאפ
        </span>
        {/* ההודעה המתחלפת */}
        {cur ? (
          <div key={cur.id + i} onClick={cur.image_url ? () => setLb(cur.image_url) : undefined}
            style={{ flex: 1, minWidth: 0, color: "#f5ecd2", fontFamily: F.body, fontSize: 12.5, fontWeight: 600, lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              cursor: cur.image_url ? "pointer" : "default", animation: "bt-fade .5s ease" }}>
            {cur.text}{cur.image_url ? (isVideoUrl(cur.image_url) ? " · 🎬" : " · 📷") : ""}
            {cur.credit && <span style={{ color: b.accent, fontSize: 11, fontWeight: 800 }}> · מאת {cur.credit}</span>}
            <span style={{ color: "#b9a877", fontSize: 10.5 }}> · {timeAgoHe(cur.created_at)}</span>
          </div>
        ) : (
          <div style={{ flex: 1, color: "#c9bb93", fontFamily: F.body, fontSize: 12, fontStyle: "italic" }}>
            העדכונים בדרך — הערוץ יתעורר בקרוב…
          </div>
        )}
        {items.length > 1 && (
          <span style={{ flex: "0 0 auto", color: "#c9bb93", fontFamily: F.mono, fontSize: 10.5 }}>
            {(i % items.length) + 1}/{items.length}
          </span>
        )}
      </div>

      {lb && (
        <div onClick={() => setLb(null)} style={{ position: "fixed", inset: 0, zIndex: 2147483000,
          background: "rgba(3,2,8,0.93)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, cursor: "zoom-out" }}>
          {isVideoUrl(lb) ? (
            <video src={lb} controls autoPlay playsInline onClick={e => e.stopPropagation()}
              style={{ maxWidth: "96vw", maxHeight: "88vh", borderRadius: 12, border: `1px solid ${b.accent}88`, boxShadow: "0 20px 70px rgba(0,0,0,0.7)" }} />
          ) : (
            <img src={lb} alt="עדכון" style={{ maxWidth: "96vw", maxHeight: "88vh", borderRadius: 12,
              border: `1px solid ${b.accent}88`, boxShadow: "0 20px 70px rgba(0,0,0,0.7)" }} />
          )}
        </div>
      )}
    </div>
  );
}
