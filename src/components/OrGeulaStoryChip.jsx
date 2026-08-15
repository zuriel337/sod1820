import React, { useState, useEffect, useRef } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { seenCutoff, markSeenKey } from "../lib/crossesNew.js";
import { track } from "../lib/tracking.js";
import StoryViewer from "./StoryViewer.jsx";
import { OR_GEULA_LOGO } from "./BrandTicker.jsx";
import { storyOpen, storyImpression } from "../lib/storyTrack.js";

// 🔴 צ'יפ «סטורי חדש · אור הגאולה» — מצביע קומפקטי שמופיע *רק כשיש סטורי חדש מאז הביקור*
// (whats_new_law, פר-משתמש). הקשה → StoryViewer. רכיב קנוני יחיד — בית + צ'אט (canonical_ui_components_law).
const SEEN_KEY = "orgeula_story";
const isVideo = (u) => !!u && /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(u);

// scrollTargetId: אם נמסר — הקשה קודם גוללת לרצועת «אור הגאולה» (שיראו את הרשימה), ואז מדליקה את הסטורי.
export default function OrGeulaStoryChip({ scrollTargetId = null }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);
  const [cut, setCut] = useState(() => seenCutoff(SEEN_KEY));
  const [open, setOpen] = useState(false);
  // QUALIFIED IMPRESSION — observer מוקם פעם אחת; dedupe אמיתי ב-storyImpression (פר story/surface/session).
  const imprDone = useRef(false);
  const imprIO = useRef(null);

  useEffect(() => {
    let alive = true;
    supabase.from("channel_updates")
      .select("id,text,image_url,thumb_url,created_at")
      .eq("channel", "or-geula").not("image_url", "is", null)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (alive) setRows(Array.isArray(data) ? data : []); });
    return () => { alive = false; };
  }, []);

  if (!rows || !rows.length) return null;
  const fresh = rows.filter(r => r.created_at && r.created_at > cut);
  // ⛔ לא נעלם אחרי צפייה (בקשת צוריאל 15.8.2026): הצ'יפ נשאר נגיש תמיד; ה«חדש» האדום
  //   + המונה דולקים רק כשיש טרי מאז הביקור, אחרת מצב רגוע «אור הגאולה · סטורי».
  const hasNew = fresh.length > 0;
  const newest = fresh[0] || rows[0];
  const thumb = newest.thumb_url || (!isVideo(newest.image_url) ? newest.image_url : null);
  const dark = P.mode !== "light";

  const openStories = () => {
    try { track("or-geula", String(newest.id), "story_chip"); } catch { /* noop */ }   // back-compat (existing)
    storyOpen("or-geula", newest.id, { surface: "HOME", entry: "chip" });                // canonical open
    markSeenKey(SEEN_KEY, rows[0].created_at);   // סימון נראה → הצ'יפ ייעלם עד סטורי חדש
    // קודם גוללים לרצועה (שיראו איפה זה חי), ואז מדליקים את הסטורי — לימוד «יש כאן חדש», לא סטורי-לנצח.
    const el = scrollTargetId && typeof document !== "undefined" ? document.getElementById(scrollTargetId) : null;
    if (el) {
      try { el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { el.scrollIntoView(); }
      setTimeout(() => setOpen(true), 700);
    } else {
      setOpen(true);
    }
  };
  const closeStories = () => { setOpen(false); setCut(seenCutoff(SEEN_KEY)); };

  return (
    <div style={{ padding: "10px 16px 0", boxSizing: "border-box" }}>
      <style>{`@keyframes ogc-ping{0%{transform:scale(.9);opacity:.85}70%{transform:scale(1.5);opacity:0}100%{opacity:0}}`}</style>
      <button onClick={openStories} aria-label="סטורי חדש באור הגאולה"
        ref={(el) => {
          if (!el || imprDone.current || imprIO.current || typeof IntersectionObserver === "undefined") return;
          let timer = null;
          const io = new IntersectionObserver((es) => {
            for (const e of es) {
              if (e.isIntersecting && e.intersectionRatio >= 0.5) {
                if (!timer) timer = setTimeout(() => { imprDone.current = true; storyImpression("or-geula", newest.id, { surface: "HOME", entry: "chip" }); io.disconnect(); imprIO.current = null; }, 1000);
              } else if (timer) { clearTimeout(timer); timer = null; }
            }
          }, { threshold: [0.5] });
          imprIO.current = io; io.observe(el);
        }}
        style={{
        maxWidth: 660, margin: "0 auto", width: "100%", boxSizing: "border-box", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 13, textAlign: "start",
        background: `linear-gradient(160deg, ${dark ? "rgba(139,92,246,.14)" : "rgba(139,92,246,.12)"}, ${P.card})`,
        border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "11px 15px",
        boxShadow: `0 6px 22px ${P.glow || "rgba(0,0,0,.15)"}`,
      }}>
        {/* טבעת-סטורי + תמונה */}
        <span style={{ position: "relative", flexShrink: 0, width: 50, height: 50, borderRadius: "50%",
          padding: 2, background: "conic-gradient(from 210deg, #d6336c, #8b5cf6, #f6c453, #d6336c)" }}>
          <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#000", border: `2px solid ${P.card}` }}>
            {thumb
              ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : <img src={OR_GEULA_LOGO} alt="אור הגאולה" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          </span>
        </span>
        {/* טקסט */}
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 14 }}>
            {hasNew && (
              <span style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#e0556a" }} />
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#e0556a", animation: "ogc-ping 1.9s ease-out infinite" }} />
              </span>
            )}
            {hasNew ? "סטורי חדש · אור הגאולה" : "אור הגאולה · סטורי"}
          </span>
          <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12 }}>הקישו לצפייה במסך מלא ←</span>
        </span>
        {/* מונה — רק כשיש חדש */}
        {hasNew && fresh.length > 1 && (
          <span style={{ flexShrink: 0, background: "#e0556a", color: "#fff", fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, borderRadius: 999, padding: "3px 10px" }}>{fresh.length} חדשים</span>
        )}
      </button>

      {open && <StoryViewer items={rows} startIndex={0} onClose={closeStories} trackKey="or-geula" surface="HOME" entry="chip" />}
    </div>
  );
}
