import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { applySeo, SITE_URL } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { galThumb } from "../lib/img.js";

// 🎬 אור הגאולה — קטלוג-מדיה (ריבועים + סרטונים) מערוץ הוואטסאפ «אור הגאולה».
// ⚠️ זה לא גימטריה — אוסף מדיה אהוב. עדשה על channel_updates where channel='or-geula'.
// דף עצמאי מתויג + SEO (נכנס לסייטמאפ ול-og). עץ אחד: אותו מקור של הטיקר/מרכז-השידורים.
const isVideo = (u) => !!u && /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(u);

export default function OrGeulaPage() {
  const P = usePalette();
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    track("or-geula");
    let alive = true;
    supabase.from("channel_updates")
      .select("id,text,image_url,thumb_url,credit,link_url,created_at")
      .eq("channel", "or-geula").not("image_url", "is", null)
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { if (alive) setRows(Array.isArray(data) ? data : []); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const first = rows && rows.find(r => r.image_url && !isVideo(r.image_url));
    applySeo({
      title: "אור הגאולה — אוסף הסרטונים והרמזים",
      description: "אור הגאולה — אוסף הסרטונים, הריבועים והרמזים החזותיים של הגאולה. תיעוד חי, מתעדכן, בערוץ אור הגאולה של סוד 1820.",
      path: "/or-geula",
      image: first ? first.image_url : undefined,
    });
  }, [rows]);

  const wrap = { background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 };
  const inner = { direction: "rtl", maxWidth: 1160, margin: "0 auto", padding: "40px 16px 72px" };

  return (
    <div style={wrap}>
      <div style={inner}>
        {/* הירו */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 34 }}>🌅</div>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(28px,5.5vw,44px)", fontWeight: 800, margin: "8px 0 0" }}>אור הגאולה</h1>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.7, maxWidth: 540, margin: "10px auto 0" }}>
            אוסף הסרטונים, הריבועים והרמזים החזותיים של הגאולה — תיעוד חי שמתעדכן.
          </p>
          {rows && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginTop: 10 }}>{rows.length} פריטים · לחיצה פותחת במסך מלא</div>}
        </div>

        {rows === null ? (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 40 }}>טוען…</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 40 }}>עדיין אין פריטים באוסף.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14 }}>
            {rows.map(r => {
              const vid = isVideo(r.image_url);
              const showTxt = r.text && r.text !== "📷 עדכון" && r.text !== "🎬 עדכון וידאו";
              // תמונה-ממוזערת: thumb_url תמיד עדיף; לתמונה בלי thumb → galThumb; לוידאו בלי thumb → placeholder
              const thumb = r.thumb_url || (vid ? null : galThumb(r, 460));
              return (
                <button key={r.id} onClick={() => setOpen(r)} title="פתחו במסך מלא"
                  style={{ cursor: "pointer", textAlign: "start", padding: 0, border: `1px solid ${P.border}`,
                    borderRadius: 15, overflow: "hidden", background: P.card, display: "flex", flexDirection: "column",
                    boxShadow: "0 8px 24px rgba(0,0,0,.10)" }}>
                  <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "linear-gradient(160deg,#1a1030,#0a0710)", overflow: "hidden" }}>
                    {thumb
                      ? <img src={thumb} alt={showTxt ? r.text.slice(0, 60) : "אור הגאולה"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#6b5aa0", fontSize: 40 }}>🎬</div>}
                    {vid && (
                      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.28)" }}>
                        <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", boxShadow: "0 4px 16px rgba(0,0,0,.4)" }}>
                          <span style={{ color: "#111", fontSize: 22, marginInlineStart: 3 }}>▶</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {showTxt && (
                    <div style={{ padding: "11px 13px", color: P.ink, fontFamily: F.body, fontSize: 13, lineHeight: 1.55,
                      display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.text}</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* לייטבוקס מסך-מלא */}
      {open && (
        <div onClick={() => setOpen(null)} role="dialog" aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(6,4,12,.94)", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 20 }}>
          <button onClick={() => setOpen(null)} aria-label="סגירה"
            style={{ position: "absolute", top: 16, insetInlineEnd: 18, background: "rgba(255,255,255,.14)", color: "#fff",
              border: "none", borderRadius: 999, width: 40, height: 40, fontSize: 20, cursor: "pointer" }}>✕</button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: "100%", maxHeight: "82vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            {isVideo(open.image_url)
              ? <video src={open.image_url} controls autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "72vh", borderRadius: 14, background: "#000" }} />
              : <img src={open.image_url} alt={open.text || "אור הגאולה"} style={{ maxWidth: "100%", maxHeight: "72vh", objectFit: "contain", borderRadius: 14 }} />}
            {open.text && open.text !== "📷 עדכון" && open.text !== "🎬 עדכון וידאו" && (
              <div style={{ color: "#f0ead8", fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, textAlign: "center", maxWidth: 640, whiteSpace: "pre-wrap" }}>{open.text}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
