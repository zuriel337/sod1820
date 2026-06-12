import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { C, F, LOGO_URL } from "../../theme.js";
import { NAV, PRIMARY_KEYS } from "../../routes.jsx";
import { GoldButton } from "../ui.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { Avatar } from "../../pages/AuthPage.jsx";

const primaryItems = NAV.filter(i => PRIMARY_KEYS.includes(i.to));

function isActive(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

function Brand() {
  return (
    <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
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
    </Link>
  );
}

function NavLinkItem({ item, pathname, onNavigate }) {
  const [open, setOpen] = useState(false);
  const active = isActive(pathname, item.to);
  const hasChildren = item.children?.length;

  const linkStyle = {
    background: "none", border: "none", cursor: "pointer",
    color: active ? C.goldBright : C.muted,
    fontFamily: F.royal, fontSize: 13.5, fontWeight: 700,
    letterSpacing: 0.5, padding: "8px 11px", borderRadius: 3,
    textDecoration: "none", whiteSpace: "nowrap", display: "inline-flex",
    alignItems: "center", gap: 5,
    borderBottom: active ? `2px solid ${C.gold}` : "2px solid transparent",
    transition: "color 0.2s",
  };

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => hasChildren && setOpen(true)}
      onMouseLeave={() => hasChildren && setOpen(false)}
    >
      <Link to={item.to} style={linkStyle} onClick={onNavigate}>
        <span>{item.emoji} {item.label}</span>
        {hasChildren && <span style={{ fontSize: 9, opacity: 0.8 }}>▾</span>}
      </Link>
      {hasChildren && open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, minWidth: 200,
          background: "rgba(8,5,2,0.99)", backdropFilter: "blur(14px)",
          border: `1px solid ${C.borderGold}`, borderRadius: 8,
          padding: 8, zIndex: 200, boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}>
          {item.children.map(c => (
            <Link key={c.to} to={c.to} onClick={onNavigate} style={{
              display: "block", color: C.goldDim, textDecoration: "none",
              fontFamily: F.royal, fontSize: 13, padding: "9px 12px",
              borderRadius: 5, whiteSpace: "nowrap", transition: "background 0.18s, color 0.18s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.color = C.goldBright; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.goldDim; }}
            >{c.label}</Link>
          ))}
        </div>
      )}
    </div>
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

  const startItem = NAV.find(i => i.to === "/start");

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: scrolled ? "rgba(5,4,0,0.98)" : "rgba(5,4,0,0.9)",
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${scrolled ? C.borderGold : C.border}`,
      padding: "0 18px",
      direction: "rtl",
      transition: "all 0.35s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: 64, maxWidth: 1360, margin: "0 auto" }}>
        <Brand />

        {/* "כאן מתחילים" — בולט ליד הלוגו */}
        {startItem && (
          <Link to="/start" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: `linear-gradient(135deg, ${C.crimson}, ${C.crimsonLight})`,
            color: C.goldBright, textDecoration: "none",
            fontFamily: F.heading, fontSize: 12, fontWeight: 800, letterSpacing: 1,
            padding: "8px 14px", borderRadius: 6, whiteSpace: "nowrap",
            border: `1px solid ${C.goldDim}`, boxShadow: "0 0 14px rgba(122,19,32,0.5)",
          }}>🚀 כאן מתחילים</Link>
        )}

        {/* primary links — desktop */}
        <div className="sod-nav-desktop" style={{
          flex: 1, display: "flex", justifyContent: "center", alignItems: "center",
          gap: 2, overflowX: "auto",
        }}>
          {primaryItems.filter(i => i.to !== "/start").map(item => (
            <NavLinkItem key={item.to} item={item} pathname={pathname} />
          ))}
        </div>

        {/* navigation center + register — desktop */}
        <div className="sod-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link to="/map" title="מרכז הניווט" style={{
            color: C.goldDim, textDecoration: "none", fontSize: 18,
            padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`,
          }}>🏛</Link>
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
            <GoldButton to="/login" style={{ padding: "8px 18px", fontSize: 11, letterSpacing: 2, whiteSpace: "nowrap" }}>
              התחבר
            </GoldButton>
          )}
        </div>

        {/* hamburger — mobile */}
        <button className="sod-nav-burger" onClick={() => setDrawer(d => !d)} style={{
          display: "none", background: "none", border: `1px solid ${C.borderGold}`,
          color: C.goldBright, fontSize: 20, cursor: "pointer", borderRadius: 6,
          width: 40, height: 40, marginInlineStart: "auto",
        }}>☰</button>
      </div>

      {/* mobile drawer — full menu */}
      {drawer && (
        <div className="sod-nav-drawer" style={{
          borderTop: `1px solid ${C.border}`, padding: "12px 4px 20px",
          maxHeight: "75vh", overflowY: "auto",
        }}>
          <Link to={user ? "/profile" : "/login"} onClick={() => setDrawer(false)} style={{
            display: "flex", alignItems: "center", gap: 10, color: C.goldBright, textDecoration: "none",
            fontFamily: F.royal, fontSize: 15, fontWeight: 700, padding: "10px 14px",
            borderBottom: `1px solid ${C.border}`, marginBottom: 6,
          }}>
            {user ? <Avatar profile={profile} user={user} size={26} /> : <span style={{ fontSize: 18 }}>👤</span>}
            {user ? (profile?.display_name || profile?.username || "הפרופיל שלי") : "התחברות / הרשמה"}
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
        @media (max-width: 920px) {
          .sod-nav-desktop { display: none !important; }
          .sod-nav-burger { display: inline-flex !important; align-items: center; justify-content: center; }
        }
        @media (min-width: 921px) {
          .sod-nav-drawer { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
