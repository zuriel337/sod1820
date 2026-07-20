import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { getChannelUpdates } from "../lib/supabase.js";
import { seenCutoff, markSeenKey, isNewSince } from "../lib/crossesNew.js";
import { usePalette } from "../lib/palette.js";
import { useThemeMode } from "../lib/themeMode.js";
import { F } from "../theme.js";

// 🌳 «מה חדש באתר» — תג קטן בתוך הטיקר העליון (בלי לגזול שורה). נקודה פועמת פר-משתמש
// (whats_new_law): פועמת רק כשעלה עדכון מאז הביקור האחרון; אחרי פתיחה → נרגעת. הפאנל נפתח
// דרך Portal ל-body (כדי לא להיחתך ע״י ה-transform/overflow של הטיקר) וקורא את ערוץ «חדשות
// האתר» (site-news) — עץ אחד: מתעדכן לבד עם כל פיצ'ר. בנייד: 🌳 + נקודה בלבד (בלי טקסט).
const SEEN_KEY = "home-whatsnew";

export default function WhatsNewBadge() {
  const P = usePalette();
  const light = useThemeMode() === "light";
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [pos, setPos] = useState({ top: 44, left: 8 });
  const cutoff = useMemo(() => seenCutoff(SEEN_KEY), []);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    let alive = true;
    getChannelUpdates(8, "site-news", true)
      .then(r => { if (!alive) return; const list = r || []; setItems(list); setHasNew(list.some(u => isNewSince(u, cutoff))); })
      .catch(() => {});
    return () => { alive = false; };
  }, [cutoff]);

  useEffect(() => {
    if (!open) return;
    const out = e => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const esc = e => e.key === "Escape" && setOpen(false);
    // גלילת-העמוד = סגירה (לא נשאר תקוע). ⚠️ אבל גלילה *בתוך* הפאנל (רשימת העדכונים) לא תסגור —
    // אחרת בנייד כל ניסיון-גלילה סוגר את החלונית (הבאג שצוריאל דיווח).
    const onScroll = e => {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", out);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); window.removeEventListener("scroll", onScroll, { capture: true }); };
  }, [open]);

  if (!items.length) return null;

  const toggle = () => {
    const next = !open;
    if (next && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const w = Math.min(320, window.innerWidth * 0.9);
      setPos({ top: Math.round(r.bottom + 8), left: Math.round(Math.min(Math.max(8, r.left), window.innerWidth - w - 8)) });
    }
    setOpen(next);
    if (next && hasNew) { markSeenKey(SEEN_KEY); setHasNew(false); }
  };
  const titleOf = u => (u.text || "").split("\n")[0].trim();
  const subOf = u => (u.text || "").split("\n").slice(1).join(" ").trim();
  const dateOf = u => { try { return new Date(u.created_at).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }); } catch { return ""; } };

  const panel = (
    <div ref={panelRef} role="menu" style={{ position: "fixed", top: pos.top, left: pos.left, width: "min(320px,90vw)", zIndex: 5000,
      background: "#161009", border: "1px solid rgba(212,175,55,0.5)", borderRadius: 14, padding: 12,
      boxShadow: "0 20px 54px rgba(0,0,0,.72)", backdropFilter: "blur(10px)", direction: "rtl", textAlign: "start" }}>
      <div style={{ color: "#f6e27a", fontFamily: F.regal, fontWeight: 800, fontSize: 15, marginBottom: 2 }}>🌳 מה חדש באתר</div>
      <div style={{ color: "#b8ad8a", fontFamily: F.body, fontSize: 10.5, letterSpacing: 1, marginBottom: 10 }}>עדכוני האתר · מתעדכן אוטומטית</div>
      <div style={{ display: "flex", flexDirection: "column", maxHeight: 320, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", touchAction: "pan-y" }}>
        {items.map((u, i) => {
          const inner = (
            <>
              <div style={{ color: "#efe8d5", fontFamily: F.royal, fontWeight: 700, fontSize: 13, lineHeight: 1.4 }}>{titleOf(u)}</div>
              {subOf(u) && <div style={{ color: "#c9bfa5", fontFamily: F.body, fontSize: 11.5, lineHeight: 1.55, marginTop: 2 }}>{subOf(u).slice(0, 92)}</div>}
              <div style={{ color: "#9a8f70", fontFamily: F.heading, fontSize: 10, marginTop: 3 }}>{dateOf(u)}{u.credit ? ` · ${u.credit}` : ""}</div>
            </>
          );
          const style = { textDecoration: "none", display: "block", padding: "9px 4px",
            borderBottom: i < items.length - 1 ? "1px solid rgba(212,175,55,0.16)" : "none" };
          return u.link_url
            ? <Link key={u.id} to={u.link_url} onClick={() => setOpen(false)} style={style}>{inner}</Link>
            : <div key={u.id} style={style}>{inner}</div>;
        })}
      </div>
      <Link to="/whats-new" onClick={() => setOpen(false)} style={{ display: "block", textAlign: "center", marginTop: 10,
        color: "#f6e27a", fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, textDecoration: "none" }}>כל עדכוני האתר →</Link>
    </div>
  );

  return (
    <span style={{ display: "inline-flex" }}>
      <style>{`.wn-dot{animation:wn-pulse 1.4s ease-out infinite}
        @keyframes wn-pulse{0%,100%{box-shadow:0 0 0 0 rgba(224,83,63,.6)}50%{box-shadow:0 0 0 6px rgba(224,83,63,0)}}
        @media(max-width:640px){.wn-txt{display:none}.wn-btn{padding:4px 8px!important}}
        @media(prefers-reduced-motion:reduce){.wn-dot{animation:none}}`}</style>

      <button ref={btnRef} className="wn-btn" onClick={toggle} aria-label="מה חדש באתר" aria-expanded={open}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
          background: hasNew ? "linear-gradient(135deg,#e0c77e,#c39a3a)" : (light ? "rgba(150,110,20,0.16)" : "rgba(255,236,173,0.14)"),
          border: `1px solid ${hasNew ? "#e0533f" : (light ? "rgba(90,66,12,0.55)" : "rgba(212,175,55,0.4)")}`, borderRadius: 999,
          padding: "5px 12px", fontFamily: F.heading, fontWeight: 900, fontSize: 12.5, letterSpacing: ".2px",
          color: hasNew ? "#1a0e00" : (light ? "#33260a" : "#ffe6ad"), whiteSpace: "nowrap", lineHeight: 1 }}>
        <span className={hasNew ? "wn-dot" : ""} style={{ width: 7, height: 7, borderRadius: "50%", background: hasNew ? "#9c1322" : (light ? "rgba(120,90,20,0.6)" : "rgba(255,230,173,0.6)"), flex: "0 0 auto" }} />
        <span aria-hidden style={{ fontSize: 12 }}>🌳</span>
        <span className="wn-txt">מה חדש</span>
      </button>

      {open && typeof document !== "undefined" && createPortal(panel, document.body)}
    </span>
  );
}
