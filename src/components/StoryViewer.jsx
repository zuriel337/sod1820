import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { F } from "../theme.js";
import { SITE_URL } from "../lib/seo.js";
import { storyEvent } from "../lib/storyTrack.js";
import { shareVideoToStory } from "../lib/share.js";
import ShareActions from "./ShareActions.jsx";
import { OR_GEULA_LOGO } from "./BrandTicker.jsx";

// 📲 מציג-סטורי מלא-מסך (סגנון אינסטגרם/וואטסאפ) על פריטי-מדיה (channel_updates).
// פסי-התקדמות למעלה · הקשה שמאל=הקודם / ימין=הבא / מרכז=השהה · התקדמות-אוטומטית · שיתוף-לסטורי.
// עדשה אחת, רכיב קנוני — נפתח מרצועת-הבית ומעמוד אור-הגאולה על אותם נתונים.
const isVideo = (u) => !!u && /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(u);
const IMG_MS = 6000;
const capOf = (r) => (r && r.text && r.text !== "📷 עדכון" && r.text !== "🎬 עדכון וידאו") ? r.text : "";
const iconBtn = { background: "rgba(0,0,0,.42)", color: "#fff", border: "none", borderRadius: 999, width: 38, height: 38, fontSize: 16, cursor: "pointer", display: "grid", placeItems: "center" };

const DEFAULT_BRAND = { name: "אור הגאולה", logo: OR_GEULA_LOGO, shareBase: "/or-geula", trackKey: "or-geula" };

