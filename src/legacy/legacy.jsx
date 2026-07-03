import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase, getPostsFromSupabase, getPostBySlug, adaptPost, getGematriaByPhrases, searchPosts, getDistinctCategoriesAndTags, getGematriaByValue, getCommentsByPostId, getChatMessages, sendChatMessage, subscribeToChatMessages, getPopularPosts, sendContactMessage, getTrafficStats, subscribeEmail, getAdminInbox, markMessageRead, getOldSiteComments, adminUpdatePost, logActivity, getShareCount, incrementShareCount, subscribeShareCount, logView, getViewCount } from "../lib/supabase.js";
import UploadFindings from "../components/UploadFindings.jsx";
import { AiVerifiedDisclaimer, AiAdditionBox } from "../components/AiVerifiedNote.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import BrandTicker from "../components/BrandTicker.jsx";
import { resolveAuthor } from "../lib/authors.js";
import PostFollowBox from "../components/PostFollowBox.jsx";
import { applySeo, cleanDescription, SITE_URL } from "../lib/seo.js";
import { useAuth } from "../lib/AuthContext.jsx";
import StickyAnchorAd from "../components/StickyAnchorAd.jsx";
import SideRailAd from "../components/SideRailAd.jsx";
import PopularPrayersBox from "../components/PopularPrayersBox.jsx";
import LessonFunnel from "../components/LessonFunnel.jsx";
import ChatScrollRail from "../components/ChatScrollRail.jsx";
import AdvancedPostEditor from "../components/AdvancedPostEditor.jsx";
import PostImageCarousel from "../components/PostImageCarousel.jsx";
import PostGalleryLinks from "../components/PostGalleryLinks.jsx";
import Lightbox from "../components/Lightbox.jsx";
import MatrixRain from "../components/MatrixRain.jsx";
import { POST_FX } from "../lib/postFx.js";
import { openNumberDrawer } from "../lib/numberDrawer.js";
import { track, trackWhatsapp } from "../lib/tracking.js";
import { usePalette } from "../lib/palette.js";

// פוסטי תפילה/רפואה שבהם מוצג חלון "העבירו את האור הלאה" (לפי wp_id):
// 29289 — סדר תפילה לרפואה שלמה (רבי פנחס מקוריץ) · 36173 — תפילה לרפואה של הינוקא.
const PRAYER_SHARE_WP_IDS = [29289, 36173];

// ===== GEMATRIA =====
const GEM = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
const calcGem = w => [...w].reduce((s,c) => s + (GEM[c] || 0), 0);

// ===== DESIGN TOKENS =====
const C = {
  bg:           "#07050E",
  bgGlow:       "#110e1e",
  gold:         "#d4af37",
  goldLight:    "#e8c840",
  goldBright:   "#f6e27a",
  goldDim:      "#9a7818",
  goldDark:     "#3a2200",
  goldDeep:     "#1a0e00",
  crimson:      "#7a1320",
  crimsonLight: "#a01f2e",
  royal:        "#3d1f5c",
  royalLight:   "#6b3fa0",
  surface:      "#0d0a0e",
  surface2:     "#140f0c",
  border:       "rgba(212,175,55,0.18)",
  borderGold:   "rgba(212,175,55,0.38)",
  muted:        "#8a7a5e",
  faint:        "#1a0f0a",
  danger:       "#8B2020",
};

const F = {
  royal:   "'Heebo', sans-serif",
  regal:   "'Heebo', serif",
  cinzel:  "'Cinzel', serif",
  heading: "'Heebo', sans-serif",
  body:    "'Heebo', serif",
  mono:    "'Courier New', monospace",
};

// ===== DATA =====
const TESTIMONIALS = [
  { name: "מיכל ר׳", text: "אחרי השיעור הראשון ראיתי את המספר שלי בכל מקום. זה שינה לי את החיים.", stars: 5 },
  { name: "דוד כ׳", text: "ההסברים נוגעים בדברים שאין להם הסבר — ועדיין מבינים הכל.", stars: 5 },
  { name: "שרה מ׳", text: "הקורס על המסתתר פתח לי ממד שלם שלא ידעתי שקיים.", stars: 5 },
  { name: "יוסף ב׳", text: "השקעתי בקורס ארבעת העולמות ושינה את האופן שבו אני רואה את המציאות.", stars: 5 },
  { name: "רחל א׳", text: "הסברים ברורים, עמוקים ומרגשים. ממליצה לכל אחד.", stars: 5 },
];

// ===== KEY NUMBERS =====

const LOGO_URL = "/logo.png";

const KEY_NUMBERS = {
  1:    "האחד — שורש הכל",
  3:    "שלמות / חשכה / קוד הבריאה 333",
  7:    "חותם הבריאה",
  14:   "דוד מלכות",
  26:   "יהוה",
  40:   "מ — זרע שינוי",
  45:   "גאולה",
  358:  "משיח = נחש",
  400:  "ת — חותם התפשטות",
  1237: "התגלות — לילה כיום יאיר",
  1820: "סוד השם יהוה × עמים",
};

const PAGE_CONTENT_STORE_KEY = "sod1820_page_content";
const PAGE_CONTENT_DEFAULTS = {
  home: {
    title: "סוד 1820",
    description: "גימטריה היא לא עניין של מספרים בלבד — היא שפה חיה שמגלה את המציאות מאחורי המציאות.",
    bodyHtml: "<p>גלה איך המילים והמספרים מתחברים כדי לחשוף מבנים נסתרות. כאן תוכל לקדם את עצמך עם שיטות למידה חדשות ולראות את המספרים כחלופה לשפה.</p>",
    category: "ראשי",
    tag: "home",
  },
  about: {
    title: "אודות",
    description: "צוריאל הוא חוקר גימטריה עצמאי עם למעלה מ-10 שנות מחקר, שמפתח שיטות מקוריות לחשיפה של הסודות בשפה.",
    bodyHtml: "<p>העמוד הזה מכיל את הסיפור מאחורי השיטות, החזון והדרך שבה צוריאל פיתח את הגישה הייחודית שלו.</p>",
    category: "אודות",
    tag: "about",
  },
  blog: {
    title: "פוסטים אחרונים",
    description: "",
    bodyHtml: "",
    category: "",
    tag: "blog",
  },
};

// ===== ORNAMENTS =====

const Ornament = ({ size = 20, color = C.gold }) => (
  <span style={{ color, fontSize: size, fontFamily: "serif", lineHeight: 1, userSelect: "none" }}>✦</span>
);

const RoyalDivider = ({ width = 300 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, margin: "0 auto", width }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, ${C.gold}, transparent)` }} />
      <span style={{ color: C.goldDim, fontSize: 7, lineHeight: 1, userSelect: "none" }}>✦</span>
      <span style={{ color: C.gold, fontSize: 13, lineHeight: 1, userSelect: "none" }}>❖</span>
      <span style={{ color: C.goldDim, fontSize: 7, lineHeight: 1, userSelect: "none" }}>✦</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${C.gold}, transparent)` }} />
    </div>
    <div style={{ width: "54%", height: 1, background: `linear-gradient(to right, transparent, ${C.borderGold}, transparent)` }} />
  </div>
);

// ===== SHARED COMPONENTS =====

function GoldButton({ children, onClick, variant = "primary", style = {}, disabled = false }) {
  const [hov, setHov] = useState(false);
  const isPrimary = variant === "primary";
  return (
    <button
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: isPrimary
          ? (hov ? `linear-gradient(135deg, #3a2a00, #4a3600)` : `linear-gradient(135deg, #2A1E00, #3a2a00)`)
          : "transparent",
        border: `1px solid ${hov ? C.goldBright : C.gold}`,
        color: hov ? C.goldBright : C.goldLight,
        padding: "13px 36px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: F.heading,
        fontSize: 13,
        letterSpacing: 3,
        borderRadius: 2,
        transition: "all 0.25s",
        fontWeight: 600,
        opacity: disabled ? 0.4 : 1,
        textTransform: "uppercase",
        boxShadow: hov && isPrimary ? `0 0 24px ${C.goldDark}` : "none",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function RoyalInput({ label, value, onChange, type = "text", placeholder = "" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, color: C.muted, letterSpacing: 4,
        marginBottom: 8, fontFamily: F.heading, textTransform: "uppercase"
      }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          background: C.bg,
          border: `1px solid ${focused ? C.gold : C.border}`,
          borderBottom: `1px solid ${focused ? C.goldBright : C.borderGold}`,
          color: C.goldBright,
          padding: "12px 16px",
          fontSize: 15,
          fontFamily: F.body,
          borderRadius: 2,
          outline: "none",
          boxSizing: "border-box",
          direction: (type === "email" || type === "password") ? "ltr" : "rtl",
          transition: "border-color 0.25s",
          boxShadow: focused ? `inset 0 0 20px ${C.goldDeep}` : "none",
        }}
      />
    </div>
  );
}

function SectionHeader({ eyebrow, title, center = true }) {
  return (
    <div style={{ textAlign: center ? "center" : "right", marginBottom: 56 }}>
      {eyebrow && (
        <div style={{
          fontSize: 12, letterSpacing: 6, color: C.goldDim,
          marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase"
        }}>{eyebrow}</div>
      )}
      <h2 style={{
        color: C.goldLight,
        margin: "0 0 20px",
        fontSize: "clamp(26px, 4.2vw, 40px)",
        fontFamily: F.regal,
        fontWeight: 700,
        letterSpacing: 2,
        textShadow: `0 0 50px rgba(212,175,55,0.4), 0 1px 3px rgba(0,0,0,0.7)`,
      }}>{title}</h2>
      <RoyalDivider />
    </div>
  );
}

function PageBody({ bodyHtml }) {
  if (!bodyHtml) return null;
  return (
    <div
      style={{
        color: C.goldDim,
        fontFamily: F.body,
        fontSize: 16,
        lineHeight: 2,
        maxWidth: 750,
        margin: "0 auto 40px",
        textAlign: "center",
      }}
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  );
}

// ===== ELS (דילוגי אותיות) =====

const ELS_SOURCE = `
  בראשית ברא אלהים את השמים ואת הארץ
  והארץ היתה תהו ובהו וחשך על פני תהום ורוח אלהים מרחפת על פני המים
  ויאמר אלהים יהי אור ויהי אור
  וירא אלהים את האור כי טוב ויבדל אלהים בין האור ובין החשך
  ויקרא אלהים לאור יום ולחשך קרא לילה ויהי ערב ויהי בקר יום אחד
  ויאמר אלהים יהי רקיע בתוך המים ויהי מבדיל בין מים למים
  ויעש אלהים את הרקיע ויבדל בין המים אשר מתחת לרקיע ובין המים אשר מעל לרקיע ויהי כן
  ויקרא אלהים לרקיע שמים ויהי ערב ויהי בקר יום שני
`;
const ELS_FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
function elsNormalize(s) {
  return [...(s || "")].filter(ch => /[א-ת]/.test(ch))
    .map(ch => ELS_FINALS[ch] || ch).join('');
}
const ELS_SAMPLE = elsNormalize(ELS_SOURCE); // fallback אם טעינת התורה נכשלת
const ELS_HIT_CAP = 300; // הגבלת מספר המופעים שנאספים

// צבעים לכל מונח בחיפוש מונחים מרובים (האחראי=זהב)
const ELS_TERM_COLORS = ["#E8C84A", "#a01f2e", "#6b3fa0", "#3a9b6e", "#c77d2e"];

// חיפוש ELS: תומך בסבילות לשגיאות וממוין לפי מובהקות (דילוג קצר קודם)
function elsSearch(letters, targetRaw, skipMin, skipMax, dir, maxMismatches = 0) {
  const target = elsNormalize(targetRaw);
  const N = letters.length, L = target.length;
  const hits = [];
  if (L < 2 || N === 0) return { hits, N, target, capped: false };
  const dirs = dir === 'fwd' ? [1] : dir === 'back' ? [-1] : [1, -1];
  let capped = false;

  for (let start = 0; start < N && !capped; start++) {
    // קפיצה מהירה אפשרית רק בחיפוש מדויק (ללא סבילות)
    if (maxMismatches === 0 && letters[start] !== target[0]) continue;
    for (const d of dirs) {
      for (let skip = skipMin; skip <= skipMax; skip++) {
        const step = skip * d;
        const end = start + step * (L - 1);
        if (end < 0 || end >= N) continue;
        let mm = 0, bad = false;
        for (let k = 0; k < L; k++) {
          if (letters[start + step * k] !== target[k]) {
            if (++mm > maxMismatches) { bad = true; break; }
          }
        }
        if (!bad) {
          const positions = [];
          for (let k = 0; k < L; k++) positions.push(start + step * k);
          hits.push({ skip, dir: d, start, positions, mismatches: mm });
          if (hits.length >= ELS_HIT_CAP) { capped = true; break; }
        }
      }
      if (capped) break;
    }
  }
  // מיון מובהקות: התאמה מדויקת קודם, ואז דילוג קצר קודם
  hits.sort((a, b) => (a.mismatches - b.mismatches) || (Math.abs(a.skip) - Math.abs(b.skip)));
  return { hits, N, target, capped };
}

// אשכול מונחים: מחפש כל מונח, בוחר עוגן (הנדיר ביותר), ומודד קרבה במטריצה
function elsClusters(letters, terms, skipMin, skipMax, dir, maxMismatches) {
  const perTerm = terms.map(t => {
    const r = elsSearch(letters, t, skipMin, skipMax, dir, maxMismatches);
    return { term: r.target, hits: r.hits };
  });
  const missing = perTerm.filter(p => p.hits.length === 0).map(p => p.term);
  const allTerms = perTerm.map(p => p.term);
  if (missing.length) return { clusters: [], missing, terms: allTerms };

  const sorted = [...perTerm].sort((a, b) => a.hits.length - b.hits.length);
  const anchor = sorted[0], others = sorted.slice(1);
  const center = h => (Math.min(...h.positions) + Math.max(...h.positions)) / 2;

  const clusters = [];
  for (const aHit of anchor.hits.slice(0, 200)) {
    const aC = center(aHit);
    const picks = [{ term: anchor.term, hit: aHit }];
    let ok = true;
    for (const o of others) {
      let best = null, bestD = Infinity;
      for (const h of o.hits) {
        const d = Math.abs(center(h) - aC);
        if (d < bestD) { bestD = d; best = h; }
      }
      if (!best) { ok = false; break; }
      picks.push({ term: o.term, hit: best });
    }
    if (!ok) continue;
    const allPos = picks.flatMap(p => p.hit.positions);
    const span = Math.max(...allPos) - Math.min(...allPos);
    clusters.push({ picks, span, anchorHit: aHit });
  }
  clusters.sort((a, b) => a.span - b.span);
  return { clusters: clusters.slice(0, 12), terms: allTerms, anchorTerm: anchor.term };
}

function ELSMatrix({ letters, hit }) {
  const cols = Math.abs(hit.skip);
  // מטריצה רחבה מדי לא ניתנת להצגה — מציגים את הרצף בשורה אחת עם הקשר
  if (cols > 60) {
    const min = Math.min(...hit.positions);
    const max = Math.max(...hit.positions);
    const from = Math.max(0, min - 2);
    const to = Math.min(letters.length, max + 3);
    const set = new Set(hit.positions);
    const cells = [];
    for (let i = from; i < to; i++) {
      const isHit = set.has(i);
      cells.push(
        <span key={i} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: 22, padding: "2px 1px", borderRadius: 3, margin: 1,
          background: isHit ? `linear-gradient(135deg, ${C.crimson}, #4a0c14)` : "transparent",
          color: isHit ? C.goldBright : "#6f6347",
          fontWeight: isHit ? 700 : 400,
          boxShadow: isHit ? `0 0 8px rgba(122,19,32,0.6)` : "none",
        }}>{letters[i]}</span>
      );
    }
    return (
      <div style={{ direction: "rtl", fontFamily: F.regal, fontSize: 15, lineHeight: 1.9 }}>
        <div style={{ color: C.goldDim, fontSize: 10, marginBottom: 4 }}>
          דילוג גדול ({cols}) — מוצג הרצף בהקשרו
        </div>
        {cells}
      </div>
    );
  }

  const set = new Set(hit.positions);
  const min = Math.min(...hit.positions);
  const max = Math.max(...hit.positions);
  const startRow = Math.max(0, Math.floor(min / cols) - 1);
  const endRow = Math.min(Math.ceil(letters.length / cols), Math.floor(max / cols) + 2);
  const rows = [];
  for (let r = startRow; r < endRow; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const isHit = set.has(idx);
      rows.push(
        <div key={idx} style={{
          width: 26, height: 30, display: "flex", alignItems: "center",
          justifyContent: "center", borderRadius: 3,
          background: isHit ? `linear-gradient(135deg, ${C.crimson}, #4a0c14)` : "#0a0700",
          color: isHit ? C.goldBright : "#6f6347",
          fontWeight: isHit ? 700 : 400,
          boxShadow: isHit ? `0 0 8px rgba(122,19,32,0.6)` : "none",
        }}>{idx < letters.length ? letters[idx] : ""}</div>
      );
    }
  }
  return (
    <div style={{
      display: "grid", gap: 3, direction: "rtl",
      gridTemplateColumns: `repeat(${cols}, 26px)`,
      fontFamily: F.regal, fontSize: 15, overflowX: "auto", padding: 4,
    }}>{rows}</div>
  );
}

// מטריצת אשכול: כל מונח בצבע משלו, לפי רוחב העוגן
function ELSClusterMatrix({ letters, cluster }) {
  const cols = Math.abs(cluster.anchorHit.skip);
  const colorByIdx = new Map();
  cluster.picks.forEach((p, ti) => {
    const color = ELS_TERM_COLORS[ti % ELS_TERM_COLORS.length];
    p.hit.positions.forEach(idx => colorByIdx.set(idx, color));
  });
  const allPos = cluster.picks.flatMap(p => p.hit.positions);
  const min = Math.min(...allPos), max = Math.max(...allPos);
  const startRow = Math.max(0, Math.floor(min / cols) - 1);
  const endRow = Math.min(Math.ceil(letters.length / cols), Math.floor(max / cols) + 2);
  // מטריצה רחבה/ארוכה מדי — לא מציגים גריד (יוצג סיכום טקסטואלי בלבד)
  if (cols > 60 || (endRow - startRow) > 60) return null;

  const cells = [];
  for (let r = startRow; r < endRow; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const color = colorByIdx.get(idx);
      cells.push(
        <div key={idx} style={{
          width: 24, height: 28, display: "flex", alignItems: "center",
          justifyContent: "center", borderRadius: 3,
          background: color ? color : "#0a0700",
          color: color ? "#0a0700" : "#6f6347",
          fontWeight: color ? 800 : 400,
          boxShadow: color ? `0 0 8px ${color}88` : "none",
        }}>{idx < letters.length ? letters[idx] : ""}</div>
      );
    }
  }
  return (
    <div style={{
      display: "grid", gap: 3, direction: "rtl",
      gridTemplateColumns: `repeat(${cols}, 24px)`,
      fontFamily: F.regal, fontSize: 14, overflowX: "auto", padding: 4,
    }}>{cells}</div>
  );
}

// תצוגת ציר אנכי (העמודה שבה הרצף יורד מלמעלה למטה) + חיפוש פנימי בתוך הציר
function ELSAxisView({ letters, hit, contextRows = 12, innerMaxSkip = 12 }) {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");

  const axis = React.useMemo(() => {
    const S = Math.abs(hit.skip);
    const col = ((hit.start % S) + S) % S;
    const colIdx = [];
    for (let p = col; p < letters.length; p += S) colIdx.push(p);
    const colLetters = colIdx.map(p => letters[p]);
    const posSet = new Set(hit.positions);
    const termRowSet = new Set();
    colIdx.forEach((p, i) => { if (posSet.has(p)) termRowSet.add(i); });
    return { S, col, colLetters, termRowSet };
  }, [letters, hit]);

  const inner = React.useMemo(() => {
    const q = elsNormalize(applied);
    const set = new Set();
    let info = null;
    const { colLetters } = axis;
    if (q.length >= 2) {
      for (let sk = 1; sk <= innerMaxSkip && !info; sk++) {
        for (const d of [1, -1]) {
          let done = false;
          for (let s = 0; s < colLetters.length; s++) {
            const end = s + sk * d * (q.length - 1);
            if (end < 0 || end >= colLetters.length) continue;
            let ok = true;
            for (let k = 0; k < q.length; k++) {
              if (colLetters[s + sk * d * k] !== q[k]) { ok = false; break; }
            }
            if (ok) {
              for (let k = 0; k < q.length; k++) set.add(s + sk * d * k);
              info = { skip: sk, dir: d }; done = true; break;
            }
          }
          if (done) break;
        }
      }
    }
    return { set, info, q };
  }, [applied, axis, innerMaxSkip]);

  const termRows = [...axis.termRowSet];
  const tMin = Math.min(...termRows), tMax = Math.max(...termRows);
  const from = Math.max(0, tMin - contextRows);
  const to = Math.min(axis.colLetters.length, tMax + contextRows + 1);

  const inputStyle = {
    flex: 1, background: "#050400", border: `1px solid ${C.border}`,
    color: C.goldBright, padding: "8px 10px", borderRadius: 6,
    fontFamily: F.royal, fontSize: 14, outline: "none",
  };

  return (
    <div style={{
      marginTop: 12, padding: 14, borderRadius: 8,
      background: "#0a0700", border: `1px solid ${C.border}`,
    }}>
      <div style={{ color: C.goldDim, fontSize: 11, marginBottom: 10, fontFamily: F.heading, letterSpacing: 1 }}>
        ציר אנכי · עמודה {(axis.col + 1).toLocaleString("he")} · דילוג {axis.S} · הרצף יורד מלמעלה למטה
      </div>

      {/* הציר עצמו — אנכי */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        direction: "rtl", fontFamily: F.regal, fontSize: 16,
        maxHeight: 420, overflowY: "auto", padding: "4px 0",
      }}>
        {Array.from({ length: to - from }, (_, j) => {
          const i = from + j;
          const isTerm = axis.termRowSet.has(i);
          const isInner = inner.set.has(i);
          return (
            <div key={i} style={{
              width: 34, height: 30, display: "flex", alignItems: "center",
              justifyContent: "center", borderRadius: 4,
              background: isInner ? "#2f7d57" : isTerm ? `linear-gradient(135deg, ${C.crimson}, #4a0c14)` : "transparent",
              color: (isInner || isTerm) ? C.goldBright : "#6f6347",
              fontWeight: (isInner || isTerm) ? 700 : 400,
              boxShadow: isTerm ? `0 0 8px rgba(122,19,32,0.6)`
                : isInner ? `0 0 8px rgba(58,155,110,0.6)` : "none",
            }}>{axis.colLetters[i]}</div>
          );
        })}
      </div>

      {/* חיפוש פנימי בתוך הציר */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          style={inputStyle}
          value={query}
          placeholder="חיפוש בתוך הציר…"
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && setApplied(query)}
        />
        <button onClick={() => setApplied(query)} style={{
          background: "#2f7d57", color: C.goldBright, border: "none",
          padding: "0 16px", borderRadius: 6, cursor: "pointer",
          fontFamily: F.heading, fontSize: 12, fontWeight: 700, letterSpacing: 1,
        }}>חפש בציר</button>
      </div>
      {applied && (
        <div style={{ marginTop: 8, fontSize: 12.5, fontFamily: F.royal, color: C.muted }}>
          {inner.info
            ? <>נמצא <b style={{ color: "#4fc78c" }}>{inner.q}</b> בתוך הציר (דילוג פנימי {inner.info.skip}, {inner.info.dir === 1 ? "למטה" : "למעלה"})</>
            : <>הביטוי <b style={{ color: C.crimsonLight }}>{inner.q || applied}</b> לא נמצא בתוך הציר (דילוג עד {innerMaxSkip}).</>}
        </div>
      )}
    </div>
  );
}

