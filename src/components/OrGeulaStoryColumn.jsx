import React, { useState, useEffect } from "react";
import { F, LOGO_URL } from "../theme.js";
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
// 🌟 סטורי מוצמד/ממותג של האתר («כי לה׳ המלוכה») — priority גבוה מסמן אותו; מקבל כוכב + לוגו-הכתר
//    ונשאר ראשון כל עוד לא פג (expires_at). סרטוני אור-הגאולה הרגילים הם priority ~50.
const isFeatured = (r) => (Number(r?.priority) || 0) >= 1000;
// באדג׳ הכוכב+לוגו — מוצג רק על הסטורי הממותג. size: 'sm' (רצועה) | 'md' (עמודה)
function FeaturedBadge({ size = "sm" }) {
  const d = size === "md" ? 26 : 22, l = size === "md" ? 17 : 14, st = size === "md" ? 13 : 11;
  return (
    <span style={{ position: "absolute", bottom: -3, insetInlineStart: -3, width: d, height: d, borderRadius: "50%", background: "#fff", border: "2px solid #e8c84a", display: "grid", placeItems: "center", boxShadow: "0 1px 5px rgba(0,0,0,.45)", zIndex: 2 }}>
      <img src={LOGO_URL} alt="כי לה׳ המלוכה" style={{ width: l, height: l, borderRadius: "50%", objectFit: "cover" }} />
      <span style={{ position: "absolute", top: -8, insetInlineEnd: -6, fontSize: st, textShadow: "0 1px 2px rgba(0,0,0,.5)" }}>⭐</span>
    </span>
  );
}

export default function OrGeulaStoryColumn({ limit = 30, variant = "column" }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);
  const [story, setStory] = useState(-1);   // אינדקס הפריט הפתוח כסטורי (-1 = סגור)

  useEffect(() => {
    let alive = true;
    const nowIso = new Date().toISOString();
    supabase.from("channel_updates")
      .select("id,text,image_url,thumb_url,created_at,priority,credit,expires_at")
      .eq("channel", "or-geula").not("image_url", "is", null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)   // סטורי-שבוע פג לבד; שאר הפריטים (expires_at=null) נשארים
      .order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(limit)   // מוצמד (priority↑) ראשון
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

  const viewer = (story >= 0 && rows && rows[story])
    ? <StoryViewer items={rows} startIndex={story} onClose={() => setStory(-1)} />
    : null;

  // 🎞️ variant="rail" — רצועת-סטוריז אופקית (סגנון אינסטגרם), קבועה למובייל: תמיד גלויה,
  // גם אחרי צפייה. אותו מקור + אותו StoryViewer קנוני — בלי כפילות (canonical_ui_components_law).
  if (variant === "rail") {
    return (
      <section aria-label="אור הגאולה — סטוריז" style={{ direction: "rtl" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
          <img src={OR_GEULA_LOGO} alt="" width="22" height="22" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" }} />
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>אור הגאולה · סטוריז</div>
          <a href="/or-geula" style={{ marginInlineStart: "auto", color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, textDecoration: "none" }}>לכל האוסף ←</a>
        </div>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {(rows || Array.from({ length: 8 })).map((r, i) => {
            if (!r) return <div key={i} style={{ flex: "0 0 auto", width: 66, height: 66, borderRadius: "50%", background: P.card, opacity: .5 }} />;
            const vid = isVideo(r.image_url);
            const feat = isFeatured(r);
            const thumb = r.thumb_url || (vid ? null : galThumb(r, 160));
            const cap = capOf(r);
            return (
              <button key={r.id} onClick={() => setStory(i)} title="צפו כסטורי" aria-label={cap.slice(0, 40) || "סטורי אור הגאולה"}
                style={{ flex: "0 0 auto", width: 72, cursor: "pointer", background: "none", border: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <span style={{ position: "relative", width: 66, height: 66, borderRadius: "50%", padding: 3,
                  background: feat ? "conic-gradient(from 210deg, #e8c84a, #c9a52e, #f6e27a, #e8c84a)" : "conic-gradient(from 210deg, #d6336c, #8b5cf6, #f6c453, #d6336c)", flex: "0 0 auto" }}>
                  <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "linear-gradient(160deg,#1a1030,#0a0710)", border: `2px solid ${P.card}` }}>
                    {thumb
                      ? <img src={thumb} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}><img src={OR_GEULA_LOGO} alt="אור הגאולה" loading="lazy" style={{ width: "56%", height: "56%", objectFit: "contain", opacity: .92 }} /></span>}
                  </span>
                  {vid && (
                    <span style={{ position: "absolute", inset: 3, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(0,0,0,.18)" }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", color: "#111", fontSize: 10 }}>▶</span>
                    </span>
                  )}
                  {feat && <FeaturedBadge size="sm" />}
                </span>
                <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 9.5, lineHeight: 1.2, maxWidth: 72, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{timeAgoHe(r.created_at)}</span>
              </button>
            );
          })}
        </div>
        {viewer}
      </section>
    );
  }

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
          const feat = isFeatured(r);
          const thumb = r.thumb_url || (vid ? null : galThumb(r, 200));
          const cap = capOf(r);
          return (
            <div key={r.id} onClick={() => setStory(i)} title="צפו כסטורי" role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStory(i); } }}
              style={{ cursor: "pointer", display: "flex", gap: 10, alignItems: "stretch", textAlign: "start",
                background: P.card, border: `1px solid ${feat ? "#e8c84a" : P.border}`, borderRadius: 12, overflow: "hidden", padding: 8,
                boxShadow: feat ? "0 0 0 1px #e8c84a, 0 4px 16px rgba(212,175,55,0.18)" : "none" }}>
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
                {feat && <FeaturedBadge size="md" />}
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

      {viewer}
    </section>
  );
}
