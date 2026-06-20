import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getImagesByPrimaryValue } from "../lib/supabase.js";

// 🎞️ קרוסלת רמזים — תמונות לפי ערך, רצות אחת-אחרי-השנייה (לא רשת).
// כל שקופית: תמונה שנפתחת בלייטבוקס · צ'יפ מספר → /number/:n · תאריך העלאה.
// עץ אחד: רכיב גלריה קנוני יחיד — אותו מנוע בתוך פוסט וגם בעמוד המספר (חוק לכל מספר).
//   • <PostImageCarousel value={n} /> — טוען לבד לפי primary_value (בתוך פוסט).
//   • <PostImageCarousel value={n} images={[...]} /> — מקבל תמונות מוכנות (עמוד המספר:
//     התאמת primary_value או all_values, בלי שאילתה נוספת — לא מאבדים הצלבות).

const HE_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

// תאריך העלאה: occurred_at אם קיים, אחרת מתוך נתיב /uploads/YYYY/MM/.
function uploadDate(img) {
  const raw = img.occurred_at || img.created_at;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d)) return `${HE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  const m = (img.image_url || "").match(/\/uploads\/(\d{4})\/(\d{2})\//);
  if (m) return `${HE_MONTHS[(+m[2]) - 1] || m[2]} ${m[1]}`;
  return null;
}

// המספרים שבתמונה: primary קודם, ואז all_values (ללא כפילות), מסוננים למספרים תקפים.
function imgNumbers(img) {
  const out = [];
  const push = v => { const n = Number(v); if (n > 0 && !out.includes(n)) out.push(n); };
  push(img.primary_value);
  (Array.isArray(img.all_values) ? img.all_values : []).forEach(push);
  return out;
}

export default function PostImageCarousel({ value, images }) {
  const P = usePalette();
  const provided = Array.isArray(images);
  const [imgs, setImgs] = useState(provided ? images : null); // null=טוען
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // תמונות מוכנות (עמוד המספר) — לא טוענים שוב; אחרת טוענים לפי ערך (בתוך פוסט).
    if (provided) { setImgs(images); setIdx(0); return; }
    let alive = true;
    setImgs(null); setIdx(0);
    getImagesByPrimaryValue(value).then(d => { if (alive) setImgs(d); }).catch(() => alive && setImgs([]));
    return () => { alive = false; };
  }, [value, provided, images]);

  const total = imgs ? imgs.length : 0;
  const go = useCallback(d => setIdx(i => total ? (i + d + total) % total : 0), [total]);

  // ריצה אוטומטית — אחת אחרי השנייה. עוצר בלייטבוקס / מגע / ריחוף.
  useEffect(() => {
    if (paused || lightbox || total < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % total), 4000);
    return () => clearInterval(id);
  }, [paused, lightbox, total]);

  // ESC סוגר לייטבוקס; חיצים מנווטים
  useEffect(() => {
    const onKey = e => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (imgs === null) return <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 13, padding: "24px 0" }}>טוען גלריה…</div>;
  if (!total) return null;

  const btn = {
    cursor: "pointer", border: `1px solid ${P.borderStrong}`, background: P.card, color: P.accentText,
    width: 40, height: 40, borderRadius: "50%", fontSize: 18, fontWeight: 800, lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto",
  };

  return (
    <div
      style={{ maxWidth: 560, margin: "1.2em auto 0", direction: "rtl" }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {/* במה — שקופית אחת בכל פעם */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${P.borderStrong}`, background: P.cardSoft, boxShadow: `0 6px 26px ${P.glow}` }}>
        <div style={{ position: "relative", width: "100%", height: "clamp(280px,62vw,440px)", overflow: "hidden", direction: "ltr" }}>
          <div style={{ display: "flex", height: "100%", transition: "transform .55s cubic-bezier(.22,.61,.36,1)", transform: `translateX(${idx * 100}%)` }}>
            {imgs.map((img, i) => (
              <button
                key={img.id || i}
                onClick={() => setLightbox(img.image_url)}
                title="הגדל תמונה"
                style={{ flex: "0 0 100%", width: "100%", height: "100%", padding: 0, border: "none", background: "transparent", cursor: "zoom-in" }}
              >
                <img
                  src={img.image_url} alt={img.name || `רמז ${value}`}
                  loading={i <= 1 ? "eager" : "lazy"}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* חיצים */}
        {total > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="הקודם" style={{ ...btn, position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", zIndex: 2 }}>›</button>
            <button onClick={() => go(1)} aria-label="הבא" style={{ ...btn, position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", zIndex: 2 }}>‹</button>
            <div style={{ position: "absolute", top: 10, left: 12, background: "rgba(0,0,0,0.55)", color: "#f3e6c0", fontFamily: F.mono, fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 999, zIndex: 2 }}>
              {idx + 1} / {total}
            </div>
          </>
        )}
      </div>

      {/* כיתוב השקופית: שם · מספרים לחיצים · תאריך העלאה */}
      {(() => {
        const cur = imgs[idx];
        const nums = imgNumbers(cur);
        const dt = uploadDate(cur);
        return (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            {cur.name && <div style={{ color: P.ink, fontFamily: F.heading, fontSize: 14.5, fontWeight: 700, marginBottom: 8, lineHeight: 1.5 }}>{cur.name}</div>}
            <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
              {nums.map(n => (
                <Link key={n} to={`/number/${n}`} title={`לדף המספר ${n}`} style={{ textDecoration: "none", fontFamily: F.mono, fontSize: 13, fontWeight: 800, color: P.onAccent, background: P.accentBtn, borderRadius: 999, padding: "4px 13px" }}>
                  {n} →
                </Link>
              ))}
              {dt && <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>📅 {dt}</span>}
            </div>
          </div>
        );
      })()}

      {/* נקודות ניווט */}
      {total > 1 && total <= 30 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
          {imgs.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`תמונה ${i + 1}`}
              style={{ cursor: "pointer", width: i === idx ? 22 : 8, height: 8, borderRadius: 999, border: "none", padding: 0, background: i === idx ? P.accentBtn : P.border, transition: "all .3s" }} />
          ))}
        </div>
      )}

      {/* לייטבוקס — תמונה מלאה */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,3,10,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}>
          <img src={lightbox} alt="" style={{ maxWidth: "96vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 10px 50px rgba(0,0,0,0.7)" }} />
          <button onClick={() => setLightbox(null)} aria-label="סגור" style={{ position: "fixed", top: 16, left: 16, width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
      )}
    </div>
  );
}
