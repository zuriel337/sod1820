import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { applySeo, SITE_URL, setOrGeulaVideosJsonLd, clearOrGeulaVideosJsonLd } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { storyOpen, storyEvent } from "../lib/storyTrack.js";
import { galThumb } from "../lib/img.js";
import { shareVideoToStory } from "../lib/share.js";
import ShareActions from "../components/ShareActions.jsx";
import WatchButton from "../components/WatchButton.jsx";
import { useHiddenWidget } from "../lib/hiddenWidgets.js";
import { OR_GEULA_LOGO } from "../components/BrandTicker.jsx";

// 🎬 אור הגאולה — קטלוג-מדיה (ריבועים + סרטונים) מערוץ הוואטסאפ «אור הגאולה».
// ⚠️ זה לא גימטריה — אוסף מדיה אהוב. עדשה על channel_updates where channel='or-geula'.
// דף עצמאי מתויג + SEO (נכנס לסייטמאפ ול-og). עץ אחד: אותו מקור של הטיקר/מרכז-השידורים.
const isVideo = (u) => !!u && /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(u);

export default function OrGeulaPage() {
  const P = usePalette();
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  const [speakerFilter, setSpeakerFilter] = useState(null);   // סינון לפי דובר (רב) — תחת אור הגאולה בלבד
  const { hidden: ogHidden, restore: ogRestore } = useHiddenWidget("or_geula_story");   // מצב «הוסתר לגמרי» + החזרה
  const [sp, setSp] = useSearchParams();
  const openTimeRef = useRef(0);   // dwell (session_ms) for story_close

  // מנוע-סטורי קנוני על ה-player הקיים (approved OQ4: play→story_open, בלי refactor ל-StoryViewer).
  const beginStory = (r, entry) => {
    openTimeRef.current = Date.now();
    storyOpen("or-geula", r.id, { surface: "OR_GEULA_PAGE", entry, index: 0 });                         // canonical open
    storyEvent("or-geula", r.id, "story_view", { surface: "OR_GEULA_PAGE", entry, index: 0, advance: "open" }); // per-item view
  };
  // פתיחת פריט = מעקב + deep-link (?v=id) כדי ששיתוף יגיע *ישר לסרטון הזה*
  const openItem = (r) => {
    setOpen(r);
    try { track("or-geula", String(r.id), "play"); } catch { /* noop */ }   // back-compat (existing)
    beginStory(r, "grid");
    const n = new URLSearchParams(sp); n.set("v", String(r.id)); setSp(n);
  };
  const closeItem = () => {
    if (open) storyEvent("or-geula", open.id, "story_close", { surface: "OR_GEULA_PAGE", entry: "grid", index: 0, reason: "close", session_ms: Date.now() - (openTimeRef.current || Date.now()) });
    setOpen(null);
    const n = new URLSearchParams(sp); n.delete("v"); setSp(n, { replace: true });
  };

  // 📲 שיתוף לסטורי — רכיב-שיתוף קנוני יחיד (lib/share). סופר כ-share_story (≡ story_share, מועשר ב-meta).
  async function shareToStory(item) {
    const r = await shareVideoToStory({
      url: `${SITE_URL}/or-geula?v=${item.id}`,
      text: (item.text || "").trim().slice(0, 140),
    });
    if (r) { storyEvent("or-geula", item.id, "share_story", { surface: "OR_GEULA_PAGE", entry: "grid", index: 0, channel: "link" }); }
    else if (r === null) { /* בוטל/נכשל — שקט */ }
  }

  useEffect(() => {
    track("or-geula");
    let alive = true;
    supabase.from("channel_updates")
      .select("id,text,image_url,thumb_url,credit,link_url,created_at,speaker")
      .eq("channel", "or-geula").not("image_url", "is", null)
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { if (alive) setRows(Array.isArray(data) ? data : []); });
    return () => { alive = false; };
  }, []);

  // deep-link: אם הגיעו עם ?v=<id> — לפתוח ישר את הפריט הזה (שיתוף מגיע לסרטון הספציפי)
  useEffect(() => {
    if (!rows || !rows.length) return;
    const v = sp.get("v");
    if (v) { const it = rows.find(r => String(r.id) === v); if (it && !open) { setOpen(it); beginStory(it, "deeplink"); } }
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // 🖼 תמונת-שיתוף ממותגת (1200×630) — אותו כרטיס /api/card שה-crawler כבר משתמש בו לדף (עקביות
    //    בין גוגל/SPA לבין רשתות; מותג «אור הגאולה» במקום «תמונה ראשונה» אקראית). הכרטיס כבר חי בפרודקשן.
    const shareCard = `${SITE_URL}/api/card?w=${encodeURIComponent("אור הגאולה")}&sub=${encodeURIComponent("סרטונים · ריבועים · רמזי גאולה")}&cap=${encodeURIComponent("אוסף חי שמתעדכן")}`;
    applySeo({
      title: "אור הגאולה — אוסף הסרטונים והרמזים",
      description: "אור הגאולה — אוסף הסרטונים, הריבועים והרמזים החזותיים של הגאולה. תיעוד חי, מתעדכן, בערוץ אור הגאולה של סוד 1820.",
      path: "/or-geula",
      image: shareCard,
    });
    // 🎬 structured data עשיר — ItemList של VideoObject מכל סרטוני-הערוץ (תוצאות-וידאו בגוגל)
    setOrGeulaVideosJsonLd(rows || []);
  }, [rows]);

  // ניקוי ה-JSON-LD של הסרטונים ביציאה מהדף (SPA — לא להשאיר שאריות לדף הבא)
  useEffect(() => () => clearOrGeulaVideosJsonLd(), []);

  // 🏷️ רבנים שמתויגים בערוץ (speaker) — סינון פנימי לדף אור-הגאולה בלבד, לא חוצה-ערוצים.
  const speakers = useMemo(() => {
    const set = new Set();
    for (const r of rows || []) if (r.speaker) set.add(r.speaker);
    return [...set].sort((a, b) => a.localeCompare(b, "he"));
  }, [rows]);
  const filteredRows = useMemo(() => {
    if (!speakerFilter) return rows || [];
    return (rows || []).filter(r => r.speaker === speakerFilter);
  }, [rows, speakerFilter]);

  const wrap = { background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 };
  const inner = { direction: "rtl", maxWidth: 1160, margin: "0 auto", padding: "40px 16px 72px" };

  return (
    <div style={wrap}>
      <div style={inner}>
        {/* הירו */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={OR_GEULA_LOGO} alt="אור הגאולה" width="76" height="76"
            style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", display: "inline-block", boxShadow: "0 4px 18px rgba(0,0,0,.35)" }} />
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(28px,5.5vw,44px)", fontWeight: 800, margin: "8px 0 0" }}>אור הגאולה</h1>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.7, maxWidth: 540, margin: "10px auto 0" }}>
            אוסף הסרטונים, הריבועים והרמזים החזותיים של הגאולה — תיעוד חי שמתעדכן.
          </p>
          {rows && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginTop: 10 }}>{filteredRows.length} פריטים · לחיצה פותחת במסך מלא</div>}
          {/* 🔔 מעקב אחרי אור הגאולה — עדכון כשעולה סרטון/רמז חדש */}
          <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
            <WatchButton topic="channel:or-geula" source="or-geula" label="עקוב אחרי אור הגאולה"
              followLabel="עוקב אחרי אור הגאולה ✓" explainer="נעדכן אותך כשעולה סרטון או רמז חדש בערוץ." />
          </div>
          {/* ↩︎ החזרה — אם המשתמש הסתיר את אור הגאולה «לגמרי», כאן אפשר להחזיר */}
          {ogHidden && (
            <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center",
              background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "10px 14px" }}>
              <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5 }}>🙈 אור הגאולה מוסתר מהעדכונים שלך.</span>
              <button onClick={ogRestore} style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent || "#1a0e00", border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "6px 15px" }}>↩︎ החזר לעדכונים</button>
            </div>
          )}
        </div>

        {/* 🏷️ סינון לפי רב (speaker) — רק כשיש דוברים מתויגים באוסף */}
        {speakers.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 22 }}>
            <button onClick={() => setSpeakerFilter(null)}
              style={{ cursor: "pointer", border: `1px solid ${!speakerFilter ? P.accentText : P.border}`, borderRadius: 999,
                background: !speakerFilter ? P.accentText : P.card, color: !speakerFilter ? "#1a0e00" : P.ink,
                fontFamily: F.heading, fontSize: 12, fontWeight: 800, padding: "6px 14px" }}>הכל</button>
            {speakers.map(s => (
              <button key={s} onClick={() => setSpeakerFilter(s === speakerFilter ? null : s)}
                style={{ cursor: "pointer", border: `1px solid ${speakerFilter === s ? P.accentText : P.border}`, borderRadius: 999,
                  background: speakerFilter === s ? P.accentText : P.card, color: speakerFilter === s ? "#1a0e00" : P.ink,
                  fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "6px 14px" }}>{s}</button>
            ))}
          </div>
        )}

        {rows === null ? (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 40 }}>טוען…</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 40 }}>עדיין אין פריטים באוסף.</div>
        ) : filteredRows.length === 0 ? (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 40 }}>אין פריטים מתויגים לרב הזה.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14 }}>
            {filteredRows.map(r => {
              const vid = isVideo(r.image_url);
              const showTxt = r.text && r.text !== "📷 עדכון" && r.text !== "🎬 עדכון וידאו";
              // תמונה-ממוזערת: thumb_url תמיד עדיף; לתמונה בלי thumb → galThumb; לוידאו בלי thumb → placeholder
              const thumb = r.thumb_url || (vid ? null : galThumb(r, 460));
              return (
                <button key={r.id} onClick={() => openItem(r)} title="פתחו במסך מלא"
                  style={{ cursor: "pointer", textAlign: "start", padding: 0, border: `1px solid ${P.border}`,
                    borderRadius: 15, overflow: "hidden", background: P.card, display: "flex", flexDirection: "column",
                    boxShadow: "0 8px 24px rgba(0,0,0,.10)" }}>
                  <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "linear-gradient(160deg,#1a1030,#0a0710)", overflow: "hidden" }}>
                    {thumb
                      ? <img src={thumb} alt={showTxt ? r.text.slice(0, 60) : "אור הגאולה"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><img src={OR_GEULA_LOGO} alt="אור הגאולה" loading="lazy" style={{ width: "52%", height: "52%", objectFit: "contain", opacity: .92 }} /></div>}
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

      {/* לייטבוקס מסך-מלא — Portal ל-body כדי לצאת משכבת-התוכן (אחרת ה-FAB «העדכונים החיים» מסתיר אותו) */}
      {open && createPortal((
        <div onClick={closeItem} role="dialog" aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "rgba(6,4,12,.94)", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <button onClick={closeItem} aria-label="סגירה"
            style={{ position: "absolute", top: 16, insetInlineEnd: 18, background: "rgba(255,255,255,.14)", color: "#fff",
              border: "none", borderRadius: 999, width: 40, height: 40, fontSize: 20, cursor: "pointer", zIndex: 2 }}>✕</button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, margin: "auto 0" }}>
            {isVideo(open.image_url)
              ? <video src={open.image_url} controls autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "64vh", borderRadius: 14, background: "#000" }} />
              : <img src={open.image_url} alt={open.text || "אור הגאולה"} style={{ maxWidth: "100%", maxHeight: "64vh", objectFit: "contain", borderRadius: 14 }} />}
            {open.text && open.text !== "📷 עדכון" && open.text !== "🎬 עדכון וידאו" && (
              <div style={{ color: "#f0ead8", fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, textAlign: "center", maxWidth: 640, whiteSpace: "pre-wrap" }}>{open.text}</div>
            )}

            {/* 🙏 עידוד-לשיתוף + שיתוף-לסטורי + שיתופים קנוניים */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 11, width: "100%", maxWidth: 560,
              background: "rgba(255,255,255,.05)", border: "1px solid rgba(139,92,246,.35)", borderRadius: 16, padding: "16px 16px 14px" }}>
              <div style={{ color: "#ffd98a", fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, textAlign: "center" }}>
                אהבתם? שתפו — ותזכו את הרבים 🙏
              </div>
              <button onClick={() => shareToStory(open)}
                style={{ background: "linear-gradient(160deg,#8b5cf6,#d6336c)", color: "#fff", border: "none", borderRadius: 999,
                  padding: "12px 26px", fontFamily: F.heading, fontSize: 15, fontWeight: 800, cursor: "pointer", minHeight: 46 }}>
                🔗 שתפו קישור לצפייה
              </button>
              <ShareActions type="video" compact force
                url={`${SITE_URL}/or-geula?v=${open.id}`}
                title={(open.text && open.text.trim().slice(0, 90)) || "אור הגאולה · סוד 1820"}
                image={open.thumb_url || undefined} />
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