export default function StoryViewer({ items = [], startIndex = 0, onClose, trackKey, brand = DEFAULT_BRAND, onSeen, surface = null, entry = null }) {
  const brandTrackKey = trackKey || brand.trackKey || "or-geula";   // = canonical `section` (→ content_world)
  const [idx, setIdx] = useState(Math.max(0, Math.min(startIndex, items.length - 1)));
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [prog, setProg] = useState(0);           // 0..1 התקדמות הפריט הנוכחי
  const vidRef = useRef(null);
  const cur = items[idx];

  // 🎬 taxonomy state: how the current item was reached, dwell start, and single-fire end guard.
  const advanceRef = useRef("open");             // open | user_next | user_prev | auto
  const openTimeRef = useRef(Date.now());
  const endedRef = useRef(false);
  const idxRef = useRef(idx); idxRef.current = idx;

  // סיום-סשן: story_complete (הגיע לסוף) או story_close (סגירה מוקדמת) — פעם אחת בלבד, ואז onClose האמיתי.
  const endSession = useCallback((kind, reason) => {
    if (endedRef.current) return; endedRef.current = true;
    const session_ms = Date.now() - openTimeRef.current;
    const i = idxRef.current, last = items[i];
    if (kind === "complete") {
      storyEvent(brandTrackKey, last?.id, "story_complete", { surface, entry, items_count: items.length, trigger: advanceRef.current === "auto" ? "auto" : "user", session_ms });
    } else {
      storyEvent(brandTrackKey, last?.id, "story_close", { surface, entry, index: i, reason, session_ms });
    }
    onClose && onClose();
  }, [items, brandTrackKey, surface, entry, onClose]);

  const go = useCallback((n) => {
    if (n < 0) { setIdx(0); return; }
    if (n >= items.length) { endSession("complete"); return; }   // past last = completion
    setIdx(n); setProg(0); setPaused(false);
  }, [items.length, endSession]);
  // user vs auto advance — story_next/story_prev fire ONLY on user action; auto sets advance="auto" (no next event).
  const userNext = useCallback(() => { advanceRef.current = "user_next"; storyEvent(brandTrackKey, items[idxRef.current]?.id, "story_next", { surface, entry, from_index: idxRef.current, to_index: idxRef.current + 1 }); go(idxRef.current + 1); }, [go, brandTrackKey, surface, entry, items]);
  const userPrev = useCallback(() => { advanceRef.current = "user_prev"; storyEvent(brandTrackKey, items[idxRef.current]?.id, "story_prev", { surface, entry, from_index: idxRef.current, to_index: Math.max(0, idxRef.current - 1) }); go(idxRef.current - 1); }, [go, brandTrackKey, surface, entry, items]);
  const autoNext = useCallback(() => { advanceRef.current = "auto"; go(idxRef.current + 1); }, [go]);
  const next = userNext;   // taps/keyboard = user
  const prev = userPrev;

  // per-item view (KEEP per-item semantics) — advance distinguishes open/user_next/user_prev/auto.
  useEffect(() => {
    if (!cur) return;
    storyEvent(brandTrackKey, cur.id, "story_view", { surface, entry, index: idx, advance: advanceRef.current });
    if (onSeen) { try { onSeen(cur); } catch { /* noop */ } }
  }, [idx]); // eslint-disable-line

  // התקדמות + מעבר-אוטומטי לתמונות (וידאו/יוטיוב מתקדמים ידנית/דרך onEnded)
  useEffect(() => {
    if (!cur || isVideo(cur.image_url) || cur.yt) return;
    let raf, start = null;
    const tick = (t) => {
      if (start === null) start = t;
      if (paused) { start = t - prog * IMG_MS; raf = requestAnimationFrame(tick); return; }
      const p = Math.min(1, (t - start) / IMG_MS);
      setProg(p);
      if (p >= 1) { autoNext(); return; }
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
      else if (e.key === "Escape") { e.preventDefault(); endSession("close", "esc"); }
    };
    document.addEventListener("keydown", onKey);
    const prevOv = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOv; };
  }, [next, prev, endSession]);

  if (!cur) return null;
  const vid = isVideo(cur.image_url);
  const cap = capOf(cur);
  const shareUrl = `${SITE_URL}${cur.link_url || `${brand.shareBase || "/or-geula"}?v=${cur.id}`}`;

  // Portal ל-body: מציג-הסטורי חייב לצאת משכבת-התוכן (position:relative;z-index:1 של Layout)
  // אחרת ה-z-index העצום שלו נלכד בתוכה וה-FAB של «העדכונים החיים» (z-index:150 בשורש) מסתיר אותו.
  const ui = (
    <div onClick={() => endSession("close", "backdrop")} role="dialog" aria-modal="true"
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#fff", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, textShadow: "0 1px 4px rgba(0,0,0,.7)" }}>
            <img src={brand.logo || OR_GEULA_LOGO} alt="" width="24" height="24" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(255,255,255,.85)" }} />
            {brand.name || "אור הגאולה"}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {vid && <button onClick={() => setMuted(m => !m)} aria-label="השתקה" style={iconBtn}>{muted ? "🔇" : "🔊"}</button>}
            <button onClick={() => endSession("close", "x")} aria-label="סגירה" style={iconBtn}>✕</button>
          </div>
        </div>

        {/* מדיה — mp4 (<video>) · יוטיוב (<iframe>) · תמונה */}
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          {vid
            ? <video ref={vidRef} src={cur.image_url} autoPlay playsInline
                onTimeUpdate={e => { const v = e.currentTarget; if (v.duration) setProg(v.currentTime / v.duration); }}
                onEnded={autoNext}
                style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
            : cur.yt
              ? <iframe title={cap || brand.name} src={`https://www.youtube-nocookie.com/embed/${cur.yt}?autoplay=1&rel=0&playsinline=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                  style={{ width: "100%", height: "100%", border: 0, background: "#000" }} />
              : <img src={cur.image_url} alt={cap || brand.name || "אור הגאולה"} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
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
              <button onClick={async () => { setPaused(true); const r = await shareVideoToStory({ url: shareUrl, text: cap.slice(0, 140) }); if (r) storyEvent(brandTrackKey, cur.id, "share_story", { surface, entry, index: idx, channel: "link" }); /* ביטול (r===null) ≠ שיתוף — לא נספר, כמו OrGeulaPage */ }}
                style={{ background: "linear-gradient(160deg,#8b5cf6,#d6336c)", color: "#fff", border: "none", borderRadius: 999, padding: "11px 22px", fontFamily: F.heading, fontSize: 14, fontWeight: 800, cursor: "pointer", minHeight: 44 }}>
                🔗 שתפו קישור לצפייה
              </button>
              {/* ערוצים בלבד — בלי כפתור native כפול (מקור-native יחיד = «🔗 שתפו קישור לצפייה» למעלה) */}
              <ShareActions type="video" compact force channels={["whatsapp", "telegram", "facebook", "x", "email", "copy"]} url={shareUrl} title={cap.slice(0, 90) || `${brand.name || "אור הגאולה"} · סוד 1820`} image={cur.thumb_url || undefined} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return (typeof document !== "undefined" && document.body) ? createPortal(ui, document.body) : ui;
}
