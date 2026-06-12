import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { C, F, LOGO_URL } from "../../theme.js";
import { NAV } from "../../routes.jsx";
import { GoldButton } from "../ui.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { Avatar } from "../../pages/AuthPage.jsx";

// קישורי ליבה בסרגל; השאר עוברים לתפריט "עוד ▾"
const CORE_KEYS = ["/timeline", "/numbers", "/beit-midrash", "/code", "/community"];
const coreItems = NAV.filter(i => CORE_KEYS.includes(i.to));
const moreItems = NAV.filter(i => !CORE_KEYS.includes(i.to) && !["/", "/start"].includes(i.to));

function isActive(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

// ── חיפוש / מחשבון גימטריה ──
function GematriaSearch({ onDone, full }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  function go(e) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    nav(`/number/${encodeURIComponent(v)}`);
    setQ(""); onDone?.();
  }
  return (
    <form onSubmit={go} className="nav-gem" style={{ width: full ? "100%" : undefined }}>
      <span className="nav-gem-ico" aria-hidden>🔢</span>
      <input
        value={q} onChange={e => setQ(e.target.value)}
        placeholder="חשב גימטריה / חפש מספר"
        aria-label="חיפוש גימטריה" />
      <button type="submit" aria-label="חשב">←</button>
    </form>
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
    fontFamily: F.royal, fontSize: 13.5, fontWeight: 700,
    letterSpacing: 0.3, padding: "7px 12px", borderRadius: 8,
    textDecoration: "none", whiteSpace: "nowrap", display: "inline-flex",
    alignItems: "center", gap: 5,
    boxShadow: active ? "0 0 14px rgba(212,175,55,0.15)" : "none",
    transition: "color 0.2s, background 0.2s, border-color 0.2s",
  };

  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => hasChildren && setOpen(true)}
      onMouseLeave={() => hasChildren && setOpen(false)}>
      <Link to={item.to} className="nav-link" style={linkStyle} onClick={onNavigate}>
        <span>{item.emoji} {item.label}</span>
        {hasChildren && <span style={{ fontSize: 9, opacity: 0.8 }}>▾</span>}
      </Link>
      {hasChildren && open && <Dropdown items={item.children} onNavigate={onNavigate} />}
    </div>
  );
}

// תפריט "עוד ▾"
function MoreMenu({ items, pathname, onNavigate }) {
  const [open, setOpen] = useState(false);
  const anyActive = items.some(i => isActive(pathname, i.to));
  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="nav-link" style={{
        background: anyActive ? "rgba(212,175,55,0.12)" : "transparent",
        border: anyActive ? `1px solid ${C.borderGold}` : "1px solid transparent",
        cursor: "pointer", color: anyActive ? C.goldBright : C.muted,
        fontFamily: F.royal, fontSize: 13.5, fontWeight: 700, letterSpacing: 0.3,
        padding: "7px 12px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 5,
        transition: "color 0.2s, background 0.2s",
      }}>עוד <span style={{ fontSize: 9, opacity: 0.8 }}>▾</span></button>
      {open && <Dropdown items={items} onNavigate={onNavigate} />}
    </div>
  );
}

