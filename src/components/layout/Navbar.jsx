import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { C, F, LOGO_URL, calcGem } from "../../theme.js";
import { NAV } from "../../routes.jsx";
import { GoldButton } from "../ui.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { Avatar } from "../../pages/AuthPage.jsx";
import { searchPosts } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";
import { openNumberDrawer } from "../../lib/numberDrawer.js";

// קישורי ליבה בסרגל; השאר -> "עוד ▾". מבנה נקי לפי החזון.
const CORE_KEYS = ["/", "/timeline", "/beit-midrash", "/community"];
const coreItems = NAV.filter(i => CORE_KEYS.includes(i.to));
const moreItems = [
  ...NAV.filter(i => !CORE_KEYS.includes(i.to) && !["/start"].includes(i.to)),
  { label: "צור קשר", emoji: "✉", to: "/contact" },
];

// יעדים ל"הפתיע אותי" — דפי ישות בלבד (מספרים וביטויים משמעותיים)
const SURPRISE_NUMS = [
  1820, 1237, 376, 358, 86, 26, 613, 541, 65, 72, 137, 314, 749, 631, 776,
  "משיח", "גאולה", "ישראל", "אהבה", "אמת", "תורה", "חכמה", "בינה", "דעת", "אור",
];

function isActive(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

const postTitle = p => stripHtml(typeof p.title === "string" ? p.title : (p.title?.rendered || ""));

// ── חיפוש אוניברסלי (פוסטים + גימטריה + קיצורי דרך) ──
function UniversalSearch({ onDone, full }) {
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
  function submit(e) { e.preventDefault(); const v = q.trim(); if (v) go("/number/" + encodeURIComponent(v)); }

  const v = q.trim();
  const gem = /[א-ת]/.test(v) ? calcGem(v) : (/^\d+$/.test(v) ? +v : null);
  const cats = [
    { e: "🌅", l: "ציר ההתגלות", to: "/timeline" },
    { e: "🌳", l: "עץ המספרים", to: "/numbers" },
    { e: "🔍", l: "דילוגי אותיות", to: "/code" },
    { e: "🖼", l: "גלריות", to: "/archive" },
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
          {gem != null && (
            <button className="nav-drop-row" onClick={() => go("/number/" + encodeURIComponent(v))}>
              <span>🔢</span><span>גימטריה של «{v}» = <b style={{ color: C.goldBright }}>{gem}</b> · גלה הכל ←</span>
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
  // 🎲 גלגול אוטומטי מדי פעם — שהמבקר ישים לב לקובייה (בלי ניווט)
  useEffect(() => {
    const id = setInterval(() => { setSpin(true); setTimeout(() => setSpin(false), 800); }, 8000);
    return () => clearInterval(id);
  }, []);
  return (
    <button onClick={surprise} className={`nav-dice${spin ? " spin" : ""}`} title="הפתיעו אותי" aria-label="הפתיעו אותי">🎲</button>
  );
}

function NavLinkItem({ item, pathname, onNavigate }) {
  const [open, setOpen] = useState(false);
  const active = isActive(pathname, item.to);
  const hasChildren = item.children?.length;
  const linkStyle = {
    background: active ? "rgba(212,175,55,0.12)" : "transparent",
    border: active ? `1px solid ${C.borderGold}` : "1px solid transparent",
    cursor: "pointer", color: active ? C.goldBright : C.muted,
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

function MoreMenu({ items, pathname, onNavigate }) {
  const [open, setOpen] = useState(false);
  const anyActive = items.some(i => isActive(pathname, i.to));
  return (
    <div style={{ position: "relative" }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="nav-link" style={{
        background: anyActive ? "rgba(212,175,55,0.12)" : "transparent",
        border: anyActive ? `1px solid ${C.borderGold}` : "1px solid transparent",
        cursor: "pointer", color: anyActive ? C.goldBright : C.muted,
        fontFamily: F.royal, fontSize: 15, fontWeight: 700, letterSpacing: 0.3,
        padding: "7px 12px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 5,
        transition: "color 0.2s, background 0.2s",
      }}>⋯ עוד <span style={{ fontSize: 9, opacity: 0.8 }}>▾</span></button>
      {open && <Dropdown items={items} onNavigate={onNavigate} />}
    </div>
  );
}

function Dropdown({ items, onNavigate }) {
  return (
    <div style={{
      position: "absolute", top: "100%", right: 0, minWidth: 200,
      background: "rgba(8,5,2,0.99)", backdropFilter: "blur(14px)",
      border: `1px solid ${C.borderGold}`, borderRadius: 8, padding: 8, zIndex: 200,
      boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
    }}>
      {items.map(c => (
        <Link key={c.to} to={c.to} onClick={onNavigate} style={{
          display: "block", color: C.goldDim, textDecoration: "none",
          fontFamily: F.royal, fontSize: 15, padding: "10px 13px", borderRadius: 5,
          whiteSpace: "nowrap", transition: "background 0.18s, color 0.18s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.color = C.goldBright; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.goldDim; }}
        >{c.emoji ? `${c.emoji} ` : ""}{c.label}</Link>
      ))}
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <div className="nav-logo-wrap" style={{ position: "relative", display: "inline-flex" }}>
        <img src={LOGO_URL} alt="SOD1820" className="logo-animated" style={{ height: 36, width: "auto" }} />
        <span className="nav-scan" aria-hidden />
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
        <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 14, fontWeight: 800, lineHeight: 1.25 }}>
          כי לה' המלוכה
        </div>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 8.5, letterSpacing: 3, textTransform: "uppercase" }}>
          SOD1820
        </div>
      </div>
    </Link>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, profile } = useAuth();
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
      background: scrolled ? "rgba(5,4,0,0.98)" : "rgba(5,4,0,0.9)",
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${scrolled ? C.borderGold : C.border}`,
      padding: "0 18px", direction: "rtl", transition: "all 0.35s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 64, maxWidth: 1360, margin: "0 auto" }}>
        <Brand />

        <Link to="/start" title="כאן מתחילים — המסע בשתי דקות" style={{
          display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
          background: `linear-gradient(135deg, ${C.crimson}, ${C.crimsonLight})`,
          color: C.goldBright,
          fontFamily: F.heading, fontSize: 13, fontWeight: 800, letterSpacing: 0.5,
          padding: "8px 13px", borderRadius: 6, whiteSpace: "nowrap",
          border: `1px solid ${C.goldDim}`, boxShadow: "0 0 12px rgba(122,19,32,0.4)",
        }}>🚀 כאן מתחילים</Link>

        {/* ליבה + עוד */}
        <div className="sod-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {coreItems.map(item => <NavLinkItem key={item.to} item={item} pathname={pathname} />)}
          <MoreMenu items={moreItems} pathname={pathname} />
        </div>

        {/* חיפוש + הפתעה + כניסה */}
        <div className="sod-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 8, marginInlineStart: "auto" }}>
          <UniversalSearch />
          <SurpriseButton />
          {user ? (
            <Link to="/profile" title="הפרופיל שלי" style={{
              display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
              padding: "3px 6px 3px 12px", border: `1px solid ${C.border}`, borderRadius: 22,
            }}>
              <span style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 12.5, fontWeight: 700, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.display_name || profile?.username || "פרופיל"}
              </span>
              <Avatar profile={profile} user={user} size={28} />
            </Link>
          ) : (
            <GoldButton to="/login" style={{ padding: "8px 16px", fontSize: 12.5, letterSpacing: 1, whiteSpace: "nowrap" }}>
              🔑 כניסה · הרשמה חינם
            </GoldButton>
          )}
        </div>

        {/* קובייה במובייל — נראית בכניסה, מתגלגלת מדי פעם */}
        <span className="sod-nav-mobile-only" style={{ marginInlineStart: "auto" }}><SurpriseButton /></span>

        <button className="sod-nav-burger" aria-label="תפריט" onClick={() => setDrawer(d => !d)} style={{
          display: "none", background: "none", border: `1px solid ${C.borderGold}`,
          color: C.goldBright, fontSize: 20, cursor: "pointer", borderRadius: 6,
          width: 40, height: 40, marginInlineStart: 8,
        }}>{drawer ? "✕" : "☰"}</button>
      </div>

      {drawer && (
        <div className="sod-nav-drawer" style={{ borderTop: `1px solid ${C.border}`, padding: "12px 8px 20px", maxHeight: "80vh", overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 6px 12px" }}>
            <UniversalSearch full onDone={() => setDrawer(false)} />
            <SurpriseButton onDone={() => setDrawer(false)} />
          </div>
          <Link to={user ? "/profile" : "/login"} onClick={() => setDrawer(false)} style={{
            display: "flex", alignItems: "center", gap: 10, color: C.goldBright, textDecoration: "none",
            fontFamily: F.royal, fontSize: 15, fontWeight: 700, padding: "10px 14px",
            borderBottom: `1px solid ${C.border}`, marginBottom: 6,
          }}>
            {user ? <Avatar profile={profile} user={user} size={26} /> : <span style={{ fontSize: 18 }}>🔑</span>}
            {user ? (profile?.display_name || profile?.username || "הפרופיל שלי") : "כניסה · הרשמה חינם"}
          </Link>
          {NAV.map(item => (
            <div key={item.to} style={{ marginBottom: 4 }}>
              {false ? null : (
                <Link to={item.to} onClick={() => setDrawer(false)} style={{
                  display: "block", color: isActive(pathname, item.to) ? C.goldBright : C.goldDim,
                  textDecoration: "none", fontFamily: F.royal, fontSize: 15, fontWeight: 700,
                  padding: "10px 14px", borderRadius: 6,
                }}>{item.emoji} {item.label}</Link>
              )}
              {item.children && (
                <div style={{ paddingInlineStart: 22 }}>
                  {item.children.map(c => (
                    <Link key={c.to} to={c.to} onClick={() => setDrawer(false)} style={{
                      display: "block", color: C.muted, textDecoration: "none",
                      fontFamily: F.royal, fontSize: 15, padding: "8px 14px",
                    }}>– {c.label}</Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes nav-logo-scan { 0% { transform: translateY(-130%); } 100% { transform: translateY(330%); } }
        .nav-logo-wrap .nav-scan { position: absolute; inset: 0; overflow: hidden; border-radius: 6px; pointer-events: none; z-index: 1; }
        .nav-logo-wrap .nav-scan::after { content: ""; position: absolute; left: -10%; right: -10%; height: 38%;
          background: linear-gradient(180deg, transparent, rgba(246,226,122,0.6), transparent); animation: nav-logo-scan 2.6s ease-in-out infinite; }

        .nav-link:hover { color: #f6e27a !important; background: rgba(212,175,55,0.08) !important; }

        .nav-gem { display: inline-flex; align-items: center; gap: 4px; background: rgba(8,5,2,0.6);
          border: 1px solid ${C.border}; border-radius: 999px; padding: 3px 6px 3px 4px; transition: border-color 0.2s, box-shadow 0.2s; }
        .nav-gem:focus-within { border-color: ${C.gold}; box-shadow: 0 0 16px rgba(212,175,55,0.18); }
        .nav-gem-ico { font-size: 13px; opacity: 0.85; }
        .nav-gem input { width: 168px; max-width: 40vw; background: none; border: none; outline: none; color: ${C.goldLight};
          font-family: ${F.body}; font-size: 13px; padding: 5px 2px; min-width: 0; }
        .nav-gem input::placeholder { color: ${C.muted}; opacity: 0.85; }
        /* מצב מלא (מגירת המובייל) — תיבה רספונסיבית ברוחב מלא */
        .nav-gem.nav-gem-full { width: 100%; box-sizing: border-box; }
        .nav-gem.nav-gem-full input { width: 100%; max-width: none; flex: 1; font-size: 16px; }
        .nav-gem.nav-gem-full input::placeholder { font-size: 14px; }
        .nav-gem button { background: ${C.gold}; color: #1a0e00; border: none; border-radius: 999px;
          width: 26px; height: 26px; cursor: pointer; font-size: 14px; font-weight: 800; flex-shrink: 0; }
        .nav-gem button:hover { background: ${C.goldLight}; }

        .nav-gem-drop { position: absolute; top: calc(100% + 6px); right: 0; left: 0; min-width: 280px;
          background: rgba(8,5,2,0.99); backdrop-filter: blur(14px); border: 1px solid ${C.borderGold};
          border-radius: 12px; padding: 8px; z-index: 250; box-shadow: 0 14px 44px rgba(0,0,0,0.7); }
        .nav-drop-row { display: flex; align-items: center; gap: 9px; width: 100%; text-align: right; cursor: pointer;
          background: none; border: none; color: ${C.goldDim}; font-family: ${F.body}; font-size: 14.5px;
          padding: 9px 10px; border-radius: 8px; transition: background 0.15s, color 0.15s; }
        .nav-drop-row:hover { background: ${C.surface}; color: ${C.goldBright}; }
        .nav-drop-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nav-drop-empty { color: ${C.muted}; font-family: ${F.body}; font-size: 13px; padding: 8px 10px; }
        .nav-drop-div { height: 1px; background: ${C.border}; margin: 6px 4px; }
        .nav-drop-cats { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px; }
        .nav-drop-cat { cursor: pointer; background: rgba(20,15,12,0.6); border: 1px solid ${C.border};
          color: ${C.goldLight}; font-family: ${F.heading}; font-size: 13.5px; font-weight: 700;
          padding: 6px 11px; border-radius: 999px; transition: border-color 0.15s, background 0.15s; }
        .nav-drop-cat:hover { border-color: ${C.gold}; background: ${C.surface}; }

        .nav-dice { width: 38px; height: 38px; flex-shrink: 0; cursor: pointer; font-size: 18px;
          background: rgba(8,5,2,0.6); border: 1px solid ${C.borderGold}; border-radius: 10px; color: ${C.goldBright};
          transition: transform 0.25s, box-shadow 0.2s, background 0.2s; }
        .nav-dice:hover { transform: rotate(18deg) scale(1.06); box-shadow: 0 0 16px rgba(212,175,55,0.3); background: ${C.surface}; }
        .nav-dice.spin { animation: nav-dice-spin 0.55s cubic-bezier(.2,.8,.2,1); box-shadow: 0 0 22px rgba(212,175,55,0.45); }
        @keyframes nav-dice-spin { 0% { transform: rotate(0) scale(1); } 60% { transform: rotate(540deg) scale(1.18); } 100% { transform: rotate(720deg) scale(1); } }

        .sod-nav-drawer { animation: nav-drawer-in 0.25s ease; }
        @keyframes nav-drawer-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

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
