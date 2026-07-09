import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";
import { getSitePromo } from "../lib/supabase.js";

// 📣 פופ-אפ קמפיין אתר-רחב (site_promo) — קופץ פעם אחת לגולש שנמצא באתר אך *לא* היה בעמוד
// הבית ולא ראה את הפוסט (בעמוד-הבית/בעמוד-הפוסט → מסומן "ראה", בלי פופ-אפ). דאטא-דרייבן מ-nodes
// (role='site_promo', active_until) → צוריאל מכבה/מאריך בלי פריסה. פר-גולש, לא מנדנד (whats_new spirit).

const seenKey = id => `sod_promo_seen_${id}`;
const isSeen = id => { try { return localStorage.getItem(seenKey(id)) === "1"; } catch { return false; } };
const markSeen = id => { try { localStorage.setItem(seenKey(id), "1"); } catch { /* noop */ } };
const norm = p => (p || "").replace(/\/+$/, "") || "/";

export default function SitePromoPopup() {
  const P = usePalette();
  const { pathname } = useLocation();
  const [promo, setPromo] = useState(null);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => { let a = true; getSitePromo().then(p => { if (a) setPromo(p); }).catch(() => {}); return () => { a = false; }; }, []);

  let here = pathname;
  try { here = decodeURIComponent(pathname); } catch { /* noop */ }
  const onHome = norm(here) === "/";
  const onPost = !!promo && norm(here) === norm(promo.href);

  useEffect(() => {
    if (!promo) return;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    // ראה בעמוד הבית או בעמוד הפוסט → סימון "ראה" בלי פופ-אפ (לא כופלים חשיפה)
    if (onHome || onPost) { markSeen(promo.id); setOpen(false); return; }
    if (isSeen(promo.id)) { setOpen(false); return; }
    // גולש בעמוד פנימי, לא ראה עדיין → קופץ אחרי רגע, ומסומן כ"ראה" (פעם אחת לגולש)
    timer.current = setTimeout(() => { setOpen(true); markSeen(promo.id); }, 1100);
    return () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  }, [promo, here, onHome, onPost]);

  if (!promo || !open) return null;

  const close = () => setOpen(false);
  const isLight = P.mode === "light";

  return (
    <div onClick={close}
      style={{ position: "fixed", inset: 0, zIndex: 9400, background: "rgba(0,0,0,.72)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, direction: "rtl" }}>
      <style>{`@keyframes sp-in{0%{opacity:0;transform:translateY(16px) scale(.97)}100%{opacity:1;transform:none}}`}</style>
      <div onClick={e => e.stopPropagation()}
        style={{ position: "relative", width: "100%", maxWidth: 420, background: isLight ? "#fbf7ec" : "#100a1c", border: `1.5px solid ${P.accent}`, borderRadius: 20, overflow: "hidden", boxShadow: `0 0 60px ${P.glow}, 0 24px 60px rgba(0,0,0,.5)`, animation: "sp-in .32s cubic-bezier(.2,.8,.2,1)" }}>
        <button onClick={close} aria-label="סגור"
          style={{ position: "absolute", top: 12, insetInlineEnd: 14, zIndex: 2, width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(0,0,0,.35)", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>

        {promo.image && (
          <Link to={promo.href} onClick={close} style={{ display: "block" }}>
            <img src={promo.image} alt={promo.title} loading="lazy"
              style={{ display: "block", width: "100%", maxHeight: 220, objectFit: "cover" }} />
          </Link>
        )}

        <div style={{ padding: "18px 20px 20px", textAlign: "center" }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5, marginBottom: 7 }}>✦ פוסט חדש באתר</div>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(18px,3vw,22px)", fontWeight: 800, lineHeight: 1.35 }}>{promo.title}</div>
          {promo.teaser && <p style={{ color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.75, margin: "10px auto 0", maxWidth: 340 }}>{promo.teaser}</p>}
          <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
            <Link to={promo.href} onClick={close}
              style={{ textDecoration: "none", background: P.accentBtn, color: P.onAccent, borderRadius: 999, fontFamily: F.heading, fontSize: 15.5, fontWeight: 800, padding: "12px 22px" }}>
              {promo.cta}
            </Link>
            <button onClick={close}
              style={{ cursor: "pointer", background: "none", border: "none", color: P.inkSoft, fontFamily: F.heading, fontSize: 13, padding: "4px" }}>אחר כך</button>
          </div>
        </div>
      </div>
    </div>
  );
}
