import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { getDimensionFiveVideos } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import { track } from "../lib/tracking.js";
import { SITE_URL } from "../lib/seo.js";
import { shareVideoToStory } from "../lib/share.js";
import WatchButton from "./WatchButton.jsx";

// 🎬 פיד-הרצף של «מימד חמש» — נגן מסך-מלא בסגנון Shorts/TikTok. נפתח מכל כרטיס-מימד-חמש
//    (סרגל/פוטר/ענן) דרך openD5Feed(slug), טוען את כל הסרטונים, ומאפשר מעבר מאחד לשני
//    (החלקה מעלה/מטה · חיצים · מקלדת), כל אחד עם כתוביות עברית (+אנגלית) וכפתור «לפוסט המלא».
//    מותקן פעם אחת ב-Layout. עץ אחד: קורא את אותם פוסטי-וידאו של הסרגלים (getDimensionFiveVideos).
const IND = "#8458ff";

export default function DimensionFiveFeed() {
  const nav = useNavigate();
  const [items, setItems] = useState(null);   // null=טרם נטען
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const touch = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // טעינת הרשימה פעם אחת (בעצלתיים) + פתיחה לפי אירוע
  useEffect(() => {
    let cache = null;
    const ensure = async () => { if (!cache) cache = await getDimensionFiveVideos(); setItems(cache); return cache; };
    const onOpen = async (e) => {
      const slug = e?.detail?.slug;
      const list = await ensure();
      const i = Math.max(0, list.findIndex(v => v.slug === slug));
      if (list.length && list.some(v => v.slug === slug)) {
        setIdx(i); setOpen(true);
      } else if (slug) {
        nav(`/${slug}`);   // אין וידאו לפוסט הזה → פתיחה רגילה
      }
    };
    window.addEventListener("d5feed:open", onOpen);
    return () => window.removeEventListener("d5feed:open", onOpen);
  }, [nav]);

  const cur = open && items ? items[idx % items.length] : null;

  // כתוביות עברית דלוקות כברירת-מחדל + ספירת-צפייה
  useEffect(() => {
    if (!cur) return;
    try { track("dim5", cur.slug, "feed_view", { surface: "feed" }); } catch { /* noop */ }
    const v = videoRef.current;
    if (!v) return;
    const showHe = () => {
      const tracks = v.textTracks || [];
      for (let i = 0; i < tracks.length; i++) tracks[i].mode = (tracks[i].language === "he") ? "showing" : "disabled";
    };
    const t = setTimeout(showHe, 120);
    v.addEventListener("loadedmetadata", showHe);
    return () => { clearTimeout(t); v.removeEventListener("loadedmetadata", showHe); };
  }, [cur]);

  const go = useCallback((d) => {
    setIdx(i => {
      const n = items ? items.length : 1;
      return (i + d + n) % n;
    });
  }, [items]);

  const close = useCallback(() => setOpen(false), []);

  // מקלדת: חצים = מעבר · Esc = סגירה
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, go, close]);

  if (!open || !cur) return null;

  const total = items.length;
  const postUrl = `${SITE_URL}/${cur.slug}`;
  // 🖼️ טקסט-קריא לפוסט-תמונה — הופכים את ה-HTML לפסקאות, ומורידים שורות-רעש (מדיה/קרדיט/ניווט).
  const toText = (html) => String(html || "")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|section|ul)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n").trim();
  const photoText = cur.kind === "photo"
    ? toText(cur.html).split("\n").filter(s => {
        const t = s.trim();
        return !/^🎵/.test(t) && !/מקור חזותי/.test(t) && !/^ראו גם/.test(t) && !/עוד מקוד המציאות/.test(t);
      }).join("\n").replace(/\n{3,}/g, "\n\n").trim()
    : "";
  const onTouchStart = (e) => { touch.current = e.touches[0]?.clientY ?? null; };
  const onTouchEnd = (e) => {
    if (touch.current == null) return;
    const dy = (e.changedTouches[0]?.clientY ?? touch.current) - touch.current;
    if (Math.abs(dy) > 55) go(dy < 0 ? 1 : -1); // החלקה מעלה=הבא
    touch.current = null;
  };
  const doShare = async () => {
    await shareVideoToStory({ url: postUrl, text: stripHtml(cur.title || "") });
    try { track("dim5", cur.slug, "share", { surface: "feed" }); } catch { /* noop */ }
  };

  return (
    <div
      role="dialog" aria-label="מימד חמש — נגן סרטונים"
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      style={{
        position: "fixed", inset: 0, zIndex: 5200, background: "rgba(6,4,14,.96)",
        direction: "rtl", display: "flex", flexDirection: "column", alignItems: "center",
      }}
    >
      {/* שורה עליונה: כותרת · מונה · סגירה */}
      <div style={{ width: "100%", maxWidth: 480, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", flex: "0 0 auto" }}>
        <span style={{ background: `${IND}dd`, color: "#fff", fontFamily: F.heading, fontWeight: 800, fontSize: 11, padding: "3px 9px", borderRadius: 999, flex: "0 0 auto" }}>🌀 מימד חמש</span>
        {/* ✓ וי-מעקב עדין אחרי קטגוריית «מימד חמש» — כמעט בלתי-נראה עד שעוקבים */}
        <span style={{ flex: "0 0 auto" }}><WatchButton variant="mini" topic="category:מימד חמש" source="dim5-feed" label="מעקב" followLabel="עוקב" explainer="עקבו אחרי מימד חמש — נעדכן כשעולה סרטון חדש" /></span>
        <span style={{ color: "#cdbff2", fontFamily: F.heading, fontSize: 12, fontWeight: 700, flex: "0 0 auto" }}>{idx + 1}/{total}</span>
        <div style={{ color: "#fff", fontFamily: F.royal, fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{stripHtml(cur.title || "")}</div>
        <button onClick={close} aria-label="סגירה" style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.14)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
      </div>

      {/* הנגן */}
      <div style={{ flex: 1, width: "100%", maxWidth: 480, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", minHeight: 0, padding: "0 8px" }}>
        {cur.kind === "photo" ? (
          // 🖼️ פוסט-תמונה בסגנון-טיקטוק: תמונה מלאה כרקע מעומעם + מוזיקה מתנגנת אוטומטית + מלל לקריאה (נגלל).
          <div key={cur.id} style={{ position: "relative", height: "100%", width: "100%", borderRadius: 14, overflow: "hidden", background: "#000", boxShadow: "0 10px 40px rgba(0,0,0,.6)" }}>
            {cur.image && <img src={cur.image} alt={stripHtml(cur.title || "")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(.5)" }} />}
            <div style={{ position: "absolute", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch",
              padding: "20px 18px 96px", color: "#f3eefc", fontFamily: F.body, fontSize: 15.5, lineHeight: 1.8, whiteSpace: "pre-wrap", textAlign: "center",
              background: "linear-gradient(180deg, rgba(6,4,14,.15) 0%, rgba(6,4,14,.45) 35%, rgba(6,4,14,.85) 100%)" }}>
              {photoText}
            </div>
            <audio key={"a" + cur.id} ref={audioRef} src={cur.audio_url} autoPlay loop playsInline />
          </div>
        ) : (
          <video
            key={cur.id} ref={videoRef}
            src={cur.video_url} poster={cur.poster || undefined}
            controls autoPlay playsInline crossOrigin="anonymous"
            onEnded={() => go(1)}
            style={{ maxHeight: "100%", maxWidth: "100%", width: "auto", borderRadius: 14, background: "#000", boxShadow: "0 10px 40px rgba(0,0,0,.6)" }}
          >
            {cur.he_vtt && <track kind="subtitles" src={cur.he_vtt} srcLang="he" label="עברית" default />}
            {cur.en_vtt && <track kind="subtitles" src={cur.en_vtt} srcLang="en" label="English" />}
          </video>
        )}

        {/* חיצים בצד (דסקטופ) */}
        <button onClick={() => go(-1)} aria-label="הקודם" title="הקודם"
          style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.12)", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>▲</button>
        <button onClick={() => go(1)} aria-label="הבא" title="הבא"
          style={{ position: "absolute", insetInlineStart: 10, top: "calc(50% + 56px)", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.12)", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>▼</button>
      </div>

      {/* שורה תחתונה: פעולות */}
      <div style={{ width: "100%", maxWidth: 480, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "12px 14px calc(12px + env(safe-area-inset-bottom))", flex: "0 0 auto" }}>
        <button onClick={() => go(1)} style={{ background: IND, color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px", fontFamily: F.heading, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{cur.kind === "photo" ? "הבא ↓" : "הסרטון הבא ↓"}</button>
        <button onClick={() => { const s = cur.slug; close(); nav(`/${s}`); }} style={{ background: "rgba(255,255,255,.12)", color: "#fff", border: "none", borderRadius: 999, padding: "10px 16px", fontFamily: F.heading, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>📖 לפוסט המלא</button>
        <button onClick={doShare} aria-label="שיתוף" style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,.12)", color: "#fff", border: "none", fontSize: 16, cursor: "pointer" }}>🔗</button>
      </div>
    </div>
  );
}
