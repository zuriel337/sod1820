import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getImagesByPrimaryValue } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";

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
  const [lbIdx, setLbIdx] = useState(null); // אינדקס מסך-מלא (null=סגור)
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);

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
  const lbGo = useCallback(d => setLbIdx(i => i == null || !total ? i : (i + d + total) % total), [total]);

  // ריצה אוטומטית — אחת אחרי השנייה. עוצר במסך-מלא / מגע / ריחוף.
  useEffect(() => {
    if (paused || lbIdx != null || total < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % total), 4000);
    return () => clearInterval(id);
  }, [paused, lbIdx, total]);

  // מקלדת: במסך-מלא מנווט את המסך-מלא; אחרת את הקרוסלה. ESC סוגר.
  useEffect(() => {
    const onKey = e => {
      if (lbIdx != null) {
        if (e.key === "Escape") setLbIdx(null);
        else if (e.key === "ArrowRight") lbGo(-1);
        else if (e.key === "ArrowLeft") lbGo(1);
      } else {
        if (e.key === "ArrowRight") go(-1);
        else if (e.key === "ArrowLeft") go(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, lbGo, lbIdx]);

  if (imgs === null) return <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 13, padding: "24px 0" }}>טוען גלריה…</div>;
  if (!total) return null;

  const btn = {
    cursor: "pointer", border: `1px solid ${P.borderStrong}`, background: P.card, color: P.accentText,
    width: 46, height: 44, borderRadius: 12, fontSize: 22, fontWeight: 800, lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto",
  };

  const lb = lbIdx != null ? imgs[lbIdx] : null;

  return (
    <div
      style={{ maxWidth: 560, margin: "1.2em auto 0", direction: "rtl" }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {/* במה — שקופית אחת בכל פעם */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${P.borderStrong}`, background: P.cardSoft, boxShadow: `0 6px 26px ${P.glow}` }}>
        <div style={{ position: "relative", width: "100%", height: "clamp(280px,62vw,440px)", overflow: "hidden", direction: "ltr" }}>
          <div style={{ display: "flex", height: "100%", transition: "transform .55s cubic-bezier(.22,.61,.36,1)", transform: `translateX(${-idx * 100}%)` }}>
            {imgs.map((img, i) => (
              <button
                key={img.id || i}
                onClick={() => setLbIdx(i)}
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
      </div>

      {/* חיצים + מונה — בתחתית הבמה (לא על התמונה) */}
      {total > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 12 }}>
          <button onClick={() => go(-1)} aria-label="הקודם" style={btn}>›</button>
          <div style={{ minWidth: 64, textAlign: "center", color: P.accentText, fontFamily: F.mono, fontSize: 14, fontWeight: 700 }}>{idx + 1} / {total}</div>
          <button onClick={() => go(1)} aria-label="הבא" style={btn}>‹</button>
        </div>
      )}

      {/* כיתוב השקופית: שם · תיאור (מה שנכתב מתחת לתמונה) · מספרים לחיצים · תאריך העלאה */}
      {(() => {
        const cur = imgs[idx];
        const nums = imgNumbers(cur);
        const dt = uploadDate(cur);
        const desc = cur.description ? stripHtml(cur.description).trim() : "";
        return (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            {cur.name && <div style={{ color: P.ink, fontFamily: F.heading, fontSize: 14.5, fontWeight: 700, marginBottom: 8, lineHeight: 1.5 }}>{cur.name}</div>}
            {desc && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.8, marginBottom: 10, whiteSpace: "pre-wrap" }}>{desc}</div>}
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

      {/* לייטבוקס — מסך מלא, מדפדף תמונה-תמונה (כפתורים למטה · מקלדת · החלקה) */}
      {lb && (
        <div
          onClick={() => setLbIdx(null)}
          onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={e => { const dx = touchX.current == null ? 0 : e.changedTouches[0].clientX - touchX.current; touchX.current = null; if (Math.abs(dx) > 45) lbGo(dx > 0 ? -1 : 1); }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,3,10,0.94)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 12px", direction: "rtl" }}
        >
          <img src={lb.image_url} alt={lb.name || ""} onClick={e => e.stopPropagation()} style={{ maxWidth: "96vw", maxHeight: lb.name || lb.description ? "64vh" : "80vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 10px 50px rgba(0,0,0,0.7)", cursor: "default" }} />

          {(lb.name || lb.description) && (
            <div onClick={e => e.stopPropagation()} style={{ maxWidth: 720, textAlign: "center", marginTop: 12, cursor: "default" }}>
              {lb.name && <div style={{ color: "#e8c840", fontFamily: F.heading, fontSize: 17, fontWeight: 700 }}>{lb.name}</div>}
              {lb.description && <div style={{ color: "#cfc9d6", fontFamily: F.body, fontSize: 14, lineHeight: 1.9, marginTop: 8, whiteSpace: "pre-wrap", maxHeight: "18vh", overflow: "auto" }}>{stripHtml(lb.description)}</div>}
            </div>
          )}

          {/* ניווט תחתון במסך-מלא */}
          {total > 1 && (
            <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 16 }}>
              <button onClick={() => lbGo(-1)} aria-label="הקודם" style={{ ...btn, width: 56, height: 50, background: "rgba(255,255,255,0.08)", color: "#fff", borderColor: "rgba(255,255,255,0.35)" }}>›</button>
              <div style={{ minWidth: 70, textAlign: "center", color: "#f3e6c0", fontFamily: F.mono, fontSize: 15, fontWeight: 700 }}>{lbIdx + 1} / {total}</div>
              <button onClick={() => lbGo(1)} aria-label="הבא" style={{ ...btn, width: 56, height: 50, background: "rgba(255,255,255,0.08)", color: "#fff", borderColor: "rgba(255,255,255,0.35)" }}>‹</button>
            </div>
          )}

          <button onClick={() => setLbIdx(null)} aria-label="סגור" style={{ position: "fixed", top: 16, left: 16, width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
      )}
    </div>
  );
}
