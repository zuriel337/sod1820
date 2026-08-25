import React, { useState, useEffect, useCallback } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { timeAgoHe } from "../lib/format.js";
import { galThumb } from "../lib/img.js";
import StoryViewer from "./StoryViewer.jsx";
import { OR_GEULA_LOGO } from "./BrandTicker.jsx";
import WatchButton from "./WatchButton.jsx";
import { storyOpen, storyImpression, useQualifiedImpression } from "../lib/storyTrack.js";
import { ensureVideoThumbs } from "../lib/videoThumb.js";

// 🎬 רצועת «אור הגאולה» לעמוד-הבית — הסרטונים האחרונים שעלו + מתי. מצביע ל-/or-geula.
// עץ אחד: אותו מקור (channel_updates channel=or-geula) של עמוד-הקטלוג; כאן רק טעימה.
const isVideo = (u) => !!u && /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(u);

// surface: "HOME" (default) · "VIDEO_CATEGORY" (מ-TaxonomyPage). section קבוע = or-geula → content_world OR_GEULA.
export default function HomeOrGeulaRail({ limit = 10, surface = "HOME" }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);
  const [story, setStory] = useState(-1);   // אינדקס הפריט הפתוח כסטורי (-1 = סגור)
  useEffect(() => {
    let alive = true;
    supabase.from("channel_updates")
      .select("id,text,image_url,thumb_url,created_at")
      .eq("channel", "or-geula").not("image_url", "is", null)
      .order("created_at", { ascending: false }).limit(limit)
      .then(({ data }) => { if (alive) { const rs = Array.isArray(data) ? data : []; setRows(rs); ensureVideoThumbs(rs); } });
    return () => { alive = false; };
  }, [limit]);

  if (rows !== null && rows.length === 0) return null;

  return (
    <section id="or-geula-home" className="hn-wrap" style={{ padding: "0 18px 40px", scrollMarginTop: 74 }}>
      <style>{`@keyframes ogr-ping{0%{transform:scale(.9);opacity:.85}70%{transform:scale(1.7);opacity:0}100%{opacity:0}}`}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <h2 className="hn-h2" style={{ textAlign: "start", margin: 0, display: "inline-flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <img src={OR_GEULA_LOGO} alt="" width="30" height="30" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" }} />
          אור הגאולה
          {/* צ'יפ «● סטורי» — טבעת-גרדיאנט (זהה לטבעת-הסטורי) + נקודה מהבהבת */}
          <span style={{ display: "inline-block", padding: 2, borderRadius: 999, flex: "0 0 auto", background: "conic-gradient(from 210deg, #d6336c, #8b5cf6, #f6c453, #d6336c)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: P.card, borderRadius: 999, padding: "3px 11px 3px 9px" }}>
              <span style={{ position: "relative", width: 7, height: 7, flex: "0 0 auto" }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#e0556a" }} />
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#e0556a", animation: "ogr-ping 1.9s ease-out infinite" }} />
              </span>
              <span style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 12, letterSpacing: .2 }}>סטורי</span>
            </span>
          </span>
        </h2>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>
          <WatchButton topic="channel:or-geula" source="or-geula-home" compact
            label="עקוב" followLabel="עוקב ✓" explainer="" />
          <a href="/or-geula" style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>לכל האוסף ←</a>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x proximity" }}>
        {(rows || Array.from({ length: 6 })).map((r, i) => {
          if (!r) return <div key={i} style={{ flex: "0 0 160px", height: 200, borderRadius: 14, background: P.card, opacity: .5 }} />;
          return (
            <RailTile key={r.id} r={r} i={i} P={P} surface={surface}
              onOpen={() => { storyOpen("or-geula", r.id, { surface, entry: "rail", index: i }); setStory(i); }} />
          );
        })}
      </div>

      {story >= 0 && rows && rows[story] && (
        <StoryViewer items={rows} startIndex={story} onClose={() => setStory(-1)}
          trackKey="or-geula" surface={surface} entry="rail" />
      )}
    </section>
  );
}

// 🎞️ אריח-רצועה — עם QUALIFIED IMPRESSION (≥50% נראה ≥1ש', dedupe פר story/surface/session).
function RailTile({ r, i, P, surface, onOpen }) {
  const ref = useQualifiedImpression(
    useCallback(() => storyImpression("or-geula", r.id, { surface, entry: "rail", index: i }), [r.id, surface, i])
  );
  const vid = isVideo(r.image_url);
  const thumb = r.thumb_url || (vid ? null : galThumb(r, 340));
  const cap = r.text && r.text !== "📷 עדכון" && r.text !== "🎬 עדכון וידאו" ? r.text : "";
  return (
    <button ref={ref} onClick={onOpen} title="צפו כסטורי" style={{ flex: "0 0 160px", scrollSnapAlign: "start", textDecoration: "none", textAlign: "start", padding: 0, cursor: "pointer",
      background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "linear-gradient(160deg,#1a1030,#0a0710)", overflow: "hidden" }}>
        {thumb
          ? <img src={thumb} alt={cap.slice(0, 40) || "אור הגאולה"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><img src={OR_GEULA_LOGO} alt="אור הגאולה" loading="lazy" style={{ width: "54%", height: "54%", objectFit: "contain", opacity: .92 }} /></div>}
        {vid && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.25)" }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center" }}>
              <span style={{ color: "#111", fontSize: 17, marginInlineStart: 2 }}>▶</span>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 700 }}>🕒 {timeAgoHe(r.created_at)}</div>
        {cap && <div style={{ color: P.ink, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cap}</div>}
      </div>
    </button>
  );
}
