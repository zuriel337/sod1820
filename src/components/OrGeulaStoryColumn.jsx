import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { F, LOGO_URL } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase, getTzofonStories, getVideoStories, getLatestPostCards } from "../lib/supabase.js";
import { isFreshSearchLanding } from "../lib/tracking.js";
import { SITE_URL } from "../lib/seo.js";
import { timeAgoHe } from "../lib/format.js";
import { galThumb } from "../lib/img.js";
import { ensureVideoThumbs } from "../lib/videoThumb.js";
import { withinFresh } from "../lib/crossesNew.js";

// נקודת «חדש» רק אם טרם-נצפה וגם עלה ב-24 השעות האחרונות (בקשת צוריאל: לא נקודות על סטורי מעל 24ש׳).
const isNewFresh = (r, seen) => !!(r && !seen.has(r.id) && withinFresh(r.created_at, 24));
import { track } from "../lib/tracking.js";
import { shareVideoToStory } from "../lib/share.js";
import StoryViewer from "./StoryViewer.jsx";
import { OR_GEULA_LOGO } from "./BrandTicker.jsx";
import { storyOpen, storyImpression, useQualifiedImpression } from "../lib/storyTrack.js";
import { useHiddenWidget } from "../lib/hiddenWidgets.js";

// 🎬 עמודת-סטוריז ממותגת — כל הסרטונים מלמעלה-למטה (דף הצ'אט).
// עדשה אחת על channel_updates לפי brand.channel — לא רכיב מקביל (canonical_ui_components_law).
// ברירת-מחדל: «אור הגאולה» (aggregated); brand={BRAND_MELUCHA} → «כי לה׳ המלוכה» (החומר של האתר).
// המנוף לשיתוף: כפתור 🔗 *ישיר* על כל פריט. לחיצה על הכרטיס פותחת StoryViewer במסך-מלא.
const isVideo = (u) => !!u && /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(u);
const capOf = (r) => (r && r.text && r.text !== "📷 עדכון" && r.text !== "🎬 עדכון וידאו") ? r.text : "";
// 🌟 סטורי מוצמד/ממותג — priority גבוה מסמן אותו; מקבל כוכב + לוגו. סרטוני-אור-הגאולה הרגילים priority ~50.
const isFeatured = (r) => (Number(r?.priority) || 0) >= 1000;

// 🏷️ מיתוגים — כל ערוץ-סטוריז הוא אותו רכיב עם מיתוג אחר (לוגו/שם/צבע/מפתח-נראה נפרד).
export const BRAND_OR_GEULA = {
  channel: "or-geula", name: "אור הגאולה", logo: OR_GEULA_LOGO, href: "/or-geula",
  seenKey: "og_seen_v1", trackKey: "or-geula", shareBase: "/or-geula",
  ring: "conic-gradient(from 210deg, #d6336c, #8b5cf6, #f6c453, #d6336c)",
  featRing: "conic-gradient(from 210deg, #e8c84a, #c9a52e, #f6e27a, #e8c84a)",
  badgeColor: "#e8c84a", railTitle: "אור הגאולה · סטוריז", colTitle: "אור הגאולה",
};
// 🔯 «צפונות בתורה» — הצפנים של האתר (כתר «כי לה׳ המלוכה»). המקור = פוסטים לפי **קטגוריה**
//    (צפונות בתורה + הצופן בסרטים), לא ערוץ channel_updates. לחיצה מנווטת לפוסט (linkMode='post').
export const BRAND_TZOFON = {
  fetchRows: (limit) => getTzofonStories({ limit }), linkMode: "post", pinFirst: true,
  name: "צפונות בתורה", logo: LOGO_URL, href: "/category/צפונות בתורה",
  seenKey: "tzofon_seen_v1", trackKey: "tzofon", shareBase: "/category/צפונות בתורה",
  ring: "conic-gradient(from 210deg, #e8c84a, #c9a52e, #f6e27a, #e8c84a)",
  featRing: "conic-gradient(from 210deg, #f6e27a, #e8c84a, #b8860b, #f6e27a)",
  badgeColor: "#e8c84a", railTitle: "צפונות בתורה · הצפנים שלנו", colTitle: "צפונות בתורה",
};

