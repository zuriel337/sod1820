import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { F, KEY_NUMBERS } from "../theme.js";
import { cleanName } from "../lib/galleryName.js";
import { shortDate, domNum, hintNums } from "../lib/reality.js";
import { trackShare } from "../lib/tracking.js";

// onEdit(image) — אם מסופק, מציג כפתור ✏️ (למנהלים בלבד).
// לייטבוקס מועשר: תמונה + פאנל-מידע (צד בדסקטופ, מתחת במובייל) עם כל המספרים
// כקישורים, משמעויות מספרי-הליבה, תגיות, תיאור מלא, ו-CTA לדף-המספר (עץ אחד —
// כל ההקשרים חיים שם, לא משוכפלים כאן).
export default function Lightbox({ images = [], initialIndex = 0, onClose, onEdit, note = null }) {
  const [idx, setIdx] = useState(initialIndex);
  const [fadeKey, setFadeKey] = useState(0);
  const [shared, setShared] = useState(false);
  const [tall, setTall] = useState(false);   // תמונה גבוהה (מאמר/ערך) → גלילה במקום דחיסה-לגובה
  const touchStart = useRef(null);

  async function handleShare(image) {
    const url = image?.image_url || window.location.href;
    const title = cleanName(image?.name) || 'SOD1820';
    const slug = `gallery-${image?.id ?? domNum(image) ?? ""}`;
    if (navigator.share) {
      trackShare("native", slug);
      try { await navigator.share({ title, url }); } catch {}
    } else {
      trackShare("copy", slug);
      try { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2000); } catch {}
    }
  }

  useEffect(() => { setIdx(initialIndex); }, [initialIndex]);
  useEffect(() => { setTall(false); }, [idx]);   // איפוס זיהוי-הגובה בכל מעבר תמונה

  function go(newIdx) {
    setIdx(newIdx);
    setFadeKey(k => k + 1);
  }
  const prev = () => go(idx > 0 ? idx - 1 : images.length - 1);
  const next = () => go(idx < images.length - 1 ? idx + 1 : 0);

  useEffect(() => {
    const fn = e => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });

  if (!images.length) return null;
  const h = images[idx];
  const v = domNum(h);
  const title = cleanName(h?.name);
  const date = shortDate(h);
  const nums = [...new Set(hintNums(h || {}))];
  const tags = Array.isArray(h?.tags) ? h.tags.filter(Boolean) : [];
  const desc = h?.description ? h.description.replace(/<[^>]+>/g, "").trim() : "";
  const hasInfo = !!(title || h?.name || date || desc || nums.length || tags.length || onEdit || note);

  return createPortal((
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2147483600,
        background: "rgba(2,1,6,0.97)",
        display: "flex", flexDirection: "column",
        direction: "rtl",
      }}
    >
      <style>{LB_CSS}</style>

      {/* Header — ריווח עליון לפי safe-area + scrim שחור כדי שה-X תמיד בולט */}
      <div
        style={{ display: "flex", alignItems: "center", padding: "max(12px, env(safe-area-inset-top)) 14px 12px", gap: 10, flexShrink: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0) 100%)",
          position: "relative", zIndex: 3 }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={closeBtn} aria-label="סגור">✕</button>
        {images.length > 1 && (
          <span style={{ color: "#ffffff55", fontFamily: F.heading, fontSize: 12.5 }}>
            {idx + 1} / {images.length}
          </span>
        )}
        <span style={{ flex: 1 }} />

        {h?.image_url && (
          <a href={h.image_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            style={{ ...closeBtn, fontSize: 17, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffffbb" }}
            title="פתח בגודל מלא" aria-label="פתח בגודל מלא">⤢</a>
        )}
        <button onClick={e => { e.stopPropagation(); handleShare(h); }}
          style={{ ...closeBtn, fontSize: 15, color: shared ? "#5ef0a0" : "#ffffffbb", transition: "color .3s" }}
          title={shared ? "הועתק!" : "שתף תמונה"} aria-label="שתף">{shared ? "✓" : "🔗"}</button>
        {onEdit && (
          <button onClick={e => { e.stopPropagation(); onEdit(images[idx]); }}
            style={{ ...closeBtn, fontSize: 16, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", color: "#d4af37" }}
            aria-label="עריכת תמונה">✏️</button>
        )}
        {v != null && (
          <Link to={`/number/${v}`} onClick={onClose}
            style={{ background: "rgba(212,175,55,0.88)", color: "#1a0e00", fontFamily: F.mono, fontWeight: 800, fontSize: 14, borderRadius: 999, padding: "4px 16px", textDecoration: "none" }}>{v}</Link>
        )}
      </div>

      {/* Main — תמונה + פאנל מידע (row בדסקטופ, column במובייל). tall → גלילה רציפה. */}
      <div className={`lb-main${tall ? " lb-scroll" : ""}`}>
        <div
          className="lb-imgpane"
          onClick={e => e.stopPropagation()}
          onTouchStart={e => { touchStart.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchStart.current == null) return;
            const dx = e.changedTouches[0].clientX - touchStart.current;
            touchStart.current = null;
            if (Math.abs(dx) < 40) return;
            dx < 0 ? next() : prev();
          }}
        >
          {images.length > 1 && (
            <button onClick={prev} style={navBtnStyle("right")} aria-label="הקודם">&#8250;</button>
          )}
          {h?.image_url
            ? <img key={fadeKey} src={h.image_url} alt={title || ""} className={`lb-img${tall ? " tall" : ""}`} style={{ animation: "lb-fade .25s ease" }}
                onLoad={e => { const t = e.currentTarget; if (t.naturalWidth) setTall(t.naturalHeight > t.naturalWidth * 1.5); }} />
            : <div style={{ width: 360, height: 240, background: "#1a1a1a", borderRadius: 10 }} />
          }
          {images.length > 1 && (
            <button onClick={next} style={navBtnStyle("left")} aria-label="הבא">&#8249;</button>
          )}
        </div>

        {hasInfo && (
          <aside className="lb-panel" onClick={e => e.stopPropagation()}>
            {note && (
              <div style={{ display: "inline-block", background: "rgba(62,166,255,0.14)", border: "1px solid rgba(62,166,255,0.5)", color: "#8fd0ff", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: "5px 14px", marginBottom: 12 }}>
                {note}
              </div>
            )}
            {title
              ? <div style={{ color: "#fff", fontFamily: F.regal, fontSize: 18, fontWeight: 700, lineHeight: 1.45, marginBottom: 6 }}>{title}</div>
              : h?.name ? <div style={{ color: "#ffffffcc", fontFamily: F.body, fontSize: 15, marginBottom: 6 }}>{h.name}</div> : null}

            {date && (
              <div style={{ color: "#ffffff77", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>🗓️ {date}</div>
            )}

            {nums.length > 0 && (
              <div className="lb-sec">
                <div className="lb-sec-t">המספרים בתמונה</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {nums.map(n => {
                    const dom = n === v;
                    const meaning = KEY_NUMBERS[n];
                    return (
                      <Link key={n} to={`/number/${n}`} onClick={onClose} className={`lb-num${dom ? " dom" : ""}`}>
                        <span className="lb-num-v">{n}</span>
                        {meaning && <span className="lb-num-m">{meaning}</span>}
                        <span className="lb-num-go">→</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {desc && (
              <div className="lb-sec">
                <div className="lb-sec-t">תיאור</div>
                <div style={{ color: "#ffffffb5", fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{desc}</div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="lb-sec">
                <div className="lb-sec-t">תגיות</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {tags.map(t => <span key={t} className="lb-tag">{t}</span>)}
                </div>
              </div>
            )}

            {v != null && (
              <Link to={`/number/${v}`} onClick={onClose} className="lb-cta">
                כל הרמזים וההקשרים של {v} →
              </Link>
            )}

            {onEdit && (
              <button onClick={e => { e.stopPropagation(); onEdit(images[idx]); }} className="lb-edit" aria-label="עריכת תמונה">
                ✏️ עריכת תמונה — משפיע בכל מקום
              </button>
            )}
          </aside>
        )}
      </div>

      {/* Dots navigation */}
      {images.length > 1 && images.length <= 20 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "0 16px 10px", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {images.map((_, i) => (
            <button key={i} onClick={() => go(i)}
              style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 999, background: i === idx ? "#d4af37" : "#ffffff33", border: "none", cursor: "pointer", transition: "all .25s" }}
              aria-label={`תמונה ${i + 1}`} />
          ))}
        </div>
      )}

      {/* פס סגירה תחתון — שחור, תמיד גלוי */}
      <div onClick={e => e.stopPropagation()}
        style={{ flexShrink: 0, display: "flex", justifyContent: "center", padding: "10px 16px calc(12px + env(safe-area-inset-bottom))",
          background: "linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0) 100%)" }}>
        <button onClick={onClose} aria-label="סגור תמונה"
          style={{ background: "rgba(0,0,0,0.72)", border: "2px solid rgba(255,255,255,0.7)", color: "#fff", fontFamily: F.heading, fontWeight: 800, fontSize: 15.5,
            borderRadius: 999, padding: "11px 34px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 9, boxShadow: "0 4px 18px rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}>✕ סגירה</button>
      </div>
    </div>
  ), document.body);
}

const LB_CSS = `
  @keyframes lb-fade { from { opacity: 0; transform: scale(.975); } to { opacity: 1; transform: scale(1); } }
  .lb-main { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .lb-imgpane { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; min-height: 0; padding: 0 6px; }
  .lb-img { max-width: min(92vw, 1000px); max-height: calc(100vh - 200px); object-fit: contain; border-radius: 10px; display: block; }
  /* 🖼️ תמונה גבוהה (צילום ערך/מאמר): במקום לדחוס לגובה-המסך ולהקטין את הטקסט — מציגים ברוחב קריא,
     גוללים אנכית דרך כל המודאל, והטקסט/פאנל זורם ברור מתחת (תיקון «רואים את התמונה אבל הטקסט מתחתיה»). */
  .lb-main.lb-scroll { overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .lb-main.lb-scroll .lb-imgpane { flex: none; align-items: flex-start; padding: 10px 6px; }
  .lb-img.tall { max-height: none; width: min(94vw, 640px); height: auto; }
  .lb-panel { flex-shrink: 0; max-height: 38vh; overflow-y: auto; padding: 14px 18px 18px; -webkit-overflow-scrolling: touch; }
  .lb-main.lb-scroll .lb-panel { max-height: none; overflow: visible; }
  .lb-sec { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); }
  .lb-sec-t { color: #ffffff66; font-family: ${F.heading}; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; }
  .lb-num { display: flex; align-items: center; gap: 10px; text-decoration: none;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,55,0.2); border-radius: 10px; padding: 8px 12px; transition: border-color .15s, background .15s; }
  .lb-num:hover { border-color: #d4af37; background: rgba(212,175,55,0.1); }
  .lb-num.dom { background: linear-gradient(135deg, rgba(246,221,146,0.16), rgba(212,175,55,0.08)); border-color: rgba(212,175,55,0.55); }
  .lb-num-v { font-family: ${F.mono}; font-weight: 800; font-size: 16px; color: #f6dd92; min-width: 44px; }
  .lb-num.dom .lb-num-v { color: #ffe9a8; }
  .lb-num-m { flex: 1; color: #ffffffb0; font-family: ${F.body}; font-size: 12.5px; line-height: 1.4; }
  .lb-num-go { color: #d4af3788; font-size: 14px; }
  .lb-tag { background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.32); color: #e6c66a; font-family: ${F.heading}; font-size: 12px; font-weight: 700; border-radius: 999px; padding: 3px 11px; }
  .lb-cta { display: block; text-align: center; text-decoration: none; margin-top: 16px;
    background: linear-gradient(135deg, #f6dd92, #d4af37); color: #1a0e00; font-family: ${F.heading}; font-weight: 800; font-size: 13.5px;
    border-radius: 11px; padding: 11px 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
  .lb-edit { display: block; width: 100%; margin-top: 10px; cursor: pointer;
    background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.45); color: #d4af37;
    font-family: ${F.heading}; font-weight: 700; font-size: 13.5px; border-radius: 11px; padding: 10px 16px; }
  @media (min-width: 920px) {
    .lb-main, .lb-main.lb-scroll { flex-direction: row; overflow: hidden; }
    .lb-imgpane { padding: 0 10px; }
    .lb-main.lb-scroll .lb-imgpane { flex: 1; overflow-y: auto; align-items: flex-start; }
    .lb-panel, .lb-main.lb-scroll .lb-panel { width: 340px; max-height: none; overflow-y: auto; border-inline-start: 1px solid rgba(212,175,55,0.18);
      background: linear-gradient(200deg, rgba(20,15,8,0.5), rgba(6,4,2,0.4)); }
    .lb-img { max-height: calc(100vh - 150px); max-width: 100%; }
    .lb-img.tall { width: auto; max-width: 100%; max-height: none; }
  }
`;

const closeBtn = {
  background: "rgba(0,0,0,0.6)",
  border: "2px solid rgba(255,255,255,0.7)",
  color: "#fff",
  fontSize: 22,
  cursor: "pointer",
  borderRadius: 12,
  width: 46, height: 46,
  display: "flex", alignItems: "center", justifyContent: "center",
  lineHeight: 1,
  flexShrink: 0,
  backdropFilter: "blur(3px)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
};

const navBtnStyle = side => ({
  position: "absolute",
  [side]: 10,
  top: "50%", transform: "translateY(-50%)",
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
  fontSize: 34, width: 50, height: 50,
  borderRadius: "50%", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 2, transition: "background .2s",
  userSelect: "none",
});
