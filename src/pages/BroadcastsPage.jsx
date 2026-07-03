import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getChannelUpdates } from "../lib/supabase.js";
import { timeAgoHe } from "../lib/format.js";
import { thumb } from "../lib/img.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import BrandTicker, { BRANDS, isVideoUrl, shareUpdate, UpdateModal } from "../components/BrandTicker.jsx";

// 📡 «מרכז השידורים» — דף הטיקרים המלא: כל ערוץ עם הרצועה החיה שלו + כל העדכונים הפעילים.
// עדשה על channel_updates (עץ אחד) — אותו מקור של הטיקרים בבית/בצ'אט.
const CHANNELS = ["reality-code", "torat-haremez", "or-geula", "sod-hachashmal"];

function ChannelFeed({ channel, P, focusId }) {
  const b = BRANDS[channel];
  const [items, setItems] = useState(null);
  const [lb, setLb] = useState(null);
  const scrolledRef = useRef(false);   // גלילה לעדכון המשותף — פעם אחת בלבד

  useEffect(() => {
    let live = true;
    getChannelUpdates(30, channel).then(r => { if (live) setItems(r || []); }).catch(() => live && setItems([]));
    return () => { live = false; };
  }, [channel]);

  return (
    <section id={`ch-${channel}`} style={{ marginBottom: 34, scrollMarginTop: 80 }}>
      <BrandTicker channel={channel} />
      {b.sub && (
        <div style={{ color: b.accent, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textAlign: "center", margin: "4px 0 8px", opacity: 0.9 }}>
          {b.sub}
        </div>
      )}
      {items === null ? (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, padding: "8px 4px" }}>טוען…</div>
      ) : items.length === 0 ? (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, fontStyle: "italic", padding: "6px 4px" }}>
          עוד אין עדכונים פעילים בערוץ הזה — בקרוב.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map(u => {
            const focused = focusId && u.id === focusId;
            return (
            <div key={u.id}
              ref={focused ? el => {
                if (el && !scrolledRef.current) {
                  scrolledRef.current = true;
                  setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
                }
              } : undefined}
              onClick={() => setLb(u)} title="לחצו לפתיחת הידיעה במסך מלא"
              style={{ display: "flex", gap: 12, alignItems: "flex-start", background: P.card, cursor: "pointer",
              border: focused ? `1.5px solid ${b.accent}` : `1px solid ${P.border}`,
              borderInlineStart: `3px solid ${b.accent}`, borderRadius: 12, padding: "12px 14px",
              ...(focused ? { boxShadow: `0 0 26px ${b.accent}55`, animation: "bc-focus 1.6s ease 2" } : {}) }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{u.text}</p>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", color: P.inkSoft, fontFamily: F.heading, fontSize: 11 }}>
                  <span>{u.credit ? <>✍️ מאת {u.credit} · </> : null}🕒 {timeAgoHe(u.created_at)}</span>
                  <button onClick={e => { e.stopPropagation(); shareUpdate(u, b.title); }} style={{ cursor: "pointer", background: "none",
                    border: `1px solid ${b.accent}66`, color: b.accent, borderRadius: 999, fontFamily: F.heading,
                    fontSize: 10.5, fontWeight: 800, padding: "2px 11px" }}>↗ שתפו</button>
                  {u.link_url && (
                    <Link to={u.link_url} onClick={e => e.stopPropagation()} style={{ textDecoration: "none", background: b.accent, color: "#191008",
                      fontFamily: F.heading, fontSize: 10.5, fontWeight: 900, borderRadius: 999, padding: "3px 12px" }}>
                      📖 לקריאת הפוסט המלא ←
                    </Link>
                  )}
                </div>
              </div>
              {u.image_url && (
                <button onClick={e => { e.stopPropagation(); setLb(u); }} title={isVideoUrl(u.image_url) ? "נגן את הסרטון" : "פתח את התמונה"}
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
          );})}
        </div>
      )}
      {lb && <UpdateModal u={lb} brand={b} onClose={() => setLb(null)} />}
    </section>
  );
}

export default function BroadcastsPage() {
  const P = usePalette();
  const [params] = useSearchParams();
  const focusId = params.get("u");   // קישור ויראלי: ?u=<id> — נוחתים בדיוק על העדכון ששותף
  useEffect(() => {
    applySeo({ title: "מרכז השידורים — עדכונים חיים", description: "שידורים חיים ועדכונים מכל הערוצים — קוד המציאות, אור הגאולה וסוד החשמל — רמזים, מסרים וסרטונים במקום אחד, לייב מקבוצות הוואטסאפ.", path: "/broadcasts" });
    track("broadcasts");   // 📈 מעקב-צפיות — נמדד בדף האדמין (בקשת צוריאל: מעקב אחרי הדף)
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
      <style>{`@keyframes bc-focus { 0%,100% { transform:none; } 50% { transform:scale(1.015); } }`}</style>
      {/* 🧭 ניווט-מהיר בין הערוצים — קפיצה לערוץ בלחיצה */}
      <nav style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
        {CHANNELS.map(ch => {
          const b = BRANDS[ch];
          return (
            <a key={ch} href={`#ch-${ch}`} style={{ display: "inline-flex", alignItems: "center", gap: 6,
              textDecoration: "none", background: `${b.accent}14`, border: `1px solid ${b.accent}55`,
              borderRadius: 999, padding: "6px 14px", color: b.accent, fontFamily: F.heading,
              fontSize: 12.5, fontWeight: 800, minHeight: 34 }}>
              {b.logo
                ? <img src={b.logo} alt="" style={{ width: 16, height: 16, borderRadius: "50%", display: "block" }} />
                : <span>{b.emoji}</span>}
              {b.title} ↓
            </a>
          );
        })}
      </nav>
      {CHANNELS.map(ch => <ChannelFeed key={ch} channel={ch} P={P} focusId={focusId} />)}
    </div>
  );
}