// 👁️ «כבר נראה» — מסתירים סטורי שהמשתמש כבר צפה בו (localStorage per-משתמש · whats_new_law).
const loadSeen = (key) => { try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); } };
const saveSeen = (key, set) => { try { localStorage.setItem(key, JSON.stringify([...set].slice(-500))); } catch { /* noop */ } };
// באדג׳ לוגו-מיתוג (± כוכב) בפינת הסטורי — מזהה לאיזה ערוץ הפריט שייך (כתר=שלנו / לוגו=אור הגאולה).
// star=true (הסטורי המודגש/האחרון-שלנו) מוסיף ⭐. size: 'sm' (רצועה) | 'md' (עמודה)
function BrandBadge({ size = "sm", brand, star = true }) {
  const d = size === "lg" ? 34 : size === "md" ? 26 : 22, l = size === "lg" ? 24 : size === "md" ? 17 : 14, st = size === "lg" ? 15 : size === "md" ? 13 : 11;
  return (
    <span style={{ position: "absolute", bottom: -3, insetInlineStart: -3, width: d, height: d, borderRadius: "50%", background: "#fff", border: `2px solid ${brand.badgeColor}`, display: "grid", placeItems: "center", boxShadow: "0 1px 5px rgba(0,0,0,.45)", zIndex: 2 }}>
      <img src={brand.logo} alt={brand.name} style={{ width: l, height: l, borderRadius: "50%", objectFit: "cover" }} />
      {star && <span style={{ position: "absolute", top: -8, insetInlineEnd: -6, fontSize: st, textShadow: "0 1px 2px rgba(0,0,0,.5)" }}>⭐</span>}
    </span>
  );
}

