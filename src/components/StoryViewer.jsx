import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { F } from "../theme.js";
import { SITE_URL } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { shareVideoToStory } from "../lib/share.js";
import ShareActions from "./ShareActions.jsx";

// 📲 מציג-סטורי מלא-מסך (סגנון אינסטגרם/וואטסאפ) על פריטי-מדיה (channel_updates).
// פסי-התקדמות למעלה · הקשה שמאל=הקודם / ימין=הבא / מרכז=השהה · התקדמות-אוטומטית · שיתוף-לסטורי.
// עדשה אחת, רכיב קנוני — נפתח מרצועת-הבית ומעמוד אור-הגאולה על אותם נתונים.
const isVideo = (u) => !!u && /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(u);
const IMG_MS = 6000;
const capOf = (r) => (r && r.text && r.text !== "📷 עדכון" && r.text !== "🎬 עדכון וידאו") ? r.text : "";
const iconBtn = { background: "rgba(0,0,0,.42)", color: "#fff", border: "none", borderRadius: 999, width: 38, height: 38, fontSize: 16, cursor: "pointer", display: "grid", placeItems: "center" };

export default function StoryViewer({ items = [], startIndex = 0, onClose, trackKey = "or-geula" }) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(startIndex, items.length - 1)));
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [prog, setProg] = useState(0);           // 0..1 התקדמות הפריט הנוכחי
  const vidRef = useRef(null);
  const cur = items[idx];

  const go = useCallback((n) => {
    if (n < 0) { setIdx(0); return; }
    if (n >= items.length) { onClose && onClose(); return; }
    setIdx(n); setProg(0); setPaused(false);
  }, [items.length, onClose]);
  const next = useCallback(() => go(idx + 1), [go, idx]);
  const prev = useCallback(() => go(idx - 1), [go, idx]);

  // מעקב-צפייה לכל פריט
  useEffect(() => { if (cur) { try { track(trackKey, String(cur.id), "story_view"); } catch { /* noop */ } } }, [idx]); // eslint-disable-line

  // התקדמות + מעבר-אוטומטי לתמונות (וידאו מתקדם דרך onTimeUpdate/onEnded)
  useEffect(() => {
    if (!cur || isVideo(cur.image_url)) return;
    let raf, start = null;
    const tick = (t) => {
      if (start === null) start = t;
      if (paused) { start = t - prog * IMG_MS; raf = requestAnimationFrame(tick); return; }
      const p = Math.min(1, (t - start) / IMG_MS);
      setProg(p);
      if (p >= 1) { next(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idx, paused]); // eslint-disable-line

  // וידאו: סנכרון השהיה/ניגון והשתקה
  useEffect(() => {
    const v = vidRef.current; if (!v) return;
    v.muted = muted;
    if (paused) v.pause(); else v.play().catch(() => {});
  }, [paused, muted, idx]);

  // מקלדת + נעילת גלילת-רקע
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") { e.preventDefault(); onClose && onClose(); }
    };
    document.addEventListener("keydown", onKey);
    const prevOv = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOv; };
  }, [next, prev, onClose]);

  if (!cur) return null;
  const vid = isVideo(cur.image_url);
  const cap = capOf(cur);
  const shareUrl = `${SITE_URL}/or-geula?v=${cur.id}`;

  // Portal ל-body: מציג-הסטורי חייב לצאת משכבת-התוכן (position:relative;z-index:1 של Layout)
  // אחרת ה-z-index העצום שלו נלכד בתוכה וה-FAB של «העדכונים החיים» (z-index:150 בשורש) מסתיר אותו.
  const ui = (
    <div onClick={() => onClose && onClose()} role="dialog" aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ position: "relative", width: "100%", height: "100%", maxWidth: 480, margin: "0 auto", background: "#000", overflow: "hidden" }}>

        {/* פסי-התקדמות */}
        <div style={{ position: "absolute", top: 0, insetInline: 0, zIndex: 5, display: "flex", gap: 4, padding: "10px 10px 0" }}>
          {items.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,.32)", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#fff", width: i < idx ? "100%" : i === idx ? `${prog * 100}%` : "0%" }} />
            </div>
          ))}
        </div>

        {/* שורה עליונה — מיתוג + השתקה + סגירה */}
        <div style={{ position: "absolute", top: 18, insetInline: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
          <span style={{ color: "#fff", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textShadow: "0 1px 4px rgba(0,0,0,.7)" }}>🌅 אור הגאולה</span>
          <div style={{ display: "flex", gap: 6 }}>
            {vid && <button onClick={() => setMuted(m => !m)} aria-label="השתקה" style={iconBtn}>{muted ? "🔇" : "🔊"}</button>}
            <button onClick={() => onClose && onClose()} aria-label="סגירה" style={iconBtn}>✕</button>
          </div>
        </div>

        {/* מדיה */}
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          {vid
            ? <video ref={vidRef} src={cur.image_url} autoPlay playsInline
                onTimeUpdate={e => { const v = e.currentTarget; if (v.duration) setProg(v.currentTime / v.duration); }}
                onEnded={next}
                style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
            : <img src={cur.image_url} alt={cap || "אור הגאולה"} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
        </div>

        {/* אזורי-הקשה: שמאל=הקודם · ימין=הבא · מרכז=השהה/נגן */}
        <button aria-label="הקודם" onClick={prev} style={{ position: "absolute", top: 56, bottom: 150, insetInlineStart: 0, width: "32%", background: "transparent", border: "none", zIndex: 3, cursor: "pointer" }} />
        <button aria-label="השהה" onClick={() => setPaused(p => !p)} style={{ position: "absolute", top: 56, bottom: 150, insetInline: "32%", background: "transparent", border: "none", zIndex: 3, cursor: "pointer" }} />
        <button aria-label="הבא" onClick={next} style={{ position: "absolute", top: 56, bottom: 150, insetInlineEnd: 0, width: "32%", background: "transparent", border: "none", zIndex: 3, cursor: "pointer" }} />

        {/* תחתית — כיתוב + עידוד + שיתוף */}
        <div style={{ position: "absolute", insetInline: 0, bottom: 0, zIndex: 5, padding: "18px 14px calc(14px + env(safe-area-inset-bottom))", background: "linear-gradient(0deg, rgba(0,0,0,.85), rgba(0,0,0,0))" }}>
          {cap && <div style={{ color: "#fff", fontFamily: F.body, fontSize: 13.5, lineHeight: 1.55, textAlign: "center", maxHeight: "20vh", overflowY: "auto", marginBottom: 10, whiteSpace: "pre-wrap", textShadow: "0 1px 4px rgba(0,0,0,.8)" }}>{cap}</div>}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ color: "#ffd98a", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textShadow: "0 1px 4px rgba(0,0,0,.7)" }}>שתפו — ותזכו את הרבים 🙏</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <button onClick={async () => { setPaused(true); await shareVideoToStory({ url: shareUrl, text: cap.slice(0, 140) }); try { track(trackKey, String(cur.id), "share_story"); } catch { /* noop */ } }}
                style={{ background: "linear-gradient(160deg,#8b5cf6,#d6336c)", color: "#fff", border: "none", borderRadius: 999, padding: "11px 22px", fontFamily: F.heading, fontSize: 14, fontWeight: 800, cursor: "pointer", minHeight: 44 }}>
                🔗 שתפו קישור לצפייה
              </button>
              <ShareActions type="video" compact force url={shareUrl} title={cap.slice(0, 90) || "אור הגאולה · סוד 1820"} image={cur.thumb_url || undefined} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return (typeof document !== "undefined" && document.body) ? createPortal(ui, document.body) : ui;
}
