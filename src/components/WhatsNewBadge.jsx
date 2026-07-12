import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { getChannelUpdates } from "../lib/supabase.js";
import { seenCutoff, markSeenKey, isNewSince } from "../lib/crossesNew.js";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";

// 🌳 «מה חדש באתר» — תג קטן שיושב בתוך הטיקר העליון (בלי לגזול שורה). נקודה פועמת פר-משתמש
// (whats_new_law): פועמת רק כשעלה עדכון מאז הביקור האחרון; אחרי פתיחה → נרגעת. הפאנל נפתח
// כ-fixed (לא נחתך ע״י ה-overflow של הטיקר) וקורא את ערוץ «חדשות האתר» (site-news) — עץ אחד:
// מתעדכן לבד עם כל פיצ'ר, בלי לקודד פוסט. בנייד: מוצג רק 🌳 + נקודה (טקסט מוסתר) — לא גוזל מקום.
const SEEN_KEY = "home-whatsnew";

export default function WhatsNewBadge() {
  const P = usePalette();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [pos, setPos] = useState({ top: 44, left: 8 });
  const cutoff = useMemo(() => seenCutoff(SEEN_KEY), []);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    let alive = true;
    getChannelUpdates(8, "site-news", true)
      .then(r => { if (!alive) return; const list = r || []; setItems(list); setHasNew(list.some(u => isNewSince(u, cutoff))); })
      .catch(() => {});
    return () => { alive = false; };
  }, [cutoff]);

  useEffect(() => {
    if (!open) return;
    const out = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const esc = e => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
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

  return (
    <span ref={wrapRef} style={{ display: "inline-flex" }}>
      <style>{`.wn-dot{animation:wn-pulse 1.4s ease-out infinite}
        @keyframes wn-pulse{0%,100%{box-shadow:0 0 0 0 rgba(224,83,63,.6)}50%{box-shadow:0 0 0 6px rgba(224,83,63,0)}}
        @media(max-width:640px){.wn-txt{display:none}.wn-btn{padding:4px 8px!important}}
        @media(prefers-reduced-motion:reduce){.wn-dot{animation:none}}`}</style>

      <button ref={btnRef} className="wn-btn" onClick={toggle} aria-label="מה חדש באתר" aria-expanded={open}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
          background: hasNew ? "linear-gradient(135deg,#ffe08a,#e6b53a)" : "rgba(255,236,173,0.14)",
          border: `1px solid ${hasNew ? "#e0533f" : "rgba(212,175,55,0.4)"}`, borderRadius: 999,
          padding: "4px 11px", fontFamily: F.heading, fontWeight: 900, fontSize: 11, letterSpacing: ".2px",
          color: hasNew ? "#1a0e00" : "#ffe6ad", whiteSpace: "nowrap", lineHeight: 1 }}>
        <span className={hasNew ? "wn-dot" : ""} style={{ width: 7, height: 7, borderRadius: "50%", background: hasNew ? "#9c1322" : "rgba(255,230,173,0.6)", flex: "0 0 auto" }} />
        <span aria-hidden style={{ fontSize: 12 }}>🌳</span>
        <span className="wn-txt">מה חדש</span>
      </button>

      {open && (
        <div role="menu" style={{ position: "fixed", top: pos.top, left: pos.left, width: "min(320px,90vw)", zIndex: 3000,
          background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 14, padding: 12,
          boxShadow: "0 20px 54px rgba(0,0,0,.6)", direction: "rtl", textAlign: "start" }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontWeight: 800, fontSize: 15, marginBottom: 2 }}>🌳 מה חדש באתר</div>
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 10.5, letterSpacing: 1, marginBottom: 10 }}>עדכוני האתר · מתעדכן אוטומטית</div>
          <div style={{ display: "flex", flexDirection: "column", maxHeight: 320, overflowY: "auto" }}>
            {items.map((u, i) => {
              const inner = (
                <>
                  <div style={{ color: P.ink, fontFamily: F.royal, fontWeight: 700, fontSize: 13, lineHeight: 1.4 }}>{titleOf(u)}</div>
                  {subOf(u) && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.55, marginTop: 2 }}>{subOf(u).slice(0, 92)}</div>}
                  <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10, marginTop: 3 }}>{dateOf(u)}{u.credit ? ` · ${u.credit}` : ""}</div>
                </>
              );
              const style = { textDecoration: "none", display: "block", padding: "9px 4px",
                borderBottom: i < items.length - 1 ? `1px solid ${P.border}` : "none" };
              return u.link_url
                ? <Link key={u.id} to={u.link_url} onClick={() => setOpen(false)} style={style}>{inner}</Link>
                : <div key={u.id} style={style}>{inner}</div>;
            })}
          </div>
          <Link to="/broadcasts" onClick={() => setOpen(false)} style={{ display: "block", textAlign: "center", marginTop: 10,
            color: P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, textDecoration: "none" }}>כל עדכוני האתר →</Link>
        </div>
      )}
    </span>
  );
}
