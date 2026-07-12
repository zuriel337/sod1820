import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { F, LOGO_URL, calcGem } from "../../theme.js";
import { NAV } from "../../routes.jsx";
import { GoldButton } from "../ui.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { Avatar } from "../../pages/AuthPage.jsx";
import { useUserCenter } from "../../lib/userCenter/UserCenterContext.jsx";
import { searchPosts } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";
import { openNumberDrawer } from "../../lib/numberDrawer.js";
import { useThemeMode, toggleTheme } from "../../lib/themeMode.js";
import { chromeColors } from "../../lib/chromeTheme.js";
import { isToolReady } from "../../lib/hub/ready.js";
import { isStandalone, canInstall, promptInstall, isIOS } from "../../lib/install.js";
import { useStream, STREAMS } from "../../lib/stream.js";
import StreamSwitch from "../StreamSwitch.jsx";

// 🔍 סמל מותאם לדילוגי-אותיות. המשמעות: שלוש אותיות עבריות (א־ב־ג = הטקסט) + קו-דילוג
// אלכסוני דק ביניהן (הדילוג) + זכוכית-מגדלת קטנה (מחקר). האותיות ב-currentColor → מקבלות
// אוטומטית את צבע הטקסט (זהב/לבן) כך שיש «גרסה בהירה וכהה» בלי כפילות. אקסנט חם אחד לצבעוניות.
function DilugimIcon({ size = 24, accent = "#e0a53a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ display: "block" }}>
      {/* רקע-ריבוע בגוון מגילה — נוכח ומגובש (כמו ריבועי האימוג'י), עם מסגרת-זהב */}
      <rect x="2" y="2" width="28" height="28" rx="7.5" fill="#6a4a24" stroke="rgba(212,175,55,0.55)" strokeWidth="1.3" />
      {/* קו-הדילוג — האלכסון הדק שמחבר את שלוש האותיות */}
      <path d="M23 10 L11 25" stroke={accent} strokeWidth="1.7" strokeLinecap="round" opacity="0.7" />
      {/* שלוש אותיות עבריות = הטקסט (currentColor) */}
      <g fill="currentColor" fontFamily="'Heebo', sans-serif" fontWeight="800" fontSize="11.5">
        <text x="24" y="14" textAnchor="middle">א</text>
        <text x="17.5" y="21" textAnchor="middle">ב</text>
        <text x="11" y="28" textAnchor="middle">ג</text>
      </g>
      {/* זכוכית-מגדלת קטנה = מחקר */}
      <circle cx="8" cy="8.5" r="4" stroke={accent} strokeWidth="1.7" fill="none" />
      <line x1="10.9" y1="11.4" x2="13.5" y2="14" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

// 🧭 השורה הראשית = מוצרים בלבד (כלל צוריאל: «דף שראוי לחיפוש-גוגל משלו»).
// דף המספר · דילוגי אותיות · בית המדרש — כל אחד מוצר עצמאי. «היכל» = הכניסה לכלים,
// קהילה = השער החברתי. השאר (תוכן, ציר, זרם, שידורים, גלריות, עץ) → «עוד ▾».
// אופציה א׳: «היכל» = העוגן הזהוב, ושלושת הכלים שלו יושבים לצידו כיחידה אחת.
// הלוגו מוביל הביתה — לכן «בית» אינו קישור נפרד. סדר (RTL): היכל ▸ דף המספר · בית המדרש · דילוגים.
const productItems = [
  { label: "דף המספר", emoji: "🔢", to: "/number" },
  { label: "בית המדרש", emoji: "📖", to: "/beit-midrash" },
  { label: "דילוגי אותיות", emoji: "🔠", to: "/code", locked: true, icon: "dilugim" },
];
// כל השאר (תוכן · קהילה · ציר · זרם · שידורים · גלריות · עץ) חי בתפריט-הרשת ⊞ — מקום אחד, לא סרגל שני.
const GRID_EXCLUDE = ["/", "/number", "/code", "/beit-midrash"];
const MORE_HIDE = ["/start", "/members", "/lab"];
const moreItems = [
  ...NAV.filter(i => !GRID_EXCLUDE.includes(i.to) && !MORE_HIDE.includes(i.to)),
  { label: "צור קשר", emoji: "✉️", to: "/contact" },
];

// תפריט מובייל בסגנון-אפליקציה — אריחי המדורים הראשיים (פעילים) + "בקרוב" מעומעם
// הסמלים זהים לאלה שבתוך החלונות עצמם (מחשבון=🧮 כמו בבית המדרש · מנוע המספרים=🔢 כמו בדף המספר)
// מסודר לפי קבוצות: מחקר (מחשבון · מספרים · היכל) → תוכן (פוסטים · גלריות · ציר) → קהילה → ניווט.
// מקור-אמת יחיד לאריחי התפריט (מובייל + פאנל-דסקטופ) — סמלים ונוסחים מתואמים בכל המקומות.
// fav = שלושת הפייבוריטים (מודגשים). locked = בבנייה + מנעול, לא-לחיץ בכל המקומות.
const MOBILE_TILES = [
  { e: "🚀", l: "כאן מתחילים", to: "/start" },
  { e: "🔢", l: "דף המספר", to: "/number", fav: true },
  { e: "🔠", l: "דילוגי אותיות", to: "/code", fav: true, locked: true, icon: "dilugim" },
  { e: "📖", l: "בית המדרש", to: "/beit-midrash", fav: true },
  { e: "🏛️", l: "ההיכל", to: "/research" },
  { e: "💬", l: "הצ'אט", to: "/community/chat" },
  { e: "📜", l: "פוסטים", to: "/post" },
  { e: "📸", l: "גלריות", to: "/archive" },
  { e: "📡", l: "מרכז השידורים", to: "/broadcasts" },
  { e: "🗺️", l: "מרכז הניווט", to: "/map" },
  { e: "✉️", l: "צור קשר", to: "/contact" },
];
const MOBILE_SOON = [
  { e: "🌳", l: "עץ ההתכנסויות", to: "/numbers" },
];

// יעדים ל"הפתיע אותי" — דפי ישות בלבד (מספרים וביטויים משמעותיים)
const SURPRISE_NUMS = [
  1820, 1237, 376, 358, 86, 26, 613, 541, 65, 72, 137, 314, 749, 631, 776,
  "משיח", "גאולה", "ישראל", "אהבה", "אמת", "תורה", "חכמה", "בינה", "דעת", "אור",
];

function isActive(pathname, to) {
  if (to === "/") return pathname === "/";
  const base = to.split("?")[0];   // "/archive?tab=reality" נחשב פעיל בכל /archive
  return pathname === base || pathname.startsWith(base + "/");
}

const postTitle = p => stripHtml(typeof p.title === "string" ? p.title : (p.title?.rendered || ""));

// ── חיפוש אוניברסלי (פוסטים + גימטריה + קיצורי דרך) ──
function UniversalSearch({ onDone, full }) {
  const cc = chromeColors(useThemeMode());
  const nav = useNavigate();
  const ref = useRef(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const v = q.trim();
    if (v.length < 2) { setPosts([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try { const r = await searchPosts(v, { limit: 5 }); if (alive) setPosts(r || []); }
      catch { if (alive) setPosts([]); }
    }, 280);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function close() { setQ(""); setPosts([]); setOpen(false); onDone?.(); }
  function go(to) { nav(to); close(); }
  // חיפוש מספר/מילה → דף הישות המלא (לא הסרגל הצף).
  function submit(e) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    // 💬 "צאט"/"צ'אט"/chat → דף הצ'אט (לא חיפוש גימטריה)
    if (v.replace(/['"׳״\s]/g, "").includes("צאט") || /chat/i.test(v)) return go("/community/chat");
    go("/number/" + encodeURIComponent(v));
  }

  const v = q.trim();
  const gem = /[א-ת]/.test(v) ? calcGem(v) : (/^\d+$/.test(v) ? +v : null);
  // 💬 חיפוש "צאט"/"צ'אט"/chat → קיצור דרך לצ'אט האתר
  const isChatQuery = v.replace(/['"׳״\s]/g, "").includes("צאט") || /chat/i.test(v);
  const cats = [
    { e: "🌊", l: "זרם המציאות", to: "/archive?tab=reality" },
  { e: "📡", l: "מרכז השידורים", to: "/broadcasts" },
    { e: "🌳", l: "עץ ההתכנסויות", to: "/numbers" },
    { e: "🏛️", l: "היכל הגילוי", to: "/research" },
    { e: "📸", l: "גלריות", to: "/archive" },
  ];

  return (
    <div ref={ref} style={{ position: "relative", flex: full ? 1 : undefined, minWidth: 0, width: full ? "100%" : undefined }}>
      <form onSubmit={submit} className={`nav-gem${full ? " nav-gem-full" : ""}`} style={{ width: full ? "100%" : undefined }}>
        <span className="nav-gem-ico" aria-hidden>🔎</span>
        <input value={q} onFocus={() => setOpen(true)} onChange={e => { setQ(e.target.value); setOpen(true); }}
          placeholder="מה תרצו לגלות היום?" aria-label="חיפוש באתר" />
        <button type="submit" aria-label="חפש">←</button>
      </form>

      {open && v.length >= 2 && (
        <div className="nav-gem-drop">
          {isChatQuery && (
            <button className="nav-drop-row" onClick={() => go("/community/chat")}>
              <span>💬</span><span>עבור ל<b style={{ color: cc.goldBright }}>צ'אט האתר</b> ←</span>
            </button>
          )}
          {gem != null && (
            <button className="nav-drop-row" onClick={() => go("/number/" + encodeURIComponent(v))}>
              <span>🔢</span><span>גימטריה של «{v}» = <b style={{ color: cc.goldBright }}>{gem}</b> · גלה הכל ←</span>
            </button>
          )}
          {posts.map(p => (
            <button key={p.slug || p.id} className="nav-drop-row" onClick={() => go(`/${p.slug}`)}>
              <span>📜</span><span className="nav-drop-txt">{postTitle(p)}</span>
            </button>
          ))}
          {!posts.length && v.length >= 2 && (
            <div className="nav-drop-empty">אין פוסט תואם — נסו חיפוש גימטריה ↑</div>
          )}
          <div className="nav-drop-div" />
          <div className="nav-drop-cats">
            {cats.map(c => (
              <button key={c.to} className="nav-drop-cat" onClick={() => go(c.to)}>{c.e} {c.l}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SurpriseButton({ onDone }) {
  const nav = useNavigate();
  const [spin, setSpin] = useState(false);
  function surprise() {
    if (spin) return;
    setSpin(true);
    // גלגל מסתובב קצר ואז חשיפה — מקפיץ תמיד לדף ישות (מספר/ביטוי), לא לפוסטים
    setTimeout(() => {
      const t = SURPRISE_NUMS[Math.floor(Math.random() * SURPRISE_NUMS.length)];
      nav(`/number/${encodeURIComponent(t)}`);
      setSpin(false);
      onDone?.();
    }, 520);
  }
  // 🎲 גלגול attention רק ב-5 השניות הראשונות (שהמבקר ישים לב), ואז עוצר. הלחיצה תמיד פעילה.
  useEffect(() => {
    const timers = [500, 2200, 3900].map(t =>
      setTimeout(() => { setSpin(true); setTimeout(() => setSpin(false), 800); }, t));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <button onClick={surprise} className={`nav-dice${spin ? " spin" : ""}`} title="הפתיעו אותי" aria-label="הפתיעו אותי">🎲</button>
  );
}

function NavLinkItem({ item, pathname, onNavigate }) {
  const cc = chromeColors(useThemeMode());
  const [open, setOpen] = useState(false);
  const active = isActive(pathname, item.to);
  const hasChildren = item.children?.length;
  const linkStyle = {
    background: active ? cc.activeBg : "transparent",
    border: active ? `1px solid ${cc.borderGold}` : "1px solid transparent",
    cursor: "pointer", color: active ? cc.goldBright : cc.muted,
    fontFamily: F.royal, fontSize: 15, fontWeight: 700, letterSpacing: 0.3,
    padding: "7px 12px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap",
    display: "inline-flex", alignItems: "center", gap: 5,
    boxShadow: active ? "0 0 14px rgba(212,175,55,0.15)" : "none",
    transition: "color 0.2s, background 0.2s, border-color 0.2s",
  };
  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => hasChildren && setOpen(true)} onMouseLeave={() => hasChildren && setOpen(false)}>
      <Link to={item.to} className="nav-link" style={linkStyle} onClick={onNavigate}>
        <span>{item.emoji} {item.label}</span>
        {hasChildren && <span style={{ fontSize: 9, opacity: 0.8 }}>▾</span>}
      </Link>
      {hasChildren && open && <Dropdown items={item.children} onNavigate={onNavigate} />}
    </div>
  );
}

// פריט-סרגל נעול (בבנייה) — לא-לחיץ, עם מנעול + תגית «בבנייה». לדילוגי-אותיות בשורת המוצרים.
function LockedNavItem({ item }) {
  const cc = chromeColors(useThemeMode());
  return (
    <span aria-disabled="true" title="בבנייה — בקרוב" style={{
      display: "inline-flex", alignItems: "center", gap: 5, cursor: "not-allowed",
      color: cc.muted, opacity: 0.72, fontFamily: F.royal, fontSize: 15, fontWeight: 700,
      padding: "7px 10px", borderRadius: 8, whiteSpace: "nowrap",
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        {item.icon === "dilugim" ? <DilugimIcon size={16} accent={cc.goldLight} /> : <span>{item.emoji}</span>}
        <span>{item.label}</span>
      </span>
      <span aria-hidden style={{ fontSize: 11 }}>🔒</span>
      <span style={{ fontSize: 8.5, fontWeight: 900, background: "#3a2400", color: "#ffd86b", borderRadius: 4, padding: "2px 5px" }}>בבנייה</span>
    </span>
  );
}

function MoreMenu({ items, pathname, onNavigate, grid }) {
  const cc = chromeColors(useThemeMode());
  const [open, setOpen] = useState(false);
  const anyActive = items.some(i => isActive(pathname, i.to));
  return (
    <div style={{ position: "relative" }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="nav-link" title="עוד — כל השאר" aria-label="עוד — כל השאר" style={{
        background: anyActive ? cc.activeBg : "transparent",
        border: anyActive ? `1px solid ${cc.borderGold}` : "1px solid transparent",
        cursor: "pointer", color: anyActive ? cc.goldBright : cc.muted,
        fontFamily: F.royal, fontSize: 15, fontWeight: 700, letterSpacing: 0.3,
        padding: grid ? "8px 10px" : "7px 12px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: grid ? 6 : 5,
        transition: "color 0.2s, background 0.2s",
      }}>
        {grid ? <GridIcon /> : "⋯ עוד"} <span style={{ fontSize: 9, opacity: 0.8 }}>▾</span>
      </button>
      {open && <Dropdown items={items} onNavigate={onNavigate} />}
    </div>
  );
}

// אופציה ב׳ — כפתור «תפריט» שפותח חלון-אריחים ויזואלי (אותה שפה של אריחי-המובייל).
// מחזיק את «כל השאר» (קהילה · זרם · שידורים · גלריות · ציר · עץ · פוסטים · צור קשר) במקום אחד.
function MenuPanel({ items, pathname, cc }) {
  const mode = useThemeMode();
  const light = mode === "light";
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  // אופציה 3: חלון-התפריט בהיר ביום (הסרגל עצמו נשאר «כריכה» כהה). בלילה — צבעי ה-chrome הכהים.
  const pc = light ? {
    panelBg: "#fbf8f1", panelBorder: "rgba(160,120,30,0.40)", shadow: "0 20px 56px rgba(80,60,10,0.22)",
    heading: "#8a6a1a", tileBg: "#ffffff", tileBorder: "rgba(120,90,20,0.20)", tileHoverBg: "#f4ecda",
    tileText: "#2a2013", tileActive: "#c9a84a", favBg: "#fdf6e3", favBorder: "#d8b24a",
    bannerBg: "rgba(201,168,74,0.16)", bannerBorder: "rgba(160,120,30,0.45)", bannerHover: "#c9a84a",
    bannerTitle: "#6d4e0b", bannerSub: "#6b5f45", arrow: "#8a6a1a",
  } : {
    panelBg: "#0c0803", panelBorder: cc.borderGold, shadow: "0 20px 56px rgba(0,0,0,0.62)",
    heading: cc.muted, tileBg: "#1b1409", tileBorder: cc.border, tileHoverBg: "#26190c",
    tileText: cc.goldLight, tileActive: cc.borderGold, favBg: "#20180a", favBorder: "rgba(212,175,55,0.55)",
    bannerBg: cc.activeBg, bannerBorder: cc.borderGold, bannerHover: cc.gold,
    bannerTitle: cc.goldBright, bannerSub: cc.muted, arrow: cc.goldLight,
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="nav-link" onClick={() => setOpen(o => !o)} aria-label="תפריט" aria-expanded={open} style={{
        background: open ? cc.activeBg : "transparent",
        border: `1px solid ${open ? cc.borderGold : cc.border}`,
        cursor: "pointer", color: open ? cc.goldBright : cc.goldLight,
        fontFamily: F.royal, fontSize: 14.5, fontWeight: 700, letterSpacing: 0.3,
        padding: "8px 14px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 8,
        transition: "color 0.2s, background 0.2s, border-color 0.2s",
      }}>
        <GridIcon /> תפריט <span style={{ fontSize: 9, opacity: 0.8 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", left: 0, width: "min(720px, 88vw)",
          background: pc.panelBg, backdropFilter: light ? "none" : "blur(16px)",
          border: `1px solid ${pc.panelBorder}`, borderRadius: 18, padding: 14, zIndex: 250,
          boxShadow: pc.shadow,
        }}>
          {/* «כאן מתחילים» — באנר גדול נפרד בראש התפריט, לפני שאר המדורים */}
          <Link to="/start" onClick={() => setOpen(false)} style={{
            display: "flex", alignItems: "center", gap: 13, textDecoration: "none",
            background: pc.bannerBg, border: `1px solid ${pc.bannerBorder}`, borderRadius: 14,
            padding: "14px 16px", marginBottom: 14, transition: "border-color 0.2s, transform 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = pc.bannerHover; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = pc.bannerBorder; e.currentTarget.style.transform = "none"; }}>
            <span style={{ fontSize: 30, lineHeight: 1 }}>🚀</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: pc.bannerTitle, fontFamily: F.royal, fontSize: 18, fontWeight: 800 }}>כאן מתחילים</span>
              <span style={{ color: pc.bannerSub, fontFamily: F.body, fontSize: 12.5 }}>המדריך בשתי דקות — מה זה ואיך מנווטים</span>
            </span>
            <span style={{ marginInlineStart: "auto", color: pc.arrow, fontSize: 18 }}>←</span>
          </Link>
          <div style={{ color: pc.heading, fontFamily: F.heading, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: "2px 6px 12px" }}>כל המדורים</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
            {items.map(it => {
              const active = isActive(pathname, it.to);
              return (
                <Link key={it.to} to={it.to} onClick={() => setOpen(false)} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7,
                  background: pc.tileBg, border: `1px solid ${active ? pc.tileActive : pc.tileBorder}`,
                  borderRadius: 14, padding: "16px 6px", textDecoration: "none",
                  transition: "transform 0.15s, border-color 0.15s, background 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = pc.tileActive; e.currentTarget.style.background = pc.tileHoverBg; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = active ? pc.tileActive : pc.tileBorder; e.currentTarget.style.background = pc.tileBg; }}>
                  <span style={{ fontSize: 26, lineHeight: 1 }}>{it.emoji}</span>
                  <span style={{ color: pc.tileText, fontFamily: F.royal, fontSize: 13.5, fontWeight: 700, textAlign: "center" }}>{it.label}</span>
                </Link>
              );
            })}
            {!isStandalone() && (
              <button onClick={async () => { setOpen(false); if (canInstall()) { await promptInstall(); } else if (isIOS()) alert("להתקנה באייפון: לחצו על כפתור השיתוף (□↑) בספארי ואז «הוסף למסך הבית»"); else alert("להתקנה: פתחו את תפריט הדפדפן (⋮) ובחרו «הוסף למסך הבית / התקן אפליקציה»"); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7,
                  background: pc.tileBg, border: `1px solid ${pc.tileBorder}`, borderRadius: 14, padding: "16px 6px", cursor: "pointer",
                  transition: "transform 0.15s, border-color 0.15s, background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = pc.tileActive; e.currentTarget.style.background = pc.tileHoverBg; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = pc.tileBorder; e.currentTarget.style.background = pc.tileBg; }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>📲</span>
                <span style={{ color: pc.tileText, fontFamily: F.royal, fontSize: 13.5, fontWeight: 700, textAlign: "center" }}>הורדת האפליקציה</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Dropdown({ items, onNavigate }) {
  const cc = chromeColors(useThemeMode());
  return (
    <div style={{
      position: "absolute", top: "100%", right: 0, minWidth: 200,
      background: cc.dropBg, backdropFilter: "blur(14px)",
      border: `1px solid ${cc.borderGold}`, borderRadius: 8, padding: 8, zIndex: 200,
      boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
    }}>
      {items.map(c => (
        <Link key={c.to} to={c.to} onClick={onNavigate} style={{
          display: "block", color: cc.goldDim, textDecoration: "none",
          fontFamily: F.royal, fontSize: 15, padding: "10px 13px", borderRadius: 5,
          whiteSpace: "nowrap", transition: "background 0.18s, color 0.18s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = cc.surface; e.currentTarget.style.color = cc.goldBright; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = cc.goldDim; }}
        >{c.emoji ? `${c.emoji} ` : ""}{c.label}</Link>
      ))}
    </div>
  );
}

// תפריט המשתמש — chip עם אווטר, ובריחוף נפתח תפריט: פרופיל + ניהול עדכונים.
function UserMenu({ user, profile, cc }) {
  const [open, setOpen] = useState(false);
  const { isAdmin } = useAuth();
  const { open: openCenter } = useUserCenter();
  const item = {
    display: "block", color: cc.goldDim, textDecoration: "none",
    fontFamily: F.royal, fontSize: 14.5, padding: "10px 13px", borderRadius: 5,
    whiteSpace: "nowrap", transition: "background 0.18s, color 0.18s",
  };
  const hov = e => { e.currentTarget.style.background = cc.surface; e.currentTarget.style.color = cc.goldBright; };
  const out = e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = cc.goldDim; };
  return (
    <div style={{ position: "relative" }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button onClick={() => openCenter()} title="מרכז השליטה שלי" style={{
        display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", background: "transparent",
        padding: "3px 6px 3px 12px", border: `1px solid ${open ? cc.borderGold : cc.border}`, borderRadius: 22,
        transition: "border-color .2s",
      }}>
        <span style={{ color: cc.goldLight, fontFamily: F.royal, fontSize: 12.5, fontWeight: 700, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {profile?.display_name || profile?.username || "פרופיל"}
        </span>
        <Avatar profile={profile} user={user} size={28} onDark />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, minWidth: 190,
          background: cc.dropBg, backdropFilter: "blur(14px)",
          border: `1px solid ${cc.borderGold}`, borderRadius: 8, padding: 8, zIndex: 200,
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}>
          <button onClick={() => openCenter()} style={{ ...item, width: "100%", textAlign: "right", background: "transparent", border: "none", cursor: "pointer" }} onMouseEnter={hov} onMouseLeave={out}>👤 מרכז השליטה שלי</button>
          {isAdmin && (
            <Link to="/admin" style={{ ...item, color: cc.goldBright, borderTop: `1px solid ${cc.border}`, marginTop: 4, paddingTop: 11 }} onMouseEnter={hov} onMouseLeave={out}>👑 דף ניהול</Link>
          )}
          {isAdmin && (
            <Link to="/research" style={{ ...item, color: cc.goldBright }} onMouseEnter={hov} onMouseLeave={out}>🔭 היכל הגילוי</Link>
          )}
        </div>
      )}
    </div>
  );
}

// 🏛️ תפריט-מגה אופקי של «היכל הגילוי» — נפתח בריחוף, מציג את כלי המעבדה בשורה (מאוזן, לא מאונך)
const LAB_MENU = [
  { e: "🧮", l: "מחשבון גימטריה", to: "/research?tool=gematria" },
  { e: "🔢", l: "דף המספר", to: "/research?tool=number" },
  { e: "📖", l: "בית המדרש", to: "/research?tool=midrash" },
  { e: "📜", l: "חיפוש בפסוקים", to: "/research?tool=verse" },
  { e: "🔀", l: "השוואת מילים", to: "/research?tool=compare" },
  { e: "🔠", l: "ראשי / אמצעי / סופי תיבות", to: "/research?tool=notarikon" },
  { e: "📊", l: "ניתוח קובץ", to: "/research?tool=import" },
  { e: "🔡", l: "דילוגי אותיות", to: "/research?tool=els" },
  { e: "🧭", l: "מסע חיפוש", to: "/research?tool=journey" },
];
// מזהה-כלי מתוך ה-to (…?tool=xxx) — לאיחוד הנעילה מול isToolReady (מקור-אמת אחד).
const labToolId = to => (to.match(/tool=([a-z]+)/) || [])[1] || null;
function LabMenu() {
  const [open, setOpen] = useState(false);
  const { isAdmin } = useAuth();
  const cc = chromeColors(useThemeMode());
  // 🔓 נעילה מאוחדת: כלי פתוח אם isToolReady (READY_TOOLS) — מקור-אמת אחד עם המעבדה. אדמין רואה הכל.
  const isLabOpen = it => { const id = labToolId(it.to); return id ? isToolReady(id, isAdmin) : true; };
  return (
    <div className="sod-nav-desktop" style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link to="/research" onClick={() => setOpen(false)} aria-label="ההיכל" style={{
        display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", textDecoration: "none",
        background: cc.activeBg, color: cc.goldBright,
        border: "1.5px solid #c9a84a",
        fontFamily: F.heading, fontWeight: 800, fontSize: 14.5, letterSpacing: 0.3,
        padding: "8px 18px", borderRadius: 12, whiteSpace: "nowrap",
        boxShadow: "0 2px 12px rgba(201,168,74,0.20)", marginInlineEnd: 4,
      }}>🏛️ ההיכל
        <span style={{ fontSize: 9, opacity: 0.8 }}>▾</span></Link>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, minWidth: 240, background: cc.dropBg, backdropFilter: "blur(14px)",
          border: `1px solid ${cc.borderGold}`, borderRadius: 8, padding: 8, zIndex: 200, boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}>
          {LAB_MENU.map(it => isLabOpen(it) ? (
            <Link key={it.to} to={it.to} onClick={() => setOpen(false)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, color: cc.goldBright, textDecoration: "none",
              fontFamily: F.royal, fontSize: 15, padding: "10px 13px", borderRadius: 5, whiteSpace: "nowrap",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = cc.surface; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
              <span>{it.e} {it.l}</span>
              {isAdmin && it.to !== "/research?tool=midrash" && <span style={{ fontSize: 10, color: cc.muted }}>🔑</span>}
            </Link>
          ) : (
            <div key={it.to} aria-disabled="true" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, color: cc.muted,
              fontFamily: F.royal, fontSize: 15, padding: "10px 13px", borderRadius: 5, whiteSpace: "nowrap", opacity: 0.65, cursor: "not-allowed",
            }}>
              <span>{it.e} {it.l}</span>
              <span style={{ fontSize: 9.5, fontWeight: 800, background: "#3a2400", color: "#ffd86b", borderRadius: 4, padding: "2px 6px" }}>🔒 בבנייה</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Brand() {
  const cc = chromeColors(useThemeMode());
  const stream = useStream();
  const tagline = stream === "reality" ? STREAMS.reality.label : "כי לה' המלוכה";
  return (
    <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <div className="nav-logo-wrap" style={{ position: "relative", display: "inline-flex" }}>
        <img src={LOGO_URL} alt="SOD1820" className="logo-animated" style={{ height: 36, width: "auto" }} />
        <span className="nav-scan" aria-hidden />
        {/* ✨ ניצוץ-AI (החלטת צוריאל 7.7.2026) — במקום אותיות "AI": השפה הוויזואלית של בינה, בלי מילים */}
        <span aria-hidden style={{
          position: "absolute", top: -7, right: -9,
          fontSize: 13, lineHeight: 1,
          filter: "drop-shadow(0 0 4px rgba(212,175,55,0.85))",
          animation: "sodSparkle 12s ease-in-out infinite",
        }}>✨</span>
        {/* נשימה אחת כל 12ש׳ (צוריאל): הפעימה עצמה ~2.4ש׳ (10%=1.2ש׳ שיא, 20%=2.4ש׳ סיום), ואז מנוחה */}
        <style>{`@keyframes sodSparkle{0%{opacity:.72;transform:scale(1)}10%{opacity:1;transform:scale(1.2)}20%,100%{opacity:.72;transform:scale(1)}}`}</style>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ color: cc.goldBright, fontFamily: F.royal, fontSize: 14, fontWeight: 400, lineHeight: 1.25 }}>
          {tagline}
        </div>
        <div style={{ color: cc.goldDim, fontFamily: F.heading, fontSize: 8.5, letterSpacing: 3, textTransform: "uppercase" }}>
          SOD1820
        </div>
      </div>
    </Link>
  );
}

// 🌗 מתג תמה גלובלי (יום/לילה) — בנאבבר, גלוי בכל מסך
function NavThemeToggle() {
  const mode = useThemeMode();
  return (
    <button onClick={toggleTheme} className="nav-theme" title="מצב יום / לילה" aria-label="החלפת מצב יום/לילה">
      {mode === "light" ? "🌙" : "☀️"}
    </button>
  );
}

// ⊞ אייקון תפריט מתקדם — רשת 3×3 (משיק לסגנון "מנוע"/אפליקציה), מחליף את ההמבורגר
function GridIcon() {
  return (
    <span className="nav-grid" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => <i key={i} />)}
    </span>
  );
}

export default function Navbar() {
  const cc = chromeColors(useThemeMode());
  const { pathname } = useLocation();
  const { user, profile, isAdmin } = useAuth();
  const { open: openCenter } = useUserCenter();
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  useEffect(() => { setDrawer(false); }, [pathname]);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: scrolled ? cc.bgScrolled : cc.bg,
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${scrolled ? cc.borderGold : cc.border}`,
      padding: "0 18px", direction: "rtl", transition: "all 0.35s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 64, maxWidth: 1800, margin: "0 auto" }}>
        <Brand />

        {/* "כאן מתחילים" הוסר זמנית עד סיום הבנייה (לפי בקשת צוריאל) */}

        {/* אופציה א׳ — קבוצת «היכל»: העוגן הזהוב מצביע (▸) על שלושת הכלים שלו, עטופים כיחידה אחת. */}
        <div className="sod-nav-desktop sod-heichal-group">
          <LabMenu />
          <span className="sod-heichal-arrow" aria-hidden>▸</span>
          {productItems.map(item => item.locked
            ? <LockedNavItem key={item.to} item={item} />
            : <NavLinkItem key={item.to} item={item} pathname={pathname} />)}
        </div>

        {/* חיפוש + הפתעה + כניסה + תפריט-רשת ⊞ (כל השאר במקום אחד — לא סרגל שני) */}
        <div className="sod-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 8, marginInlineStart: "auto" }}>
          <UniversalSearch />
          <SurpriseButton />
          {user ? (
            <UserMenu user={user} profile={profile} cc={cc} />
          ) : (
            <GoldButton to="/login" style={{ padding: "8px 16px", fontSize: 12.5, letterSpacing: 1, whiteSpace: "nowrap" }}>
              🔑 כניסה · הרשמה חינם
            </GoldButton>
          )}
          <MenuPanel items={moreItems} pathname={pathname} cc={cc} />
        </div>

        {/* קובייה במובייל — נראית בכניסה, מתגלגלת מדי פעם */}
        <span className="sod-nav-mobile-only" style={{ marginInlineStart: "auto" }}><SurpriseButton /></span>

        {/* מתג עדשת הזרם — מגודר לאדמין בלבד (מוסתר לציבור) */}
        <StreamSwitch />

        {/* מתג תמה גלובלי — גלוי בכל מסך */}
        <NavThemeToggle />

        <button className="sod-nav-burger" aria-label="תפריט" onClick={() => setDrawer(d => !d)} style={{
          display: "none", background: "none", border: `1px solid ${cc.borderGold}`,
          color: cc.goldBright, cursor: "pointer", borderRadius: 8,
          width: 40, height: 40, marginInlineStart: 8, alignItems: "center", justifyContent: "center",
        }}>{drawer ? <span style={{ fontSize: 18 }}>✕</span> : <GridIcon />}</button>
      </div>

      {drawer && (
        <div className="sod-nav-drawer" style={{ borderTop: `1px solid ${cc.border}`, padding: "12px 8px 20px", maxHeight: "80vh", overflowY: "auto" }}>
          {/* הקוביה הוסרה מהמגירה — היא כבר קיימת בסרגל המובייל העליון (בקשת צוריאל) */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 6px 12px" }}>
            <UniversalSearch full onDone={() => setDrawer(false)} />
          </div>
          {user ? (
            <button onClick={() => { setDrawer(false); openCenter(); }} style={{
              display: "flex", alignItems: "center", gap: 10, color: cc.goldBright, textDecoration: "none",
              fontFamily: F.royal, fontSize: 15, fontWeight: 700, padding: "10px 14px", width: "100%",
              background: "none", border: "none", borderBottom: `1px solid ${cc.border}`, marginBottom: 6,
              cursor: "pointer", textAlign: "start",
            }}>
              <Avatar profile={profile} user={user} size={26} onDark />
              {profile?.display_name || profile?.username || "מרכז השליטה שלי"}
            </button>
          ) : (
            <Link to="/login" onClick={() => setDrawer(false)} style={{
              display: "flex", alignItems: "center", gap: 10, color: cc.goldBright, textDecoration: "none",
              fontFamily: F.royal, fontSize: 15, fontWeight: 700, padding: "10px 14px",
              borderBottom: `1px solid ${cc.border}`, marginBottom: 6,
            }}>
              <span style={{ fontSize: 18 }}>🔑</span>
              כניסה · הרשמה חינם
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" onClick={() => setDrawer(false)} style={{
              display: "flex", alignItems: "center", gap: 10, color: cc.goldBright, textDecoration: "none",
              fontFamily: F.royal, fontSize: 14, fontWeight: 700, padding: "8px 14px", borderBottom: `1px solid ${cc.border}`, marginBottom: 6,
            }}>👑 דף ניהול</Link>
          )}
          {isAdmin && (
            <Link to="/research" onClick={() => setDrawer(false)} style={{
              display: "flex", alignItems: "center", gap: 10, color: cc.goldBright, textDecoration: "none",
              fontFamily: F.royal, fontSize: 14, fontWeight: 700, padding: "8px 14px", borderBottom: `1px solid ${cc.border}`, marginBottom: 6,
            }}>🔭 היכל הגילוי</Link>
          )}
          {/* ההיכל = האב; שלוש התוכנות שבמסגרת = הבנים. צ'יפ-אב «🏛️ ההיכל» יושב על קו-המסגרת
              (כמו legend) → הכלים שבתוכה שייכים לו. בלי מילים; המסגרת + הצ'יפ מספרים את ההיררכיה. */}
          <div style={{ position: "relative", margin: "16px 6px 2px", padding: "18px 10px 12px",
            border: `1.5px solid ${cc.borderGold}`, background: "rgba(212,175,55,0.05)", borderRadius: 16 }}>
            <Link to="/research" onClick={() => setDrawer(false)} aria-label="ההיכל" style={{
              position: "absolute", top: -14, insetInlineStart: 16, display: "inline-flex", alignItems: "center", gap: 7,
              background: cc.bgScrolled, border: `1.5px solid ${cc.borderGold}`, borderRadius: 999, padding: "4px 13px 4px 5px", textDecoration: "none" }}>
              <span style={{ width: 23, height: 23, borderRadius: "50%", background: "linear-gradient(135deg,#e6cf86,#c9a84a)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🏛️</span>
              <span style={{ color: cc.goldBright, fontFamily: F.royal, fontSize: 14, fontWeight: 800 }}>ההיכל</span>
            </Link>
            <span style={{ position: "absolute", top: -11, insetInlineEnd: 14, background: cc.bgScrolled, border: `1px solid ${cc.border}`, borderRadius: 999, padding: "3px 9px", color: cc.muted, fontFamily: F.heading, fontSize: 9.5, fontWeight: 700, whiteSpace: "nowrap" }}>💻 חוויה מלאה במחשב</span>
            <div className="sod-tiles" style={{ padding: 0 }}>
              {MOBILE_TILES.filter(t => t.fav).map(t => t.locked ? (
                <div key={t.to} className="sod-tile" aria-disabled="true" title="בבנייה — בקרוב"
                  style={{ borderColor: cc.borderGold, borderStyle: "dashed", background: "rgba(212,175,55,0.07)", opacity: 0.72, cursor: "not-allowed", position: "relative", minHeight: 84 }}>
                  {/* סרט «🔒 בבנייה» צף על קו-המסגרת — לא מוסיף גובה, כך שכל האריחים אחידים */}
                  <span style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: "#3a2400", color: "#ffd86b", fontFamily: F.heading, fontSize: 8, fontWeight: 900, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap", border: `1px solid ${cc.borderGold}` }}>🔒 בבנייה</span>
                  {t.icon === "dilugim"
                    ? <span className="sod-tile-e" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#e6cf86" }}><DilugimIcon size={30} /></span>
                    : <span className="sod-tile-e">{t.e}</span>}
                  <span className="sod-tile-l">{t.l}</span>
                </div>
              ) : (
                <Link key={t.to} to={t.to} onClick={() => setDrawer(false)} className="sod-tile"
                  style={{ borderColor: cc.borderGold, background: "rgba(212,175,55,0.07)", minHeight: 84 }}>
                  <span className="sod-tile-e">{t.e}</span>
                  <span className="sod-tile-l">{t.l}</span>
                </Link>
              ))}
            </div>
          </div>
          {/* כל המדורים */}
          <div style={{ color: cc.muted, fontFamily: F.heading, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, padding: "14px 8px 4px" }}>כל המדורים</div>
          <div className="sod-tiles">
            {MOBILE_TILES.filter(t => !t.fav && t.to !== "/research").map(t => (
              <Link key={t.to} to={t.to} onClick={() => setDrawer(false)} className="sod-tile"
                style={{ borderColor: isActive(pathname, t.to) ? cc.borderGold : cc.border }}>
                <span className="sod-tile-e">{t.e}</span>
                <span className="sod-tile-l">{t.l}</span>
              </Link>
            ))}
            {/* 📲 הורדת האפליקציה — מוסתר כשכבר מותקנת; אנדרואיד=חלון-התקנה, אייפון=הנחיה */}
            {!isStandalone() && (
              <button className="sod-tile" style={{ borderColor: cc.borderGold, background: "none", cursor: "pointer" }}
                onClick={async () => {
                  setDrawer(false);
                  if (canInstall()) { await promptInstall(); }
                  else if (isIOS()) alert("להתקנה באייפון: לחצו על כפתור השיתוף (□↑) בספארי ואז «הוסף למסך הבית»");
                  else alert("להתקנה: פתחו את תפריט הדפדפן (⋮) ובחרו «הוסף למסך הבית / התקן אפליקציה»");
                }}>
                <span className="sod-tile-e">📲</span>
                <span className="sod-tile-l">הורדת האפליקציה</span>
              </button>
            )}
          </div>
          {/* בקרוב — מעומעם */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "12px 6px 4px" }}>
            <span style={{ color: cc.muted, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>בקרוב:</span>
            {MOBILE_SOON.map(s => (
              <span key={s.to} style={{ color: cc.muted, fontFamily: F.royal, fontSize: 13.5, opacity: 0.6 }}>🔒 {s.l}</span>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes nav-logo-scan { 0% { transform: translateY(-130%); } 100% { transform: translateY(330%); } }
        .nav-logo-wrap .nav-scan { position: absolute; inset: 0; overflow: hidden; border-radius: 6px; pointer-events: none; z-index: 1; }
        .nav-logo-wrap .nav-scan::after { content: ""; position: absolute; left: -10%; right: -10%; height: 38%;
          background: linear-gradient(180deg, transparent, rgba(246,226,122,0.6), transparent); animation: nav-logo-scan 2.6s ease-in-out 2 forwards; }

        .nav-link:hover { color: ${cc.goldBright} !important; background: ${cc.hoverBg} !important; }

        /* אופציה א׳ — קבוצת «היכל»: מסגרת עדינה שעוטפת את העוגן + שלושת הכלים כיחידה אחת */
        .sod-heichal-group { align-items: center; gap: 2px;
          border: 1px solid ${cc.border}; border-radius: 14px; padding: 3px 5px 3px 7px;
          background: ${cc.chipBg}; transition: border-color 0.2s, box-shadow 0.2s; }
        .sod-heichal-group:hover { border-color: ${cc.borderGold}; box-shadow: 0 0 16px rgba(212,175,55,0.12); }
        .sod-heichal-arrow { color: ${cc.muted}; font-size: 12px; opacity: 0.6; margin: 0 2px; user-select: none; }
        @media (min-width: 1041px) { .sod-heichal-group { display: flex; } }

        .nav-gem { display: inline-flex; align-items: center; gap: 4px; background: ${cc.chipBg};
          border: 1px solid ${cc.border}; border-radius: 999px; padding: 3px 6px 3px 4px; transition: border-color 0.2s, box-shadow 0.2s; }
        .nav-gem:focus-within { border-color: ${cc.gold}; box-shadow: 0 0 16px rgba(212,175,55,0.18); }
        .nav-gem-ico { font-size: 13px; opacity: 0.85; }
        .nav-gem input { width: 168px; max-width: 40vw; background: none; border: none; outline: none; color: ${cc.goldLight};
          font-family: ${F.body}; font-size: 13px; padding: 5px 2px; min-width: 0; }
        .nav-gem input::placeholder { color: ${cc.muted}; opacity: 0.85; }
        /* מצב מלא (מגירת המובייל) — תיבה רספונסיבית ברוחב מלא */
        .nav-gem.nav-gem-full { width: 100%; box-sizing: border-box; }
        .nav-gem.nav-gem-full input { width: 100%; max-width: none; flex: 1; font-size: 16px; }
        .nav-gem.nav-gem-full input::placeholder { font-size: 14px; }
        .nav-gem button { background: ${cc.gold}; color: ${cc.onGold}; border: none; border-radius: 999px;
          width: 26px; height: 26px; cursor: pointer; font-size: 14px; font-weight: 800; flex-shrink: 0; }
        .nav-gem button:hover { background: ${cc.goldLight}; }

        .nav-gem-drop { position: absolute; top: calc(100% + 6px); right: 0; left: 0; min-width: 280px;
          background: ${cc.dropBg}; backdrop-filter: blur(14px); border: 1px solid ${cc.borderGold};
          border-radius: 12px; padding: 8px; z-index: 250; box-shadow: 0 14px 44px rgba(0,0,0,0.7); }
        .nav-drop-row { display: flex; align-items: center; gap: 9px; width: 100%; text-align: right; cursor: pointer;
          background: none; border: none; color: ${cc.goldDim}; font-family: ${F.body}; font-size: 14.5px;
          padding: 9px 10px; border-radius: 8px; transition: background 0.15s, color 0.15s; }
        .nav-drop-row:hover { background: ${cc.surface}; color: ${cc.goldBright}; }
        .nav-drop-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nav-drop-empty { color: ${cc.muted}; font-family: ${F.body}; font-size: 13px; padding: 8px 10px; }
        .nav-drop-div { height: 1px; background: ${cc.border}; margin: 6px 4px; }
        .nav-drop-cats { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px; }
        .nav-drop-cat { cursor: pointer; background: ${cc.catBg}; border: 1px solid ${cc.border};
          color: ${cc.goldLight}; font-family: ${F.heading}; font-size: 13.5px; font-weight: 700;
          padding: 6px 11px; border-radius: 999px; transition: border-color 0.15s, background 0.15s; }
        .nav-drop-cat:hover { border-color: ${cc.gold}; background: ${cc.surface}; }

        .nav-dice { width: 38px; height: 38px; flex-shrink: 0; cursor: pointer; font-size: 18px;
          background: ${cc.chipBg}; border: 1px solid ${cc.borderGold}; border-radius: 10px; color: ${cc.goldBright};
          transition: transform 0.25s, box-shadow 0.2s, background 0.2s; }
        .nav-dice:hover { transform: rotate(18deg) scale(1.06); box-shadow: 0 0 16px rgba(212,175,55,0.3); background: ${cc.surface}; }
        .nav-dice.spin { animation: nav-dice-spin 0.55s cubic-bezier(.2,.8,.2,1); box-shadow: 0 0 22px rgba(212,175,55,0.45); }
        @keyframes nav-dice-spin { 0% { transform: rotate(0) scale(1); } 60% { transform: rotate(540deg) scale(1.18); } 100% { transform: rotate(720deg) scale(1); } }

        .sod-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; padding: 4px 6px 2px; }
        @media (max-width: 380px) { .sod-tiles { grid-template-columns: repeat(2, 1fr); } }
        .sod-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
          background: ${cc.catBg}; border: 1px solid ${cc.border}; border-radius: 14px; padding: 16px 6px;
          text-decoration: none; transition: transform 0.15s, border-color 0.15s, background 0.15s; }
        .sod-tile:hover, .sod-tile:active { transform: translateY(-2px); border-color: ${cc.gold} !important; background: ${cc.surface}; }
        .sod-tile-e { font-size: 26px; line-height: 1; }
        .sod-tile-l { color: ${cc.goldLight}; font-family: ${F.royal}; font-size: 13.5px; font-weight: 700; text-align: center; }

        .sod-nav-drawer { animation: nav-drawer-in 0.25s ease; }
        @keyframes nav-drawer-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        .nav-theme { width: 38px; height: 38px; flex-shrink: 0; cursor: pointer; font-size: 17px; line-height: 1;
          background: ${cc.chipBg}; border: 1px solid ${cc.borderGold}; border-radius: 10px; color: ${cc.goldBright};
          display: inline-flex; align-items: center; justify-content: center; margin-inline-start: 8px;
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s; }
        .nav-theme:hover { transform: scale(1.08) rotate(-8deg); box-shadow: 0 0 16px rgba(212,175,55,0.3); background: ${cc.surface}; }

        .nav-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; width: 18px; height: 18px; }
        .nav-grid i { width: 4px; height: 4px; border-radius: 50%; background: ${cc.goldBright}; display: block;
          transition: transform 0.2s ease, opacity 0.2s ease; }
        .sod-nav-burger:hover .nav-grid i { transform: scale(1.25); opacity: 0.92; }

        .sod-nav-mobile-only { display: none; }
        @media (max-width: 1040px) {
          .sod-nav-desktop { display: none !important; }
          .sod-nav-burger { display: inline-flex !important; align-items: center; justify-content: center; }
          .sod-nav-mobile-only { display: inline-flex !important; align-items: center; }
        }
        @media (min-width: 1041px) { .sod-nav-drawer { display: none !important; } }
        @media (prefers-reduced-motion: reduce) {
          .nav-logo-wrap .nav-scan::after, .sod-nav-drawer, .nav-dice { animation: none; transition: none; }
        }
      `}</style>
    </nav>
  );
}