function Dropdown({ items, onNavigate }) {
  return (
    <div style={{
      position: "absolute", top: "100%", right: 0, minWidth: 200,
      background: "rgba(8,5,2,0.99)", backdropFilter: "blur(14px)",
      border: `1px solid ${C.borderGold}`, borderRadius: 8,
      padding: 8, zIndex: 200, boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
    }}>
      {items.map(c => (
        <Link key={c.to} to={c.to} onClick={onNavigate} style={{
          display: "block", color: C.goldDim, textDecoration: "none",
          fontFamily: F.royal, fontSize: 13, padding: "9px 12px",
          borderRadius: 5, whiteSpace: "nowrap", transition: "background 0.18s, color 0.18s",
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
        <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 12, fontWeight: 800, lineHeight: 1.25 }}>
          כי לה' המלוכה
        </div>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 7, letterSpacing: 3, textTransform: "uppercase" }}>
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

        {/* "כאן מתחילים" — בולט ליד הלוגו */}
        <Link to="/start" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: `linear-gradient(135deg, ${C.crimson}, ${C.crimsonLight})`,
          color: C.goldBright, textDecoration: "none",
          fontFamily: F.heading, fontSize: 12, fontWeight: 800, letterSpacing: 1,
          padding: "8px 14px", borderRadius: 6, whiteSpace: "nowrap",
          border: `1px solid ${C.goldDim}`, boxShadow: "0 0 14px rgba(122,19,32,0.5)",
        }}>🚀 כאן מתחילים</Link>

        {/* קישורי ליבה + "עוד" — דסקטופ */}
        <div className="sod-nav-desktop" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 2 }}>
          {coreItems.map(item => <NavLinkItem key={item.to} item={item} pathname={pathname} />)}
          {moreItems.length > 0 && <MoreMenu items={moreItems} pathname={pathname} />}
        </div>

        {/* חיפוש גימטריה + כניסה — דסקטופ */}
        <div className="sod-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GematriaSearch />
          {user ? (
            <Link to="/profile" title="הפרופיל שלי" style={{
              display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
              padding: "3px 6px 3px 12px", border: `1px solid ${C.border}`, borderRadius: 22,
            }}>
              <span style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 12.5, fontWeight: 700, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.display_name || profile?.username || "פרופיל"}
              </span>
              <Avatar profile={profile} user={user} size={28} />
            </Link>
          ) : (
            <GoldButton to="/login" style={{ padding: "8px 18px", fontSize: 11, letterSpacing: 1.5, whiteSpace: "nowrap" }}>
              כניסה למעגל ✦
            </GoldButton>
          )}
        </div>

        {/* המבורגר — מובייל */}
        <button className="sod-nav-burger" aria-label="תפריט" onClick={() => setDrawer(d => !d)} style={{
          display: "none", background: "none", border: `1px solid ${C.borderGold}`,
          color: C.goldBright, fontSize: 20, cursor: "pointer", borderRadius: 6,
          width: 40, height: 40, marginInlineStart: "auto",
        }}>{drawer ? "✕" : "☰"}</button>
      </div>

      {/* מגירת מובייל */}
      {drawer && (
        <div className="sod-nav-drawer" style={{ borderTop: `1px solid ${C.border}`, padding: "12px 4px 20px", maxHeight: "78vh", overflowY: "auto" }}>
          <div style={{ padding: "4px 10px 12px" }}><GematriaSearch full onDone={() => setDrawer(false)} /></div>
          <Link to={user ? "/profile" : "/login"} onClick={() => setDrawer(false)} style={{
            display: "flex", alignItems: "center", gap: 10, color: C.goldBright, textDecoration: "none",
            fontFamily: F.royal, fontSize: 15, fontWeight: 700, padding: "10px 14px",
            borderBottom: `1px solid ${C.border}`, marginBottom: 6,
          }}>
            {user ? <Avatar profile={profile} user={user} size={26} /> : <span style={{ fontSize: 18 }}>✦</span>}
            {user ? (profile?.display_name || profile?.username || "הפרופיל שלי") : "כניסה למעגל / הצטרפות"}
          </Link>
          {NAV.map(item => (
            <div key={item.to} style={{ marginBottom: 4 }}>
              <Link to={item.to} onClick={() => setDrawer(false)} style={{
                display: "block", color: isActive(pathname, item.to) ? C.goldBright : C.goldDim,
                textDecoration: "none", fontFamily: F.royal, fontSize: 15, fontWeight: 700,
                padding: "10px 14px", borderRadius: 6,
              }}>{item.emoji} {item.label}</Link>
              {item.children && (
                <div style={{ paddingInlineStart: 22 }}>
                  {item.children.map(c => (
                    <Link key={c.to} to={c.to} onClick={() => setDrawer(false)} style={{
                      display: "block", color: C.muted, textDecoration: "none",
                      fontFamily: F.royal, fontSize: 13.5, padding: "7px 14px",
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

        /* חיפוש גימטריה */
        .nav-gem { display: inline-flex; align-items: center; gap: 4px; background: rgba(8,5,2,0.6);
          border: 1px solid ${C.border}; border-radius: 999px; padding: 3px 6px 3px 4px; transition: border-color 0.2s, box-shadow 0.2s; }
        .nav-gem:focus-within { border-color: ${C.gold}; box-shadow: 0 0 16px rgba(212,175,55,0.18); }
        .nav-gem-ico { font-size: 13px; opacity: 0.8; }
        .nav-gem input { width: 150px; background: none; border: none; outline: none; color: ${C.goldLight};
          font-family: ${F.body}; font-size: 13px; padding: 5px 2px; }
        .nav-gem input::placeholder { color: ${C.muted}; opacity: 0.8; }
        .nav-gem button { background: ${C.gold}; color: #1a0e00; border: none; border-radius: 999px;
          width: 26px; height: 26px; cursor: pointer; font-size: 14px; font-weight: 800; flex-shrink: 0; }
        .nav-gem button:hover { background: ${C.goldLight}; }

        .sod-nav-drawer { animation: nav-drawer-in 0.25s ease; }
        @keyframes nav-drawer-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 980px) {
          .sod-nav-desktop { display: none !important; }
          .sod-nav-burger { display: inline-flex !important; align-items: center; justify-content: center; }
        }
        @media (min-width: 981px) { .sod-nav-drawer { display: none !important; } }
        @media (prefers-reduced-motion: reduce) {
          .nav-logo-wrap .nav-scan::after, .sod-nav-drawer { animation: none; }
        }
      `}</style>
    </nav>
  );
}