function ELSSection() {
  // קישור עמוק — קריאת פרמטרי החיפוש מה-URL
  const deepLink = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("terms");
    if (!t || elsNormalize(t).length < 2) return null;
    const num = k => { const v = parseInt(sp.get(k)); return Number.isFinite(v) ? v : null; };
    return { terms: t, skipMin: num("skipMin"), skipMax: num("skipMax"), dir: sp.get("dir"), mm: num("mm") };
  }, []);

  const sectionRef = useRef(null);
  const [target, setTarget] = useState(deepLink?.terms ?? "אור");
  const [skipMin, setSkipMin] = useState(deepLink?.skipMin ?? 1);
  const [skipMax, setSkipMax] = useState(deepLink?.skipMax ?? 100);
  const [dir, setDir] = useState(deepLink?.dir ?? "both");
  const [maxMismatches, setMaxMismatches] = useState(deepLink?.mm ?? 0);
  const [letters, setLetters] = useState(ELS_SAMPLE); // עד שהתורה נטענת — קטע לדוגמה
  const [loaded, setLoaded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [axisHit, setAxisHit] = useState(null); // המופע שצירו האנכי פתוח
  const [copied, setCopied] = useState(false);
  const [cfg, setCfg] = useState({ contextRows: 12, innerMaxSkip: 12, freeQuota: 5 });

  // טעינת הגדרות הכלי מ-Supabase (טבלת els_settings)
  useEffect(() => {
    supabase.from("els_settings").select("key,value").then(({ data }) => {
      if (!data) return;
      const m = {};
      data.forEach(r => { m[r.key] = r.value; });
      setCfg({
        contextRows: m.axis_context_rows ?? 12,
        innerMaxSkip: m.inner_search_max_skip ?? 12,
        freeQuota: m.free_quota_searches ?? 5,
      });
      // ברירות מחדל מההגדרות — רק אם אין קישור עמוק שגובר עליהן
      if (!deepLink && m.default_skip_min != null) setSkipMin(m.default_skip_min);
      if (!deepLink && m.default_skip_max != null) setSkipMax(m.default_skip_max);
    });
  }, []);

  // טעינת טקסט התורה המלא פעם אחת
  useEffect(() => {
    let alive = true;
    fetch("/torah-letters.txt")
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(txt => {
        if (!alive) return;
        const clean = elsNormalize(txt);
        if (clean.length > 1000) { setLetters(clean); setLoaded(true); }
      })
      .catch(() => {/* נשארים עם קטע הדוגמה */});
    return () => { alive = false; };
  }, []);

  // חיפוש ראשוני / לפי קישור עמוק כשהטקסט מוכן
  useEffect(() => {
    if (deepLink) {
      const lo = Math.max(1, parseInt(skipMin) || 1);
      const hi = Math.max(lo, parseInt(skipMax) || lo);
      const mm = Math.max(0, parseInt(maxMismatches) || 0);
      const terms = deepLink.terms.split(/[,\n]/).map(s => s.trim()).filter(s => elsNormalize(s).length >= 2);
      if (terms.length >= 2) setResult({ mode: "cluster", ...elsClusters(letters, terms, lo, hi, dir, mm) });
      else setResult({ mode: "single", ...elsSearch(letters, terms[0] || deepLink.terms, lo, hi, dir, mm) });
    } else {
      setResult({ mode: "single", ...elsSearch(letters, "אור", 1, 100, "both", 0) });
    }
  }, [letters]);

  // גלילה אוטומטית לכלי כשמגיעים דרך קישור עמוק
  useEffect(() => {
    if (!deepLink) return;
    const t = setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 500);
    return () => clearTimeout(t);
  }, []);

  function run() {
    const lo = Math.max(1, parseInt(skipMin) || 1);
    const hi = Math.max(lo, parseInt(skipMax) || lo);
    const mm = Math.max(0, parseInt(maxMismatches) || 0);
    // מספר מונחים מופרדים בפסיק → חיפוש אשכול
    const terms = target.split(/[,\n]/).map(s => s.trim()).filter(s => elsNormalize(s).length >= 2);
    setAxisHit(null);
    setSearching(true);
    // נותנים ל-UI להתעדכן לפני חישוב כבד
    setTimeout(() => {
      if (terms.length >= 2) {
        setResult({ mode: "cluster", ...elsClusters(letters, terms, lo, hi, dir, mm) });
      } else {
        setResult({ mode: "single", ...elsSearch(letters, terms[0] || target, lo, hi, dir, mm) });
      }
      setSearching(false);
    }, 10);
  }

  // בניית קישור עמוק לחיפוש הנוכחי + העתקה ללוח
  function copyLink() {
    const sp = new URLSearchParams();
    sp.set("terms", target);
    sp.set("skipMin", String(Math.max(1, parseInt(skipMin) || 1)));
    sp.set("skipMax", String(Math.max(1, parseInt(skipMax) || 1)));
    sp.set("dir", dir);
    if (parseInt(maxMismatches) > 0) sp.set("mm", String(parseInt(maxMismatches)));
    const url = `${window.location.origin}/?${sp.toString()}#els`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => { setCopied(true); setTimeout(() => setCopied(false), 2200); },
        () => window.prompt("העתק את הקישור:", url)
      );
    } else {
      window.prompt("העתק את הקישור:", url);
    }
  }

  const inputStyle = {
    width: "100%", background: "#050400", border: `1px solid ${C.border}`,
    color: C.goldBright, padding: "10px 12px", borderRadius: 6,
    fontFamily: F.royal, fontSize: 15, outline: "none",
  };
  const labelStyle = {
    display: "block", fontSize: 11, color: C.goldDim, letterSpacing: 2,
    textTransform: "uppercase", marginBottom: 6, fontFamily: F.heading,
  };

  return (
    <div ref={sectionRef} id="els" style={{
      padding: "80px 24px",
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.surface} 100%)`,
      direction: "rtl",
    }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <SectionHeader eyebrow="כלי דילוגי אותיות" title="הצופן שמסתתר בטקסט" />

        <div style={{
          maxWidth: 640, margin: "-32px auto 28px", textAlign: "center",
          color: C.muted, fontSize: 13.5, fontFamily: F.royal, lineHeight: 1.8,
          borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
          padding: "14px 16px",
        }}>
          <b style={{ color: C.goldBright, letterSpacing: 1 }}>עדות — ולא ניבוי.</b>{" "}
          הדילוגים מתעדים התאמות בטקסט הקדום; הם אינם חיזוי עתידות ואינם הוכחה.
          כלי לימוד והתבוננות, לא נבואה.
        </div>

        <div style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>מילת היעד  ·  לאשכול הפרד מונחים בפסיק</label>
              <input style={inputStyle} value={target} maxLength={80}
                placeholder="לדוגמה: משיח, דוד, גאולה"
                onChange={e => setTarget(e.target.value)}
                onKeyDown={e => e.key === "Enter" && run()} />
            </div>
            <div>
              <label style={labelStyle}>דילוג מינימלי</label>
              <input style={inputStyle} type="number" value={skipMin} min={1}
                onChange={e => setSkipMin(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>דילוג מקסימלי</label>
              <input style={inputStyle} type="number" value={skipMax} min={1}
                onChange={e => setSkipMax(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>כיוון</label>
              <select style={inputStyle} value={dir} onChange={e => setDir(e.target.value)}>
                <option value="both">שני הכיוונים</option>
                <option value="fwd">קדימה בלבד</option>
                <option value="back">אחורה בלבד</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>סבילות לשגיאות</label>
              <select style={inputStyle} value={maxMismatches}
                onChange={e => setMaxMismatches(e.target.value)}>
                <option value={0}>התאמה מדויקת</option>
                <option value={1}>עד שגיאה אחת</option>
                <option value={2}>עד 2 שגיאות</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <GoldButton onClick={run} disabled={searching}>
              {searching ? "מחפש…" : "חפש דילוגים ◆"}
            </GoldButton>
            <button onClick={copyLink} style={{
              background: "transparent", color: C.goldBright,
              border: `1px solid ${C.borderGold}`, borderRadius: 6,
              padding: "10px 18px", cursor: "pointer", fontFamily: F.heading,
              fontSize: 12, fontWeight: 700, letterSpacing: 1,
            }}>{copied ? "✓ הקישור הועתק" : "🔗 העתק קישור לחיפוש"}</button>
          </div>
        </div>

        <div style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: 20,
        }}>
          {/* ── מצב יחיד ── */}
          {(!result || result.mode === "single") && (
            <>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, fontFamily: F.royal }}>
                טקסט: <b style={{ color: C.goldBright }}>{(result?.N ?? letters.length).toLocaleString("he")}</b> אותיות ·
                יעד: <b style={{ color: C.goldBright }}>{result?.target || "—"}</b> ·
                נמצאו <b style={{ color: C.goldBright }}>{(result?.hits.length ?? 0).toLocaleString("he")}{result?.capped ? "+" : ""}</b> מופעים
                {(result?.hits.length ?? 0) > 0 && <span> · ממוין לפי מובהקות</span>}
              </div>
              {!result || result.hits.length === 0 ? (
                <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 14 }}>
                  לא נמצאו מופעים. נסה להרחיב את טווח הדילוג, להעלות סבילות לשגיאות, או מילה קצרה יותר.
                </div>
              ) : (
                <>
                  {result.capped && (
                    <div style={{ color: C.goldDim, fontSize: 12, marginBottom: 10, fontFamily: F.royal }}>
                      נמצאו מופעים רבים — מוצגים החזקים ביותר (דילוג קצר). צמצם את הטווח למיקוד.
                    </div>
                  )}
                  {result.hits.slice(0, 6).map((h, i) => (
                    <div key={i} style={{ borderTop: `1px solid ${C.border}`, padding: "14px 0" }}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontFamily: F.royal, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <span>
                          מופע {i + 1} · דילוג <b style={{ color: C.goldBright }}>{h.skip}</b> ·
                          כיוון <b style={{ color: C.goldBright }}>{h.dir === 1 ? "קדימה" : "אחורה"}</b> ·
                          מיקום <b style={{ color: C.goldBright }}>{(h.start + 1).toLocaleString("he")}</b>
                          {h.mismatches > 0 && <> · <b style={{ color: C.crimsonLight }}>{h.mismatches} שגיאות</b></>}
                        </span>
                        <button onClick={() => setAxisHit(axisHit === h ? null : h)} style={{
                          background: axisHit === h ? C.gold : "transparent",
                          color: axisHit === h ? "#0a0700" : C.goldBright,
                          border: `1px solid ${C.borderGold}`, borderRadius: 5,
                          padding: "3px 10px", cursor: "pointer", fontFamily: F.heading,
                          fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                        }}>{axisHit === h ? "סגור ציר ▲" : "ציר אנכי ▼"}</button>
                      </div>
                      <ELSMatrix letters={letters} hit={h} />
                      {axisHit === h && (
                        <ELSAxisView letters={letters} hit={h}
                          contextRows={cfg.contextRows} innerMaxSkip={cfg.innerMaxSkip} />
                      )}
                    </div>
                  ))}
                  {result.hits.length > 6 && (
                    <div style={{ color: C.muted, textAlign: "center", padding: 16, fontSize: 13 }}>
                      ...ועוד {(result.hits.length - 6).toLocaleString("he")}{result.capped ? "+" : ""} מופעים
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── מצב אשכול (מונחים מרובים) ── */}
          {result?.mode === "cluster" && (
            result.missing?.length ? (
              <div style={{ color: C.muted, fontSize: 13.5, fontFamily: F.royal, padding: "8px 0", lineHeight: 1.8 }}>
                המונחים <b style={{ color: C.crimsonLight }}>{result.missing.join(", ")}</b> לא נמצאו בטווח הנוכחי — לכן אין אשכול.
                נסה להרחיב את טווח הדילוג או להעלות סבילות לשגיאות.
              </div>
            ) : (
              <>
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, fontFamily: F.royal }}>
                  חיפוש אשכול · מונחים: <b style={{ color: C.goldBright }}>{result.terms.join(" · ")}</b> ·
                  עוגן: <b style={{ color: C.goldBright }}>{result.anchorTerm}</b> ·
                  נמצאו <b style={{ color: C.goldBright }}>{(result.clusters?.length ?? 0).toLocaleString("he")}</b> אשכולות (ממוין לפי קומפקטיות)
                </div>
                {(result.clusters?.length ?? 0) === 0 ? (
                  <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 14 }}>
                    כל המונחים נמצאו בנפרד, אך לא נוצר אשכול קרוב בטווח הזה.
                  </div>
                ) : result.clusters.slice(0, 5).map((cl, ci) => (
                  <div key={ci} style={{ borderTop: `1px solid ${C.border}`, padding: "14px 0" }}>
                    <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10, fontFamily: F.royal }}>
                      אשכול {ci + 1} · כל המונחים בתוך <b style={{ color: C.goldBright }}>{cl.span.toLocaleString("he")}</b> אותיות
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                      {cl.picks.map((p, ti) => (
                        <span key={ti} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontFamily: F.royal, color: C.muted }}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: ELS_TERM_COLORS[ti % ELS_TERM_COLORS.length] }} />
                          <b style={{ color: C.goldBright }}>{p.term}</b> (דילוג {p.hit.skip}{p.hit.mismatches > 0 ? `, ${p.hit.mismatches} שג׳` : ""})
                        </span>
                      ))}
                    </div>
                    <ELSClusterMatrix letters={letters} cluster={cl} />
                  </div>
                ))}
              </>
            )
          )}
        </div>

        <div style={{ color: C.goldDim, fontSize: 11, textAlign: "center", marginTop: 24, fontFamily: F.heading, lineHeight: 1.9 }}>
          {loaded
            ? `טקסט המקור: חמשת חומשי התורה · ${letters.length.toLocaleString("he")} אותיות (נוסח קורן המסורתי, נחלת הכלל)`
            : "טוען את טקסט התורה המלא…  בינתיים מוצג קטע מבראשית"}
          <br />
          חינם: עד {cfg.freeQuota} חיפושים · גישה מלאה לבני ההיכל (מנוי)
        </div>
      </div>
    </div>
  );
}

function AboutPage({ onNav, pageContent, adminMode }) {
  const { title, description, bodyHtml, category } = pageContent || {};
  return (
    <div style={{ direction: "rtl", maxWidth: 780, margin: "0 auto", padding: "64px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <SectionHeader eyebrow={category || "אודות"} title={title || "אודות"} />
        {adminMode && (
          <button onClick={() => onNav("admin", "about")} style={{
            background: C.bgGlow, border: `1px solid ${C.gold}`,
            color: C.goldLight, padding: "10px 16px", borderRadius: 4,
            cursor: "pointer", fontFamily: F.heading, fontSize: 12,
            letterSpacing: 2, textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            ערוך דף
          </button>
        )}
      </div>

      <div style={{
        background: `linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 100%)`,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.gold}`,
        borderRadius: 2,
        padding: "48px 40px",
        marginBottom: 20,
        boxShadow: `0 4px 40px ${C.goldDeep}`,
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: "50%",
          background: `radial-gradient(circle, ${C.goldDark} 0%, ${C.bg} 100%)`,
          border: `1px solid ${C.gold}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, color: C.goldLight,
          margin: "0 auto 32px",
          boxShadow: `0 0 30px ${C.goldDeep}`,
        }}>✦</div>

        <p style={{ color: C.goldLight, fontSize: 15, lineHeight: 2.2, marginBottom: 20, fontFamily: F.body, textAlign: "center" }}>
          {description || "צוריאל הוא חוקר גימטריה עצמאי עם למעלה מ-10 שנות מחקר מעמיק בקודים הנסתרים של השפה העברית. הוא פיתח מספר שיטות ייחודיות שאינן מלמדות בשום מקום אחר — ביניהן שיטת ההפרשים (\"המסתתר\") ומסגרת \"ארבעת העולמות\"."}
        </p>

        <PageBody bodyHtml={bodyHtml} />

        <div style={{ margin: "24px 0" }}>
          <RoyalDivider width={160} />
        </div>

        <p style={{ color: C.goldDim, fontSize: 14, lineHeight: 2.1, fontFamily: F.body, textAlign: "center" }}>
          עם קהילה של למעלה מ-1820 תלמידים, צוריאל מאמין שגימטריה אינה מיסטיקה —
          היא מתמטיקה של השפה, כלי חשיבה שמשנה את האופן שבו רואים מילים, מספרים ומציאות.
        </p>

        <div style={{ margin: "26px 0 4px" }}><RoyalDivider width={120} /></div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>
            עקבו אחריי
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            {[
              { label: "Facebook", href: "https://www.facebook.com/sod1820", path: "M13 22v-9h3l.5-3.5H13V7.2c0-1 .3-1.7 1.8-1.7H17V2.3C16.6 2.2 15.4 2 14 2c-2.9 0-4.8 1.7-4.8 4.9V9.5H6V13h3.2v9H13z" },
              { label: "TikTok", href: "https://www.tiktok.com/@sod_1820", path: "M16.6 5.8a4.3 4.3 0 0 1-1-2.8h-3.3v12.1a2.4 2.4 0 1 1-2.4-2.4c.2 0 .5 0 .7.1V9.5a5.7 5.7 0 0 0-.7 0 5.6 5.6 0 1 0 5.6 5.6V9.3a7.5 7.5 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6z" },
            ].map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}
                style={{
                  width: 46, height: 46, borderRadius: "50%", border: `1px solid ${C.borderGold}`,
                  background: C.surface2, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: C.goldBright, transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = C.bg; e.currentTarget.style.boxShadow = `0 0 18px ${C.goldDim}`; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.surface2; e.currentTarget.style.color = C.goldBright; e.currentTarget.style.boxShadow = "none"; }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
              </a>
            ))}
          </div>
        </div>

        <div style={{ margin: "26px 0 0" }}><RoyalDivider width={120} /></div>
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <a href="https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#1faa55,#128c43)", color: "#fff", textDecoration: "none", fontFamily: F.heading, fontSize: 14, fontWeight: 800, padding: "12px 22px", borderRadius: 999, boxShadow: "0 0 18px rgba(31,170,85,0.4)" }}>
            💬 הצטרפו לקבוצת הגימטריה בוואטסאפ
          </a>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        gap: 12,
        marginBottom: 40
      }}>
        {[["10+","שנות מחקר"],["1820","תלמידים"],["4","שיטות ייחודיות"],["50+","שיעורים מוקלטים"]].map(([n, l]) => (
          <div key={l} style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderTop: `2px solid ${C.borderGold}`,
            borderRadius: 2,
            padding: "24px 16px",
            textAlign: "center"
          }}>
            <div style={{
              fontSize: 28, color: C.goldBright, fontWeight: 900,
              fontFamily: F.heading, textShadow: `0 0 20px ${C.goldDeep}`
            }}>{n}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 8, letterSpacing: 3, fontFamily: F.heading, textTransform: "uppercase" }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center" }}>
        <GoldButton onClick={() => onNav("blog")}>לפוסטים</GoldButton>
      </div>
    </div>
  );
}

// ===== LOGIN PAGE =====

function LoginPage({ onNav }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!email || !pass) { setError("יש למלא את כל השדות"); return; }
    setError(""); setDone(true);
    if (mode === "register") subscribeEmail({ email, name, source: "register" }).catch(() => {});
  }

  if (done) return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 24, color: C.goldLight, textShadow: `0 0 40px ${C.goldDark}` }}>✦</div>
        <h2 style={{ color: C.goldBright, margin: "0 0 12px", fontFamily: F.royal, fontSize: 26 }}>
          {mode === "login" ? "ברוך הבא" : "ברוך הצטרפותך"}
        </h2>
        <RoyalDivider width={120} />
        <p style={{ color: C.muted, fontSize: 13, marginTop: 16, fontFamily: F.body }}>
          {mode === "login" ? "הכניסה הצליחה" : "החשבון נוצר בהצלחה"}
        </p>
        <GoldButton style={{ marginTop: 32 }} onClick={() => onNav("home")}>לדף הבית →</GoldButton>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, direction: "rtl" }}>
      <div style={{
        background: `linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 100%)`,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.gold}`,
        borderRadius: 2,
        padding: "48px 40px",
        width: "100%", maxWidth: 400,
        boxShadow: `0 8px 60px ${C.goldDeep}`,
      }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 9, letterSpacing: 6, color: C.muted, marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase" }}>SOD1820</div>
          <h2 style={{ color: C.goldBright, margin: "0 0 16px", fontSize: 22, fontFamily: F.royal }}>
            {mode === "login" ? "כניסה לחשבון" : "הרשמה"}
          </h2>
          <RoyalDivider width={120} />
        </div>

        <div style={{ display: "flex", marginBottom: 28, border: `1px solid ${C.border}`, borderRadius: 2, overflow: "hidden" }}>
          {[["login","כניסה"],["register","הרשמה"]].map(([k, v]) => (
            <button key={k} onClick={() => { setMode(k); setError(""); }} style={{
              flex: 1,
              background: mode === k ? C.goldDark : "transparent",
              border: "none",
              color: mode === k ? C.goldBright : C.muted,
              padding: "10px 0", cursor: "pointer",
              fontFamily: F.heading, fontSize: 11,
              letterSpacing: 2, transition: "all 0.2s",
              textTransform: "uppercase"
            }}>{v}</button>
          ))}
        </div>

        {mode === "register" && <RoyalInput label="שם מלא" value={name} onChange={setName} />}
        <RoyalInput label="אימייל" value={email} onChange={setEmail} type="email" />
        <RoyalInput label="סיסמה" value={pass} onChange={setPass} type="password" />

        {error && <div style={{ color: "#c05050", fontSize: 12, marginBottom: 16, textAlign: "center", fontFamily: F.body }}>{error}</div>}

        <GoldButton style={{ width: "100%", textAlign: "center", marginTop: 8 }} onClick={handleSubmit}>
          {mode === "login" ? "כניסה" : "יצירת חשבון"}
        </GoldButton>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: 12, color: C.muted, fontFamily: F.body }}>
            {mode === "login" ? "אין לך חשבון? " : "כבר רשום? "}
          </span>
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{
            background: "none", border: "none", color: C.goldDim,
            cursor: "pointer", fontSize: 12, fontFamily: F.heading,
            letterSpacing: 1, textDecoration: "underline"
          }}>{mode === "login" ? "הרשמה" : "כניסה"}</button>
        </div>
      </div>
    </div>
  );
}

// ===== BLOG PAGE =====

const PER_PAGE = 10;

const toSlug = name => name.trim().replace(/\s+/g, '-');
const fromSlug = slug => decodeURIComponent(slug).replace(/-/g, ' ');

