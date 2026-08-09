import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { SITE_URL } from "../lib/seo.js";
import { timeAgoHe } from "../lib/format.js";
import { galThumb } from "../lib/img.js";
import { track } from "../lib/tracking.js";
import { shareVideoToStory } from "../lib/share.js";
import StoryViewer from "./StoryViewer.jsx";
import { OR_GEULA_LOGO } from "./BrandTicker.jsx";

// 🎬 עמודת «אור הגאולה» — כל הסרטונים מלמעלה-למטה, לדסקטופ בלבד (דף הצ'אט).
// עדשה אחת: אותו מקור (channel_updates channel=or-geula) של הרצועה בבית ושל /or-geula — לא רכיב מקביל.
// המנוף לשיתוף: כפתור 🔗 *ישיר* על כל פריט — משתפים בלי לפתוח את הסרטון (הכפתור כבר לא קבור צעד עמוק).
// לחיצה על הכרטיס פותחת את הסטורי במסך-מלא (StoryViewer הקנוני).
const isVideo = (u) => !!u && /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(u);
const capOf = (r) => (r && r.text && r.text !== "📷 עדכון" && r.text !== "🎬 עדכון וידאו") ? r.text : "";

export default function OrGeulaStoryColumn({ limit = 30 }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);
  const [story, setStory] = useState(-1);   // אינדקס הפריט הפתוח כסטורי (-1 = סגור)

  useEffect(() => {
    let alive = true;
    supabase.from("channel_updates")
      .select("id,text,image_url,thumb_url,created_at")
      .eq("channel", "or-geula").not("image_url", "is", null)
      .order("created_at", { ascending: false }).limit(limit)
      .then(({ data }) => { if (alive) setRows(Array.isArray(data) ? data : []); });
    return () => { alive = false; };
  }, [limit]);

  if (rows !== null && rows.length === 0) return null;

  // שיתוף ישיר — בלי לפתוח את הסרטון (סופר כ-share_story, כמו מתוך המציג)
  const shareItem = async (e, r) => {
    e.stopPropagation();
    const res = await shareVideoToStory({ url: `${SITE_URL}/or-geula?v=${r.id}`, text: capOf(r).slice(0, 140) });
    if (res) { try { track("or-geula", String(r.id), "share_story"); } catch { /* noop */ } }
  };

  const dark = P.mode !== "light";
  return (
    <section aria-label="אור הגאולה — סרטונים">
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <img src={OR_GEULA_LOGO} alt="" width="28" height="28" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>אור הגאולה</div>
          <a href="/or-geula" style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, textDecoration: "none" }}>לכל האוסף ←</a>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(rows || Array.from({ length: 6 })).map((r, i) => {
          if (!r) return <div key={i} style={{ height: 76, borderRadius: 12, background: P.card, opacity: .5 }} />;
          const vid = isVideo(r.image_url);
          const thumb = r.thumb_url || (vid ? null : galThumb(r, 200));
          const cap = capOf(r);
          return (
            <div key={r.id} onClick={() => setStory(i)} title="צפו כסטורי" role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStory(i); } }}
              style={{ cursor: "pointer", display: "flex", gap: 10, alignItems: "stretch", textAlign: "start",
                background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, overflow: "hidden", padding: 8 }}>
              {/* תמונה-ממוזערת */}
              <div style={{ position: "relative", flex: "0 0 64px", width: 64, height: 64, borderRadius: 9, overflow: "hidden",
                background: "linear-gradient(160deg,#1a1030,#0a0710)" }}>
                {thumb
                  ? <img src={thumb} alt={cap.slice(0, 40) || "אור הגאולה"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><img src={OR_GEULA_LOGO} alt="אור הגאולה" loading="lazy" style={{ width: "56%", height: "56%", objectFit: "contain", opacity: .92 }} /></div>}
                {vid && (
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.25)" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center" }}>
                      <span style={{ color: "#111", fontSize: 11, marginInlineStart: 1 }}>▶</span>
                    </div>
                  </div>
                )}
              </div>
              {/* טקסט + זמן */}
              <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10, fontWeight: 700 }}>🕒 {timeAgoHe(r.created_at)}</div>
                {cap && <div style={{ color: P.ink, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cap}</div>}
              </div>
              {/* 🔗 שיתוף ישיר — בלי לפתוח */}
              <button onClick={(e) => shareItem(e, r)} aria-label="שתפו סרטון זה" title="שתפו — ותזכו את הרבים"
                style={{ flex: "0 0 auto", alignSelf: "center", width: 36, height: 36, borderRadius: 999, cursor: "pointer",
                  border: "none", color: "#fff", fontSize: 15, display: "grid", placeItems: "center",
                  background: dark ? "linear-gradient(160deg,#8b5cf6,#d6336c)" : "linear-gradient(160deg,#8b5cf6,#d6336c)" }}>
                🔗
              </button>
            </div>
          );
        })}
      </div>

      {story >= 0 && rows && rows[story] && (
        <StoryViewer items={rows} startIndex={story} onClose={() => setStory(-1)} />
      )}
    </section>
  );
}
