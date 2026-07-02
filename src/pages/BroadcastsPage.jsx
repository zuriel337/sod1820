import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getChannelUpdates } from "../lib/supabase.js";
import { timeAgoHe } from "../lib/format.js";
import { thumb } from "../lib/img.js";
import { applySeo } from "../lib/seo.js";
import BrandTicker, { BRANDS, isVideoUrl, shareUpdate } from "../components/BrandTicker.jsx";

// 📡 «מרכז השידורים» — דף הטיקרים המלא: כל ערוץ עם הרצועה החיה שלו + כל העדכונים הפעילים.
// עדשה על channel_updates (עץ אחד) — אותו מקור של הטיקרים בבית/בצ'אט.
const CHANNELS = ["reality-code", "or-geula", "sod-hachashmal"];

function ChannelFeed({ channel, P }) {
  const b = BRANDS[channel];
  const [items, setItems] = useState(null);
  const [lb, setLb] = useState(null);

  useEffect(() => {
    let live = true;
    getChannelUpdates(30, channel).then(r => { if (live) setItems(r || []); }).catch(() => live && setItems([]));
    return () => { live = false; };
  }, [channel]);

  return (
    <section style={{ marginBottom: 34 }}>
      <BrandTicker channel={channel} />
      {items === null ? (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, padding: "8px 4px" }}>טוען…</div>
      ) : items.length === 0 ? (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, fontStyle: "italic", padding: "6px 4px" }}>
          עוד אין עדכונים פעילים בערוץ הזה — בקרוב.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map(u => (
            <div key={u.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: P.card,
              border: `1px solid ${P.border}`, borderInlineStart: `3px solid ${b.accent}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{u.text}</p>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", color: P.inkSoft, fontFamily: F.heading, fontSize: 11 }}>
                  <span>{u.credit ? <>✍️ מאת {u.credit} · </> : null}🕒 {timeAgoHe(u.created_at)}</span>
                  <button onClick={() => shareUpdate(u, b.title)} style={{ cursor: "pointer", background: "none",
                    border: `1px solid ${b.accent}66`, color: b.accent, borderRadius: 999, fontFamily: F.heading,
                    fontSize: 10.5, fontWeight: 800, padding: "2px 11px" }}>↗ שתפו</button>
                </div>
              </div>
              {u.image_url && (
                <button onClick={() => setLb(u.image_url)} title={isVideoUrl(u.image_url) ? "נגן את הסרטון" : "פתח את התמונה"}
                  style={{ flex: "0 0 auto", padding: 0, cursor: "zoom-in",
                  border: `1px solid ${P.borderStrong}`, borderRadius: 10, overflow: "hidden", background: "#0a0710" }}>
                  {isVideoUrl(u.image_url) ? (
                    <span style={{ position: "relative", display: "block", width: 74, height: 74 }}>
                      {/* preload=metadata — פריים ראשון בלבד, לא הסרטון */}
                      <video src={u.image_url} preload="metadata" muted playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,.25)", color: "#fff", fontSize: 22, textShadow: "0 1px 6px rgba(0,0,0,.8)" }}>▶</span>
                    </span>
                  ) : (
                    <img src={thumb(u.image_url, 360)} alt="" loading="lazy" style={{ width: 74, height: 74, objectFit: "cover", display: "block" }} />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
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
    </section>
  );
}

export default function BroadcastsPage() {
  const P = usePalette();
  useEffect(() => {
    applySeo({ title: "מרכז השידורים", description: "העדכונים החיים מכל הערוצים — קוד המציאות, אור הגאולה וסוד החשמל — במקום אחד.", path: "/broadcasts" });
  }, []);

  return (
    <div style={{ direction: "rtl", maxWidth: 760, margin: "0 auto", padding: "34px 16px 90px" }}>
      <header style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>שידור חי</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(23px,4.4vw,34px)", fontWeight: 800, margin: "6px 0 8px", textShadow: `0 0 40px ${P.glow}` }}>
          📡 מרכז השידורים
        </h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.9, maxWidth: 480, margin: "0 auto" }}>
          העדכונים החיים מכל הערוצים במקום אחד — כל ערוץ והצבע שלו, כל עדכון עם המקור שלו.
          <br /><span style={{ color: "#25d366", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>
            💬 מגיע אוטומטית · לייב מקבוצות הוואטסאפ
          </span>
        </p>
      </header>
      {CHANNELS.map(ch => <ChannelFeed key={ch} channel={ch} P={P} />)}
    </div>
  );
}
