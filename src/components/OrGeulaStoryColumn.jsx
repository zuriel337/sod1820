import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { F, LOGO_URL } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase, getTzofonStories } from "../lib/supabase.js";
import { SITE_URL } from "../lib/seo.js";
import { timeAgoHe } from "../lib/format.js";
import { galThumb } from "../lib/img.js";
import { track } from "../lib/tracking.js";
import { shareVideoToStory } from "../lib/share.js";
import StoryViewer from "./StoryViewer.jsx";
import { OR_GEULA_LOGO } from "./BrandTicker.jsx";

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
  const d = size === "md" ? 26 : 22, l = size === "md" ? 17 : 14, st = size === "md" ? 13 : 11;
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
function StoryRailTile({ r, brand, feat = false, brandBadge = false, onOpen, P }) {
  if (!r) return <div style={{ flex: "0 0 auto", width: 66, height: 66, borderRadius: "50%", background: P.card, opacity: .5 }} />;
  const vid = r.is_video || isVideo(r.image_url);
  const thumb = r.thumb_url || (vid ? null : galThumb(r, 160));
  const cap = capOf(r);
  return (
    <button onClick={() => onOpen(r)} title="צפו כסטורי" aria-label={cap.slice(0, 40) || `סטורי ${brand.name}`}
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
        {(feat || brandBadge) && <BrandBadge size="sm" brand={brand} star={feat} />}
      </span>
      <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 9.5, lineHeight: 1.2, maxWidth: 72, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{timeAgoHe(r.created_at)}</span>
    </button>
  );
}

// 🔀 רצועה ממוזגת (מובייל = שורה אחת): הסרטון האחרון שלנו ראשון ומודגש (כתר-זהב), ואחריו
// סטוריז חדשים של אור הגאולה (טבעת ורודה + לוגו). כל פריט נושא את זהותו → מבחינים בלי שתי שורות.
export function MergedStoriesRail({ sources, limit = 20 }) {
  const P = usePalette();
  const navigate = useNavigate();
  const primary = sources[0];
  const bkey = (b) => b.channel || b.seenKey || b.name;
  const [rowsMap, setRowsMap] = useState(null);
  const [seen, setSeen] = useState(() => { const s = new Set(); sources.forEach(b => loadSeen(b.seenKey).forEach(id => s.add(id))); return s; });
  const [viewer, setViewer] = useState(null);   // { items, index, brand }

  useEffect(() => {
    let alive = true;
    Promise.all(sources.map(b => fetchBrandRows(b, limit))).then(res => {
      if (!alive) return;
      const map = {}; sources.forEach((b, i) => { map[bkey(b)] = res[i] || []; });
      setRowsMap(map);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const primaryRows = (rowsMap && rowsMap[bkey(primary)]) || [];
  const merged = [];
  if (rowsMap) {
    const pushId = new Set();
    const add = (r, b) => { if (r && !pushId.has(r.id)) { pushId.add(r.id); merged.push({ ...r, _brand: b }); } };
    if (primary.pinFirst && primaryRows[0]) add(primaryRows[0], primary);   // האחרון שלנו — תמיד ראשון
    sources.forEach(b => (rowsMap[bkey(b)] || []).forEach(r => { if (!seen.has(r.id)) add(r, b); }));   // חדש בלבד
  }
  if (rowsMap && merged.length === 0) return null;

  const openItem = (r) => {
    const b = r._brand || primary;
    setSeen(prev => { const n = new Set(prev); n.add(r.id); const bs = loadSeen(b.seenKey); bs.add(r.id); saveSeen(b.seenKey, bs); return n; });
    if (b.linkMode === "post" && r.link_url) { navigate(r.link_url); return; }
    const rows = (rowsMap && rowsMap[bkey(b)]) || [];
    setViewer({ items: rows, index: Math.max(0, rows.findIndex(x => x.id === r.id)), brand: b });
  };
  const isPinned = (r) => !!(r && r._brand?.pinFirst && r.id === primaryRows[0]?.id);

  return (
    <section aria-label="סטוריז — הצפנים שלנו ואור הגאולה" style={{ direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9, flexWrap: "wrap" }}>
        <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>🎬 סטוריז</div>
        {/* מקרא זעיר — מפענח את הטבעות */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: P.inkSoft, fontFamily: F.body, fontSize: 10.5 }}>
          <img src={primary.logo} alt="" width="14" height="14" style={{ width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${primary.badgeColor}` }} /> שלנו
          <span style={{ opacity: .5, margin: "0 2px" }}>·</span>
          <img src={BRAND_OR_GEULA.logo} alt="" width="14" height="14" style={{ width: 14, height: 14, borderRadius: "50%" }} /> אור הגאולה
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
        {(rowsMap ? merged : Array.from({ length: 8 })).map((r, i) => (
          <StoryRailTile key={r?.id || i} r={r} brand={r?._brand || primary} feat={isPinned(r)} brandBadge onOpen={openItem} P={P} />
        ))}
      </div>
      {viewer && <StoryViewer items={viewer.items} startIndex={viewer.index} brand={viewer.brand} onClose={() => setViewer(null)} />}
    </section>
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
  // בדרך-כלל מסתירים סטורי שנצפה. brand.pinFirst → הפריט האחרון שלנו (rows[0]) **תמיד** מוצג
  //   ומודגש (הסרטון האחרון של האתר תמיד למעלה); רק הישנים יותר נעלמים אחרי צפייה.
  const shown = (() => {
    const list = (rows || []).filter(Boolean);
    if (!brand.pinFirst || !list.length) return list.filter(r => !seen.has(r.id));
    const [first, ...rest] = list;
    return [first, ...rest.filter(r => !seen.has(r.id))];
  })();

  useEffect(() => {
    let alive = true;
    // מקור-נתונים מותאם-מיתוג (למשל «צפונות בתורה» = פוסטים לפי קטגוריה) — עוקף את שאילתת הערוץ
    if (brand.fetchRows) {
      brand.fetchRows(limit).then(data => { if (alive) setRows(Array.isArray(data) ? data : []); }).catch(() => { if (alive) setRows([]); });
      return () => { alive = false; };
    }
    const nowIso = new Date().toISOString();
    supabase.from("channel_updates")
      .select("id,text,image_url,thumb_url,created_at,priority,credit,expires_at,link_url")
      .eq("channel", brand.channel).not("image_url", "is", null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)   // סטורי-שבוע פג לבד; שאר הפריטים (expires_at=null) נשארים
      .order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(limit)   // מוצמד (priority↑) ראשון
      .then(({ data }) => { if (alive) setRows(Array.isArray(data) ? data : []); });
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
            <StoryRailTile key={r?.id || i} r={r} brand={brand} feat={isFeatured(r) || (brand.pinFirst && i === 0)} onOpen={openAt} P={P} />
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