// שליפת שורות למיתוג (ערוץ channel_updates או fetchRows מותאם) — משמש גם רצועה בודדת וגם ממוזגת.
async function fetchBrandRows(brand, limit) {
  try {
    if (brand.fetchRows) { const d = await brand.fetchRows(limit); return Array.isArray(d) ? d : []; }
    const nowIso = new Date().toISOString();
    const { data } = await supabase.from("channel_updates")
      .select("id,text,image_url,thumb_url,created_at,priority,credit,expires_at,link_url")
      .eq("channel", brand.channel).not("image_url", "is", null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

// 🎞️ אריח-רצועה קנוני יחיד (עיגול-סטורי) — משמש את הרצועה הבודדת ואת הרצועה הממוזגת.
//   badgeBoost → הלוגו שלנו גדול יותר (הבלטה). pin → 📌 בפינה (הסטורי הנעוץ = הצופן).
function StoryRailTile({ r, brand, feat = false, brandBadge = false, badgeBoost = false, pin = false, isNew = false, onOpen, P, surface = "CHAT", index = 0 }) {
  const ir = useQualifiedImpression(useCallback(() => { if (r) storyImpression(brand?.trackKey || "or-geula", r.id, { surface, entry: "rail", index }); }, [r?.id, brand?.trackKey, surface, index]));
  if (!r) return <div style={{ flex: "0 0 auto", width: 66, height: 66, borderRadius: "50%", background: P.card, opacity: .5 }} />;
  const vid = r.is_video || isVideo(r.image_url);
  const thumb = r.thumb_url || (vid ? null : galThumb(r, 160));
  const cap = capOf(r);
  return (
    <button ref={ir} onClick={() => onOpen(r)} title="צפו כסטורי" aria-label={cap.slice(0, 40) || `סטורי ${brand.name}`}
      style={{ flex: "0 0 auto", width: 72, cursor: "pointer", background: "none", border: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <span style={{ position: "relative", width: 66, height: 66, borderRadius: "50%", padding: 3, background: feat ? brand.featRing : brand.ring, flex: "0 0 auto" }}>
        <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "linear-gradient(160deg,#1a1030,#0a0710)", border: `2px solid ${P.card}` }}>
          {thumb
            ? <img src={thumb} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}><img src={brand.logo} alt={brand.name} loading="lazy" style={{ width: "56%", height: "56%", objectFit: "contain", opacity: .92 }} /></span>}
        </span>
        {vid && (
          <span style={{ position: "absolute", inset: 3, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(0,0,0,.18)" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", color: "#111", fontSize: 10 }}>▶</span>
          </span>
        )}
        {pin && <span aria-hidden style={{ position: "absolute", top: -8, insetInlineEnd: -6, fontSize: 18, transform: "rotate(-8deg)", textShadow: "0 1px 3px rgba(0,0,0,.6)", zIndex: 3 }}>🦅</span>}
        {isNew && <span aria-hidden title="חדש מאז שלא היית" style={{ position: "absolute", top: -2, insetInlineStart: -2, width: 12, height: 12, borderRadius: "50%", background: "#e0556a", border: `2px solid ${P.card}`, zIndex: 4 }} />}
        {(feat || brandBadge) && <BrandBadge size={badgeBoost ? "lg" : "sm"} brand={brand} star={feat && !pin} />}
      </span>
      <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 9.5, lineHeight: 1.2, maxWidth: 72, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.created_at ? timeAgoHe(r.created_at) : (r.ours ? "שלנו" : "")}</span>
    </button>
  );
}

// 🃏 אריח-עמודה קנוני (כרטיס אופקי: תמונה + טקסט) — לגרסת-העמודה של הרצועה הממוזגת (דסקטופ, צד שמאל).
function StoryColumnCard({ r, brand, feat = false, pin = false, badgeBoost = false, brandBadge = false, isNew = false, onOpen, P, surface = "CHAT", index = 0 }) {
  const ir = useQualifiedImpression(useCallback(() => { if (r) storyImpression(brand?.trackKey || "or-geula", r.id, { surface, entry: "column", index }); }, [r?.id, brand?.trackKey, surface, index]));
  if (!r) return <div style={{ height: 76, borderRadius: 12, background: P.card, opacity: .5 }} />;
  const vid = r.is_video || isVideo(r.image_url);
  const thumb = r.thumb_url || (vid ? null : galThumb(r, 200));
  const cap = capOf(r);
  return (
    <div ref={ir} onClick={() => onOpen(r)} title="צפו כסטורי" role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(r); } }}
      style={{ cursor: "pointer", display: "flex", gap: 10, alignItems: "stretch", textAlign: "start",
        background: P.card, border: `1px solid ${feat ? brand.badgeColor : P.border}`, borderRadius: 12, overflow: "hidden", padding: 8,
        boxShadow: feat ? `0 0 0 1px ${brand.badgeColor}, 0 4px 16px rgba(212,175,55,0.18)` : "none" }}>
      <div style={{ position: "relative", flex: "0 0 64px", width: 64, height: 64, borderRadius: 9, overflow: "hidden", background: "linear-gradient(160deg,#1a1030,#0a0710)" }}>
        {thumb
          ? <img src={thumb} alt={cap.slice(0, 40) || brand.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><img src={brand.logo} alt={brand.name} loading="lazy" style={{ width: "56%", height: "56%", objectFit: "contain", opacity: .92 }} /></div>}
        {vid && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.25)" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center" }}><span style={{ color: "#111", fontSize: 11, marginInlineStart: 1 }}>▶</span></div>
          </div>
        )}
        {pin && <span aria-hidden style={{ position: "absolute", top: -6, insetInlineEnd: -4, fontSize: 17, transform: "rotate(-8deg)", textShadow: "0 1px 3px rgba(0,0,0,.6)", zIndex: 3 }}>🦅</span>}
        {isNew && <span aria-hidden title="חדש מאז שלא היית" style={{ position: "absolute", top: -3, insetInlineStart: -3, width: 12, height: 12, borderRadius: "50%", background: "#e0556a", border: `2px solid ${P.card}`, zIndex: 4 }} />}
        {(feat || badgeBoost || brandBadge) && <BrandBadge size={badgeBoost ? "md" : "sm"} brand={brand} star={feat && !pin} />}
      </div>
      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3, justifyContent: "center" }}>
        <div style={{ color: (feat || r.ours) ? brand.badgeColor : P.accentDim, fontFamily: F.heading, fontSize: 10, fontWeight: 800 }}>{r.ours ? `${r.is_cipher ? "🦅 " : ""}${r.created_at ? "🕒 " + timeAgoHe(r.created_at) : "שלנו"}` : `🕒 ${timeAgoHe(r.created_at)}`}</div>
        {cap && <div style={{ color: P.ink, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cap}</div>}
      </div>
    </div>
  );
}