function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8230;/g, "…")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => { try { return String.fromCodePoint(parseInt(code, 10)); } catch { return ""; } })
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateHe(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateHebrewCal(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString("he-IL-u-ca-hebrew", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return "";
  }
}

function formatDateWP(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}, ${hh}:${mi}`;
}

function WPArticleCard({ post, onPost }) {
  const [hov, setHov] = useState(false);
  const title  = stripHtml(post.title?.rendered ?? "");
  const terms  = (post._embedded?.["wp:term"] ?? []).flat();
  const cats   = terms.filter(t => t.taxonomy === "category");
  const tags   = terms.filter(t => t.taxonomy === "post_tag").slice(0, 5);
  const date   = formatDateWP(post.date);
  const author = post.author || "מערכת כי לה' המלוכה";
  const excerpt = stripHtml(post.excerpt?.rendered ?? "").slice(0, 320);

  return (
    <div
      style={{
        breakInside: "avoid",
        marginBottom: 20,
        background: hov ? C.surface2 : C.surface,
        border: `1px solid ${hov ? C.borderGold : C.border}`,
        borderTop: `2px solid ${hov ? C.goldBright : C.gold}`,
        borderRadius: 2,
        padding: "20px 24px 22px",
        cursor: "pointer",
        transition: "all 0.25s",
        boxShadow: hov ? `0 6px 32px ${C.goldDeep}` : "none",
        direction: "rtl",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onPost}
    >
      {/* categories line */}
      {cats.length > 0 && (
        <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <span style={{ color: C.goldDim, fontSize: 12, marginLeft: 4 }}>📁</span>
          {cats.map((cat, i) => (
            <span key={cat.id}>
              <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 11, letterSpacing: 0.5 }}>
                {cat.name}
              </span>
              {i < cats.length - 1 && <span style={{ color: C.border, margin: "0 3px" }}>,</span>}
            </span>
          ))}
        </div>
      )}

      {/* title */}
      <h2 style={{
        color: hov ? C.goldBright : "#ede4d3",
        fontFamily: F.royal, fontWeight: 700,
        fontSize: "clamp(15px, 2vw, 19px)",
        lineHeight: 1.5, margin: "0 0 12px",
        transition: "color 0.2s",
      }}>{title}</h2>

      {/* meta row */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "4px 10px",
        alignItems: "center", marginBottom: excerpt ? 14 : 0,
        paddingBottom: excerpt ? 12 : 0,
        borderBottom: excerpt ? `1px solid ${C.border}` : "none",
        fontSize: 10.5, color: C.muted, fontFamily: F.heading,
      }}>
        <span>מאת {author}</span>
        <span style={{ color: C.border }}>|</span>
        <span style={{ direction: "ltr", display: "inline-block" }}>{date}</span>
        {tags.length > 0 && (
          <>
            <span style={{ color: C.border }}>|</span>
            {tags.map(tag => (
              <span key={tag.id} style={{ color: C.goldDim }}>#{tag.name}</span>
            ))}
          </>
        )}
      </div>

      {/* excerpt */}
      {excerpt && (
        <p style={{
          color: "#c8bfb0", fontSize: 14.5, lineHeight: 1.9,
          fontFamily: F.body, margin: 0,
        }}>
          {excerpt}{excerpt.length >= 320 ? "…" : ""}
        </p>
      )}
    </div>
  );
}

function PostSkeleton() {
  const bar = (w, h = 10, mt = 0) => (
    <div style={{
      height: h, width: w, background: C.faint,
      borderRadius: 1, marginTop: mt,
    }} />
  );
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%",
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderTop: `2px solid ${C.borderGold}`,
      borderRadius: 2, overflow: "hidden",
    }}>
      <div style={{ height: 196, background: C.faint }} />
      <div style={{ padding: "24px 24px 28px" }}>
        {bar("28%", 8)}
        {bar("88%", 14, 14)}
        {bar("65%", 14, 8)}
        {bar("95%", 10, 20)}
        {bar("80%", 10, 8)}
        {bar("70%", 10, 8)}
        {bar("22%", 10, 20)}
      </div>
    </div>
  );
}

// כרטיס פוסט — בעיצוב דפי התגיות/קטגוריות (זהב מלכותי, מסגרת מעוגלת, גימטריה).
function PostCard({ post, onPost }) {
  const [hov, setHov] = useState(false);

  const image   = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
  const title   = stripHtml(post.title?.rendered ?? "");
  const excerpt = stripHtml(post.excerpt?.rendered ?? "").slice(0, 120);
  const date    = formatDateHe(post.date);
  const gem     = calcGem(title);

  return (
    <div
      onClick={onPost}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column", height: "100%", cursor: "pointer", overflow: "hidden",
        border: `1px solid ${hov ? C.gold : C.border}`, borderRadius: 14,
        background: "linear-gradient(160deg, rgba(20,15,12,0.55), rgba(8,5,2,0.45))",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? "0 14px 38px rgba(0,0,0,0.5), 0 0 22px rgba(212,175,55,0.16)" : "none",
        transition: "border-color .18s, transform .18s, box-shadow .18s",
      }}
    >
      {/* תמונה — יחס 16:10 */}
      <div style={{
        position: "relative", aspectRatio: "16/10", display: "flex", alignItems: "center", justifyContent: "center",
        background: image ? `center/cover no-repeat url(${image})` : `linear-gradient(135deg, ${C.goldDeep}, ${C.faint})`,
      }}>
        {!image && <span style={{ color: C.goldDim, fontSize: 30, opacity: 0.5 }}>✦</span>}
        <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, rgba(5,4,0,0.85))" }} />
        {gem > 0 && (
          <span title={`גימטריה: ${gem}`} style={{
            position: "absolute", top: 8, right: 8, background: "rgba(212,175,55,0.92)", color: "#1a0e00",
            fontFamily: F.mono, fontSize: 12, fontWeight: 800, padding: "2px 9px", borderRadius: 999, zIndex: 2,
          }}>ג׳ {gem}</span>
        )}
      </div>

      {/* תוכן */}
      <div style={{ padding: "13px 15px 15px", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        <div style={{
          color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{title}</div>
        {excerpt && (
          <div style={{
            color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.7,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{excerpt}…</div>
        )}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 6,
          color: C.goldDim, fontFamily: F.heading, fontSize: 11.5,
        }}>
          <span>{date}</span>
          <span aria-hidden>←</span>
        </div>
      </div>
    </div>
  );
}

function BlogPage({ onNav, pageContent, adminMode, filterCategory = null, filterTag = null }) {
  // paginated posts
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = { current: null };

  // gematria
  const [gemInput, setGemInput] = useState("");
  const [gemValue, setGemValue] = useState(null);
  const [gemWords, setGemWords] = useState([]);
  const [gemResults, setGemResults] = useState(null);
  const [gemLoading, setGemLoading] = useState(false);
  const gemTimer = { current: null };

  // filters
  const [filterCat, setFilterCat] = useState(null);
  const [filterTagL, setFilterTagL] = useState(null);
  const [filterYear, setFilterYear] = useState(null);
  const [allCats, setAllCats] = useState([]);
  const [allTags, setAllTags] = useState([]);

  const { title, description, bodyHtml, category } = pageContent || {};
  const showPanel = !filterCategory && !filterTag;

  // active search mode: "text" | "gem" | null
  const activeMode = searchResults !== null ? "text" : gemResults !== null ? "gem" : null;
  const activeCat  = filterCategory || filterCat;
  const activeTag  = filterTag || filterTagL;

  useEffect(() => {
    setLoading(true); setError(""); setCurrentPage(1);
    setSearchQuery(""); setSearchResults(null);
    setGemInput(""); setGemResults(null); setGemValue(null); setGemWords([]);
    setFilterCat(null); setFilterTagL(null); setFilterYear(null);
  }, [filterCategory, filterTag]);

  // load categories + tags for dropdowns once
  useEffect(() => {
    if (!showPanel) return;
    getDistinctCategoriesAndTags().then(({ categories, tags }) => {
      setAllCats(categories); setAllTags(tags);
    }).catch(() => {});
  }, [showPanel]);

  // paginated posts (when no search active)
  useEffect(() => {
    if (activeMode) return;
    setLoading(true); setError("");
    getPostsFromSupabase({ limit: PER_PAGE, page: currentPage, category: activeCat, tag: activeTag, year: filterYear })
      .then(({ posts: rows, total }) => {
        setPosts(rows.map(adaptPost));
        setTotalPages(Math.ceil(total / PER_PAGE) || 1);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [currentPage, activeCat, activeTag, filterYear, activeMode]);

  // reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filterCat, filterTagL, filterYear]);

  function goTo(p) { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }

  // text search with debounce
  function handleSearch(q) {
    setSearchQuery(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults(null); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(() => {
      searchPosts(q, { category: activeCat, tag: activeTag, year: filterYear })
        .then(rows => { setSearchResults(rows.map(adaptPost)); setSearchLoading(false); })
        .catch(() => setSearchLoading(false));
    }, 350);
  }

  // gematria input handler
  function handleGemInput(val) {
    setGemInput(val);
    setGemResults(null); setGemValue(null); setGemWords([]);
    clearTimeout(gemTimer.current);
    if (!val.trim()) return;
    gemTimer.current = setTimeout(async () => {
      setGemLoading(true);
      const isNum = /^\d+$/.test(val.trim());
      const num = isNum ? parseInt(val.trim()) : calcGem(val.trim());
      setGemValue(num);
      try {
        const [posts, words] = await Promise.all([
          searchPosts(String(num), { category: activeCat, tag: activeTag, year: filterYear }),
          getGematriaByValue(num),
        ]);
        setGemResults(posts.map(adaptPost));
        setGemWords(words);
      } catch {}
      setGemLoading(false);
    }, 400);
  }

  function clearAll() {
    setSearchQuery(""); setSearchResults(null);
    setGemInput(""); setGemResults(null); setGemValue(null); setGemWords([]);
    setFilterCat(null); setFilterTagL(null); setFilterYear(null);
    setCurrentPage(1);
  }

  const hasAnyFilter = searchQuery || gemInput || filterCat || filterTagL || filterYear;
  const displayPosts = activeMode === "text" ? searchResults : activeMode === "gem" ? gemResults : posts;
  const isSearching  = searchLoading || gemLoading;
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  function goTo(p) {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const inputStyle = {
    flex: 1, background: "transparent", border: "none", outline: "none",
    color: "#ede4d3", fontFamily: F.body, fontSize: 15,
    padding: "12px 0", direction: "rtl",
  };
  const selectStyle = {
    background: C.surface2, border: `1px solid ${C.border}`,
    color: C.muted, fontFamily: F.heading, fontSize: 12,
    padding: "8px 12px", borderRadius: 3, cursor: "pointer",
    outline: "none", flex: 1,
  };

  const isFilteredView = !!(filterCategory || filterTag);

  return (
    <div style={{ padding: "64px 16px", maxWidth: 1200, margin: "0 auto", direction: "rtl" }}>

      {/* ── CATEGORY/TAG HEADER (WordPress style) ── */}
      {isFilteredView ? (
        <header style={{ marginBottom: 36, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.goldDim, fontFamily: F.heading, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
            {filterCategory ? "קטגוריה" : "תגית"}
          </div>
          <h1 style={{ color: C.goldBright, fontFamily: F.royal, fontWeight: 700, fontSize: "clamp(22px, 4vw, 36px)", margin: "0 0 12px", lineHeight: 1.3 }}>
            {filterCategory || filterTag}
          </h1>
          {filterCategory === "תיעוד אירועים" && (
            <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, margin: 0, lineHeight: 1.8 }}>
              תיעוד אירועים ורמזים – בנושאי אחרית הימים וגאולת ישראל
            </p>
          )}
        </header>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
            <SectionHeader
              eyebrow={category || "פוסטים"}
              title={title || "תובנות ותגליות"}
            />
            {adminMode && (
              <button onClick={() => onNav("admin", "blog")} style={{
                background: C.bgGlow, border: `1px solid ${C.gold}`,
                color: C.goldLight, padding: "10px 16px", borderRadius: 4,
                cursor: "pointer", fontFamily: F.heading, fontSize: 12,
                letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap",
              }}>ערוך דף</button>
            )}
          </div>
          {description && (
            <p style={{ color: C.goldDim, fontSize: 15, lineHeight: 2, marginBottom: 32, fontFamily: F.body, textAlign: "center" }}>
              {description}
            </p>
          )}
          <PageBody bodyHtml={bodyHtml} />
        </>
      )}

      {/* ── SEARCH PANEL ── */}
      {showPanel && (
        <div style={{
          maxWidth: 700, margin: "0 auto 40px",
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 6, overflow: "hidden",
        }}>
          {/* 1. חיפוש טקסט */}
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 16px" }}>
              <span style={{ color: C.goldDim, fontSize: 15, marginLeft: 10 }}>🔍</span>
              <input
                value={searchQuery}
                onChange={e => { setGemInput(""); setGemResults(null); handleSearch(e.target.value); }}
                placeholder="חיפוש בכותרת ובתוכן הפוסט..."
                style={inputStyle}
              />
              {searchQuery && <button onClick={() => { setSearchQuery(""); setSearchResults(null); }} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18,padding:"0 4px" }}>×</button>}
            </div>
          </div>

          {/* 2. גימטריה */}
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 16px" }}>
              <span style={{ color: "#b39ddb", fontSize: 13, marginLeft: 10, whiteSpace: "nowrap" }}>✡ גימטריה</span>
              <input
                value={gemInput}
                onChange={e => { setSearchQuery(""); setSearchResults(null); handleGemInput(e.target.value); }}
                placeholder="הכנס מילה או מספר — למשל: משיח או 358"
                style={{ ...inputStyle, fontSize: 14 }}
              />
              {gemInput && <button onClick={() => { setGemInput(""); setGemResults(null); setGemValue(null); setGemWords([]); }} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18,padding:"0 4px" }}>×</button>}
            </div>
            {gemValue !== null && (
              <div style={{ padding: "6px 16px 10px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#c4b5fd", fontFamily: F.heading }}>
                  = <strong style={{ fontSize: 16 }}>{gemValue}</strong>
                </span>
                {gemWords.length > 0 && (
                  <span style={{ fontSize: 11, color: C.muted }}>
                    · מילים זהות: {gemWords.map(w => w.phrase).join(" · ")}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 3. פילטרים */}
          <div style={{ display: "flex", gap: 8, padding: "10px 12px", flexWrap: "wrap", alignItems: "center" }}>
            <select value={filterCat || ""} onChange={e => { setFilterCat(e.target.value || null); setCurrentPage(1); }} style={selectStyle}>
              <option value="">📂 כל הקטגוריות</option>
              {allCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={filterTagL || ""} onChange={e => { setFilterTagL(e.target.value || null); setCurrentPage(1); }} style={selectStyle}>
              <option value="">🏷 כל התגיות</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select value={filterYear || ""} onChange={e => { setFilterYear(e.target.value ? parseInt(e.target.value) : null); setCurrentPage(1); }} style={selectStyle}>
              <option value="">📅 כל התקופות</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {hasAnyFilter && (
              <button onClick={clearAll} style={{
                background: "none", border: `1px solid ${C.crimson}`,
                color: C.crimsonLight, borderRadius: 3, padding: "7px 14px",
                cursor: "pointer", fontFamily: F.heading, fontSize: 11, letterSpacing: 1,
              }}>נקה הכל ×</button>
            )}
          </div>

          {/* status */}
          {(isSearching || activeMode) && (
            <div style={{ padding: "6px 16px 10px", fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
              {isSearching ? "מחפש..." : activeMode === "text" ? `${searchResults?.length ?? 0} תוצאות עבור "${searchQuery}"` : activeMode === "gem" ? `${gemResults?.length ?? 0} פוסטים עם המספר ${gemValue}` : ""}
            </div>
          )}
        </div>
      )}

      <style>{`
        .blog-two-col { display: flex; gap: 24px; align-items: flex-start; }
        .blog-main { flex: 1 1 0; min-width: 0; }
        .blog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 18px;
        }
        .wp-masonry { columns: 2 360px; column-gap: 24px; }
        @media (max-width: 900px) {
          .blog-two-col { flex-direction: column-reverse; }
          .blog-events-sidebar { width: 100% !important; position: static !important; }
        }
        @media (max-width: 700px) {
          .wp-masonry { columns: 1; }
        }
        @media (max-width: 600px) {
          .blog-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="blog-two-col">
        {/* sidebar — first child = right side in RTL */}
        {showPanel && !activeMode && (
          <div className="blog-events-sidebar">
            <EventsSidebar onNav={onNav} />
          </div>
        )}

        {/* main content */}
        <div className="blog-main">
          {error && (
            <div style={{
              background: C.surface,
              border: `1px solid ${C.borderGold}`,
              borderRadius: 2, padding: "36px",
              textAlign: "center", marginBottom: 40,
            }}>
              <div style={{ fontSize: 32, color: C.goldDim, marginBottom: 16 }}>✦</div>
              <p style={{ color: "#b05050", fontSize: 14, fontFamily: F.body, marginBottom: 20 }}>
                לא ניתן לטעון פוסטים: {error}
              </p>
              <GoldButton variant="secondary" onClick={() => setCurrentPage(p => p)}>
                נסה שוב
              </GoldButton>
            </div>
          )}

          {/* WordPress-style masonry for category/tag pages */}
          {isFilteredView ? (
            <div className="wp-masonry">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)
                : displayPosts.map(post => (
                    <WPArticleCard key={post.id} post={post} onPost={() => onNav("post", post)} />
                  ))
              }
            </div>
          ) : (
            <div className="blog-grid">
              {isSearching
                ? Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
                : activeMode
                  ? displayPosts.map(post => <PostCard key={post.id} post={post} onPost={() => onNav("post", post)} />)
                  : loading
                    ? Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)
                    : displayPosts.map(post => <PostCard key={post.id} post={post} onPost={() => onNav("post", post)} />)
              }
            </div>
          )}

          {!isSearching && !activeMode && !loading && !error && displayPosts.length === 0 && (
            <div style={{ textAlign: "center", padding: "72px 0", color: C.muted, fontFamily: F.body, fontSize: 15 }}>
              אין פוסטים להצגה
            </div>
          )}
          {!isSearching && activeMode && displayPosts.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.muted, fontFamily: F.body, fontSize: 15 }}>
              לא נמצאו תוצאות
            </div>
          )}

          {!loading && !error && !searchResults && totalPages > 1 && (
            <div style={{
              display: "flex", gap: 8, justifyContent: "center",
              marginTop: 56, flexWrap: "wrap", alignItems: "center",
            }}>
              <GoldButton
                variant="secondary"
                onClick={() => goTo(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ padding: "8px 20px", fontSize: 11, letterSpacing: 2 }}
              >← הקודם</GoldButton>

              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => goTo(p)} style={{
                  background: p === currentPage ? C.goldDark : "transparent",
                  border: `1px solid ${p === currentPage ? C.gold : C.border}`,
                  color: p === currentPage ? C.goldBright : C.muted,
                  width: 38, height: 38, cursor: "pointer",
                  fontFamily: F.heading, fontSize: 12,
                  borderRadius: 2, transition: "all 0.2s",
                }}>{p}</button>
              ))}

              <GoldButton
                variant="secondary"
                onClick={() => goTo(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ padding: "8px 20px", fontSize: 11, letterSpacing: 2 }}
              >הבא →</GoldButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== EVENTS SIDEBAR =====
