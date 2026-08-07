import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { timeAgoHe } from "../lib/format.js";
import { galThumb } from "../lib/img.js";

// 🎬 רצועת «אור הגאולה» לעמוד-הבית — הסרטונים האחרונים שעלו + מתי. מצביע ל-/or-geula.
// עץ אחד: אותו מקור (channel_updates channel=or-geula) של עמוד-הקטלוג; כאן רק טעימה.
const isVideo = (u) => !!u && /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(u);

export default function HomeOrGeulaRail({ limit = 10 }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);
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

  return (
    <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <h2 className="hn-h2" style={{ textAlign: "start", margin: 0 }}>🎬 אור הגאולה — סרטונים אחרונים</h2>
        <a href="/or-geula" style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>לכל האוסף ←</a>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x proximity" }}>
        {(rows || Array.from({ length: 6 })).map((r, i) => {
          if (!r) return <div key={i} style={{ flex: "0 0 160px", height: 200, borderRadius: 14, background: P.card, opacity: .5 }} />;
          const vid = isVideo(r.image_url);
          const thumb = r.thumb_url || (vid ? null : galThumb(r, 340));
          const cap = r.text && r.text !== "📷 עדכון" && r.text !== "🎬 עדכון וידאו" ? r.text : "";
          return (
            <a key={r.id} href="/or-geula" style={{ flex: "0 0 160px", scrollSnapAlign: "start", textDecoration: "none",
              background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "linear-gradient(160deg,#1a1030,#0a0710)", overflow: "hidden" }}>
                {thumb
                  ? <img src={thumb} alt={cap.slice(0, 40) || "אור הגאולה"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#6b5aa0", fontSize: 34 }}>🎬</div>}
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
            </a>
          );
        })}
      </div>
    </section>
  );
}
