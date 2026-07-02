import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { getChannelUpdates } from "../lib/supabase.js";
import { timeAgoHe } from "../lib/format.js";
import { trackShare } from "../lib/tracking.js";

// וידאו מהקבוצה? (mp4/webm/mov) → 🎬 ונגן במקום תמונה. נטען רק בהקשה — לא שורף תעבורה.
export const isVideoUrl = u => /\.(mp4|webm|mov)(\?|$)/i.test(u || "");

// ↗ שיתוף עדכון ישירות מהאתר: Web Share (מובייל) → נפילה לוואטסאפ. נמדד ב-share tracking.
export async function shareUpdate(u, brandTitle) {
  const text = `📡 ${brandTitle} · סוד 1820\n\n${u.text}${u.credit ? `\n✍️ מאת ${u.credit}` : ""}\n\n🔗 https://sod1820.co.il/broadcasts?src=share`;
  try { trackShare("broadcast", "bc-" + u.id); } catch { /* ignore */ }
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch { return; }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

// 📡 טיקר ממותג — רצועת עדכונים חיה לערוץ מסוים («אור הגאולה» / «קוד המציאות»).
// אותו מקור נתונים של הטיקר הראשי (channel_updates, עדשה לפי channel — עץ אחד).
// עובד זהה במובייל ובדסקטופ: הודעה מתחלפת בדהייה, קרדיט ליד, תמונה נפתחת בהקשה.
export const BRANDS = {
  "or-geula":       { title: "אור הגאולה", emoji: "✨", accent: "#f2c94c", glow: "rgba(242,201,76,.35)", bg: "linear-gradient(90deg, rgba(63,48,10,.75), rgba(90,70,16,.85), rgba(63,48,10,.75))",
                      logo: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/broadcasts/logo-or-geula.png" },
  "reality-code":   { title: "קוד המציאות", emoji: "🎬", accent: "#9d7bff", glow: "rgba(157,123,255,.35)", bg: "linear-gradient(90deg, rgba(34,22,63,.8), rgba(52,33,96,.9), rgba(34,22,63,.8))",
                      wa: "https://whatsapp.com/channel/0029Vb7CqG67Noa2cZUPug1k" },   // הצטרפות לערוץ
  "sod-hachashmal": { title: "סוד החשמל", emoji: "⚡", accent: "#5ec8ff", glow: "rgba(94,200,255,.32)", bg: "linear-gradient(90deg, rgba(8,38,58,.8), rgba(12,55,84,.9), rgba(8,38,58,.8))" },
};

// peek: {channel, to} — נקודת-הצצה לערוץ אחר: כשיש שם עדכונים חיים, מופיעה נקודה
// נושמת בקצה הרצועה שמקשרת לדף שבו הערוץ ההוא חי (למשל אור-הגאולה → דף הצ'אט).
export default function BrandTicker({ channel, peek = null }) {
  const b = BRANDS[channel] || BRANDS["reality-code"];
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  const [lb, setLb] = useState(null);
  const [peekCount, setPeekCount] = useState(0);

  useEffect(() => {
    let live = true;
    const load = () => getChannelUpdates(8, channel).then(r => { if (live) setItems(r || []); }).catch(() => {});
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 90000);
    return () => { live = false; clearInterval(id); };
  }, [channel]);

  useEffect(() => {
    if (!peek?.channel) return;
    let live = true;
    getChannelUpdates(8, peek.channel).then(r => { if (live) setPeekCount((r || []).length); }).catch(() => {});
    return () => { live = false; };
  }, [peek?.channel]);

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
      {/* רצועה עבה בשתי קומות (בקשת צוריאל): שורת-כותרת למעלה, ההודעה המלאה (2-3 שורות) מתחת */}
      <div style={{ background: b.bg, border: `1px solid ${b.accent}55`, borderRadius: 14, padding: "9px 12px 11px",
        boxShadow: `0 4px 18px ${b.glow}` }}>
        {/* ── קומה 1: המותג · לייב מהוואטסאפ · הצצה · מונה · שיתוף ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 6, background: b.accent,
            color: "#191008", fontFamily: F.heading, fontWeight: 900, fontSize: 11, borderRadius: 999, padding: "3px 11px", whiteSpace: "nowrap" }}>
            <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#9c1322", animation: "bt-dot 1.4s infinite" }} />
            {b.logo
              ? <img src={b.logo} alt="" style={{ width: 18, height: 18, borderRadius: "50%", display: "block" }} />
              : <span>{b.emoji}</span>}
            {b.title}
          </span>
          {b.wa ? (
            <a href={b.wa} target="_blank" rel="noopener noreferrer" title="הצטרפו לערוץ הוואטסאפ — העדכונים מגיעים משם לייב"
              style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 4, color: "#25d366", fontFamily: F.heading,
                fontSize: 9.5, fontWeight: 800, border: "1px solid rgba(37,211,102,.45)", borderRadius: 999, padding: "2px 8px",
                background: "rgba(37,211,102,.12)", whiteSpace: "nowrap", textDecoration: "none" }}>
              💬 לייב מהוואטסאפ +
            </a>
          ) : (
            <span title="העדכונים מגיעים אוטומטית — לייב מקבוצות הוואטסאפ" style={{ flex: "0 0 auto", display: "inline-flex",
              alignItems: "center", gap: 4, color: "#25d366", fontFamily: F.heading, fontSize: 9.5, fontWeight: 800,
              border: "1px solid rgba(37,211,102,.45)", borderRadius: 999, padding: "2px 8px", background: "rgba(37,211,102,.12)", whiteSpace: "nowrap" }}>
              💬 לייב מהוואטסאפ
            </span>
          )}
          <span style={{ flex: 1 }} />
          {peek?.channel && peekCount > 0 && (() => {
            const pb = BRANDS[peek.channel];
            return (
              <Link to={peek.to || "/broadcasts"} title={`יש ${peekCount} עדכונים חיים ב«${pb.title}» — לצפייה`}
                style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
                  border: `1px solid ${pb.accent}66`, background: `${pb.accent}1f`, borderRadius: 999, padding: "2px 9px" }}>
                <i style={{ width: 7, height: 7, borderRadius: "50%", background: pb.accent, boxShadow: `0 0 7px ${pb.accent}`,
                  animation: "bt-dot 1.6s infinite" }} />
                <span style={{ color: pb.accent, fontFamily: F.heading, fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {pb.emoji} {peekCount}
                </span>
              </Link>
            );
          })()}
          {items.length > 1 && (
            <span style={{ flex: "0 0 auto", color: "#c9bb93", fontFamily: F.mono, fontSize: 10.5 }}>
              {(i % items.length) + 1}/{items.length}
            </span>
          )}
          {cur && (
            <button onClick={() => shareUpdate(cur, b.title)} title="שתפו את העדכון"
              style={{ flex: "0 0 auto", cursor: "pointer", background: "none", border: `1px solid ${b.accent}66`,
                color: b.accent, borderRadius: 999, width: 26, height: 26, fontSize: 13, lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>↗</button>
          )}
        </div>
        {/* ── קומה 2: ההודעה בגדול (עד 3 שורות) + תצוגה-מקדימה לתמונה/וידאו ── */}
        {cur ? (
          <div key={cur.id + i} style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: "bt-fade .5s ease" }}>
            {cur.image_url && (
              <button onClick={() => setLb(cur.image_url)} title={isVideoUrl(cur.image_url) ? "נגן את הסרטון" : "פתח את התמונה"}
                style={{ flex: "0 0 auto", position: "relative", padding: 0, cursor: "pointer", border: `1px solid ${b.accent}66`,
                  borderRadius: 10, overflow: "hidden", background: "#0a0710", width: 64, height: 64 }}>
                {isVideoUrl(cur.image_url) ? (
                  <>
                    {/* preload=metadata — מוריד רק את הפריים הראשון (קילו-בייטים), לא את הסרטון */}
                    <video src={cur.image_url} preload="metadata" muted playsInline
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,0,0,.25)", color: "#fff", fontSize: 20, textShadow: "0 1px 6px rgba(0,0,0,.8)" }}>▶</span>
                  </>
                ) : (
                  <img src={cur.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                )}
              </button>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* גם האותיות לחיצות — פותחות את הידיעה, לא רק התמונה (בקשת צוריאל) */}
              <div onClick={cur.image_url ? () => setLb(cur.image_url) : undefined}
                title={cur.image_url ? (isVideoUrl(cur.image_url) ? "לחצו לצפייה בסרטון" : "לחצו לצפייה בתמונה") : undefined}
                style={{ color: "#f5ecd2", fontFamily: F.body, fontSize: 13.5, fontWeight: 600, lineHeight: 1.6, minHeight: 42,
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                cursor: cur.image_url ? "pointer" : "default" }}>
                {cur.text}
              </div>
              <div style={{ marginTop: 3, color: "#b9a877", fontFamily: F.heading, fontSize: 10.5 }}>
                {cur.credit && <span style={{ color: b.accent, fontWeight: 800 }}>מאת {cur.credit} · </span>}
                {timeAgoHe(cur.created_at)}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: "#c9bb93", fontFamily: F.body, fontSize: 12.5, fontStyle: "italic", minHeight: 30 }}>
            העדכונים בדרך — הערוץ יתעורר בקרוב…
          </div>
        )}
        {/* שורת-תחתית: שקיפות (בהרצה) + דלת למרכז השידורים — כל העדכונים מכל הערוצים */}
        <div style={{ marginTop: 7, paddingTop: 6, borderTop: `1px solid ${b.accent}26`, display: "flex",
          alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "#a99a7c", fontFamily: F.heading, fontSize: 9.5, letterSpacing: 0.3 }}>
            🛠 ערוץ שידורים אוטומטי · בהרצה
          </span>
          <Link to="/broadcasts" style={{ marginInlineStart: "auto", color: b.accent, fontFamily: F.heading,
            fontSize: 10.5, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>
            📡 כל העדכונים מכל הערוצים ←
          </Link>
        </div>
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