function EventsSidebar({ onNav }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getPostsFromSupabase({ limit: 10, page: 1, category: "תיעוד אירועים" })
      .then(({ posts }) => { setEvents(posts); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{
      width: 270, flexShrink: 0,
      background: "linear-gradient(180deg, rgba(122,19,32,0.14), rgba(122,19,32,0.06))",
      border: "1px solid rgba(160,31,46,0.30)",
      borderRadius: 6, overflow: "hidden",
      position: "sticky", top: 80, alignSelf: "flex-start",
    }}>
      {/* header */}
      <div style={{
        padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid rgba(160,31,46,0.22)",
        background: "rgba(122,19,32,0.18)",
      }}>
        <span style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 14, fontWeight: 700 }}>
          📋 תיעוד אירועים
        </span>
        <span style={{
          background: C.crimson, color: "#f6e27a",
          fontSize: 9, padding: "2px 7px", borderRadius: 10,
          fontFamily: F.heading, letterSpacing: 1, fontWeight: 700,
        }}>חי</span>
      </div>

      {/* event list */}
      <div>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: "11px 16px", borderBottom: "1px solid rgba(160,31,46,0.12)" }}>
                <div style={{ height: 9, background: C.surface2, borderRadius: 2, marginBottom: 6, width: "50%" }} />
                <div style={{ height: 11, background: C.surface2, borderRadius: 2, width: "85%" }} />
              </div>
            ))
          : events.map(post => {
              const d = post.date ? new Date(post.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
              return (
                <div
                  key={post.wp_id}
                  onClick={() => onNav("post", adaptPost(post))}
                  style={{ padding: "11px 16px", borderBottom: "1px solid rgba(160,31,46,0.12)", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(122,19,32,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ fontSize: 9, color: "#c87070", fontFamily: F.heading, letterSpacing: 1, marginBottom: 3 }}>{d}</div>
                  <div style={{ fontSize: 13, color: "#ede4d3", fontFamily: F.body, lineHeight: 1.45 }}>{post.title}</div>
                </div>
              );
            })
        }
      </div>

      {/* footer */}
      <div
        onClick={() => navigate('/category/' + toSlug('תיעוד אירועים'))}
        style={{
          padding: "11px 16px", textAlign: "center", cursor: "pointer",
          color: "#c87070", fontFamily: F.heading, fontSize: 11, letterSpacing: 2,
          borderTop: "1px solid rgba(160,31,46,0.22)", transition: "color 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = C.goldBright}
        onMouseLeave={e => e.currentTarget.style.color = "#c87070"}
      >
        ← כל תיעוד האירועים
      </div>
    </div>
  );
}

// ===== GLOBAL STYLES =====
const GLOBAL_CSS = `
  .sod-inflate {
    display: inline-block;
    transition: transform 0.16s ease, text-shadow 0.18s ease;
    cursor: pointer;
  }
  .sod-inflate:hover {
    transform: scale(1.09);
    text-shadow: 0 0 10px currentColor;
  }
  .sod-inflate:active {
    transform: scale(0.95);
    opacity: 0.8;
  }
  @keyframes light-rays {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to   { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes hero-shimmer {
    0%, 100% { opacity: 0.88; }
    50%       { opacity: 1; filter: drop-shadow(0 0 18px rgba(246,226,122,0.35)); }
  }
  @keyframes ticker-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
`;

// ===== POST PAGE =====

const POST_CONTENT_CSS = `
  .sod-post-content { direction: rtl; color: #ede4d3; overflow-x: hidden; font-family: 'Heebo', sans-serif; text-align: center; }
  /* קישור-מספרים אוטומטי: שומר על צבע המספר הצרוב, מוסיף רמז עדין שהוא לחיץ */
  .sod-post-content .sod-numlink { cursor: pointer; border-bottom: 1px dotted currentColor; }
  .sod-post-content .sod-numlink:hover { background: rgba(212,175,55,.28); border-radius: 3px; }
  /* קישור-ביטוי גימטריה: שומר על העיצוב הצרוב, מסמן לחיצוּת בריחוף (כדי לא להציף) */
  .sod-post-content .sod-gemlink { cursor: pointer; }
  .sod-post-content .sod-gemlink:hover { background: rgba(212,175,55,.22); border-radius: 3px; text-decoration: underline dotted; text-underline-offset: 3px; }
  .sod-post-content h1, .sod-post-content h2, .sod-post-content h3,
  .sod-post-content h4, .sod-post-content h5 {
    font-family: 'Heebo', sans-serif;
    font-weight: 700;
    line-height: 1.3;
    margin: 2.4em 0 0.9em;
    letter-spacing: 0;
    text-align: center;
  }
  .sod-post-content h1 {
    color: ${C.goldBright};
    font-size: clamp(18px, 2.6vw, 27px);
    text-shadow: 0 0 40px ${C.goldDeep};
  }
  .sod-post-content h2 {
    color: ${C.goldLight};
    font-size: clamp(14px, 2.1vw, 22px);
  }
  .sod-post-content h3 {
    color: ${C.gold};
    font-size: clamp(12px, 1.7vw, 17px);
  }
  .sod-post-content p {
    color: #ede4d3;
    font-family: 'Heebo', sans-serif;
    font-size: 15.5px;
    line-height: 2.1;
    margin: 0 0 1.4em;
  }
  .sod-post-content a {
    color: ${C.gold} !important;
    text-decoration: underline !important;
    text-underline-offset: 3px;
    display: inline-block;
    transition: color 0.18s, transform 0.16s ease, text-shadow 0.18s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .sod-post-content a:hover,
  .sod-post-content a:focus {
    color: ${C.goldBright} !important;
    transform: scale(1.07);
    text-shadow: 0 0 12px ${C.gold};
  }
  .sod-post-content a:active {
    color: #fff !important;
    transform: scale(0.95);
    opacity: 0.85;
  }
  .sod-post-content a:visited { color: ${C.goldLight} !important; }
  .sod-post-content img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 2em auto;
    border-radius: 2px;
    border: 1px solid ${C.border};
    filter: brightness(0.85) sepia(0.15);
    cursor: zoom-in;
    transition: filter .2s, box-shadow .2s;
  }
  .sod-post-content img:hover {
    filter: brightness(1) sepia(0.05);
    box-shadow: 0 6px 28px rgba(0,0,0,.5), 0 0 18px rgba(212,175,55,.25);
  }

  /* ── Jetpack "tiled gallery" + WordPress classic gallery ──
     מקור הבעיה: גלריות אלו מגיעות עם רוחב/גובה קבועים בפיקסלים (inline)
     ותלויות ב-CSS של ג'טפק שלא נטען — בלעדיו התמונות נערמות אחת על השנייה.
     כאן מאפסים את המידות הקבועות והופכים לרשת רספונסיבית נקייה. */
  .sod-post-content .tiled-gallery,
  .sod-post-content .gallery {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
    gap: 12px !important;
    width: 100% !important;
    height: auto !important;
    margin: 1.8em 0 !important;
  }
  /* שיטוח עוטפי-הביניים בעלי הרוחב הקבוע כך שהפריטים יושבים ישירות ברשת */
  .sod-post-content .gallery-row,
  .sod-post-content .gallery-group {
    display: contents !important;
  }
  .sod-post-content .tiled-gallery-item,
  .sod-post-content .gallery-item,
  .sod-post-content figure.gallery-item {
    width: auto !important;
    height: auto !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    float: none !important;
  }
  .sod-post-content .tiled-gallery-item a,
  .sod-post-content .tiled-gallery-item img,
  .sod-post-content .gallery-item img,
  .sod-post-content .gallery img {
    width: 100% !important;
    height: auto !important;
    max-width: 100% !important;
    display: block !important;
    margin: 0 !important;
    border-radius: 8px;
  }
  .sod-post-content .gallery-caption,
  .sod-post-content .tiled-gallery-caption {
    grid-column: 1 / -1;
    color: ${C.goldDim}; font-family: 'Heebo', sans-serif; font-size: 12px;
    text-align: center; margin-top: -4px;
  }

  .sod-post-content ul, .sod-post-content ol {
    padding-right: 1.6em;
    margin: 0 0 1.4em;
  }
  .sod-post-content li {
    color: #ede4d3;
    font-family: 'Heebo', sans-serif;
    font-size: 15px;
    line-height: 2;
    margin-bottom: 0.4em;
  }
  .sod-post-content blockquote {
    border-right: 3px solid ${C.gold};
    margin: 2em 0;
    padding: 16px 24px;
    background: ${C.surface};
    border-radius: 0 2px 2px 0;
  }
  .sod-post-content blockquote p {
    color: ${C.goldLight};
    font-style: italic;
    margin: 0;
  }
  .sod-post-content code {
    background: ${C.faint};
    color: ${C.goldLight};
    padding: 2px 6px;
    border-radius: 2px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
  }
  .sod-post-content pre {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 2px;
    padding: 20px;
    overflow-x: auto;
    margin: 1.6em 0;
  }
  .sod-post-content pre code { background: none; padding: 0; }
  .sod-post-content hr {
    border: none;
    border-top: 1px solid ${C.border};
    margin: 2.5em 0;
  }
  .sod-post-content strong { color: ${C.goldLight}; font-weight: 700; }
  .sod-post-content em { font-style: italic; color: ${C.gold}; }
  .sod-post-content figure { margin: 2em 0; }
  .sod-post-content figcaption {
    text-align: center;
    font-size: 11px;
    color: ${C.muted};
    font-family: 'Heebo', sans-serif;
    margin-top: 8px;
    letter-spacing: 1px;
  }
  .sod-post-content .wp-block-quote { border-right: 3px solid ${C.gold}; }

  /* ── iframes & embeds ── */
  .sod-post-content iframe {
    display: block;
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 16/9;
    height: auto !important;
    margin: 1.5em auto !important;
    border: none;
    direction: ltr;
  }
  /* WordPress block embed wrapper (padding-bottom trick) */
  .sod-post-content .wp-block-embed,
  .sod-post-content figure.wp-block-embed {
    max-width: 100%;
    margin: 2em auto;
    direction: ltr;
  }
  .sod-post-content .wp-block-embed__wrapper {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
  }
  .sod-post-content .wp-block-embed__wrapper iframe {
    position: absolute;
    top: 0; left: 0;
    width: 100% !important;
    height: 100% !important;
    aspect-ratio: unset;
    margin: 0 !important;
  }
  /* YouTube span wrapper (old WP embed format) */
  .sod-post-content .embed-youtube,
  .sod-post-content span.embed-youtube {
    display: block !important;
    max-width: 100% !important;
    margin: 1.5em auto !important;
    text-align: center;
  }
  .sod-post-content .embed-youtube iframe {
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 16/9;
    height: auto !important;
  }
  /* WordPress video shortcode container */
  .sod-post-content .wp-video {
    width: auto !important;
    max-width: min(100%, 360px) !important;
    margin: 1.5em auto !important;
    display: block !important;
  }

  /* ── טאבים לסרטונים (עברית / אנגלית) — CSS בלבד, בלי JS ── */
  .sod-post-content .sod-vtabs { max-width: 680px; margin: 1.6em auto; direction: rtl; }
  .sod-post-content .sod-vtab-r { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .sod-post-content .sod-vtab-bar { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 14px; }
  .sod-post-content .sod-vtab-bar label {
    cursor: pointer; padding: 9px 24px; border-radius: 999px;
    border: 1px solid ${C.borderGold}; color: ${C.goldDim};
    font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 15px;
    background: rgba(212,175,55,0.06); transition: all .2s ease; user-select: none;
  }
  .sod-post-content .sod-vtab-bar label:hover { border-color: ${C.gold}; color: ${C.goldBright}; }
  .sod-post-content .sod-vtab-p { display: none; }
  .sod-post-content .sod-vtab-soon {
    padding: 40px 20px; border: 1px dashed ${C.borderGold}; border-radius: 14px;
    color: ${C.goldDim}; font-family: 'Heebo', sans-serif; font-size: 15px; line-height: 1.8; text-align: center;
    background: rgba(212,175,55,0.04);
  }
  #v1820-he:checked ~ .sod-vtab-p.he,
  #v1820-en:checked ~ .sod-vtab-p.en { display: block; }
  #v1820-he:checked ~ .sod-vtab-bar label[for="v1820-he"],
  #v1820-en:checked ~ .sod-vtab-bar label[for="v1820-en"] {
    background: ${C.gold}; color: ${C.goldDeep}; border-color: ${C.gold};
    box-shadow: 0 4px 16px rgba(212,175,55,0.4);
  }

  /* ── author attribution ── */
  .sod-post-content .post-author {
    display: block;
    text-align: right;
    color: #c9a535;
    font-style: italic;
    font-family: 'Heebo', sans-serif;
    font-size: 13px;
    letter-spacing: 1px;
    margin: 6px 0;
    opacity: 0.92;
  }

  /* ── collapse Elementor spacers & excess whitespace ──
     מוחל רק על תוכן וורדפרס ישן (:not(.clean)). פוסט נקי (source='ai') מקבל את הקלאס
     .clean ומדלג על כל כללי ניקוי ה-WP — האתר כבר לא וורדפרס, תוכן חדש לא נוגע בהם. */
  .sod-post-content:not(.clean) div[style*="height"] { height: auto !important; max-height: 24px !important; }
  .sod-post-content:not(.clean) div[style*="min-height"] { min-height: 0 !important; }
  .sod-post-content .elementor-spacer,
  .sod-post-content .elementor-spacer-inner { height: 16px !important; }

  /* ── ריבוע גימטריה קנוני (post_gematria_box_law) ──
     פתרון שורש ל-legacy_content_protocol §1: כל הסגנון (כולל line-height) חי בקלאס,
     כך שה-divים אינם מכילים "height" ב-inline ולא נתפסים בכלל הניקוי שמוחץ ל-24px.
     ה-override (ספציפיות 0,3,1 > 0,2,1) הוא הגנה נוספת. שימוש: <div class="sod-gematria-box"> … </div>. */
  .sod-post-content .sod-gematria-box {
    max-width: 560px; margin: 30px auto; padding: 16px 18px; border-radius: 14px;
    background: linear-gradient(135deg, rgba(212,175,55,0.10), rgba(8,5,16,0.40));
    border: 1px solid rgba(212,175,55,0.45); direction: rtl; text-align: right;
  }
  .sod-post-content .sod-gematria-box div[style*="height"] { max-height: none !important; height: auto !important; }
  .sod-post-content .sod-gematria-box .gb-title { font-weight: 800; color: ${C.goldBright}; font-size: 1.02em; margin-bottom: 10px; }
  .sod-post-content .sod-gematria-box .gb-rows { color: #e6e0d2; line-height: 1.95; }
  .sod-post-content .sod-gematria-box .gb-rows > div { margin-top: 6px; }
  .sod-post-content .sod-gematria-box .gb-rows > div:first-child { margin-top: 0; }
  .sod-post-content .sod-gematria-box .gb-note { margin-top: 10px; font-size: 0.85em; color: #a59b80; line-height: 1.6; }
  .sod-post-content .sod-gematria-box b { color: ${C.goldBright}; }

  /* post_text_colors_law v3 (חקוק): עיצוב ברירת-המחדל של פוסט «של המציאות» — לא וורדפרס.
     טקסט רץ: לבן רך, משקל רגיל, נעים לעין. זהב שמור לערכים ולאקסנטים — לא הכל צהוב.
     גימטריה = data-gem → פותחת את מגירת המספר בתוך הדף (לא ניווט החוצה).
     ביטוי: בצבע הטקסט + קו-זהב מנוקד עדין · ערך מספרי: זהב. מצב בהיר: טקסט כהה, גימטריה אדומה. */
  .sod-post-content.clean { color: #ffffff; }
  .sod-post-content.clean p { color: #ffffff; font-size: 16.5px; line-height: 2.1; font-weight: 400; }
  [data-theme="light"] .sod-post-content.clean p { color: #1c1c1c; }
  .sod-post-content.clean .sod-gemlink { color: inherit !important; font-weight: 600; border-bottom: 1px dotted rgba(255,216,107,.6); }
  .sod-post-content.clean .sod-numlink { color: #ffd86b !important; font-weight: 700; }
  .sod-post-content.clean .sod-gematria-box .gb-rows { font-weight: 400; line-height: 2.05; }
  .sod-post-content.clean .sod-gematria-box .gb-rows b { color: #ffd86b; }
  .sod-post-content.clean a[href^="/number/"] { color: #ffd86b !important; font-weight: 600; text-decoration: none !important; border-bottom: 1px dotted rgba(255,216,107,.55); display: inline; }
  [data-theme="light"] .sod-post-content.clean { color: #1c1c1c; }
  [data-theme="light"] .sod-post-content.clean .sod-gemlink { border-bottom-color: rgba(200,16,46,.55); }
  [data-theme="light"] .sod-post-content.clean .sod-numlink { color: #c8102e !important; }
  [data-theme="light"] .sod-post-content.clean .sod-gematria-box .gb-rows b { color: #c8102e; }
  [data-theme="light"] .sod-post-content.clean a[href^="/number/"] { color: #c8102e !important; border-bottom-color: rgba(200,16,46,.5); }
  /* איים כהים (sgx/sgl — רקע כהה קבוע): נשארים בעולם הזהב גם במצב בהיר */
  [data-theme="light"] .sod-post-content.clean .sgx .sod-numlink, [data-theme="light"] .sod-post-content.clean .sgl .sod-numlink { color: #ffd86b !important; }
  [data-theme="light"] .sod-post-content.clean .sgx .sod-gemlink, [data-theme="light"] .sod-post-content.clean .sgl .sod-gemlink { border-bottom-color: rgba(255,216,107,.55); }

  /* 🔤 ערכת «גרפיקת-קוד» קנונית (sgx) — אנימציות CSS לפוסטים גרפיים (ר"ת/ס"ת, אתב"ש, אנגרמות).
     חיה כאן כמו sod-gematria-box: הפוסט משתמש בקלאסים בלבד, בלי <style> משלו — פתרון מערכתי.
     שימוש ראשון: פוסט הקוד של הרב עמוס גואטה (id 5008). ⚠️ שני עותקים: legacy.jsx + theme.js. */
  .sod-post-content .sgx { background: linear-gradient(170deg, #16112a, #0e0a1a); border: 1px solid rgba(232,200,74,.35); border-radius: 16px; padding: 26px 14px; margin: 26px 0; text-align: center; direction: rtl; overflow: hidden; }
  .sod-post-content .sgx-cap { color: #b6ab92; font-size: 13.5px; line-height: 1.9; margin-top: 14px; }
  .sod-post-content .sgx-cap b { color: #f0dc9a; }
  .sod-post-content .sgx-step { display: inline-block; background: rgba(232,200,74,.12); border: 1px solid rgba(232,200,74,.45); color: #e8c84a; border-radius: 999px; padding: 3px 14px; font-size: 12px; font-weight: 800; letter-spacing: 1px; margin-bottom: 14px; }
  .sod-post-content .sgx1-name { font-size: clamp(34px, 9vw, 52px); font-weight: 800; color: #ded5c2; letter-spacing: 2px; }
  .sod-post-content .sgx1-name .rt, .sod-post-content .sgx1-name .st { display: inline-block; animation: sgx-glow 2.6s ease-in-out infinite; }
  .sod-post-content .sgx1-name .rt { color: #ffd86b; text-shadow: 0 0 18px rgba(255,216,107,.7); }
  .sod-post-content .sgx1-name .st { color: #7fd4ff; text-shadow: 0 0 18px rgba(127,212,255,.7); animation-delay: -1.3s; }
  .sod-post-content .sgx1-out { margin-top: 16px; }
  .sod-post-content .sgx1-out i { display: inline-block; font-style: normal; font-size: clamp(26px, 7vw, 38px); font-weight: 800; margin: 0 4px; padding: 6px 14px; border-radius: 12px; background: rgba(232,200,74,.1); border: 1px solid rgba(232,200,74,.5); color: #f0dc9a; animation: sgx-pop 7s ease infinite; }
  .sod-post-content .sgx1-out i:nth-child(1) { animation-delay: -0.0s; color: #ffd86b; }
  .sod-post-content .sgx1-out i:nth-child(2) { animation-delay: -5.8s; color: #ffd86b; }
  .sod-post-content .sgx1-out i:nth-child(3) { animation-delay: -4.6s; color: #7fd4ff; border-color: rgba(127,212,255,.5); background: rgba(127,212,255,.08); }
  .sod-post-content .sgx1-out i:nth-child(4) { animation-delay: -3.4s; color: #7fd4ff; border-color: rgba(127,212,255,.5); background: rgba(127,212,255,.08); }
  .sod-post-content .sgx2-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; perspective: 700px; }
  .sod-post-content .sgx2-card { width: clamp(56px, 16vw, 76px); aspect-ratio: 3/4; position: relative; }
  .sod-post-content .sgx2-in { position: absolute; inset: 0; transform-style: preserve-3d; animation: sgx-flip 7s ease-in-out infinite; }
  .sod-post-content .sgx2-card:nth-child(1) .sgx2-in { animation-delay: -0.0s; }
  .sod-post-content .sgx2-card:nth-child(2) .sgx2-in { animation-delay: -0.4s; }
  .sod-post-content .sgx2-card:nth-child(3) .sgx2-in { animation-delay: -0.8s; }
  .sod-post-content .sgx2-card:nth-child(4) .sgx2-in { animation-delay: -1.2s; }
  .sod-post-content .sgx2-f, .sod-post-content .sgx2-b { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-size: clamp(28px, 8vw, 40px); font-weight: 800; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .sod-post-content .sgx2-f { background: rgba(232,200,74,.1); border: 1px solid rgba(232,200,74,.5); color: #f0dc9a; }
  .sod-post-content .sgx2-b { background: rgba(200,16,46,.14); border: 1px solid rgba(255,110,130,.55); color: #ff9caa; transform: rotateY(180deg); }
  .sod-post-content .sgx3-stage { position: relative; min-height: 150px; }
  .sod-post-content .sgx3-rowA, .sod-post-content .sgx3-rowB { position: absolute; inset-inline: 0; top: 0; display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap; }
  .sod-post-content .sgx3-rowA { animation: sgx-showA 10s ease infinite; }
  .sod-post-content .sgx3-rowB { animation: sgx-showB 10s ease infinite; }
  .sod-post-content .sgx3-tile { display: inline-flex; align-items: center; justify-content: center; width: clamp(40px, 11vw, 54px); aspect-ratio: 1; border-radius: 11px; font-size: clamp(22px, 6vw, 30px); font-weight: 800; background: rgba(232,200,74,.1); border: 1px solid rgba(232,200,74,.5); color: #f0dc9a; }
  .sod-post-content .sgx3-red { background: rgba(200,16,46,.16); border-color: rgba(255,110,130,.6); color: #ff9caa; }
  .sod-post-content .sgx3-plus { color: #8d8270; font-size: 22px; font-weight: 800; }
  .sod-post-content .sgx3-lbl { width: 100%; color: #b6ab92; font-size: 12.5px; margin-top: 10px; }
  .sod-post-content .sgx3-lbl b { color: #f0dc9a; }
  .sod-post-content .sgx-date { direction: ltr; unicode-bidi: isolate; font-size: clamp(30px, 9vw, 46px); font-weight: 800; color: #ffd86b; text-shadow: 0 0 30px rgba(255,216,107,.55); animation: sgx-beat 2.4s ease-in-out infinite; display: inline-block; }
  @keyframes sgx-glow { 0%,100% { transform: none; } 50% { transform: translateY(-7px) scale(1.12); } }
  @keyframes sgx-pop { 0%, 8% { opacity: 0; transform: translateY(16px) scale(.7); } 14%, 88% { opacity: 1; transform: none; } 96%, 100% { opacity: 0; transform: translateY(-10px) scale(.85); } }
  @keyframes sgx-flip { 0%, 34% { transform: rotateY(0); } 48%, 84% { transform: rotateY(180deg); } 100% { transform: rotateY(360deg); } }
  @keyframes sgx-showA { 0%, 38% { opacity: 1; transform: none; } 46%, 92% { opacity: 0; transform: translateY(-14px); } 100% { opacity: 1; transform: none; } }
  @keyframes sgx-showB { 0%, 40% { opacity: 0; transform: translateY(16px); } 50%, 90% { opacity: 1; transform: none; } 98%, 100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .sod-post-content .sgx1-out i, .sod-post-content .sgx2-in, .sod-post-content .sgx3-rowA, .sod-post-content .sgx3-rowB,
    .sod-post-content .sgx1-name .rt, .sod-post-content .sgx1-name .st, .sod-post-content .sgx-date { animation: none !important; }
    .sod-post-content .sgx3-rowA { position: static; margin-bottom: 12px; }
    .sod-post-content .sgx3-rowB { position: static; }
  }
  /* ai_box_theme_aware — מצב בהיר (יום): קופסה בהירה + טקסט כהה במקום ניווי כהה על קלף */
  [data-theme="light"] .sod-post-content .sod-gematria-box {
    background: linear-gradient(135deg, rgba(176,125,18,0.10), rgba(255,255,255,0.72));
    border-color: rgba(176,125,18,0.5);
  }
  [data-theme="light"] .sod-post-content .sod-gematria-box .gb-title,
  [data-theme="light"] .sod-post-content .sod-gematria-box b { color: #8a6410; }
  [data-theme="light"] .sod-post-content .sod-gematria-box .gb-rows { color: #33301f; }
  [data-theme="light"] .sod-post-content .sod-gematria-box .gb-note { color: #756a52; }

  /* ── override dark inline colors from WordPress/Elementor (legacy בלבד) ── */
  .sod-post-content:not(.clean) [style*="color:#000"],
  .sod-post-content:not(.clean) [style*="color: #000"],
  .sod-post-content:not(.clean) [style*="color:black"],
  .sod-post-content:not(.clean) [style*="color: black"],
  .sod-post-content:not(.clean) [style*="color:#111"],
  .sod-post-content:not(.clean) [style*="color:#222"],
  .sod-post-content:not(.clean) [style*="color:#333"] {
    color: #ede4d3 !important;
  }
  .sod-post-content:not(.clean) [style*="color:#0000ff"],
  .sod-post-content:not(.clean) [style*="color: #0000ff"],
  .sod-post-content:not(.clean) [style*="color:blue"],
  .sod-post-content:not(.clean) [style*="color: blue"] {
    color: ${C.goldBright} !important;
  }

  /* ── locked-dark posts (legacy-dark): the surface is always near-black, so
       mid-dark grays / muted text become unreadable. Lift them to a readable
       muted-light. Scoped to :not(.themed) so day/night (auto) posts are untouched. ── */
  .sod-post-content:not(.themed):not(.clean) [style*="color:#444"],
  .sod-post-content:not(.themed):not(.clean) [style*="color: #444"],
  .sod-post-content:not(.themed):not(.clean) [style*="color:#555"],
  .sod-post-content:not(.themed):not(.clean) [style*="color: #555"],
  .sod-post-content:not(.themed):not(.clean) [style*="color:#666"],
  .sod-post-content:not(.themed):not(.clean) [style*="color: #666"],
  .sod-post-content:not(.themed):not(.clean) [style*="color:#777"],
  .sod-post-content:not(.themed):not(.clean) [style*="color: #777"],
  .sod-post-content:not(.themed):not(.clean) [style*="color:#888"],
  .sod-post-content:not(.themed):not(.clean) [style*="color: #888"],
  .sod-post-content:not(.themed):not(.clean) [style*="color:gray"],
  .sod-post-content:not(.themed):not(.clean) [style*="color:grey"] {
    color: #c9bda3 !important;
  }

  /* ── videos (mp4 / shortcode / reels) ── */
  .sod-post-content video {
    max-width: min(100%, 360px) !important;
    width: auto !important;
    height: auto !important;
    display: block !important;
    margin: 1.5em auto !important;
  }
  .sod-post-content table {
    width: 100%; border-collapse: collapse; margin: 1.6em 0;
  }
  .sod-post-content th {
    background: ${C.goldDark}; color: ${C.goldBright};
    font-family: 'Heebo', sans-serif; font-size: 12px;
    padding: 10px 14px; text-align: right;
    border: 1px solid ${C.borderGold};
  }
  .sod-post-content td {
    color: ${C.goldDim}; padding: 9px 14px;
    border: 1px solid ${C.border};
    font-family: 'Heebo', sans-serif; font-size: 14px;
  }
  .sod-post-content tr:nth-child(even) td { background: ${C.surface}; }

  /* ── רכיבי Elementor (ללא ה-CSS/JS המקורי של אלמנטור) ──
     התוכן עצמו גלוי; כאן רק מנקים ומעצבים כדי שלא ייראה שבור. */
  .sod-post-content .elementor-element,
  .sod-post-content .elementor-widget-container,
  .sod-post-content .elementor-widget-wrap,
  .sod-post-content .elementor-column,
  .sod-post-content .elementor-row { max-width: 100% !important; width: auto !important; }
  /* אקורדיון: התוכן ממילא פתוח — מסתירים אייקון "פתוח" כפול ומעצבים כותרת */
  .sod-post-content .elementor-accordion-item {
    border: 1px solid ${C.border}; border-radius: 8px; margin: 12px 0; overflow: hidden;
  }
  .sod-post-content .elementor-tab-title {
    background: ${C.surface}; padding: 12px 16px;
    display: flex; align-items: center; gap: 10px;
    color: ${C.goldLight}; font-family: 'Heebo', sans-serif; font-weight: 700;
    border-bottom: 1px solid ${C.border};
  }
  .sod-post-content .elementor-tab-title a,
  .sod-post-content .elementor-accordion-title { color: ${C.goldLight} !important; text-decoration: none; }
  .sod-post-content .elementor-accordion-icon-opened { display: none !important; }
  .sod-post-content .elementor-accordion-icon svg { width: 14px; height: 14px; fill: ${C.gold}; }
  .sod-post-content .elementor-tab-content { padding: 12px 16px 4px; }
  /* קו מפריד — נדרש border כדי שייראה */
  .sod-post-content .elementor-divider { padding: 14px 0; text-align: center; }
  .sod-post-content .elementor-divider-separator {
    display: block; height: 0; width: 60%; margin: 0 auto;
    border-top: 1px solid ${C.borderGold};
  }
  /* כפתורי אלמנטור */
  .sod-post-content .elementor-button {
    display: inline-block; background: ${C.goldDark}; color: ${C.goldBright} !important;
    text-decoration: none; padding: 10px 22px; border-radius: 999px;
    border: 1px solid ${C.borderGold}; font-family: 'Heebo', sans-serif; font-weight: 700; margin: 4px 0;
  }
`;

// תוספת-תמה לפוסטים נקיים (theme='auto'): דורסת רק את הצבעים מעל ה-CSS הבסיסי,
// כך שהמבנה (תמונות/גלריות/מרווחים) נשמר. הסלקטור הכפול (.themed) מנצח בלי !important,
// ובמקומות שהבסיס משתמש ב-!important — גם כאן. עובד יום (טקסט כהה על קרם) ולילה (זהב על כהה).
const themedPostContentCSS = (P) => `
  .sod-post-content.themed { color: ${P.ink}; }
  .sod-post-content.themed h1, .sod-post-content.themed h2, .sod-post-content.themed h3,
  .sod-post-content.themed h4, .sod-post-content.themed h5 { color: ${P.accentText}; text-shadow: none; }
  .sod-post-content.themed h1 { color: ${P.heroNum}; }
  .sod-post-content.themed p, .sod-post-content.themed li,
  .sod-post-content.themed td { color: ${P.ink}; }
  .sod-post-content.themed a, .sod-post-content.themed a:visited { color: ${P.accentText} !important; }
  .sod-post-content.themed a:hover, .sod-post-content.themed a:focus { color: ${P.accent} !important; }
  .sod-post-content.themed strong { color: ${P.accentText}; }
  .sod-post-content.themed em { color: ${P.accent}; }
  .sod-post-content.themed blockquote { background: ${P.cardSoft}; }
  .sod-post-content.themed blockquote p { color: ${P.inkSoft}; }
  .sod-post-content.themed .wp-block-quote { border-right-color: ${P.accent}; }
  .sod-post-content.themed code { background: ${P.cardSoft}; color: ${P.accentText}; }
  .sod-post-content.themed pre { background: ${P.cardSoft}; }
  .sod-post-content.themed hr { border-color: ${P.border}; }
  .sod-post-content.themed th { background: ${P.cardSoft}; color: ${P.accentText}; }
  .sod-post-content.themed tr:nth-child(even) td { background: ${P.cardSoft}; }
  .sod-post-content.themed figcaption,
  .sod-post-content.themed .gallery-caption,
  .sod-post-content.themed .tiled-gallery-caption { color: ${P.inkSoft}; }
  .sod-post-content.themed .elementor-tab-title a,
  .sod-post-content.themed .elementor-accordion-title { color: ${P.accentText} !important; }
  .sod-post-content.themed .elementor-button { background: ${P.accentBtn}; color: ${P.onAccent} !important; }
  /* ריבוע גימטריה — ווריאנט יום (קריא על רקע בהיר) */
  .sod-post-content.themed .sod-gematria-box { background: ${P.cardSoft}; border-color: ${P.border}; }
  .sod-post-content.themed .sod-gematria-box .gb-rows,
  .sod-post-content.themed .sod-gematria-box b { color: ${P.ink}; }
  .sod-post-content.themed .sod-gematria-box .gb-title { color: ${P.accentText}; }
  .sod-post-content.themed .sod-gematria-box .gb-note { color: ${P.inkSoft}; }
  /* טקסט שחור/כהה צרוב בתוכן — במצב בהיר נשאר קריא (דיו), לא הופך לזהב כמו בבסיס */
  .sod-post-content.themed [style*="color:#000"],
  .sod-post-content.themed [style*="color: #000"],
  .sod-post-content.themed [style*="color:black"],
  .sod-post-content.themed [style*="color: black"],
  .sod-post-content.themed [style*="color:#111"],
  .sod-post-content.themed [style*="color:#222"],
  .sod-post-content.themed [style*="color:#333"] { color: ${P.ink} !important; }
  /* טקסט בהיר/לבן צרוב (מ-WP) → דיו לפי התמה (מתאים-מצב: P משתנה עם המתג) — מונע טקסט בלתי-נראה ביום */
  .sod-post-content.themed [style*="color:#fff"],
  .sod-post-content.themed [style*="color: #fff"],
  .sod-post-content.themed [style*="color:#FFF"],
  .sod-post-content.themed [style*="color:white"],
  .sod-post-content.themed [style*="color: white"],
  .sod-post-content.themed [style*="color:#eee"],
  .sod-post-content.themed [style*="color:#ddd"],
  .sod-post-content.themed [style*="color:#f5"],
  .sod-post-content.themed [style*="color:#fafafa"],
  .sod-post-content.themed font[color="#ffffff"],
  .sod-post-content.themed font[color="#fff"],
  .sod-post-content.themed font[color="white"] { color: ${P.ink} !important; }
  /* רקע בהיר צרוב → שקוף (רקע הדף נשלט ע״י התמה) */
  .sod-post-content.themed [style*="background:#fff"],
  .sod-post-content.themed [style*="background: #fff"],
  .sod-post-content.themed [style*="background-color:#fff"],
  .sod-post-content.themed [style*="background-color: #fff"],
  .sod-post-content.themed [style*="background:white"],
  .sod-post-content.themed [style*="background-color:white"],
  .sod-post-content.themed [bgcolor="#ffffff"],
  .sod-post-content.themed [bgcolor="white"] { background: transparent !important; }
  /* גימטריות-זהב צרובות בפוסטי AI (data-gem / זהב מוטבע) → זהב קריא לפי התמה
     (בהיר=זהב כהה קריא על קלף · לילה=זהב בהיר). חוק ai_post_update_law. */
  .sod-post-content.themed [data-gem],
  .sod-post-content.themed [style*="color:#f6e27a"],
  .sod-post-content.themed [style*="color: #f6e27a"],
  .sod-post-content.themed [style*="color:#e8c840"],
  .sod-post-content.themed [style*="color:#d4af37"] { color: ${P.accentText} !important; }
  ${P.mode === "light" ? `
  /* פוסט WordPress ישן: מספרים/הדגשות בצהוב/ציאן/ירוק-בהיר צרובים נעלמים על קלף בהיר —
     במצב יום הופכים ל-אדום בולט (לא נהרסים). חוק legacy_content_protocol. */
  .sod-post-content.themed [style*="color:#ffff00"],
  .sod-post-content.themed [style*="color: #ffff00"],
  .sod-post-content.themed [style*="color:#ffff99"],
  .sod-post-content.themed [style*="color: #ffff99"],
  .sod-post-content.themed [style*="color:#ffcc00"],
  .sod-post-content.themed [style*="color: #ffcc00"],
  .sod-post-content.themed [style*="color:#ffd700"],
  .sod-post-content.themed [style*="color:yellow"],
  .sod-post-content.themed [style*="color:#00ff00"],
  .sod-post-content.themed [style*="color: #00ff00"],
  .sod-post-content.themed [style*="color:#ccffcc"],
  .sod-post-content.themed [style*="color:#00ffff"],
  .sod-post-content.themed [style*="color:#ccffff"],
  .sod-post-content.themed [style*="color:#00ccff"] { color: #cc0000 !important; }
  /* לבן צרוב (היה על רקע כהה) → דיו קריא על קלף בהיר */
  .sod-post-content.themed [style*="color:#ffffff"],
  .sod-post-content.themed [style*="color: #ffffff"],
  .sod-post-content.themed [style*="color:white"] { color: ${P.ink} !important; }
  ` : ""}
`;

// ===== שיתוף — וואטסאפ / טלגרם / פייסבוק / X / העתקת קישור + שיתוף מקורי =====
// משתף את הקישור הקנוני (SITE_URL + slug) כדי שגם לפני העברת הדומיין הקישור יהיה תקין.
function ShareBar({ url, title, text }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const body = (text || title || "").trim();
  const wa = `https://wa.me/?text=${enc((body ? body + "\n" : "") + url)}`;
  const tg = `https://t.me/share/url?url=${enc(url)}&text=${enc(body)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
  const x  = `https://twitter.com/intent/tweet?text=${enc(body)}&url=${enc(url)}`;

  const slug = (() => { try { return new URL(url).pathname.replace(/^\//, ""); } catch { return url; } })();
  const btns = [
    { label: "וואטסאפ", emoji: "💬", href: wa, bg: "#1faa55", platform: "whatsapp" },
    { label: "טלגרם", emoji: "✈️", href: tg, bg: "#2aabee", platform: "telegram" },
    { label: "פייסבוק", emoji: "👍", href: fb, bg: "#1877f2", platform: "facebook" },
    { label: "X", emoji: "𝕏", href: x, bg: "#111", platform: "x" },
  ];

  function copy() {
    track("share", slug, "share", { platform: "copy" });
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    } else { window.prompt("העתיקו את הקישור:", url); }
  }
  function native() {
    track("share", slug, "share", { platform: "native" });
    if (navigator.share) navigator.share({ title, text: body, url }).catch(() => {});
  }
  const canNative = typeof navigator !== "undefined" && !!navigator.share;

  const base = {
    display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none",
    color: "#fff", fontFamily: F.heading, fontSize: 13, fontWeight: 700,
    padding: "9px 15px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)",
    cursor: "pointer", transition: "transform .12s, box-shadow .15s",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
      {btns.map(b => (
        <a key={b.label} href={b.href} target="_blank" rel="noopener noreferrer"
          style={{ ...base, background: b.bg }}
          onClick={() => { if (b.platform === "whatsapp") trackWhatsapp(slug); else track("share", slug, "share", { platform: b.platform }); }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
          <span aria-hidden>{b.emoji}</span>{b.label}
        </a>
      ))}
      <button onClick={copy} style={{ ...base, background: copied ? C.goldDark : "transparent", color: C.goldBright, borderColor: C.borderGold }}>
        <span aria-hidden>🔗</span>{copied ? "הקישור הועתק ✓" : "העתק קישור"}
      </button>
      {canNative && (
        <button onClick={native} style={{ ...base, background: "transparent", color: C.goldBright, borderColor: C.borderGold }}>
          <span aria-hidden>↗</span>שיתוף…
        </button>
      )}
    </div>
  );
}

const YENUKA_TAGS = ["הינוקא", "ינוקא"];
const YENUKA_SHARE_TEXT = "🌟 שתפו את תפילות הינוקא עם שני אנשים עוד היום.\nאולי דווקא ההודעה שלכם תהיה הניצוץ שיביא להם תקווה, חיזוק וישועה. 🙏";

function PostPage({ post, onBack }) {
  const [fullPost, setFullPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!post?.slug) return;
    setLoading(true);
    setError("");
    getPostBySlug(post.slug)
      .then(row => {
        if (row) setFullPost(row);
        else setError("הפוסט לא נמצא");
        setLoading(false);
      })
      .catch(() => { setError("שגיאה בטעינה"); setLoading(false); });
  }, [post?.slug]);

  const image   = fullPost?.image_url ?? post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
  const author  = fullPost?.author ?? "";
  const title   = stripHtml(fullPost?.title ?? post?.title?.rendered ?? "");
  const date    = formatDateHe(fullPost?.date ?? post?.date ?? "");
  const content = fullPost?.content ?? "";

  const fx = POST_FX[post?.slug] || POST_FX[fullPost?.slug];

  return (
    <div style={{ direction: "rtl" }}>
      {/* באנר מטריקס-ריין בראש העמוד — פר-פוסט (לדוגמה מטריקס: ירוק + 506 נוזל) */}
      {fx && (
        <div style={{ position: "relative", height: "clamp(170px, 30vw, 280px)", overflow: "hidden", background: "#070b12" }}>
          <MatrixRain color={fx.color} headColor={fx.headColor} featured={fx.featured} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(7,11,18,0.05) 35%, ${C.bg} 100%)`, pointerEvents: "none" }} />
        </div>
      )}

      {/* hero image */}
      {image && !loading && (
        <div style={{
          height: "clamp(220px, 40vw, 480px)",
          position: "relative", overflow: "hidden",
          background: C.goldDeep,
        }}>
          <img src={image} alt={title} style={{
            width: "100%", height: "100%", objectFit: "cover",
            filter: "brightness(0.5) sepia(0.3)", display: "block",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(to bottom, rgba(5,4,0,0.1) 30%, ${C.bg} 100%)`,
          }} />
        </div>
      )}

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "52px 24px 96px" }}>
        <button
          onClick={onBack}
          onMouseEnter={e => (e.currentTarget.style.color = C.goldDim)}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          style={{
            background: "none", border: "none", color: C.muted,
            cursor: "pointer", fontFamily: F.heading,
            fontSize: 10, marginBottom: 40, letterSpacing: 4,
            textTransform: "uppercase", transition: "color 0.2s",
          }}
        >← חזרה לפוסטים</button>

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 42, color: C.goldDim, marginBottom: 20 }}>✦</div>
            <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, letterSpacing: 2 }}>
              טוען פוסט...
            </p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "#b05050", fontFamily: F.body, fontSize: 14 }}>{error}</p>
            <GoldButton variant="secondary" style={{ marginTop: 20 }} onClick={onBack}>
              חזרה לפוסטים
            </GoldButton>
          </div>
        )}

        {fullPost && !loading && (
          <>
            <div style={{
              fontSize: 9, color: C.muted, letterSpacing: 4,
              marginBottom: 18, fontFamily: F.heading, textTransform: "uppercase",
            }}>
              {date}{author && ` · ${author}`}
            </div>

            <h1 style={{
              color: C.goldBright, margin: "0 0 28px",
              fontSize: "clamp(24px, 4.5vw, 44px)",
              fontFamily: F.royal, fontWeight: 700,
              lineHeight: 1.2, letterSpacing: 1,
              textShadow: `0 0 70px ${C.goldDeep}`,
            }}>{title}</h1>

            <div style={{ marginBottom: 48 }}>
              <RoyalDivider width={160} />
            </div>

            <style>{POST_CONTENT_CSS}</style>
            <div
              className={`sod-post-content${post?.source === "ai" ? " clean" : ""}`}
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* שיתוף תחתון הוסר — מטופל גלובלית ע"י RoyalShareWidget הצף */}
            {false && (() => {
              const slug = fullPost.slug || post?.slug || "";
              const shareUrl = `${SITE_URL}/${slug}`;
              const tags = fullPost.tags || [];
              const isYenuka = tags.some(t => YENUKA_TAGS.includes(t));
              return (
                <div style={{ marginTop: 56 }}>
                  <RoyalDivider width={120} />
                  {isYenuka ? (
                    <div style={{
                      marginTop: 28, background: "linear-gradient(150deg, rgba(212,175,55,0.14), rgba(122,19,32,0.16))",
                      border: `1px solid ${C.borderGold}`, borderRadius: 16, padding: "26px 26px 22px", textAlign: "center",
                    }}>
                      <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(18px,3vw,23px)", fontWeight: 700, lineHeight: 1.5, marginBottom: 8 }}>
                        🌟 שתפו את תפילות הינוקא עם שני אנשים עוד היום.
                      </div>
                      <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.9, maxWidth: 540, margin: "0 auto 20px" }}>
                        אולי דווקא ההודעה שלכם תהיה הניצוץ שיביא להם תקווה, חיזוק וישועה. 🙏
                      </div>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <ShareBar url={shareUrl} title={title} text={YENUKA_SHARE_TEXT} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 24 }}>
                      <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>
                        שתפו את הפוסט
                      </div>
                      <ShareBar url={shareUrl} title={title} text={title} />
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

// ===== DYNAMIC MENU =====

const STATIC_NAV_ITEMS = [
  { key: "home",    label: "ראשי" },
  { key: "blog",    label: "פוסטים" },
  { key: "about",   label: "אודות" },
  { key: "login",   label: "כניסה" },
];

function mapUrlToRoute(url) {
  if (!url) return null;
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || path === "") return "home";
    if (/about|אודות|who|me/i.test(path)) return "about";
    if (/blog|post|article|בלוג|news/i.test(path)) return "blog";
    if (/login|account|my-account/i.test(path)) return "login";
  } catch { /* invalid URL */ }
  return null;
}


// ===== THEME PREVIEW PAGE =====

const THEMES_DATA = [
  {
    id: "a", name: "תבנית א — עמוק",
    bg: "#080500", text: "#ede4d3", heading: "#CFB53B",
    accent: "#CFB53B", surface: "#0e0a00",
    font: "'Heebo', sans-serif",
  },
  {
    id: "b", name: "תבנית ב — זהב",
    bg: "#0a0800", text: "#FFD700", heading: "#FFD700",
    accent: "#FFD700", surface: "#130e00",
    font: "'Heebo', sans-serif",
  },
  {
    id: "c", name: "תבנית ג — קלאסי",
    bg: "#000000", text: "#ffffff", heading: "#e8c040",
    accent: "#e8c040", surface: "#0d0d0d",
    font: "'Heebo', serif",
  },
];

function ThemePreviewPage() {
  const [active, setActive] = useState("a");
  const T = THEMES_DATA.find(t => t.id === active);

  return (
    <div style={{ direction: "rtl", padding: "60px 24px" }}>
      <SectionHeader eyebrow="עיצוב" title="תצוגה מקדימה" />

      {/* switcher */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 44, flexWrap: "wrap" }}>
        {THEMES_DATA.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            background: active === t.id ? C.goldDark : "transparent",
            border: `2px solid ${active === t.id ? C.gold : C.border}`,
            color: active === t.id ? C.goldBright : C.muted,
            padding: "10px 28px", cursor: "pointer",
            fontFamily: F.heading, fontSize: 14, fontWeight: 700,
            borderRadius: 2, transition: "all 0.25s",
          }}>{t.name}</button>
        ))}
      </div>

      {/* preview panel */}
      <div style={{
        maxWidth: 680, margin: "0 auto",
        background: T.bg,
        border: "1px solid #3a3a2a",
        borderRadius: 4, padding: "52px 44px",
        transition: "background 0.35s",
        boxShadow: `0 0 60px rgba(0,0,0,0.8)`,
      }}>
        <h2 style={{
          color: T.heading, fontFamily: T.font,
          fontSize: 28, fontWeight: 700, margin: "0 0 14px",
          textAlign: "center", letterSpacing: 1,
        }}>כי לה' המלוכה</h2>

        <div style={{ width: 56, height: 1, background: T.accent, margin: "0 auto 28px" }} />

        <p style={{
          color: T.text, fontFamily: T.font,
          fontSize: 16, lineHeight: 2, margin: "0 0 36px", textAlign: "center",
        }}>
          גימטריה היא לא עניין של מספרים בלבד — היא שפה חיה שמגלה
          את המציאות מאחורי המציאות.
        </p>

        {/* sample card */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.accent}55`,
          borderTop: `2px solid ${T.accent}`,
          borderRadius: 2, padding: "22px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
        }}>
          <div>
            <div style={{ color: T.heading, fontFamily: T.font, fontSize: 19, fontWeight: 700 }}>
              שער האלף-בית
            </div>
            <div style={{ color: T.text, fontFamily: T.font, fontSize: 13, opacity: 0.65, marginTop: 5 }}>
              גימטריה רגילה · 12 שיעורים
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: T.accent, fontFamily: T.font, fontSize: 26, fontWeight: 900, marginBottom: 10 }}>
              ₪297
            </div>
            <button style={{
              background: "transparent",
              border: `1px solid ${T.accent}`,
              color: T.accent, padding: "7px 20px",
              cursor: "pointer", fontFamily: T.font,
              fontSize: 12, fontWeight: 700, borderRadius: 2,
            }}>לרכישה</button>
          </div>
        </div>

        {/* color swatches */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 28 }}>
          {[["רקע", T.bg], ["טקסט", T.text], ["כותרת", T.heading]].map(([label, val]) => (
            <div key={label} style={{
              background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 2, padding: "5px 12px",
              display: "flex", gap: 8, alignItems: "center",
            }}>
              <div style={{ width: 11, height: 11, background: val, borderRadius: 2, border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
              <span style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Heebo', sans-serif", fontSize: 10, letterSpacing: 1 }}>
                {label}: {val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== ADMIN PAGE =====

const ADMIN_PASSWORD  = "sod1820";
const ADMIN_STORE_KEY = "sod1820_clues";

function AdminPage({ pageContent, onSavePage, selectedPageKey, setSelectedPageKey, setAdminMode }) {
  const [authed,  setAuthed]  = useState(false);
  const [pw,      setPw]      = useState("");
  const [pwError, setPwError] = useState(false);

  const [editPageKey, setEditPageKey] = useState(selectedPageKey || "home");
  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [pageBodyHtml, setPageBodyHtml] = useState("");
  const [pageCategory, setPageCategory] = useState("");
  const [pageTag, setPageTag] = useState("");

  const [fTitle,    setFTitle]    = useState("");
  const [fContent,  setFContent]  = useState("");
  const [fNumbers,  setFNumbers]  = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fImage,    setFImage]    = useState(null);
  const [fImgName,  setFImgName]  = useState("");
  const [okMsg,     setOkMsg]     = useState("");
  const [syncing,   setSyncing]   = useState(false);

  const [clues, setClues] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ADMIN_STORE_KEY) || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    const currentPage = selectedPageKey || editPageKey || "home";
    const pageData = (pageContent?.[currentPage] || PAGE_CONTENT_DEFAULTS[currentPage] || {});
    setPageTitle(pageData.title || "");
    setPageDescription(pageData.description || "");
    setPageBodyHtml(pageData.bodyHtml || "");
    setPageCategory(pageData.category || "");
    setPageTag(pageData.tag || "");
    setEditPageKey(currentPage);
  }, [selectedPageKey, editPageKey, pageContent]);

  function handleAuth() {
    if (pw.trim() === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError(false);
      setAdminMode && setAdminMode(true);
    } else setPwError(true);
  }

  function handleImg(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFImgName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setFImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!fTitle.trim()) return;
    const clue = {
      id: Date.now(),
      title: fTitle.trim(),
      content: fContent.trim(),
      numbers: fNumbers.split(",").map(s => s.trim()).filter(Boolean),
      category: fCategory.trim(),
      image: fImage,
      imageName: fImgName,
      createdAt: new Date().toISOString(),
    };
    const updated = [clue, ...clues];
    setClues(updated);
    try { localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(updated)); } catch {}
    setFTitle(""); setFContent(""); setFNumbers(""); setFCategory(""); setFImage(null); setFImgName("");
    setOkMsg("✦ הרמז נשמר בהצלחה");
    setTimeout(() => setOkMsg(""), 3000);
  }

  function handleDelete(id) {
    const updated = clues.filter(c => c.id !== id);
    setClues(updated);
    try { localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(updated)); } catch {}
  }

  if (!authed) return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.gold}`, borderRadius: 2,
        padding: "44px 40px", width: "100%", maxWidth: 360,
        boxShadow: `0 8px 60px ${C.goldDeep}`,
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, color: C.goldDim, marginBottom: 16 }}>✦</div>
          <h2 style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 20, margin: "0 0 16px" }}>
            ממשק ניהול
          </h2>
          <RoyalDivider width={100} />
        </div>
        <RoyalInput label="סיסמה" value={pw} onChange={setPw} type="password" />
        {pwError && <div style={{ color: "#c05050", fontSize: 13, marginBottom: 12, textAlign: "center", fontFamily: F.body }}>סיסמה שגויה</div>}
        <GoldButton style={{ width: "100%", textAlign: "center" }} onClick={handleAuth}>כניסה</GoldButton>
      </div>
    </div>
  );

  const labelStyle = {
    fontSize: 10, color: C.muted, letterSpacing: 4,
    marginBottom: 8, fontFamily: F.heading, textTransform: "uppercase",
    display: "block",
  };
  const inputStyle = {
    width: "100%", background: C.bg,
    border: `1px solid ${C.border}`, color: C.goldBright,
    padding: "10px 14px", fontSize: 15,
    fontFamily: F.body, borderRadius: 2,
    outline: "none", boxSizing: "border-box", direction: "rtl",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "60px 24px", direction: "rtl" }}>
      <SectionHeader eyebrow="ניהול" title="פאנל ניהול — עמודים ורמזים" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, alignItems: "start", marginBottom: 40 }}>
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderTop: `3px solid ${C.gold}`, borderRadius: 2, padding: "28px 28px",
        }}>
          <div style={{
            fontSize: 12, color: C.goldDim, letterSpacing: 4,
            marginBottom: 24, fontFamily: F.heading, textTransform: "uppercase",
          }}>עריכת עמוד</div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
              <div>
                <label style={labelStyle}>בחר עמוד</label>
                <select value={editPageKey} onChange={e => setEditPageKey(e.target.value)} style={inputStyle}>
                  {Object.keys(PAGE_CONTENT_DEFAULTS).map(key => (
                    <option key={key} value={key}>{PAGE_CONTENT_DEFAULTS[key].category || key}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => { setSelectedPageKey(editPageKey); setAdminMode(true); }} style={{
                background: C.bgGlow, border: `1px solid ${C.gold}`,
                color: C.goldLight, padding: "12px 18px", borderRadius: 4,
                cursor: "pointer", fontFamily: F.heading, fontSize: 12,
                letterSpacing: 2, textTransform: "uppercase",
              }}>
                פתח עמוד
              </button>
            </div>

            <RoyalInput label="כותרת עמוד" value={pageTitle} onChange={setPageTitle} />
            <div>
              <label style={labelStyle}>תיאור עמוד</label>
              <textarea
                value={pageDescription}
                onChange={e => setPageDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.8 }}
              />
            </div>
            <div>
              <label style={labelStyle}>תוכן HTML מלא</label>
              <textarea
                value={pageBodyHtml}
                onChange={e => setPageBodyHtml(e.target.value)}
                rows={6}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontFamily: "monospace" }}
                placeholder="הכנס HTML תקין כאן: <p>קטע תיאור נוסף</p>"
              />
            </div>
            <RoyalInput label="קטגוריה" value={pageCategory} onChange={setPageCategory} />
            <RoyalInput label="תגית" value={pageTag} onChange={setPageTag} />
            <GoldButton
              style={{ width: "100%", textAlign: "center" }}
              onClick={() => {
                onSavePage(editPageKey, {
                  title: pageTitle,
                  description: pageDescription,
                  bodyHtml: pageBodyHtml,
                  category: pageCategory,
                  tag: pageTag,
                });
                setOkMsg("✦ תוכן העמוד נשמר בהצלחה");
                setTimeout(() => setOkMsg(""), 3000);
              }}
            >שמור עמוד</GoldButton>

          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

        {/* ── ADD FORM ── */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderTop: `3px solid ${C.gold}`, borderRadius: 2, padding: "28px 28px",
        }}>
          <div style={{
            fontSize: 12, color: C.goldDim, letterSpacing: 4,
            marginBottom: 24, fontFamily: F.heading, textTransform: "uppercase",
          }}>הוסף רמז חדש</div>

          <RoyalInput label="כותרת *" value={fTitle} onChange={setFTitle} />

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>תוכן</label>
            <textarea
              value={fContent}
              onChange={e => setFContent(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.8 }}
            />
          </div>

          <RoyalInput label="מספרים קשורים (מופרדים בפסיק)" value={fNumbers} onChange={setFNumbers} placeholder="26, 72, 1820" />
          <RoyalInput label="קטגוריה" value={fCategory} onChange={setFCategory} />

          {/* image upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>תמונה</label>
            <label style={{
              display: "flex", alignItems: "center", gap: 10,
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 2, padding: "9px 14px", cursor: "pointer",
            }}>
              <span style={{ color: C.goldDim, fontSize: 15, lineHeight: 1 }}>📎</span>
              <span style={{ color: fImgName ? C.goldLight : C.muted, fontSize: 14, fontFamily: F.body }}>
                {fImgName || "בחר תמונה..."}
              </span>
              <input type="file" accept="image/*" onChange={handleImg} style={{ display: "none" }} />
            </label>
            {fImage && (
              <img src={fImage} alt="" style={{
                height: 72, marginTop: 10, borderRadius: 2,
                border: `1px solid ${C.border}`, display: "block",
              }} />
            )}
          </div>

          {okMsg && (
            <div style={{
              color: C.goldLight, fontSize: 13, marginBottom: 16,
              textAlign: "center", fontFamily: F.body,
            }}>{okMsg}</div>
          )}

          <GoldButton
            style={{ width: "100%", textAlign: "center" }}
            disabled={!fTitle.trim()}
            onClick={handleSave}
          >שמור רמז</GoldButton>
        </div>

        {/* ── CLUES LIST ── */}
        <div>
          <div style={{
            fontSize: 12, color: C.goldDim, letterSpacing: 4,
            marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase",
          }}>רמזים שמורים ({clues.length})</div>

          {clues.length === 0 ? (
            <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14, padding: "24px 0" }}>
              אין רמזים עדיין
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, maxHeight: "68vh", overflowY: "auto" }}>
              {clues.map(clue => (
                <div key={clue.id} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRight: `3px solid ${C.gold}`,
                  borderRadius: 2, padding: "14px 16px",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  {clue.image && (
                    <img src={clue.image} alt="" style={{
                      width: 48, height: 48, objectFit: "cover",
                      borderRadius: 2, flexShrink: 0,
                      border: `1px solid ${C.border}`,
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: C.goldBright, fontFamily: F.heading,
                      fontSize: 14, fontWeight: 700, marginBottom: 4,
                    }}>{clue.title}</div>
                    {clue.category && (
                      <span style={{
                        background: C.goldDark, border: `1px solid ${C.borderGold}`,
                        color: C.goldLight, fontSize: 9, padding: "2px 8px",
                        fontFamily: F.heading, letterSpacing: 2,
                        textTransform: "uppercase", borderRadius: 1,
                        display: "inline-block", marginBottom: 4,
                      }}>{clue.category}</span>
                    )}
                    {clue.numbers.length > 0 && (
                      <div style={{ color: C.muted, fontSize: 11, fontFamily: F.heading, letterSpacing: 1 }}>
                        מספרים: {clue.numbers.join(" · ")}
                      </div>
                    )}
                    {clue.content && (
                      <div style={{
                        color: C.muted, fontSize: 12, fontFamily: F.body,
                        marginTop: 4, lineHeight: 1.7,
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>{clue.content}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(clue.id)}
                    onMouseEnter={e => (e.currentTarget.style.color = "#c05050")}
                    onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                    style={{
                      background: "none", border: "none", color: C.muted,
                      cursor: "pointer", fontSize: 16, lineHeight: 1,
                      fontFamily: "monospace", transition: "color 0.2s", flexShrink: 0,
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== TRAFFIC DASHBOARD — היסטוריית גלישה (Jetpack 2015→) =====

function trafPretty(u) {
  if (!u) return "";
  let s = String(u);
  if (s === "WordPress Dashboard") return "לוח WordPress";
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
  try { s = decodeURIComponent(s); } catch {}
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}

function trafBucketKey(dateStr, gran) {
  if (gran === "yearly")  return dateStr.slice(0, 4);
  if (gran === "monthly") return dateStr.slice(0, 7);
  if (gran === "weekly") {
    const d = new Date(`${dateStr}T00:00:00Z`);
    const dow = d.getUTCDay() || 7;            // ראשון=7
    d.setUTCDate(d.getUTCDate() - (dow - 1));  // תחילת השבוע (שני)
    return d.toISOString().slice(0, 10);
  }
  return dateStr;                              // יומי
}

function TrafficDashboardPage({ onNav }) {
  const [authed, setAuthed]   = useState(false);
  const [pw, setPw]           = useState("");
  const [pwError, setPwError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [data, setData]       = useState({ yearly: [], daily: [], posts: [], referrers: [], clicks: [], searches: [] });
  const [year, setYear]       = useState("all");
  const [gran, setGran]       = useState("monthly");
  const [inbox, setInbox]     = useState({ messages: [], subscribers: [], unread: 0, subscriber_count: 0 });
  const [oldComments, setOldComments] = useState([]);   // תגובות מהאתר הישן, מקובצות לפי פוסט
  const [openGroups, setOpenGroups]   = useState({});   // אילו פוסטים פתוחים
  const [tab, setTab]         = useState("traffic"); // traffic | inbox

  function handleAuth() {
    if (pw.trim() === ADMIN_PASSWORD) { setAuthed(true); setPwError(false); }
    else setPwError(true);
  }

  const reload = React.useCallback(() => {
    setLoading(true); setErr("");
    const inboxEmpty = { messages: [], subscribers: [], unread: 0, subscriber_count: 0 };
    Promise.all([
      getTrafficStats(),
      getAdminInbox(ADMIN_PASSWORD).catch(() => inboxEmpty),
      getOldSiteComments().catch(() => []),
    ])
      .then(([d, ib, oc]) => { setData(d); setInbox(ib || inboxEmpty); setOldComments(oc || []); setLoading(false); })
      .catch(e => { setErr(e?.message || "שגיאה בטעינת הנתונים"); setLoading(false); });
  }, []);

  useEffect(() => { if (authed) reload(); }, [authed, reload]);

  async function toggleRead(m) {
    try {
      await markMessageRead(ADMIN_PASSWORD, m.id, !m.read);
      setInbox(prev => ({
        ...prev,
        messages: prev.messages.map(x => x.id === m.id ? { ...x, read: !x.read } : x),
        unread: prev.messages.reduce((s, x) => s + ((x.id === m.id ? !x.read : x.read) ? 0 : 1), 0),
      }));
    } catch {}
  }

  const series = React.useMemo(() => {
    const map = new Map();
    for (const d of data.daily) {
      const k = trafBucketKey(d.date, gran);
      map.set(k, (map.get(k) || 0) + d.views);
    }
    return [...map.entries()].map(([key, views]) => ({ key, views })).sort((a, b) => a.key.localeCompare(b.key));
  }, [data.daily, gran]);

  if (!authed) return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.gold}`, borderRadius: 2,
        padding: "44px 40px", width: "100%", maxWidth: 360,
        boxShadow: `0 8px 60px ${C.goldDeep}`,
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, color: C.goldDim, marginBottom: 16 }}>✦</div>
          <h2 style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 20, margin: "0 0 16px" }}>
            לוח גלישה
          </h2>
          <RoyalDivider width={100} />
        </div>
        <RoyalInput label="סיסמה" value={pw} onChange={setPw} type="password" />
        {pwError && <div style={{ color: "#c05050", fontSize: 13, marginBottom: 12, textAlign: "center", fontFamily: F.body }}>סיסמה שגויה</div>}
        <GoldButton style={{ width: "100%", textAlign: "center" }} onClick={handleAuth}>כניסה</GoldButton>
      </div>
    </div>
  );

  const nf = n => (Number(n) || 0).toLocaleString("he");
  const maxYearViews = Math.max(1, ...data.yearly.map(y => y.views));
  const maxRef   = Math.max(1, ...data.referrers.map(r => r.views));
  const maxClick = Math.max(1, ...data.clicks.map(c => c.views));
  const totalAll = data.yearly.reduce((s, y) => s + y.views, 0);
  const peakYear = data.yearly.reduce((m, y) => (y.views > m.views ? y : m), { period: "—", views: 0 });

  const GRANS  = [["יומי", "daily"], ["שבועי", "weekly"], ["חודשי", "monthly"], ["שנתי", "yearly"]];
  const WINDOW = { daily: 120, weekly: 104, monthly: 72, yearly: 99 }[gran];
  const shown  = series.slice(-WINDOW);
  const maxSeries  = Math.max(1, ...shown.map(b => b.views));
  const seriesAvg  = shown.length ? Math.round(shown.reduce((s, b) => s + b.views, 0) / shown.length) : 0;
  const seriesPeak = shown.reduce((m, b) => (b.views > m.views ? b : m), { key: "—", views: 0 });
  const barMinW    = { daily: 7, weekly: 9, monthly: 15, yearly: 46 }[gran];

  const filtered = year === "all" ? data.posts : data.posts.filter(p => p.period === year);
  const topPosts = filtered.slice(0, 50);

  // פילוח לפי יום בשבוע (ממוצע צפיות מהנתונים היומיים)
  const DOW = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const dowAgg = (() => {
    const sum = Array(7).fill(0), cnt = Array(7).fill(0);
    for (const d of data.daily) {
      const wd = new Date(`${d.date}T00:00:00Z`).getUTCDay();
      sum[wd] += d.views; cnt[wd] += 1;
    }
    return DOW.map((label, i) => ({ label, avg: cnt[i] ? Math.round(sum[i] / cnt[i]) : 0 }));
  })();
  const maxDow = Math.max(1, ...dowAgg.map(d => d.avg));
  const bestDay = data.daily.reduce((m, d) => (d.views > m.views ? d : m), { date: "—", views: 0 });

  // צמיחה שנתית (YoY)
  const yoy = data.yearly.map((y, i) => {
    const prev = data.yearly[i - 1];
    const pct = prev && prev.views ? Math.round(((y.views - prev.views) / prev.views) * 100) : null;
    return { ...y, pct };
  });

  // ייצוא CSV
  function downloadCsv(filename, rows, headers) {
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href);
  }
  const exportDaily = () => downloadCsv("traffic-daily.csv", data.daily.map(d => [d.date, d.views]), ["תאריך", "צפיות"]);
  const exportPosts = () => downloadCsv("top-posts.csv", data.posts.map(p => [p.period, p.title, p.views, p.url || ""]), ["שנה", "כותרת", "צפיות", "קישור"]);
  const exportRefs  = () => downloadCsv("referrers.csv", data.referrers.map(r => [r.title, r.views]), ["מקור", "צפיות"]);
  const exportSubs  = () => downloadCsv("subscribers.csv", inbox.subscribers.map(s => [s.email, s.name || "", s.source, s.created_at]), ["אימייל", "שם", "מקור", "תאריך"]);

  const smallBtn = {
    background: C.bgGlow, border: `1px solid ${C.borderGold}`, color: C.goldBright,
    cursor: "pointer", fontSize: 11, fontFamily: F.heading, letterSpacing: 1,
    padding: "8px 14px", borderRadius: 6,
  };

  const chipStyle = active => ({
    background: active ? C.goldDark : C.bgGlow,
    border: `1px solid ${active ? C.gold : C.borderGold}`,
    color: active ? C.goldBright : C.goldDim,
    cursor: "pointer", fontSize: 12, fontFamily: F.heading,
    letterSpacing: 1, padding: "6px 14px", borderRadius: 20,
  });
  const cardStyle = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "24px 24px" };
  const panelTitle = { fontSize: 11, color: C.goldDim, letterSpacing: 4, marginBottom: 18, fontFamily: F.heading, textTransform: "uppercase" };

  function postCell(p) {
    if ((p.title || "").trim() === "דף ראשי")
      return <button onClick={() => onNav && onNav("home")} style={{ background: "none", border: "none", color: C.goldLight, cursor: "pointer", fontFamily: F.body, fontSize: 14, padding: 0, textAlign: "right" }}>{p.title} ↗</button>;
    if (p.url)
      return <a href={p.url} target="_blank" rel="noreferrer" style={{ color: "#ede4d3", textDecoration: "none" }}>{p.title || `#${p.post_id}`}</a>;
    return p.title || `#${p.post_id}`;
  }

  // פאנל רשימה עם פסי-יחס (מקורות תנועה / קליקים)
  const ListPanel = ({ title, rows, max, link }) => (
    <div style={cardStyle}>
      <div style={panelTitle}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, padding: "12px 0" }}>אין נתונים</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#ede4d3", fontFamily: F.body, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.title}>
                  {link && r.url
                    ? <a href={r.url} target="_blank" rel="noreferrer" style={{ color: "#ede4d3", textDecoration: "none" }}>{trafPretty(r.title)}</a>
                    : trafPretty(r.title)}
                </div>
                <div style={{ background: C.bg, borderRadius: 3, height: 6, marginTop: 5, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(3, (r.views / max) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold})` }} />
                </div>
              </div>
              <div style={{ width: 64, textAlign: "left", color: C.goldDim, fontFamily: F.mono, fontSize: 12 }}>{nf(r.views)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 24px 60px", direction: "rtl" }}>
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 4 }}>
        <GoldButton variant="secondary" style={{ padding: "8px 20px", fontSize: 11 }} onClick={() => onNav && onNav("home")}>דף ראשי →</GoldButton>
      </div>
      <SectionHeader eyebrow="ניהול · Jetpack" title="היסטוריית גלישה — מ-2015" />

      {loading && <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>טוען נתונים…</div>}
      {err && <div style={{ textAlign: "center", color: "#c05050", fontFamily: F.body, padding: 20 }}>{err}</div>}

      {!loading && !err && (
        <>
          {/* סרגל כלים */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={reload} style={smallBtn}>↻ רענון</button>
              <button onClick={exportDaily} style={smallBtn}>⬇ צפיות יומיות</button>
              <button onClick={exportPosts} style={smallBtn}>⬇ פוסטים</button>
              <button onClick={exportRefs} style={smallBtn}>⬇ מקורות</button>
            </div>
            <a href="#inbox" style={{ ...smallBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
              ✉ הודעות ומנויים
              {inbox.unread > 0 && <span style={{ background: C.crimson, color: C.goldBright, borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>{inbox.unread}</span>}
            </a>
          </div>

          {/* כרטיסי סיכום */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 32 }}>
            {[["סך צפיות (2015→)", nf(totalAll)],
              [`שיא — ${peakYear.period}`, nf(peakYear.views)],
              [`היום החזק · ${bestDay.date}`, nf(bestDay.views)],
              ["פוסטים", nf(data.posts.length)],
              ["מקורות תנועה", nf(data.referrers.length)],
              ["מנויים", nf(inbox.subscriber_count)]].map(([label, val]) => (
              <div key={label} style={{ ...cardStyle, padding: "18px 16px", textAlign: "center", borderTop: `2px solid ${C.borderGold}` }}>
                <div style={{ fontSize: 24, color: C.goldBright, fontWeight: 900, fontFamily: F.heading }}>{val}</div>
                <div style={{ fontSize: 9.5, color: C.muted, marginTop: 6, letterSpacing: 2, fontFamily: F.heading, textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* ציר זמן — יומי / שבועי / חודשי / שנתי */}
          <div style={{ ...cardStyle, marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div style={{ ...panelTitle, marginBottom: 0 }}>ציר זמן — צפיות</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {GRANS.map(([label, key]) => (
                  <button key={key} onClick={() => setGran(key)} style={chipStyle(gran === key)}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 12, fontFamily: F.body, fontSize: 12, color: C.muted }}>
              <span>ממוצע: <b style={{ color: C.goldLight }}>{nf(seriesAvg)}</b></span>
              <span>שיא: <b style={{ color: C.goldLight }}>{nf(seriesPeak.views)}</b> ({seriesPeak.key})</span>
              <span>מציג: <b style={{ color: C.goldLight }}>{shown.length}</b> מתוך {series.length}</span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 168, overflowX: "auto", direction: "ltr", padding: "6px 2px", background: C.bg, borderRadius: 6 }}>
              {shown.map(b => (
                <div key={b.key} title={`${b.key} · ${nf(b.views)} צפיות`} style={{ minWidth: barMinW, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                  <div style={{ width: "72%", margin: "0 auto", height: `${Math.max(2, (b.views / maxSeries) * 150)}px`, background: `linear-gradient(180deg, ${C.goldBright}, ${C.goldDark})`, borderRadius: "2px 2px 0 0" }} />
                </div>
              ))}
            </div>
            {shown.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: F.mono, fontSize: 11, color: C.muted, direction: "ltr" }}>
                <span>{shown[0].key}</span>
                <span>{shown[shown.length - 1].key}</span>
              </div>
            )}
          </div>

          {/* פילוח לפי יום בשבוע */}
          <div style={{ ...cardStyle, marginBottom: 28 }}>
            <div style={panelTitle}>צפיות לפי יום בשבוע (ממוצע ליום)</div>
            <div style={{ display: "grid", gap: 8 }}>
              {dowAgg.map(d => (
                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 52, color: C.goldLight, fontFamily: F.heading, fontSize: 12 }}>{d.label}</div>
                  <div style={{ flex: 1, background: C.bg, borderRadius: 4, overflow: "hidden", height: 18 }}>
                    <div style={{ width: `${Math.max(3, (d.avg / maxDow) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${C.royalLight}, ${C.gold})` }} />
                  </div>
                  <div style={{ width: 60, textAlign: "left", color: C.goldDim, fontFamily: F.mono, fontSize: 12 }}>{nf(d.avg)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* מקורות תנועה + קליקים */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 28 }}>
            <ListPanel title="מאיפה נכנסים — מקורות תנועה" rows={data.referrers} max={maxRef} link />
            <ListPanel title="קליקים יוצאים ושיתופים" rows={data.clicks} max={maxClick} link />
          </div>

          {/* מילות חיפוש */}
          {data.searches.length > 0 && (
            <div style={{ ...cardStyle, marginBottom: 28 }}>
              <div style={panelTitle}>מילות חיפוש</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.searches.map((s, i) => (
                  <span key={i} style={{ background: C.bgGlow, border: `1px solid ${C.borderGold}`, borderRadius: 16, padding: "5px 12px", fontFamily: F.body, fontSize: 12, color: "#ede4d3" }}>
                    {s.title} <span style={{ color: C.gold }}>· {nf(s.views)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* צפיות לפי שנה */}
          <div style={{ ...cardStyle, marginBottom: 28 }}>
            <div style={panelTitle}>צפיות לפי שנה</div>
            <div style={{ display: "grid", gap: 10 }}>
              {yoy.map(y => (
                <div key={y.period} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>{y.period}</div>
                  <div style={{ flex: 1, background: C.bg, borderRadius: 4, overflow: "hidden", height: 22 }}>
                    <div style={{ width: `${Math.max(3, (y.views / maxYearViews) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${C.goldDark}, ${C.gold})` }} />
                  </div>
                  <div style={{ width: 56, textAlign: "left", fontFamily: F.mono, fontSize: 12, color: y.pct == null ? C.muted : y.pct >= 0 ? "#3a9b6e" : C.crimsonLight }}>
                    {y.pct == null ? "—" : `${y.pct >= 0 ? "▲" : "▼"}${Math.abs(y.pct)}%`}
                  </div>
                  <div style={{ width: 80, textAlign: "left", color: C.goldDim, fontFamily: F.mono, fontSize: 13 }}>{nf(y.views)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* פוסטים מובילים */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
              <div style={{ ...panelTitle, marginBottom: 0 }}>פוסטים מובילים</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setYear("all")} style={chipStyle(year === "all")}>הכל</button>
                {data.yearly.map(y => (
                  <button key={y.period} onClick={() => setYear(y.period)} style={chipStyle(year === y.period)}>{y.period}</button>
                ))}
              </div>
            </div>

            {topPosts.length === 0 ? (
              <div style={{ color: C.muted, fontFamily: F.body, padding: "20px 0", textAlign: "center" }}>אין נתונים לתקופה זו</div>
            ) : (
              <div style={{ display: "grid", gap: 2 }}>
                {topPosts.map((p, i) => (
                  <div key={`${p.post_id}-${p.period}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderBottom: `1px solid ${C.faint}` }}>
                    <div style={{ width: 28, color: C.gold, fontFamily: F.heading, fontSize: 12, textAlign: "center" }}>{i + 1}</div>
                    <div style={{ flex: 1, color: "#ede4d3", fontFamily: F.body, fontSize: 14, lineHeight: 1.5 }}>
                      {postCell(p)}
                      {year === "all" && <span style={{ color: C.muted, fontSize: 11, marginRight: 8 }}> · {p.period}</span>}
                    </div>
                    <div style={{ width: 70, textAlign: "left", color: C.goldBright, fontFamily: F.mono, fontSize: 14, fontWeight: 700 }}>{nf(p.views)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* תיבת דואר — הודעות ומנויים */}
          <div id="inbox" style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ ...panelTitle, marginBottom: 0 }}>הודעות מהאתר הישן</div>
                <span style={{ background: C.surface2, color: C.goldDim, borderRadius: 10, padding: "1px 9px", fontSize: 11, fontFamily: F.heading }}>
                  {oldComments.reduce((s, g) => s + g.comments.length, 0)} תגובות · {oldComments.length} פוסטים
                </span>
              </div>
              {oldComments.length === 0 ? (
                <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, padding: "10px 0" }}>אין תגובות עדיין. תגובות מהאתר הישן יופיעו כאן, מקובצות לפי פוסט.</div>
              ) : (
                <div style={{ display: "grid", gap: 8, maxHeight: 520, overflowY: "auto" }}>
                  {oldComments.map(g => {
                    const open = !!openGroups[g.post_wp_id];
                    return (
                      <div key={g.post_wp_id} style={{ border: `1px solid ${C.faint}`, borderRadius: 6, overflow: "hidden" }}>
                        <div
                          onClick={() => setOpenGroups(prev => ({ ...prev, [g.post_wp_id]: !prev[g.post_wp_id] }))}
                          title="לחץ להצגת/הסתרת התגובות"
                          style={{
                            cursor: "pointer", padding: "10px 12px", background: C.surface2,
                            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                          }}
                        >
                          <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>
                            <span style={{ color: C.goldDim, marginInlineEnd: 6 }}>{open ? "▾" : "▸"}</span>
                            {stripHtml(g.title)}
                          </span>
                          <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 11, whiteSpace: "nowrap" }}>{g.comments.length}</span>
                        </div>
                        {open && (
                          <div style={{ display: "grid", gap: 6, padding: "8px 10px" }}>
                            {g.comments.map(c => (
                              <div key={c.wp_id} style={{ padding: "9px 11px", borderRadius: 6, background: C.bg, border: `1px solid ${C.faint}` }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                                  <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{c.author_name || "אנונימי"}</span>
                                  <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 11 }}>{(c.date || "").slice(0, 10)}</span>
                                </div>
                                <div style={{ color: "#ede4d3", fontFamily: F.body, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{stripHtml(c.content || "")}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ ...panelTitle, marginBottom: 0 }}>מנויים — רשימת תפוצה</div>
                <button onClick={exportSubs} style={smallBtn}>⬇ CSV</button>
              </div>
              <div style={{ fontSize: 28, color: C.goldBright, fontWeight: 900, fontFamily: F.heading, marginBottom: 12 }}>{nf(inbox.subscriber_count)}</div>
              {inbox.subscribers.length === 0 ? (
                <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, padding: "10px 0", lineHeight: 1.7 }}>
                  אין מנויים עדיין. טופס ההרשמה כבר פעיל — כל הרשמה חדשה תופיע כאן אוטומטית.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6, maxHeight: 400, overflowY: "auto" }}>
                  {inbox.subscribers.map(s => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderBottom: `1px solid ${C.faint}` }}>
                      <span style={{ color: "#ede4d3", fontFamily: F.body, fontSize: 13 }}>{s.email}{s.name ? ` · ${s.name}` : ""}</span>
                      <span style={{ color: C.muted, fontFamily: F.mono, fontSize: 11 }}>{(s.created_at || "").slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 32 }}>
            <GoldButton variant="secondary" onClick={() => onNav && onNav("home")}>← חזרה לדף הבית</GoldButton>
          </div>
        </>
      )}
    </div>
  );
}

// ===== NUMBERS REPORT PAGE =====

const REPORT_PASSWORD = "1820";

function NumbersReportPage() {
  const [authed,   setAuthed]   = useState(false);
  const [pw,       setPw]       = useState("");
  const [pwError,  setPwError]  = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 1 });
  const [report,   setReport]   = useState(null);

  function handleAuth() {
    if (pw.trim() === REPORT_PASSWORD) { setAuthed(true); setPwError(false); }
    else setPwError(true);
  }

  async function runScan() {
    setScanning(true);
    setReport(null);
    setProgress({ done: 0, total: 1 });
    try {
      // קוראים את כל הפוסטים מ-Supabase בעמודים (PostgREST מגביל ~1000 שורות)
      const allPosts = [];
      const CH = 1000;
      for (let from = 0; ; from += CH) {
        const { data } = await supabase
          .from("posts").select("wp_id,title,content").range(from, from + CH - 1);
        if (!data || !data.length) break;
        allPosts.push(...data);
        setProgress({ done: allPosts.length, total: allPosts.length });
        if (data.length < CH) break;
      }

      const counts = {};
      for (const post of allPosts) {
        const text = (post.title ?? "") + " " + (post.content ?? "");
        for (const match of text.matchAll(/\b(\d{1,5})\b/g)) {
          const k = parseInt(match[1], 10);
          if (k > 0) counts[k] = (counts[k] || 0) + 1;
        }
      }

      const numbers = Object.entries(counts)
        .map(([n, count]) => ({ num: parseInt(n, 10), count, meaning: KEY_NUMBERS[parseInt(n, 10)] ?? null }))
        .filter(r => r.count >= 2 || r.meaning)
        .sort((a, b) => b.count - a.count);

      setReport({ generated: new Date().toISOString(), totalPosts: allPosts.length, numbers });
    } catch { /* silent */ }
    finally { setScanning(false); }
  }

  function downloadJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "numbers-report.json";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  if (!authed) return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", direction: "rtl" }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.gold}`, borderRadius: 2,
        padding: "44px 40px", width: "100%", maxWidth: 360,
        boxShadow: `0 8px 60px ${C.goldDeep}`,
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, color: C.goldDim, marginBottom: 16 }}>✦</div>
          <h2 style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 20, margin: "0 0 16px" }}>דוח מספרים</h2>
          <RoyalDivider width={100} />
        </div>
        <RoyalInput label="סיסמה" value={pw} onChange={setPw} type="password" />
        {pwError && <div style={{ color: "#c05050", fontSize: 12, marginBottom: 12, textAlign: "center", fontFamily: F.body }}>סיסמה שגויה</div>}
        <GoldButton style={{ width: "100%", textAlign: "center" }} onClick={handleAuth}>כניסה</GoldButton>
      </div>
    </div>
  );

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "64px 24px", direction: "rtl" }}>
      <SectionHeader eyebrow="כלי ניתוח" title="דוח מספרים" />

      {!report && !scanning && (
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 2, marginBottom: 28 }}>
            הכלי סורק את כל הפוסטים, מחלץ מספרים חוזרים וממיין לפי תדירות.<br />
            מספרי מפתח מסומנים בזהב.
          </p>
          <GoldButton onClick={runScan}>הפעל סריקה</GoldButton>
        </div>
      )}

      {scanning && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontSize: 40, color: C.goldDim, marginBottom: 20 }}>✦</div>
          <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, marginBottom: 20 }}>
            סורק... {progress.done} / {progress.total} עמודים ({pct}%)
          </p>
          <div style={{ maxWidth: 280, margin: "0 auto", height: 3, background: C.faint, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: C.gold, borderRadius: 2, width: `${pct}%`, transition: "width 0.35s" }} />
          </div>
        </div>
      )}

      {report && (
        <>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 28, flexWrap: "wrap" }}>
            <GoldButton variant="secondary" onClick={runScan} style={{ fontSize: 11 }}>סרוק מחדש</GoldButton>
            <GoldButton onClick={downloadJson} style={{ fontSize: 11 }}>הורד JSON</GoldButton>
          </div>
          <div style={{ textAlign: "center", marginBottom: 32, color: C.muted, fontFamily: F.body, fontSize: 13 }}>
            {report.totalPosts} פוסטים · {report.numbers.length} מספרים ייחודיים חוזרים
          </div>

          <div style={{ display: "grid", gap: 4 }}>
            {report.numbers.map(({ num, count, meaning }) => (
              <div key={num} style={{
                display: "grid", gridTemplateColumns: "56px 1fr 44px",
                alignItems: "center", gap: 16, padding: "10px 18px",
                background: meaning ? `linear-gradient(to left, ${C.goldDeep}99, transparent)` : "transparent",
                border: `1px solid ${meaning ? C.borderGold : C.faint}`,
                borderRadius: 2,
              }}>
                <span style={{ color: meaning ? C.goldBright : C.goldDim, fontFamily: F.heading, fontSize: 17, fontWeight: 700 }}>{num}</span>
                <span style={{ color: meaning ? C.goldLight : C.muted, fontFamily: F.body, fontSize: 13 }}>
                  {meaning || "—"}
                </span>
                <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10, letterSpacing: 1, textAlign: "left" }}>×{count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ===== NAVBAR =====

const NAV_ITEMS = [
  { key: "home",    label: "ראשי" },
  { key: "blog",    label: "פוסטים" },
  { key: "about",   label: "אודות" },
  { key: "login",   label: "כניסה" },
];

function Navbar({ page, onNav }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: scrolled ? "rgba(5,4,0,0.98)" : "rgba(5,4,0,0.88)",
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${scrolled ? C.borderGold : C.border}`,
      padding: "0 24px",
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      alignItems: "center",
      height: 64,
      direction: "rtl",
      transition: "all 0.35s",
      gap: 16,
    }}>
      {/* logo — right in RTL */}
      <button onClick={() => onNav("home")} style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10, padding: 0,
      }}>
        <div style={{ position: "relative", display: "inline-flex" }}>
          <img src={LOGO_URL} alt="SOD1820" className="logo-animated" style={{ height: 36, width: "auto" }} />
          <span style={{
            position: "absolute", top: -5, right: -8,
            background: `linear-gradient(135deg, ${C.crimsonLight}, ${C.crimson})`,
            color: "#f6e27a", fontSize: 7, fontWeight: 800, letterSpacing: 0.5,
            fontFamily: F.heading, padding: "1.5px 4px", borderRadius: 3,
            border: `1px solid ${C.goldDim}`, lineHeight: 1.3,
            boxShadow: `0 0 6px rgba(122,19,32,0.6)`, textTransform: "uppercase",
          }}>AI</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 12, fontWeight: 800, lineHeight: 1.25 }}>
            כי לה' המלוכה
          </div>
          <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 7, letterSpacing: 3, textTransform: "uppercase" }}>
            SOD1820
          </div>
        </div>
      </button>

      {/* center nav */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
        <button onClick={() => onNav("blog")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: page === "blog" ? C.goldBright : C.muted,
          fontFamily: F.royal, fontSize: 14, fontWeight: 700,
          letterSpacing: 1, padding: "8px 14px", borderRadius: 3,
          transition: "color 0.2s",
          borderBottom: page === "blog" ? `2px solid ${C.gold}` : "2px solid transparent",
        }}>
          פוסטים אחרונים
        </button>
        <button onClick={() => onNav("spotchat")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: page === "spotchat" ? C.goldBright : C.muted,
          fontFamily: F.royal, fontSize: 14, fontWeight: 700,
          letterSpacing: 1, padding: "8px 14px", borderRadius: 3,
          transition: "color 0.2s",
          borderBottom: page === "spotchat" ? `2px solid ${C.gold}` : "2px solid transparent",
        }}>
          צאט האתר
        </button>
        <button onClick={() => onNav("contact")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: page === "contact" ? C.goldBright : C.muted,
          fontFamily: F.royal, fontSize: 14, fontWeight: 700,
          letterSpacing: 1, padding: "8px 14px", borderRadius: 3,
          transition: "color 0.2s",
          borderBottom: page === "contact" ? `2px solid ${C.gold}` : "2px solid transparent",
        }}>
          צור קשר
        </button>
      </div>

      {/* register button — left in RTL */}
      <GoldButton
        style={{ padding: "8px 20px", fontSize: 11, letterSpacing: 2, whiteSpace: "nowrap" }}
        onClick={() => onNav("login")}
      >
        הרשם עכשיו
      </GoldButton>
    </nav>
  );
}

// ===== CONTACT PAGE =====
function ContactPage() {
  const P = usePalette();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErr("נא למלא שם, אימייל והודעה"); return;
    }
    setSending(true); setErr("");
    try {
      await sendContactMessage(form);
      setSent(true);
    } catch { setErr("שגיאה בשליחה — נסה שוב"); }
    finally { setSending(false); }
  }

  const FD = "'Heebo', 'Heebo', serif";
  const FU = "'Heebo', 'Heebo', sans-serif";

  const CHANNELS = [
    { icon: "👥", label: "קבוצת הגימטריה", value: "הצטרפו לקבוצה", href: "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql" },
    { icon: "📸", label: "אינסטגרם", value: "@zuriel7676", href: "https://www.instagram.com/zuriel7676?igsh=ZnJodWtxcnh1Y3dp" },
    { icon: "👍", label: "פייסבוק — הדף", value: "סוד 1820", href: "https://www.facebook.com/sod1820" },
    { icon: "👤", label: "פייסבוק — אישי", value: "צוריאל", href: "https://www.facebook.com/share/1ECyfiRu3e/" },
    { icon: "✉️", label: "אימייל", value: "zyz997@gmail.com", href: "mailto:zyz997@gmail.com" },
  ];

  const TESTIMONIALS = [
    { text: "צוריאל, אני ממש מודה לך על מה שעשית כאן בשבילי — זו הפעם הראשונה שאני מרגיש ככה כבר תקופה. סוף סוף נפתר לי המידע על הספרה 51… זה גרם לי להוריד דמעות.", who: "חבר בקהילה", time: "12:01" },
    { text: "פתחתי את הקבוצה בעזרתך… תודה גדולה, תמיד אזכור. אתה לא מודע לכמה אתה עוזר — גם בלי להתכוון. 🙏", who: "חברה בקהילה", time: "14:26" },
    { text: "שמח להצטרף לקבוצה היקרה הזו. ראיתי כמה סרטונים כאן ואני כבר מאוהב בכם — עלו והצליחו בגילוי האמת. ✨", who: "מצטרף חדש", time: "23:02" },
  ];

  // צילומי ויראליות אמיתיים מתוך פוסט "צופן החותים" (טיקטוק/טלגרם — צפיות, שיתופים ותגובות)
  const VIRAL_POST = "%d7%91%d7%a6%d7%95%d7%a4%d7%9f-%d7%94%d7%a4%d7%9c%d7%90%d7%99-%d7%a2%d7%9c-%d7%94%d7%97%d7%95%d7%aa%d7%99%d7%9d-%d7%a8%d7%95%d7%90%d7%99%d7%9d-%d7%90%d7%aa-%d7%9b%d7%95%d7%95%d7%a0%d7%aa-%d7%90%d7%99";
  const VIRAL_SHOTS = [
    "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2024/08/b2b327e1fc6efddc.jpg",
    "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2024/08/05fef5a47e6e3d33.jpg",
    "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2024/08/060b460286b225ac.jpg",
  ];

  const field = (label, key, type = "text", rows) => (
    <div className="ct-field">
      <label htmlFor={"ct-" + key}>{label}</label>
      {rows
        ? <textarea id={"ct-" + key} rows={rows} value={form[key]} onChange={e => set(key, e.target.value)} dir="rtl" />
        : <input id={"ct-" + key} type={type} value={form[key]} onChange={e => set(key, e.target.value)} dir="rtl" />}
    </div>
  );

  return (
    <div style={{ background: P.pageBg, minHeight: "100vh", direction: "rtl" }}>
      <style>{`
        .ct-wrap { max-width: 1060px; margin: 0 auto; padding: clamp(40px,7vw,84px) 16px 110px; }
        .ct-hero { text-align: center; position: relative; margin-bottom: clamp(34px,5vw,54px); }
        .ct-hero::before { content:""; position:absolute; left:50%; top:-30%; width:min(560px,92%); height:280px;
          transform:translateX(-50%); background:radial-gradient(closest-side, ${P.glow}, transparent 72%); opacity:.55; pointer-events:none; }
        .ct-eyebrow { position:relative; display:inline-block; font-family:${FU}; font-size:12px; font-weight:700; letter-spacing:5px;
          text-transform:uppercase; color:${P.accentDim}; padding:5px 16px; border:1px solid ${P.border}; border-radius:999px; background:${P.cardSoft}; }
        .ct-title { position:relative; font-family:${FD}; font-weight:900; font-size:clamp(36px,7.5vw,70px); line-height:1.04; margin:18px 0 12px;
          background:linear-gradient(120deg, ${P.accentText}, ${P.accent} 55%, ${P.heroNum}); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
        .ct-sub { position:relative; font-family:${FU}; font-size:clamp(15px,2.4vw,18px); color:${P.inkSoft}; max-width:520px; margin:0 auto; line-height:1.7; }

        .ct-channels { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; max-width:880px; margin:0 auto clamp(34px,5vw,52px); }
        .ct-chan { display:flex; align-items:center; gap:13px; text-decoration:none; padding:14px 16px; border-radius:16px; min-width:0;
          background:${P.card}; border:1px solid ${P.border}; transition:transform .18s, border-color .18s, box-shadow .18s; }
        .ct-chan:hover { transform:translateY(-3px); border-color:${P.accent}; box-shadow:0 12px 30px ${P.glow}; }
        .ct-chan-ic { flex:0 0 auto; width:44px; height:44px; border-radius:12px; display:grid; place-items:center; font-size:21px;
          background:${P.cardSoft}; border:1px solid ${P.border}; }
        .ct-chan-l { font-family:${FU}; font-size:11px; font-weight:700; letter-spacing:.5px; color:${P.accentDim}; }
        .ct-chan-v { font-family:${FU}; font-size:14.5px; font-weight:600; color:${P.ink}; margin-top:1px; }

        .ct-main { display:grid; grid-template-columns:1.25fr .9fr; gap:22px; align-items:start; }
        .ct-card { background:${P.cardGrad}; border:1px solid ${P.border}; border-radius:20px; padding:clamp(22px,3vw,34px); box-shadow:0 10px 40px rgba(0,0,0,.12); }
        .ct-card-h { font-family:${FD}; font-weight:700; font-size:23px; color:${P.accentText}; margin:0 0 4px; }
        .ct-card-s { font-family:${FU}; font-size:13.5px; color:${P.inkSoft}; margin:0 0 22px; }

        .ct-field { margin-bottom:16px; }
        .ct-field label { display:block; font-family:${FU}; font-size:12.5px; font-weight:700; color:${P.accentDim}; margin-bottom:6px; }
        .ct-field input, .ct-field textarea { width:100%; box-sizing:border-box; background:${P.cardSoft}; color:${P.ink};
          border:1.5px solid ${P.border}; border-radius:12px; font-family:${FU}; font-size:15px; padding:12px 15px; outline:none;
          transition:border-color .16s, box-shadow .16s; }
        .ct-field textarea { resize:vertical; line-height:1.7; min-height:130px; }
        .ct-field input:focus, .ct-field textarea:focus { border-color:${P.accent}; box-shadow:0 0 0 3px ${P.glow}; }

        .ct-btn { width:100%; cursor:pointer; border:none; border-radius:12px; padding:15px; font-family:${FU}; font-size:15px; font-weight:800;
          letter-spacing:1px; background:${P.accentBtn}; color:${P.onAccent}; transition:transform .15s, box-shadow .15s; }
        .ct-btn:hover { transform:translateY(-2px); box-shadow:0 10px 26px ${P.glow}; }
        .ct-btn:disabled { opacity:.6; cursor:wait; }

        .ct-side { display:flex; flex-direction:column; gap:18px; }
        .ct-author-top { display:flex; gap:15px; align-items:center; margin-bottom:14px; }
        .ct-ava { width:60px; height:60px; border-radius:50%; flex:0 0 auto; display:grid; place-items:center; font-size:26px;
          background:linear-gradient(135deg, ${C.goldDark}, ${C.crimson}); border:2px solid ${P.borderStrong}; color:#fff; }
        .ct-about p { font-family:${FU}; font-size:14.5px; line-height:1.95; color:${P.ink}; margin:0 0 12px; }
        .ct-about p:last-child { margin-bottom:0; }
        .ct-err { color:#e0556a; font-family:${FU}; font-size:13px; font-weight:700; margin:0 0 14px; text-align:center; }

        .ct-viral { max-width:880px; margin:0 auto clamp(30px,5vw,46px); border-radius:20px; padding:clamp(22px,3.4vw,32px); text-align:center;
          border:1px solid ${P.borderStrong}; background:linear-gradient(135deg, ${P.glow}, ${P.cardSoft}); }
        .ct-viral h3 { font-family:${FD}; font-weight:900; font-size:clamp(22px,4.2vw,33px); color:${P.accentText}; margin:0 0 7px; }
        .ct-viral p { font-family:${FU}; font-size:clamp(14px,2.2vw,16.5px); color:${P.inkSoft}; margin:0 0 17px; line-height:1.75; max-width:560px; margin-inline:auto; }
        .ct-viral p b { color:${P.accentText}; font-weight:800; }
        .ct-viral-shots { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin:2px 0 18px; }
        .ct-viral-shots a { display:block; width:148px; aspect-ratio:9/16; border-radius:14px; overflow:hidden; border:1px solid ${P.borderStrong}; background:${P.cardSoft}; transition:transform .18s, box-shadow .18s; }
        .ct-viral-shots a:hover { transform:translateY(-3px); box-shadow:0 12px 30px ${P.glow}; }
        .ct-viral-shots img { width:100%; height:100%; object-fit:cover; object-position:top center; display:block; }
        .ct-viral-cta { display:inline-flex; align-items:center; gap:7px; font-family:${FU}; font-weight:800; font-size:14.5px; text-decoration:none;
          color:${P.onAccent}; background:${P.accentBtn}; padding:11px 26px; border-radius:999px; transition:transform .15s, box-shadow .15s; }
        .ct-viral-cta:hover { transform:translateY(-2px); box-shadow:0 10px 28px ${P.glow}; }
        @media (max-width:480px){ .ct-viral-shots a{ width:108px; } }

        .ct-testi { max-width:1000px; margin:clamp(42px,6vw,66px) auto 0; }
        .ct-testi-h { text-align:center; font-family:${FD}; font-weight:700; font-size:clamp(24px,4.6vw,34px); color:${P.accentText}; margin:0 0 6px; }
        .ct-testi-s { text-align:center; font-family:${FU}; font-size:14px; color:${P.inkSoft}; margin:0 0 28px; }
        .ct-testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .ct-wa { background:${P.card}; border:1px solid ${P.border}; border-radius:16px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,.14); }
        .ct-wa-head { display:flex; align-items:center; gap:10px; padding:10px 13px; background:${P.cardSoft}; border-bottom:1px solid ${P.border}; }
        .ct-wa-ava { width:34px; height:34px; border-radius:50%; flex:0 0 auto; display:grid; place-items:center; font-family:${FU}; font-weight:800; font-size:15px; color:#fff; background:linear-gradient(135deg,#25d366,#128c43); }
        .ct-wa-name { display:block; font-family:${FU}; font-weight:700; font-size:13.5px; color:${P.ink}; line-height:1.15; }
        .ct-wa-status { font-family:${FU}; font-size:10.5px; color:#25d366; }
        .ct-wa-body { padding:16px 13px; background:${P.mode === "light" ? "#e9e2d9" : "#0b141a"}; }
        .ct-wa-bubble { background:${P.mode === "light" ? "#ffffff" : "#202c33"}; border-radius:9px 9px 9px 2px; padding:9px 12px 5px; box-shadow:0 1px 1px rgba(0,0,0,.18); }
        .ct-wa-bubble p { font-family:${FU}; font-size:13.5px; line-height:1.7; color:${P.mode === "light" ? "#1f2c34" : "#e9edef"}; margin:0; }
        .ct-wa-time { display:block; text-align:left; direction:ltr; font-family:${FU}; font-size:10.5px; color:${P.mode === "light" ? "#667781" : "#8696a0"}; margin-top:4px; }
        .ct-wa-time b { color:#53bdeb; font-weight:400; }

        @media (max-width:820px){ .ct-channels{ grid-template-columns:repeat(2,1fr); } .ct-main{ grid-template-columns:1fr; } .ct-testi-grid{ grid-template-columns:1fr; } }
        @media (max-width:480px){ .ct-channels{ grid-template-columns:1fr; } }
      `}</style>

      <div className="ct-wrap">
        <header className="ct-hero">
          <span className="ct-eyebrow">יצירת קשר</span>
          <h1 className="ct-title">נשמח לשמוע ממך</h1>
          <p className="ct-sub">שאלות, הצעות ושיתופי פעולה — כל פנייה מתקבלת בברכה ✦</p>
        </header>

        <div className="ct-channels">
          {CHANNELS.map(c => (
            <a key={c.label} className="ct-chan" href={c.href} target="_blank" rel="noopener noreferrer">
              <span className="ct-chan-ic">{c.icon}</span>
              <span style={{ minWidth: 0 }}>
                <span className="ct-chan-l" style={{ display: "block" }}>{c.label}</span>
                <span className="ct-chan-v" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir="ltr">{c.value}</span>
              </span>
            </a>
          ))}
        </div>

        <div className="ct-viral">
          <h3>🎬 יוצר סרטונים ויראליים</h3>
          <p>סרטוני צופן וגימטריה שזכו ל<b>מאות אלפי צפיות</b> והופצו בטיקטוק, בטלגרם וברשתות — עם אלפי תגובות, שיתופים ולייקים.</p>
          <div className="ct-viral-shots">
            {VIRAL_SHOTS.map((s, i) => (
              <a key={i} href={"/" + VIRAL_POST} title="לפוסט המלא — צופן החותים">
                <img src={s} alt="צילום מסך ויראלי — צופן החותים" loading="lazy" />
              </a>
            ))}
          </div>
          <a className="ct-viral-cta" href="https://www.youtube.com/watch?v=Jp0pxGofPjQ" target="_blank" rel="noopener noreferrer">▶ צפו בסרטון הוויראלי</a>
        </div>

        <div className="ct-main">
          <section className="ct-card">
            {sent ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 54, marginBottom: 16 }}>✦</div>
                <h2 className="ct-card-h" style={{ fontSize: 26 }}>ההודעה נשלחה!</h2>
                <p style={{ fontFamily: FU, color: P.inkSoft, fontSize: 15 }}>נחזור אליך בהקדם האפשרי 🙏</p>
                <button className="ct-btn" style={{ width: "auto", marginTop: 22, padding: "12px 28px", background: "transparent", color: P.accentText, border: `1.5px solid ${P.borderStrong}` }}
                  onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>שליחת הודעה נוספת</button>
              </div>
            ) : (
              <>
                <h2 className="ct-card-h">שליחת הודעה</h2>
                <p className="ct-card-s">נשתדל לחזור אליך מהר ככל האפשר.</p>
                <form onSubmit={handleSubmit}>
                  {field("שם מלא *", "name")}
                  {field("אימייל *", "email", "email")}
                  {field("נושא", "subject")}
                  {field("הודעה *", "message", "text", 6)}
                  {err && <p className="ct-err">{err}</p>}
                  <button type="submit" className="ct-btn" disabled={sending}>{sending ? "שולח…" : "שליחת הודעה ✦"}</button>
                </form>
              </>
            )}
          </section>

          <aside className="ct-side">
            <div className="ct-card">
              <div className="ct-author-top">
                <span className="ct-ava">✦</span>
                <span>
                  <span style={{ display: "block", fontFamily: FD, fontWeight: 700, fontSize: 19, color: P.accentText }}>צוריאל</span>
                  <span style={{ display: "block", fontFamily: FU, fontSize: 12, fontWeight: 700, letterSpacing: 1, color: P.accentDim, marginTop: 2 }}>מייסד ועורך · סוד 1820</span>
                </span>
              </div>
              <p style={{ fontFamily: FU, fontSize: 14, lineHeight: 1.85, color: P.inkSoft, margin: 0 }}>
                חוקר גימטריה, צפנים בתורה ורמזי אחרית הימים. מפיץ תובנות על הגאולה ומתעד אירועים בזמן אמת דרך משקפת הקבלה.
              </p>
            </div>

            <div className="ct-card ct-about">
              <div className="ct-chan-l" style={{ textAlign: "center", marginBottom: 12 }}>אודות המיזם</div>
              <p>מאחורי המיזם עומד צוריאל, יחד עם צוות חוקרי רמזים, גימטריה וקבלה מהארץ ומהעולם, הפועלים שנים באיסוף, תיעוד ופיתוח של מאגר ידע ייחודי.</p>
              <p>במשך יותר מעשור נאספו אלפי חיבורים, מספרים, צפנים ותובנות — שהפכו למערכת חיה המחברת מסורת, מחקר וטכנולוגיה.</p>
              <p style={{ color: P.accentText }}>החזון: מאגר רמזי הגאולה הגדול בעולם — שבו כל פוסט, מספר, תמונה וצופן מתחברים לתמונה אחת. ✨</p>
            </div>
          </aside>
        </div>

        <section className="ct-testi">
          <h2 className="ct-testi-h">מה אומרים הגולשים</h2>
          <p className="ct-testi-s">הודעות אמיתיות מחברי הקהילה 💛</p>
          <div className="ct-testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <div className="ct-wa" key={i}>
                <div className="ct-wa-head">
                  <span className="ct-wa-ava">{t.who.charAt(0)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="ct-wa-name">{t.who}</span>
                    <span className="ct-wa-status">מקוון</span>
                  </span>
                </div>
                <div className="ct-wa-body">
                  <div className="ct-wa-bubble">
                    <p>{t.text}</p>
                    <span className="ct-wa-time">{t.time} <b>✓✓</b></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ChatPage() {
  const [messages, setMessages]   = useState([]);
  const [author,   setAuthor]     = useState(() => localStorage.getItem("chat_author") || "");
  const [text,     setText]       = useState("");
  const [sending,  setSending]    = useState(false);
  const [error,    setError]      = useState("");
  const bottomRef = useRef(null);

  // load messages
  useEffect(() => {
    getChatMessages().then(setMessages).catch(() => {});
  }, []);

  // realtime subscription
  useEffect(() => {
    const channel = subscribeToChatMessages(msg => {
      setMessages(prev => [...prev, msg]);
    });
    return () => { channel.unsubscribe?.(); };
  }, []);

  // scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const name = author.trim() || "אנונימי";
    const body = text.trim();
    if (!body) return;
    setSending(true); setError("");
    try {
      await sendChatMessage({ author: name, content: body });
      localStorage.setItem("chat_author", name);
      setText("");
      // reload to pick up any missed messages
      getChatMessages().then(setMessages).catch(() => {});
    } catch (err) {
      setError("שגיאה בשליחה — נסה שוב");
    } finally {
      setSending(false);
    }
  }

  const formatTime = iso => {
    if (!iso) return "";
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm} ${hh}:${mi}`;
  };

  return (
    <div style={{ direction: "rtl", maxWidth: 720, margin: "0 auto", padding: "52px 16px 96px" }}>
      {/* header */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 10, color: C.goldDim, fontFamily: F.heading, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>
          קהילת סוד 1820
        </div>
        <h1 style={{ color: C.goldBright, fontFamily: F.royal, fontSize: "clamp(24px, 5vw, 38px)", fontWeight: 700, margin: "0 0 10px" }}>
          צ׳אט קהילתי
        </h1>
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, margin: 0 }}>
          שאל, שתף, התחבר — בית הפגישה של חוקרי הסוד
        </p>
        <RoyalDivider width={120} style={{ margin: "18px auto 0" }} />
      </div>

      {/* messages */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 4, padding: "20px 16px",
        minHeight: 320, maxHeight: 520, overflowY: "auto",
        marginBottom: 20, display: "flex", flexDirection: "column", gap: 2,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, fontSize: 14, padding: "60px 0" }}>
            אין הודעות עדיין — היה הראשון לכתוב
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const sameAuthor = prev?.author === msg.author;
          return (
            <div key={msg.id} style={{ marginTop: sameAuthor ? 3 : 14 }}>
              {!sameAuthor && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>
                    {msg.author}
                  </span>
                  <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10 }}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              )}
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                padding: "8px 14px",
                color: "#d8d0c4",
                fontFamily: F.body,
                fontSize: 15,
                lineHeight: 1.7,
                wordBreak: "break-word",
              }}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* compose form */}
      <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="text"
          placeholder="שמך (אופציונלי)"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          maxLength={60}
          style={{
            background: C.surface2, border: `1px solid ${C.border}`,
            color: "#ede4d3", fontFamily: F.heading, fontSize: 13,
            padding: "10px 14px", borderRadius: 3, outline: "none",
            direction: "rtl",
          }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <textarea
            placeholder="כתוב הודעה..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
            maxLength={1000}
            rows={3}
            style={{
              flex: 1,
              background: C.surface2, border: `1px solid ${C.border}`,
              color: "#ede4d3", fontFamily: F.body, fontSize: 15,
              padding: "10px 14px", borderRadius: 3, outline: "none",
              resize: "vertical", direction: "rtl", lineHeight: 1.7,
            }}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            style={{
              alignSelf: "flex-end",
              background: text.trim() ? `linear-gradient(135deg, ${C.goldDark}, ${C.goldDeep})` : C.surface2,
              border: `1px solid ${text.trim() ? C.gold : C.border}`,
              color: text.trim() ? C.goldBright : C.muted,
              fontFamily: F.heading, fontSize: 11, letterSpacing: 2,
              padding: "10px 20px", borderRadius: 3, cursor: text.trim() ? "pointer" : "not-allowed",
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}
          >
            {sending ? "שולח..." : "שלח ✦"}
          </button>
        </div>
        {error && <div style={{ color: "#c05050", fontFamily: F.heading, fontSize: 11 }}>{error}</div>}
        <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 9, letterSpacing: 1 }}>
          Enter לשליחה • Shift+Enter לשורה חדשה
        </div>
      </form>
    </div>
  );
}

