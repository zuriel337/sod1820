import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { getChannelUpdates } from "../lib/supabase.js";
import { seenCutoff, markSeenKey, isNewSince } from "../lib/crossesNew.js";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";

// 🌳 «מה חדש באתר» — תג עליון קטן עם נקודה פועמת. חוק ההבהוב (whats_new_law): הנקודה
// פועמת **רק כשעלה עדכון מאז הביקור האחרון של המשתמש**; אחרי פתיחה → נרגעת (markSeenKey).
// לחיצה פותחת פאנל-מיני שקורא את ערוץ «חדשות האתר» (site-news) — עץ אחד: מתעדכן לבד עם כל
// פיצ'ר חדש, בלי לקודד פוסט יחיד. נפרד לגמרי מ«עדכונים אחרונים» (הפוסטים של צוריאל).
const SEEN_KEY = "home-whatsnew";

export default function WhatsNewBadge() {
  const P = usePalette();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const cutoff = useMemo(() => seenCutoff(SEEN_KEY), []);
  const ref = useRef(null);

  useEffect(() => {
    let alive = true;
    getChannelUpdates(8, "site-news", true)
      .then(r => { if (!alive) return; const list = r || []; setItems(list); setHasNew(list.some(u => isNewSince(u, cutoff))); })
      .catch(() => {});
    return () => { alive = false; };
  }, [cutoff]);

  // סגירה בלחיצה בחוץ / Esc
  useEffect(() => {
    if (!open) return;
    const out = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = e => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!items.length) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && hasNew) { markSeenKey(SEEN_KEY); setHasNew(false); }   // ראה → נרגע (לא יהבהב שוב עד עדכון חדש)
  };
  const titleOf = u => (u.text || "").split("\n")[0].trim();
  const subOf = u => (u.text || "").split("\n").slice(1).join(" ").trim();
  const dateOf = u => { try { return new Date(u.created_at).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }); } catch { return ""; } };

  return (
    <div ref={ref} style={{ position: "relative", zIndex: 60 }}>
      <style>{`.wn-dot{animation:wn-pulse 1.4s ease-out infinite}
        @keyframes wn-pulse{0%,100%{box-shadow:0 0 0 0 rgba(224,83,63,.6)}50%{box-shadow:0 0 0 7px rgba(224,83,63,0)}}
        @media(prefers-reduced-motion:reduce){.wn-dot{animation:none}}`}</style>

      <button onClick={toggle} aria-label="מה חדש באתר" aria-expanded={open}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
          background: P.card, border: `1px solid ${hasNew ? P.accent : P.border}`, borderRadius: 999,
          padding: "7px 14px", fontFamily: F.heading, fontWeight: 800, fontSize: 13, color: P.accentText, whiteSpace: "nowrap" }}>
        <span className={hasNew ? "wn-dot" : ""} style={{ width: 8, height: 8, borderRadius: "50%", background: hasNew ? "#e0533f" : P.inkSoft }} />
        🌳 מה חדש
      </button>

      {open && (
        <div role="menu" style={{ position: "absolute", insetInlineEnd: 0, top: "calc(100% + 8px)", width: "min(320px,86vw)",
          background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 14, padding: 12,
          boxShadow: "0 20px 50px rgba(0,0,0,.55)", direction: "rtl", textAlign: "start" }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontWeight: 800, fontSize: 15, marginBottom: 2 }}>🌳 מה חדש באתר</div>
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 10.5, letterSpacing: 1, marginBottom: 10 }}>עדכוני האתר · מתעדכן אוטומטית</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 340, overflowY: "auto" }}>
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
    </div>
  );
}