// 🔀 רצועה ממוזגת:
//   📌 הסטורי הנעוץ הראשון = **הצופן** (כתר-זהב גדול + 🦅) — לחיצה **מנגנת את הסרט עצמו** (וידאו
//      ב-StoryViewer), לא ניווט לפוסט. · שאר הפריטים = אור הגאולה (טבעת ורודה + לוגו קטן), נעלמים
//      אחרי צפייה. הלוגו שלנו גדול משלהם להבלטה.
//   layout='rail' (מובייל, שורה אחת אופקית) · layout='column' (דסקטופ, עמודה בצד שמאל — «אותו דבר»).
// ogOnly=true → שער קנוני של **אור הגאולה בלבד** (בלי הצפנים/CIPHERS): רק ערוץ אור הגאולה,
//   כותרת ממותגת אור-הגאולה + כניסה «כל אור הגאולה» לתיקייה/ארכיון הקיים (/or-geula). preview של הערוץ.
export function MergedStoriesRail({ limit = 20, layout = "rail", surface = "CHAT", ogOnly = false }) {
  const P = usePalette();
  const OURS = BRAND_TZOFON, OG = BRAND_OR_GEULA;
  const entry = layout === "column" ? "column" : "rail";   // sub-surface
  const [videos, setVideos] = useState(null);        // כל הסרטונים שלנו (וידאו) — פיד-סטוריז
  const [ogRows, setOgRows] = useState(null);
  const [oursSeen, setOursSeen] = useState(() => loadSeen(OURS.seenKey));
  const [ogSeen, setOgSeen] = useState(() => loadSeen(OG.seenKey));
  const [viewer, setViewer] = useState(null);        // { items, index, brand, seenKey }
  // 🙈 «הסר מהעדכונים» — רלוונטי רק לשער אור-הגאולה הטהור (ogOnly); לא מסתיר את «הסרטונים שלנו».
  const { canRemove, hidden, ready: hideReady, remove } = useHiddenWidget("or_geula_story");

  useEffect(() => {
    let alive = true;
    if (ogOnly) { setVideos([]); }   // אור הגאולה בלבד — לא מושכים סרטוני-צופן (CIPHERS)
    else getVideoStories({ limit: 10 }).then(c => { if (alive) setVideos(Array.isArray(c) ? c : []); }).catch(() => { if (alive) setVideos([]); });
    fetchBrandRows(OG, limit).then(r => { if (alive) { setOgRows(r); ensureVideoThumbs(r); } }).catch(() => { if (alive) setOgRows([]); });
    return () => { alive = false; };
  }, [limit, ogOnly]);

  if (ogOnly && (hidden || (canRemove && !hideReady))) return null;

  const ready = ogRows !== null && videos !== null;
  // ⛔ לא מסתירים אחרי צפייה (בקשת צוריאל 15.8.2026 — «Rank, Don't Hide»): מציגים את הכל,
  // רק מסמנים «חדש» (נקודה אדומה) על מה שטרם נצפה. עד 3 סרטונים-שלנו, הראשון מודגש.
  const oursShown = (videos || []).filter(Boolean).slice(0, 3);
  const ogAll = (ogRows || []).filter(Boolean);
  const merged = [
    ...oursShown.map((r, i) => ({ ...r, _brand: OURS, _feat: i === 0, _new: isNewFresh(r, oursSeen) })),
    ...ogAll.map(r => ({ ...r, _brand: OG, _feat: false, _new: isNewFresh(r, ogSeen) })),
  ];
  if (ready && merged.length === 0) return null;

  const markSeen = (seenKey, id) => {
    const s = loadSeen(seenKey); s.add(id); saveSeen(seenKey, s);
    if (seenKey === OURS.seenKey) setOursSeen(new Set(s)); else setOgSeen(new Set(s));
  };
  const openItem = (r) => {
    if (r.ours) {   // סרטון שלנו — מנגן את הסרט (mp4/יוטיוב) ברצף; מסומן נצפה → נעלם
      const i = Math.max(0, oursShown.findIndex(x => x.id === r.id));
      storyOpen("tzofon", r.id, { surface, entry, index: i });   // content_world=CIPHERS
      markSeen(OURS.seenKey, r.id);
      setViewer({ items: oursShown, index: i, brand: OURS, seenKey: OURS.seenKey });
      return;
    }
    const i = Math.max(0, (ogRows || []).findIndex(x => x.id === r.id));
    storyOpen("or-geula", r.id, { surface, entry, index: i });   // content_world=OR_GEULA
    markSeen(OG.seenKey, r.id);
    setViewer({ items: ogRows || [], index: i, brand: OG, seenKey: OG.seenKey });
  };

  // כותרת: ogOnly → מיתוג אור-הגאולה בלבד + «כל אור הגאולה ←» (לתיקייה הקיימת /or-geula);
  //        אחרת → כותרת ממוזגת (סרטונים שלנו + אור הגאולה) כמו בצ'אט.
  const header = ogOnly ? (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <img src={OG.logo} alt="" width="22" height="22" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" }} />
      <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>אור הגאולה · סטוריז</div>
      <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <a href={OG.href} style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, textDecoration: "none", whiteSpace: "nowrap" }}>כל אור הגאולה ←</a>
        {canRemove && (
          <button onClick={() => { if (window.confirm("להסתיר את אור הגאולה לגמרי? הרצועה לא תוצג לך יותר באף מקום באתר. אפשר להחזיר בכל עת מדף «אור הגאולה».")) remove(); }}
            title="אל תציג לי יותר את אור הגאולה" aria-label="הסתר לגמרי את אור הגאולה"
            style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, borderRadius: 999,
              color: P.inkSoft, fontFamily: F.body, fontSize: 10.5, padding: "3px 9px", whiteSpace: "nowrap" }}>
            🙈 אל תציג לי יותר
          </button>
        )}
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
      <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>🎬 סטוריז</div>
      {/* מקרא זעיר — מפענח את הטבעות (הלוגו שלנו גדול יותר) */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: P.inkSoft, fontFamily: F.body, fontSize: 10.5 }}>
        <img src={OURS.logo} alt="" width="17" height="17" style={{ width: 17, height: 17, borderRadius: "50%", border: `1.5px solid ${OURS.badgeColor}` }} /> הסרטונים שלנו
        <span style={{ opacity: .5, margin: "0 2px" }}>·</span>
        <img src={OG.logo} alt="" width="13" height="13" style={{ width: 13, height: 13, borderRadius: "50%" }} /> אור הגאולה
      </span>
    </div>
  );
  // 📂 אריח-כניסה בסוף הרצועה → התיקייה/ארכיון הקיים של אור הגאולה (/or-geula). לא ארכיון חדש.
  const allTile = ogOnly ? (
    <a href={OG.href} title="כל אור הגאולה" aria-label="כל אור הגאולה — כל הסטוריז"
      style={{ flex: "0 0 auto", width: 72, textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <span style={{ width: 66, height: 66, borderRadius: "50%", border: `2px dashed ${P.borderStrong || P.border}`, display: "grid", placeItems: "center", background: P.card, flex: "0 0 auto" }}>
        <span style={{ fontSize: 22 }}>📂</span>
      </span>
      <span style={{ color: P.accentText, fontFamily: F.body, fontSize: 9.5, lineHeight: 1.2, maxWidth: 72, textAlign: "center", fontWeight: 700 }}>כל אור הגאולה</span>
    </a>
  ) : null;
  const viewerEl = viewer && <StoryViewer items={viewer.items} startIndex={viewer.index} brand={viewer.brand}
    surface={surface} entry={entry}
    onSeen={(it) => markSeen(viewer.seenKey, it.id)} onClose={() => setViewer(null)} />;

  // דסקטופ — «אותו דבר, בצד שמאל»: עמודה אנכית (כרטיסים), הצופן הראשון מודגש (🦅)
  if (layout === "column") {
    return (
      <section aria-label="סטוריז — הצופן ואור הגאולה" style={{ direction: "rtl" }}>
        {header}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(ready ? merged : Array.from({ length: 6 })).map((r, i) => (
            <StoryColumnCard key={r?.id || i} r={r} brand={r?._brand || OURS} surface={surface} index={i}
              feat={!!r?._feat} pin={!!(r?._feat && r?.is_cipher)} badgeBoost={!!r?._feat} brandBadge isNew={!!r?._new} onOpen={openItem} P={P} />
          ))}
          {ready && ogOnly && (
            <a href={OG.href} style={{ textAlign: "center", color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, textDecoration: "none", padding: "8px 0" }}>📂 כל אור הגאולה ←</a>
          )}
        </div>
        {viewerEl}
      </section>
    );
  }

  // מובייל — שורה אחת אופקית (עיגולים)
  return (
    <section aria-label="סטוריז — הצופן ואור הגאולה" style={{ direction: "rtl" }}>
      {header}
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
        {(ready ? merged : Array.from({ length: 8 })).map((r, i) => (
          <StoryRailTile key={r?.id || i} r={r} brand={r?._brand || OURS} surface={surface} index={i}
            feat={!!r?._feat} brandBadge badgeBoost={!!r?._feat} pin={!!(r?._feat && r?.is_cipher)} isNew={!!r?._new} onOpen={openItem} P={P} />
        ))}
        {ready && allTile}
      </div>
      {viewerEl}
    </section>
  );
}