// ===== SPOTIM CHAT PAGE =====
function SpotimChatPage() {
  const P = usePalette();
  useEffect(() => {
    // טוענים את ה-launcher של Spot.IM פעם אחת ומשאירים אותו טעון —
    // כך כשחוזרים לדף ה-SDK מזהה מחדש את אלמנט ה-conversation ולא "בורח".
    if (!document.getElementById("spotim-script")) {
      const s = document.createElement("script");
      s.id = "spotim-script";
      s.src = "https://launcher.spot.im/spot/sp_OVtajBTj";
      s.async = true;
      s.setAttribute("data-spotim-module", "spotim-launcher");
      document.body.appendChild(s);
    }
  }, []);

  // 🛤️ סרגל-גלילה תלת-מימדי מיוחד — רק בדף הצ'אט. מוסיפים class ל-<html> בכניסה
  // ומסירים ביציאה, כך שהסגנון לא דולף לשאר האתר. webkit (כרום/ספארי/אדג');
  // פיירפוקס מקבל גרסה עבה-יותר בסיסית (scrollbar-color).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("sod-chat-scroll");
    return () => root.classList.remove("sod-chat-scroll");
  }, []);

  return (
    <div style={{ direction: "rtl", maxWidth: 860, margin: "0 auto", padding: "52px 16px 96px" }}>
      {/* מסתירים את סרגל המערכת בדף הצ'אט — את מקומו תופס הרכבל המשולב (ChatScrollRail). */}
      <style>{`
        html.sod-chat-scroll { scrollbar-width: none; }
        html.sod-chat-scroll::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
      <ChatScrollRail />
      {/* ✨ טיקר «אור הגאולה» — עדכוני הערוץ בדף הצ'אט; מציץ לעדכוני קוד-המציאות (בבית) */}
      <BrandTicker channel="or-geula" peek={{ channel: "reality-code", to: "/broadcasts" }} />
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ color: P.accentText, fontFamily: F.royal, fontSize: "clamp(24px,5vw,38px)", fontWeight: 700, margin: "0 0 10px" }}>
          דף צ'אט
        </h1>
        <RoyalDivider width={120} style={{ margin: "18px auto 0" }} />
      </div>

      {/* אלמנט השיחה התקני של Spot.IM — נשמר אותו post-id כמו באתר הישן כדי לטעון את אותה שיחה */}
      <div
        data-spotim-module="conversation"
        data-post-id="POST_ID_GOES_HERE"
        data-post-url="https://sod1820.co.il/community/chat"
        style={{ minHeight: 400 }}
      />

    </div>
  );
}

// ===== APP ROOT =====

// ===== SLUG-BASED POST PAGE =====

// ===== SPOTIM COMMENTS (per-article) =====
function SpotimComments({ postId, postUrl }) {
  useEffect(() => {
    if (!postId) return;
    if (!document.getElementById("spotim-script")) {
      const s = document.createElement("script");
      s.id = "spotim-script";
      s.src = "https://launcher.spot.im/spot/sp_OVtajBTj";
      s.async = true;
      s.setAttribute("data-spotim-module", "spotim-launcher");
      document.body.appendChild(s);
    }
  }, [postId]);
  if (!postId) return null;
  return (
    <div style={{ marginTop: 64 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <RoyalDivider width={48} />
        <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 4, textTransform: "uppercase" }}>הצטרפו לדיון</span>
        <RoyalDivider width={48} />
      </div>
      <div
        key={String(postId)}
        data-spotim-module="conversation"
        data-post-id={String(postId)}
        data-post-url={postUrl}
        style={{ minHeight: 300 }}
      />
    </div>
  );
}

const editLabelStyle = {
  display: "block", color: C.goldDim, fontFamily: F.heading, fontSize: 10,
  letterSpacing: 2, textTransform: "uppercase", margin: "0 0 6px",
};
const editInputStyle = {
  width: "100%", boxSizing: "border-box", background: C.bg,
  border: `1px solid ${C.border}`, borderRadius: 3, color: "#ede4d3",
  fontFamily: F.body, fontSize: 14, padding: "10px 12px", marginBottom: 16,
};

function PostPageBySlug({ onNav }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hotWeek, setHotWeek] = useState(false);   // 🔥 חם השבוע — רק דגל (בלי לחשוף כמות צפיות)
  const contentRef = useRef(null);
  const loc = useLocation();
  const P = usePalette();
  // פוסט נקי (theme='auto', לא וורדפרס) = תמה-מודע, מתחלף יום/לילה עם המתג.
  // פוסט ישן (legacy-dark / source=wordpress) = נעול כהה — מכבד צבעים צרובים מ-WP.
  // themed = מתחלף עם מתג יום/לילה. ברירת מחדל ל-WordPress היא נעול-כהה (צבעים צרובים),
  // אבל פוסט שסומן במפורש theme='auto' יתחלף — גם פוסט ישן (opt-in דרך הניהול/DB).
  // themed (מנטרל צבעי-WP ליום/לילה) — לפוסטים ישנים בלבד; פוסט נקי מטופל ע"י post_text_colors_law
  const themed = post?.theme === "auto" && post?.source !== "ai";
  const pc = themed
    ? { bg: P.mode === "light" ? P.pageBg : C.bg, bgGlow: P.cardSoft, border: P.border, borderGold: P.borderStrong, faint: P.cardSoft, gold: P.accent, goldBright: P.accentText, goldDark: P.accentDim, goldDeep: P.onAccent, goldDim: P.accentDim, goldLight: P.ink, muted: P.inkSoft, royalLight: C.royalLight, surface: P.card, ink: P.ink, sub: P.inkSoft }
    : { bg: C.bg, bgGlow: C.bgGlow, border: C.border, borderGold: C.borderGold, faint: C.faint, gold: C.gold, goldBright: C.goldBright, goldDark: C.goldDark, goldDeep: C.goldDeep, goldDim: C.goldDim, goldLight: C.goldLight, muted: C.muted, royalLight: C.royalLight, surface: C.surface, ink: "#ede4d3", sub: "#d4ccbf" };

  // ── עריכת פוסט ידנית (מנהל מחובר בלבד) ──
  const { isAdmin, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", excerpt: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // לייטבוקס לתמונות inline בתוכן הפוסט (לא בקרוסלה)
  const [lbImages, setLbImages] = useState(null);
  const [lbStartIdx, setLbStartIdx] = useState(0);

  function startEdit() {
    setDraft({ title: post?.title ?? "", excerpt: post?.excerpt ?? "", content: post?.content ?? "" });
    setSaveErr("");
    setEditing(true);
  }
  async function saveEdit() {
    if (!post?.id) { setSaveErr("לא ניתן לשמור — אין מזהה פוסט"); return; }
    setSaving(true); setSaveErr("");
    try {
      const updated = await adminUpdatePost(post.id, draft);
      setPost(prev => ({ ...prev, ...draft, ...(updated || {}) }));
      setEditing(false);
    } catch (e) {
      setSaveErr(e?.message || "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    getPostBySlug(slug)
      .then(row => {
        if (row) { setPost(row); const rs = row.slug || slug; logView("post", rs); getViewCount("post", rs, 7).then(n => setHotWeek((n || 0) >= 5)).catch(() => {}); }   // מעקב פנימי; מציג רק דגל "חם" (בלי המספר)
        else setError("הפוסט לא נמצא");
        setLoading(false);
      })
      .catch(() => { setError("שגיאה בטעינה"); setLoading(false); });
  }, [slug]);

  // מאתר-מספר: כשמגיעים מחיפוש (?n=...) — הדגשה וגלילה אוטומטית למיקום בפוסט
  useEffect(() => {
    const hn = new URLSearchParams(loc.search).get("n");
    const el = contentRef.current;
    if (!hn || !el || !post) return;
    const id = setTimeout(() => {
      const term = (() => { try { return decodeURIComponent(hn); } catch { return hn; } })();
      const isNum = /^\d+$/.test(term);
      const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      let re; try { re = new RegExp(isNum ? `(?<!\\d)(${esc})(?!\\d)` : `(${esc})`, "g"); } catch { re = new RegExp(`(${esc})`, "g"); }
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      let first = null;
      nodes.forEach(node => {
        if (!node.nodeValue) return; re.lastIndex = 0; if (!re.test(node.nodeValue)) return; re.lastIndex = 0;
        const span = document.createElement("span");
        span.innerHTML = node.nodeValue.replace(re, '<mark class="sod-hl" style="background:#d4af37;color:#1a0e00;border-radius:3px;padding:0 3px;box-shadow:0 0 12px rgba(212,175,55,.7)">$1</mark>');
        node.parentNode && node.parentNode.replaceChild(span, node);
        if (!first) first = span.querySelector("mark");
      });
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 140);
    return () => clearTimeout(id);
  }, [post, loc.search]);

  // חוק ai_post_update_law: לחיצה על ביטוי-גימטריה (data-gem) פותחת מגירת מספר;
  // קישורים פנימיים בתוכן → ניווט SPA אמין (לא reload מלא — תיקון לנייד).
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onClick = e => {
      // תמונה inline (לא בתוך קרוסלה) → לייטבוקס
      const imgEl = e.target.closest("img");
      if (imgEl && el.contains(imgEl) && !imgEl.closest(".pic-carousel")) {
        const allImgs = [...el.querySelectorAll("img:not(.pic-carousel img)")].filter(i => i.src);
        const idx = allImgs.indexOf(imgEl);
        setLbImages(allImgs.map(i => ({ image_url: i.src, name: i.alt || "" })));
        setLbStartIdx(Math.max(0, idx));
        return;
      }
      const gemEl = e.target.closest("[data-gem]");
      if (gemEl && el.contains(gemEl)) {
        e.preventDefault();
        const term = (gemEl.getAttribute("data-gem") || "").trim();
        if (term) openNumberDrawer(term);
        return;
      }
      const a = e.target.closest("a");
      if (a && el.contains(a)) {
        const href = a.getAttribute("href") || "";
        const target = (a.getAttribute("target") || "").toLowerCase();
        // רק קישורים פנימיים (לא חיצוניים / לא target=_blank / לא עוגן)
        if (href.startsWith("/") && !href.startsWith("//") && target !== "_blank") {
          e.preventDefault();
          navigate(href);
        }
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [post, navigate]);

  // קישור-מספרים אוטומטי (עץ אחד): עוטף כל מספר עצמאי בתוכן ב-data-gem →
  // לחיצה פותחת את חלונית המספר (openNumberDrawer). לא נוגע בתוכן השמור — רק ב-DOM.
  useEffect(() => {
    if (!post) return;
    const id = setTimeout(() => {
      const root = contentRef.current;
      if (!root || root.dataset.numlinked) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          if (!n.nodeValue || !/\d/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
          for (let p = n.parentElement; p && p !== root; p = p.parentElement) {
            const t = p.tagName;
            // מדלגים על קישורים, סקריפטים, data-gem, ורכיבי React אינטראקטיביים (קרוסלה) — לא להפוך את ה-UI שלהם ללחיץ-מספר
            if (t === "A" || t === "SCRIPT" || t === "STYLE" || p.hasAttribute("data-gem") || (p.classList && p.classList.contains("pic-carousel"))) return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      const re = /(?<![\d.,/:])(\d{1,4})(?![\d.,/:])/g; // מספר עצמאי 1-4 ספרות (לא בתוך תאריך/שבר)
      nodes.forEach(node => {
        const text = node.nodeValue; re.lastIndex = 0;
        if (!re.test(text)) return; re.lastIndex = 0;
        const span = document.createElement("span");
        span.innerHTML = text.replace(re, '<span class="sod-numlink" data-gem="$1" title="פתח את חלונית המספר $1">$1</span>');
        node.parentNode && node.parentNode.replaceChild(span, node);
      });
      // גימטריות-ביטויים: ביטוי עברי קצר ומודגש (מודגש/צבוע) → data-gem (פותח חלונית עם הגימטריה והקשרים)
      const HEB = /[֐-׿]/;
      root.querySelectorAll('strong, b, [style*="color"]').forEach(el => {
        if (el.hasAttribute("data-gem") || el.closest("a") || el.closest("[data-gem]") || el.closest(".pic-carousel")) return;
        if (el.querySelector("[data-gem], img, .sod-numlink")) return; // יש ילד מקושר/תמונה — לא לעטוף את כולו
        const t = (el.textContent || "").trim();
        if (t.length < 2 || t.length > 18 || /\d/.test(t) || !HEB.test(t)) return; // ביטוי עברי קצר בלבד
        el.setAttribute("data-gem", t);
        el.classList.add("sod-gemlink");
      });
      if (contentRef.current) contentRef.current.dataset.numlinked = "1";
    }, 220);
    return () => clearTimeout(id);
  }, [post]);

  const image    = post?.image_url ?? null;
  const fx       = POST_FX[slug];   // אפקט ראש-עמוד (מטריקס-ריין) פר-פוסט
  const author   = post?.author ?? "";
  const title    = stripHtml(post?.title ?? "");
  const date     = formatDateHe(post?.date ?? "");
  const dateHeb  = formatDateHebrewCal(post?.date ?? "");
  const modified = post?.modified && post.modified !== post.date ? formatDateHe(post.modified) : null;
  // מודעות מוצגות רק על פוסטים "ישנים" — לפחות שבוע מאז הפרסום (לא על תוכן עדכני).
  const postAgeDays = post?.date ? (Date.now() - new Date(post.date).getTime()) / 86400000 : 0;
  const adsAllowed = postAgeDays >= 7;
  // 🟢 חוק התוכן הנקי: פוסט שנכתב אצלנו (source='ai') שומר על <style> מכוון (אנימציות/גרפיקה) —
  // מחיקת <style> היא ניקוי-וורדפרס והיא חלה רק על פוסטים ישנים. וורדפרס לא נכנס לתחום הנקי.
  const isCleanPost = post?.source === "ai";
  const content  = (post?.content ?? "")
    // strip injected full-HTML boilerplate (common from pasted AI-generated content)
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .replace(isCleanPost ? /$^/ : /<style[\s\S]*?<\/style>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    // collapse whitespace artifacts left by the above
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br>")
    .replace(/<p[^>]*>(\s|&nbsp;)*<\/p>/gi, "")
    .replace(/<div[^>]*style="[^"]*height:\s*\d+px[^"]*"[^>]*>\s*<\/div>/gi, "")
    // עוטף שורת "מאת …" רק בתחילת טקסט (אחרי >) — לא בתוך תכונות כמו alt= (שובר את ה-<img>)
    .replace(/(^|>)(\s*)(מאת[:\s]+[^\n<]{2,40})/g, '$1$2<span class="post-author">$3</span>');
  const cats     = post?.categories ?? [];
  const tags     = post?.tags ?? [];

  const [gematriaItems, setGematriaItems] = useState([]);
  useEffect(() => {
    if (!tags.length) { setGematriaItems([]); return; }
    getGematriaByPhrases(tags).then(setGematriaItems).catch(() => {});
  }, [tags.join(",")]);  // eslint-disable-line

  const [comments, setComments] = useState([]);
  useEffect(() => {
    if (!post?.wp_id) return;
    getCommentsByPostId(post.wp_id).then(setComments).catch(() => {});
  }, [post?.wp_id]);

  // SEO ספציפי לפוסט — מתעדכן כשהפוסט נטען (תיאור נקי, מטא מאמר ו-JSON-LD)
  useEffect(() => {
    if (!post) return;
    const desc = cleanDescription(post.excerpt || post.content || "");
    const by = resolveAuthor(post.author);
    applySeo({
      title,
      description: desc || undefined,
      path: "/" + slug,
      image: image || undefined,
      type: "article",
      publishedTime: post.date || undefined,
      modifiedTime: post.modified || post.date || undefined,
      author: by?.name && by.name !== "המערכת" ? by.name : undefined,
      tags: post.tags || [],
      section: (post.categories || [])[0] || undefined,
    });
  }, [post, title, image, slug]);

  // תיעוד צפייה בפוסט — רק למשתמש מחובר (פילוח עתידי)
  useEffect(() => {
    if (user && post?.slug) logActivity("post", post.slug, title);
  }, [user, post?.slug]);  // eslint-disable-line

  return (
    // legacy-dark = נעול כהה (מכבד צבעים צרובים מ-WP). themed = מתחלף עם המתג.
    <div data-theme={themed ? P.mode : "dark"} style={{ direction: "rtl", background: (themed ? P.mode : "dark") === "dark" ? "transparent" : pc.bg, minHeight: "100vh", color: pc.ink }}>
      {/* שיתוף מטופל גלובלית ע"י RoyalShareWidget — בוטל מנגנון השיתוף הכפול של התפילות */}
      {/* מודעות — רק על פוסטים ישנים (שבוע+ מאז הפרסום); no-op בלי מזהה AdSense: אנקור במובייל, צד בדסקטופ */}
      {post && !loading && adsAllowed && <StickyAnchorAd />}
      {post && !loading && adsAllowed && <SideRailAd />}
      {/* באנר מטריקס-ריין בראש העמוד — ה-hero לפוסט עם fx (לדוגמה מטריקס: ירוק + 506 נוזל). מחליף את תמונת ה-hero. */}
      {fx && !loading && (
        <div style={{ position: "relative", height: "clamp(200px, 34vw, 320px)", overflow: "hidden", background: "#070b12" }}>
          <MatrixRain color={fx.color} headColor={fx.headColor} featured={fx.featured} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(7,11,18,0.05) 35%, ${pc.bg} 100%)`, pointerEvents: "none" }} />
        </div>
      )}
      {image && !loading && !fx && (() => {
        // כרטיס מעוצב (api/card) — מציגים שלם ונקי (contain, בלי פילטר/הכהיה); תמונת-תוכן — cover עם הכהיה עדינה.
        const isCard = /\/api\/card|\/gallery\/sod1820\//.test(image);
        return (
          <div style={{ height: "clamp(220px, 40vw, 480px)", position: "relative", overflow: "hidden", background: isCard ? pc.bg : pc.goldDeep }}>
            <img src={image} alt={title} style={{ width: "100%", height: "100%", objectFit: isCard ? "contain" : "cover", filter: isCard ? "none" : "brightness(0.5) sepia(0.3)", display: "block" }} />
            {!isCard && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(5,4,0,0.1) 30%, ${pc.bg} 100%)` }} />}
          </div>
        );
      })()}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "52px 16px 96px" }}>
        <button onClick={() => navigate("/post")}
          style={{ background: "none", border: "none", color: pc.muted, cursor: "pointer", fontFamily: F.heading, fontSize: 13, marginBottom: 40, letterSpacing: 4, textTransform: "uppercase" }}>
          ← חזרה לפוסטים
        </button>

        {/* ── סרגל ניהול: עריכת פוסט ידנית (מנהל בלבד) ── */}
        {isAdmin && post && !loading && (
          <div style={{ marginBottom: 28 }}>
            {!editing ? (
              <button onClick={startEdit} style={{
                background: pc.bgGlow, border: `1px solid ${pc.gold}`, color: pc.goldLight,
                padding: "9px 18px", borderRadius: 4, cursor: "pointer",
                fontFamily: F.heading, fontSize: 12, letterSpacing: 2,
              }}>
                ✏️ עריכת פוסט
              </button>
            ) : (
              <AdvancedPostEditor
                draft={draft}
                setDraft={setDraft}
                onSave={saveEdit}
                onCancel={() => setEditing(false)}
                saving={saving}
                saveErr={saveErr}
              />
            )}
          </div>
        )}

        {loading && <div style={{ textAlign: "center", padding: "80px 0" }}><div style={{ fontSize: 42, color: pc.goldDim, marginBottom: 20 }}>✦</div><p style={{ color: pc.muted, fontFamily: F.body, fontSize: 14, letterSpacing: 2 }}>טוען...</p></div>}
        {error && <p style={{ color: "#b05050", fontFamily: F.body }}>{error}</p>}
        {post && !loading && (
          <>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              {cats.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, justifyContent: "center" }}>
                  {cats.map(name => (
                    <span key={name} className="sod-inflate" onClick={() => navigate('/category/' + toSlug(name))} style={{
                      background: pc.goldDark, border: `1px solid ${pc.borderGold}`,
                      color: pc.goldBright, fontSize: 12, padding: "4px 11px",
                      fontFamily: F.heading, letterSpacing: 1,
                      textTransform: "uppercase", borderRadius: 1,
                    }}>{name}</span>
                  ))}
                </div>
              )}
              <h1 style={{ color: pc.goldBright, margin: "0 0 20px", fontSize: "clamp(24px, 4.5vw, 44px)", fontFamily: F.royal, fontWeight: 700, lineHeight: 1.2, letterSpacing: 1, textShadow: P.mode === "light" ? "none" : `0 0 70px ${pc.goldDeep}` }}>{title}</h1>
              {hotWeek && (
                <div style={{ textAlign: "center", margin: "-8px 0 18px" }}>
                  <span title="חם השבוע" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#e0556a", fontFamily: F.heading, fontSize: 13, fontWeight: 800, border: "1px solid rgba(224,85,106,0.4)", background: "rgba(224,85,106,0.10)", borderRadius: 999, padding: "3px 13px" }}>
                    <span style={{ fontSize: 15 }}>🔥</span> חם השבוע
                  </span>
                </div>
              )}
              {(() => {
                const by = resolveAuthor(author);
                // כותב ברירת מחדל ("המערכת", כשהשדה ריק) — לא מציגים תיבת כותב כלל.
                if (by.name === "המערכת") return null;
                const isVerified = !!(post.verified || post.ai_touched);
                return (
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
                    <div
                      onClick={() => navigate(by.cat ? '/category/' + toSlug(by.cat) : '/post?author=' + encodeURIComponent(by.name))}
                      title={by.cat ? `כל הפוסטים בקטגוריית ${by.cat}` : `כל הפוסטים של ${by.name}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 13, background: pc.surface, border: `1px solid ${pc.border}`, borderRadius: 999, padding: "9px 22px 9px 14px", cursor: "pointer", transition: "border-color .15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = pc.borderGold}
                      onMouseLeave={e => e.currentTarget.style.borderColor = pc.border}
                    >
                      <img src={by.avatar} alt={by.name} width={38} height={38}
                        style={{ borderRadius: "50%", objectFit: "cover", border: `1px solid ${pc.borderGold}`, flex: "0 0 auto", background: pc.bg }}
                        onError={e => { e.currentTarget.src = "/logo.png"; }} />
                      <div style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ color: pc.goldLight, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>{by.name}</span>
                          {isVerified && <VerifiedBadge variant="ai" size={13} />}
                        </div>
                        <div style={{ color: pc.muted, fontFamily: F.heading, fontSize: 12, letterSpacing: 1, marginTop: 2 }}>
                          {by.role}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* חוק post_dates_law: כל פוסט מציג תאריך יצירה (לועזי + עברי) + תאריך עדכון (לועזי בלבד) */}
              <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", margin: "2px 0 16px", color: pc.muted, fontFamily: F.heading, fontSize: 12, letterSpacing: 0.5 }}>
                <span title="תאריך יצירת הפוסט">
                  📅 נוצר: {date}{dateHeb ? <span style={{ opacity: 0.65 }}> / {dateHeb}</span> : null}
                </span>
                {modified && <span style={{ color: pc.goldLight }} title="עודכן לאחרונה">✏️ עודכן: {modified}</span>}
              </div>
              <RoyalDivider width={160} />
            </div>
            {(post.verified || post.ai_touched) && <AiVerifiedDisclaimer />}
            {post.ai_addition && <AiAdditionBox html={post.ai_addition} number={post.ai_number} />}
            {/* "מספרים קשורים" הוסר לבקשת צוריאל — כפול עם הערת הלחיצוּת ("כל מספר לחיץ") שמתחת. */}
            <style>{POST_CONTENT_CSS}</style>
            {themed && <style>{themedPostContentCSS(P)}</style>}
            {/* הערת הלחיצוּת («כל מספר/מילה לחיץ») הוסרה לבקשת צוריאל — כולם כבר יודעים שהמספרים
                והביטויים המודגשים לחיצים, ההערה מיותרת ומסיחה. (number_click_hint_law — בוטל 3.7.2026.)
                הלחיצוּת עצמה נשמרת: data-gem + openNumberDrawer עדיין פעילים על כל מספר/ביטוי. */}
            <div className={`sod-post-content${themed ? " themed" : ""}${post?.source === "ai" ? " clean" : ""}`} ref={contentRef}>
              {/* מרקרי גלריה (קומפוננטת React באותו עץ — קישורים/פלטה עובדים):
                  • <div data-sod-gallery="N"></div>     → קרוסלת רמזים לפי ערך-ראשי
                  • <div data-sod-gallery-id="N"></div>  → גלריה שלמה לפי wp_gallery_id (gallery_images העריך) */}
              {(() => {
                // הפיצול לוכד 2 קבוצות לכל מרקר: דגל «-id» (או undefined) + המספר.
                const parts = String(content).split(/<div data-sod-gallery(-id)?="(\d+)"><\/div>/);
                const out = [];
                for (let i = 0; i < parts.length; i += 3) {
                  const html = parts[i];
                  if (html) out.push(<div key={"html" + i} dangerouslySetInnerHTML={{ __html: html }} />);
                  const flag = parts[i + 1], num = parts[i + 2];
                  if (num != null) out.push(
                    flag === "-id"
                      ? <PostImageCarousel key={"sodgal" + i} gallery={Number(num)} />
                      : <PostImageCarousel key={"sodgal" + i} value={Number(num)} />
                  );
                }
                return out;
              })()}
            </div>
            {/* 🖼 רצועת גישה לגלריה העריכה — התמונות המוטמעות נשארות; זו רק הפניה (עץ אחד) */}
            <PostGalleryLinks content={content} wpId={post?.wp_id} />
            {lbImages && <Lightbox images={lbImages} initialIndex={lbStartIdx} onClose={() => setLbImages(null)} />}
            {tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 48 }}>
                {tags.map(name => (
                  <span key={name} className="sod-inflate" onClick={() => navigate('/tag/' + toSlug(name))} style={{
                    background: pc.faint, border: `1px solid ${pc.border}`,
                    color: pc.muted, fontSize: 12, padding: "4px 11px",
                    fontFamily: F.heading, letterSpacing: 1,
                    textTransform: "uppercase", borderRadius: 1,
                  }}>{name}</span>
                ))}
              </div>
            )}

            {/* שיתוף תחתון הוסר — מטופל גלובלית ע"י RoyalShareWidget הצף */}
            {false && !PRAYER_SHARE_WP_IDS.includes(post.wp_id) && (() => {
              const shareUrl = `${SITE_URL}/${post.slug || slug}`;
              const isYenuka = (tags || []).some(t => YENUKA_TAGS.includes(t));
              return (
                <div style={{ marginTop: 52 }}>
                  <RoyalDivider width={120} />
                  {isYenuka ? (
                    <div style={{
                      marginTop: 28, background: "linear-gradient(150deg, rgba(212,175,55,0.14), rgba(122,19,32,0.16))",
                      border: `1px solid ${pc.borderGold}`, borderRadius: 16, padding: "26px 26px 22px", textAlign: "center",
                    }}>
                      <div style={{ color: pc.goldBright, fontFamily: F.regal, fontSize: "clamp(18px,3vw,23px)", fontWeight: 700, lineHeight: 1.5, marginBottom: 8 }}>
                        🌟 שתפו את תפילות הינוקא עם שני אנשים עוד היום.
                      </div>
                      <div style={{ color: pc.goldLight, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.9, maxWidth: 540, margin: "0 auto 20px" }}>
                        אולי דווקא ההודעה שלכם תהיה הניצוץ שיביא להם תקווה, חיזוק וישועה. 🙏
                      </div>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <ShareBar url={shareUrl} title={title} text={YENUKA_SHARE_TEXT} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 24 }}>
                      <div style={{ color: pc.goldDim, fontFamily: F.heading, fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>
                        שתפו את הפוסט
                      </div>
                      <ShareBar url={shareUrl} title={title} text={title} />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* תפילות פופולריות נוספות — רק בפוסטי התפילה */}
            {PRAYER_SHARE_WP_IDS.includes(post.wp_id) && (
              <div style={{ marginTop: 52 }}>
                <PopularPrayersBox excludeWpId={post.wp_id} title="🙏 תפילות פופולריות נוספות" />
              </div>
            )}

            {/* 🎓 משפך «שיעור 1» נודד — וריאנט רנדומלי-דביק פר-גולש, נמדד ב-visitor_events + subscribers.
                מדלג אוטומטית על פוסטים שכבר מכילים משפך מוטמע בתוכן (sgl-form). */}
            <LessonFunnel slug={post.slug || slug} content={content} />

            {/* מעקב בתוך הפוסט — הרשמה לעדכונים לפי קטגוריה/כותב (עץ אחד: subscribers + notification_prefs) */}
            <PostFollowBox categories={cats} author={author} pc={pc} />

            <SpotimComments postId={post.wp_id} postUrl={`${SITE_URL}/${post.slug || slug}`} />
            {/* ── COMMENTS ── */}
            {comments.length > 0 && (
              <div style={{ marginTop: 64 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                  <RoyalDivider width={48} />
                  <span style={{ color: pc.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 4, textTransform: "uppercase" }}>
                    תגובות ({comments.length})
                  </span>
                  <RoyalDivider width={48} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {comments.map(c => {
                    const isReply = c.parent_wp_id && c.parent_wp_id !== 0;
                    const cDate = c.date
                      ? new Date(c.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '';
                    return (
                      <div key={c.wp_id} style={{
                        marginRight: isReply ? 32 : 0,
                        background: isReply ? "rgba(61,31,92,0.12)" : pc.surface,
                        border: `1px solid ${isReply ? "rgba(107,63,160,0.25)" : pc.border}`,
                        borderRight: `3px solid ${isReply ? pc.royalLight : pc.borderGold}`,
                        borderRadius: 2, padding: "14px 18px 16px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                          <span style={{ color: pc.goldLight, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>
                            {isReply && <span style={{ color: pc.royalLight, marginLeft: 6 }}>↩</span>}
                            {c.author_name}
                          </span>
                          <span style={{ color: pc.muted, fontFamily: F.heading, fontSize: 10, letterSpacing: 1 }}>{cDate}</span>
                        </div>
                        <div
                          style={{ color: pc.sub, fontSize: 14, lineHeight: 1.85, fontFamily: F.body }}
                          dangerouslySetInnerHTML={{ __html: c.content }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===== GEMATRIA PHRASE PAGE =====

function GematriaPhrasePage({ onNav }) {
  const { phrase } = useParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(phrase);
  const [item, setItem] = useState(null);

  useEffect(() => {
    getGematriaByPhrases([decoded]).then(rows => setItem(rows[0] ?? null)).catch(() => {});
  }, [decoded]);

  useEffect(() => {
    applySeo({ title: `גימטריה: ${decoded}`, description: `ערך הגימטריה ופוסטים הקשורים ל"${decoded}" באתר SOD1820.`, path: "/number/" + phrase });
  }, [decoded, phrase]);

  return (
    <div style={{ direction: "rtl", maxWidth: 780, margin: "0 auto", padding: "52px 24px 96px" }}>
      <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: F.heading, fontSize: 10, marginBottom: 40, letterSpacing: 4, textTransform: "uppercase" }}>← חזרה</button>
      <h1 style={{ color: "#c4b5fd", fontFamily: F.royal, fontSize: "clamp(22px, 4vw, 38px)", marginBottom: 16 }}>{decoded}</h1>
      {item && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 48 }}>
          {[["רגיל", item.ragil]].filter(([,v]) => v).map(([label, val]) => (
            <span key={label} style={{ background: "#1a0a2e", border: "1px solid #7c3aed", color: "#c4b5fd", fontSize: 12, padding: "4px 14px", fontFamily: F.heading, borderRadius: 1 }}>{label}: {val}</span>
          ))}
        </div>
      )}
      <BlogPage onNav={onNav} filterTag={decoded} />
    </div>
  );
}

// ===== CATEGORY PAGE =====

function CategoryPage({ onNav }) {
  const { slug } = useParams();
  const categoryName = fromSlug(slug);
  useEffect(() => {
    applySeo({ title: `קטגוריה: ${categoryName}`, description: `כל הפוסטים בקטגוריה "${categoryName}" באתר SOD1820.`, path: "/category/" + slug });
  }, [categoryName, slug]);
  return <BlogPage onNav={onNav} filterCategory={categoryName} />;
}

// ===== TAG PAGE =====

function TagPage({ onNav }) {
  const { slug } = useParams();
  const tagName = fromSlug(slug);
  useEffect(() => {
    applySeo({ title: `תגית: ${tagName}`, description: `כל הפוסטים בתגית "${tagName}" באתר SOD1820.`, path: "/tag/" + slug });
  }, [tagName, slug]);
  return <BlogPage onNav={onNav} filterTag={tagName} />;
}

// ===== SPACE BACKGROUND =====
const _genStars = (n, spread) =>
  Array.from({ length: n }, () => {
    const x = Math.floor(Math.random() * spread);
    const y = Math.floor(Math.random() * spread);
    const o = (0.12 + Math.random() * 0.65).toFixed(2);
    return `${x}px ${y}px 0 0 rgba(255,255,255,${o})`;
  }).join(',');
const _genStars2 = (n, spread) =>
  Array.from({ length: n }, () => {
    const x = Math.floor(Math.random() * spread);
    const y = Math.floor(Math.random() * spread);
    const o = (0.25 + Math.random() * 0.5).toFixed(2);
    return `${x}px ${y}px 0 1px rgba(255,255,255,${o})`;
  }).join(',');
const STARS_SM = _genStars(180, 2400);
const STARS_LG = _genStars2(35, 2400);

function SpaceBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* city night photo — LA skyline */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1920&q=80)",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        opacity: 0.28,
      }} />
      {/* strong center mask — keeps text readable, city glows at edges */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 70% 80% at 50% 48%, rgba(7,5,14,0.97) 0%, rgba(7,5,14,0.85) 40%, rgba(7,5,14,0.45) 68%, rgba(7,5,14,0.08) 100%)",
      }} />
      {/* crimson glow top + royal purple bottom — from new palette */}
      <div style={{
        position: "absolute", inset: 0,
        background: [
          "radial-gradient(ellipse at 50% -10%, rgba(122,19,32,0.30) 0%, transparent 55%)",
          "radial-gradient(ellipse at 50% 110%, rgba(61,31,92,0.25) 0%, transparent 50%)",
          "radial-gradient(ellipse at 15% 25%, rgba(80,30,150,0.14) 0%, transparent 48%)",
          "radial-gradient(ellipse at 85% 70%, rgba(122,19,32,0.12) 0%, transparent 44%)",
        ].join(','),
      }} />
      {/* subtle stars over the city */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 1, height: 1, boxShadow: STARS_SM, opacity: 0.35 }} />
    </div>
  );
}

// ===== MAIN APP =====

// ===== ייצוא רכיבים לשימוש חוזר בארכיטקטורה החדשה =====
// מודול מעבר: הרכיבים הקיימים שנשמרים כפי שהם עד לפיצול מלא לקבצים נפרדים.
export {
  // עמודים שמחוברים ל-routes
  BlogPage, PostPageBySlug, CategoryPage, TagPage, GematriaPhrasePage,
  AboutPage, LoginPage, ContactPage, ChatPage, SpotimChatPage,
  AdminPage, TrafficDashboardPage, NumbersReportPage, ThemePreviewPage,
  // מקטעים/וידג'טים חיים (בשימוש ב-BlogPage)
  EventsSidebar, PostCard, PostSkeleton, WPArticleCard,
  // עזרים/קבועים
  STATIC_NAV_ITEMS, mapUrlToRoute,
  PAGE_CONTENT_DEFAULTS, PAGE_CONTENT_STORE_KEY,
};