// 🔎 סטוריז-גילוי לנוחתים מגוגל — הרצועה הממוזגת (הצופן + אור הגאולה) מוצגת רק ל**מבקר ראשוני
//    שהגיע ממקור חיצוני** (גוגל/רשת · isFreshSearchLanding), ורק על פוסטים **מעל חודש באתר**.
//    מטרה: לחשוף למי שנוחת מגוגל ולא מכיר את האתר את התוכן החי — בלי להטריד מבקרים חוזרים.
export function LandingDiscoveryStories({ postDate, olderThanDays = 30, excludeSlug = null }) {
  const P = usePalette();
  const [show, setShow] = useState(false);
  const [latest, setLatest] = useState([]);   // 2 הפוסטים האחרונים + זמן-עדכון
  useEffect(() => {
    let ok = false;
    try {
      const isDesktop = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(min-width: 1000px)").matches;
      const t = postDate ? new Date(postDate).getTime() : 0;
      const oldEnough = t > 0 && (Date.now() - t) > olderThanDays * 864e5;
      ok = isDesktop && oldEnough && isFreshSearchLanding();   // מחשב בלבד · פוסט מעל חודש · נוחת ראשוני מגוגל
    } catch { ok = false; }
    setShow(ok);
    if (ok) getLatestPostCards({ limit: 2, excludeSlug }).then(r => setLatest(r || [])).catch(() => {});
  }, [postDate, olderThanDays, excludeSlug]);
  if (!show) return null;
  return (
    <div style={{ margin: "0 0 22px", padding: "12px 14px", border: `1px solid ${P.borderStrong}`, borderRadius: 14, background: P.card, direction: "rtl" }}>
      <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, marginBottom: 8, letterSpacing: .3 }}>✨ חדשים כאן? הצצה לתוכן החי של האתר</div>
      <MergedStoriesRail ogOnly limit={20} surface="POST_PAGE" />
      {latest.length > 0 && (
        <>
          <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, letterSpacing: .5, margin: "14px 0 8px" }}>🆕 העדכונים האחרונים</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {latest.map(p => (
              <a key={p.slug} href={"/" + p.slug} style={{ flex: "1 1 200px", minWidth: 0, display: "flex", gap: 9, alignItems: "center", textDecoration: "none",
                background: P.cardGrad || P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: 7 }}>
                <div style={{ flex: "0 0 46px", width: 46, height: 46, borderRadius: 8, overflow: "hidden", background: "#0a0710" }}>
                  {p.poster
                    ? <img src={p.poster} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}><img src={LOGO_URL} alt="" style={{ width: "62%", height: "62%", objectFit: "contain", opacity: .9 }} /></div>}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: P.accentText, fontFamily: F.royal, fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</div>
                  {p.modified && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10, fontWeight: 700, marginTop: 2 }}>✏️ עודכן {timeAgoHe(p.modified)}</div>}
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrGeulaStoryColumn({ limit = 30, variant = "column", brand = BRAND_OR_GEULA }) {
  const P = usePalette();
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [story, setStory] = useState(-1);   // אינדקס הפריט הפתוח כסטורי (-1 = סגור)
  const [seen, setSeen] = useState(() => loadSeen(brand.seenKey));
  // פתיחת פריט: מסמנים «נראה» (נעלם) → linkMode='post' מנווט לפוסט; אחרת פותח StoryViewer על rows
  const openAt = (r) => {
    setSeen(prev => { const n = new Set(prev); n.add(r.id); saveSeen(brand.seenKey, n); return n; });
    if (brand.linkMode === "post" && r.link_url) { navigate(r.link_url); return; }
    setStory(rows.indexOf(r));
  };
  // ⛔ לא מסתירים אחרי צפייה (בקשת צוריאל 15.8.2026 — «Rank, Don't Hide»): מציגים את כל הפריטים
  //   (newest-first), ורק מסמנים «חדש» (נקודה אדומה) על מה שטרם נצפה. כך אחרי יומיים עדיין רואים
  //   את החדשים למעלה — ולא נדחפים לתוכן ישן שצף כי החדשים «נעלמו».
  const shown = (rows || []).filter(Boolean);

  useEffect(() => {
    let alive = true;
    // מקור-נתונים מותאם-מיתוג (למשל «צפונות בתורה» = פוסטים לפי קטגוריה) — עוקף את שאילתת הערוץ
    if (brand.fetchRows) {
      brand.fetchRows(limit).then(data => { if (alive) { const rs = Array.isArray(data) ? data : []; setRows(rs); ensureVideoThumbs(rs); } }).catch(() => { if (alive) setRows([]); });
      return () => { alive = false; };
    }
    const nowIso = new Date().toISOString();
    supabase.from("channel_updates")
      .select("id,text,image_url,thumb_url,created_at,priority,credit,expires_at,link_url")
      .eq("channel", brand.channel).not("image_url", "is", null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)   // סטורי-שבוע פג לבד; שאר הפריטים (expires_at=null) נשארים
      .order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(limit)   // מוצמד (priority↑) ראשון
      .then(({ data }) => { if (alive) { const rs = Array.isArray(data) ? data : []; setRows(rs); ensureVideoThumbs(rs); } });
    return () => { alive = false; };
  }, [limit, brand.channel, brand.fetchRows]);

  if (rows !== null && shown.length === 0) return null;

  // שיתוף ישיר — בלי לפתוח את הסרטון (סופר כ-share_story, כמו מתוך המציג)
  const shareUrlOf = (r) => `${SITE_URL}${r.link_url || `${brand.shareBase}?v=${r.id}`}`;
  const shareItem = async (e, r) => {
    e.stopPropagation();
    const res = await shareVideoToStory({ url: shareUrlOf(r), text: capOf(r).slice(0, 140) });
    if (res) { try { track(brand.trackKey, String(r.id), "share_story"); } catch { /* noop */ } }
  };

  const dark = P.mode !== "light";

  const viewer = (story >= 0 && rows && rows[story])
    ? <StoryViewer items={rows} startIndex={story} onClose={() => setStory(-1)} brand={brand} />
    : null;

  // 🎞️ variant="rail" — רצועת-סטוריז אופקית (סגנון אינסטגרם), קבועה למובייל: תמיד גלויה,
  // גם אחרי צפייה. אותו מקור + אותו StoryViewer קנוני — בלי כפילות (canonical_ui_components_law).
  if (variant === "rail") {
    return (
      <section aria-label={`${brand.name} — סטוריז`} style={{ direction: "rtl" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
          <img src={brand.logo} alt="" width="22" height="22" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" }} />
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>{brand.railTitle}</div>
          <a href={brand.href} style={{ marginInlineStart: "auto", color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, textDecoration: "none" }}>לכל האוסף ←</a>
        </div>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {(rows ? shown : Array.from({ length: 8 })).map((r, i) => (
            <StoryRailTile key={r?.id || i} r={r} brand={brand} feat={isFeatured(r) || (brand.pinFirst && i === 0)} isNew={isNewFresh(r, seen)} onOpen={openAt} P={P} />
          ))}
        </div>
        {viewer}
      </section>
    );
  }

  return (
    <section aria-label={`${brand.name} — סרטונים`}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <img src={brand.logo} alt="" width="28" height="28" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>{brand.colTitle}</div>
          <a href={brand.href} style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, textDecoration: "none" }}>לכל האוסף ←</a>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(rows ? shown : Array.from({ length: 6 })).map((r, i) => {
          if (!r) return <div key={i} style={{ height: 76, borderRadius: 12, background: P.card, opacity: .5 }} />;
          const vid = isVideo(r.image_url);
          const feat = isFeatured(r);
          const thumb = r.thumb_url || (vid ? null : galThumb(r, 200));
          const cap = capOf(r);
          return (
            <div key={r.id} onClick={() => openAt(r)} title="צפו כסטורי" role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openAt(r); } }}
              style={{ cursor: "pointer", display: "flex", gap: 10, alignItems: "stretch", textAlign: "start",
                background: P.card, border: `1px solid ${feat ? brand.badgeColor : P.border}`, borderRadius: 12, overflow: "hidden", padding: 8,
                boxShadow: feat ? `0 0 0 1px ${brand.badgeColor}, 0 4px 16px rgba(212,175,55,0.18)` : "none" }}>
              {/* תמונה-ממוזערת */}
              <div style={{ position: "relative", flex: "0 0 64px", width: 64, height: 64, borderRadius: 9, overflow: "hidden",
                background: "linear-gradient(160deg,#1a1030,#0a0710)" }}>
                {thumb
                  ? <img src={thumb} alt={cap.slice(0, 40) || brand.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><img src={brand.logo} alt={brand.name} loading="lazy" style={{ width: "56%", height: "56%", objectFit: "contain", opacity: .92 }} /></div>}
                {vid && (
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.25)" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center" }}>
                      <span style={{ color: "#111", fontSize: 11, marginInlineStart: 1 }}>▶</span>
                    </div>
                  </div>
                )}
                {feat && <BrandBadge size="md" brand={brand} />}
                {isNewFresh(r, seen) && <span aria-hidden title="חדש מאז שלא היית" style={{ position: "absolute", top: -3, insetInlineStart: -3, width: 12, height: 12, borderRadius: "50%", background: "#e0556a", border: `2px solid ${P.card}`, zIndex: 4 }} />}
              </div>
              {/* טקסט + זמן */}
              <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10, fontWeight: 700 }}>🕒 {timeAgoHe(r.created_at)}{isNewFresh(r, seen) && <span style={{ color: "#e0556a", fontWeight: 800 }}> · חדש</span>}</div>
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
