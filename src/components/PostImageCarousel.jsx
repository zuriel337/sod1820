import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getImagesByPrimaryValue, getImagesByGallery, setImageCuration } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import { cleanName } from "../lib/galleryName.js";
import { useAuth } from "../lib/AuthContext.jsx";
import ImageEditModal from "./ImageEditModal.jsx";

// 🎞️ קרוסלת רמזים — תמונות לפי ערך, רצות אחת-אחרי-השנייה (לא רשת).
// כל שקופית: תמונה שנפתחת בלייטבוקס · צ'יפ מספר → /number/:n · תאריך העלאה.
// עץ אחד: רכיב גלריה קנוני יחיד — אותו מנוע בתוך פוסט וגם בעמוד המספר (חוק לכל מספר).
//   • <PostImageCarousel value={n} /> — טוען לבד לפי primary_value (בתוך פוסט).
//   • <PostImageCarousel value={n} images={[...]} /> — מקבל תמונות מוכנות (עמוד המספר:
//     התאמת primary_value או all_values, בלי שאילתה נוספת — לא מאבדים הצלבות).
//   • <PostImageCarousel gallery={wpGalleryId} /> — טוען גלריה שלמה (wp_gallery_id) לפי
//     הסדר הידני שלה. כך פוסט ישן מציג את gallery_images העריך במקום HTML קפוא (עץ אחד).

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

// תאריך מיון אמין: occurred_at → תאריך מהנתיב /uploads/YYYY/MM/ → created_at.
// (כך גם תמונות בלי occurred_at לא "שוקעות" לתחתית והסדר נשאר כרונולוגי נורמלי.)
function dateVal(img) {
  if (img.occurred_at) { const d = new Date(img.occurred_at); if (!isNaN(d)) return d.getTime(); }
  const m = (img.image_url || "").match(/\/uploads\/(\d{4})\/(\d{2})\//);
  if (m) return new Date(+m[1], (+m[2]) - 1, 1).getTime();
  if (img.created_at) { const d = new Date(img.created_at); if (!isNaN(d)) return d.getTime(); }
  return 0;
}

// המספרים שבתמונה: primary קודם, ואז all_values (ללא כפילות), מסוננים למספרים תקפים.
function imgNumbers(img) {
  const out = [];
  const push = v => { const n = Number(v); if (n > 0 && !out.includes(n)) out.push(n); };
  push(img.primary_value);
  (Array.isArray(img.all_values) ? img.all_values : []).forEach(push);
  return out;
}

export default function PostImageCarousel({ value, images, gallery }) {
  const P = usePalette();
  const { isAdmin } = useAuth();                  // 🛠 שליטה אדמינית בכל תמונה (אותו עורך כמו בגלריה)
  const provided = Array.isArray(images);
  const [imgs, setImgs] = useState(provided ? images : null); // null=טוען
  const [idx, setIdx] = useState(0);
  const [lbIdx, setLbIdx] = useState(null); // אינדקס מסך-מלא (null=סגור)
  const [paused, setPaused] = useState(false);
  const [editImg, setEditImg] = useState(null);  // תמונה בעריכה (אדמין)
  const touchX = useRef(null);

  // שמירת עריכה — אותו מנגנון כמו בגלריה (setImageCuration). מעדכן מקומית בלי רענון.
  const applyPatch = useCallback((id, patch) => {
    setImgs(prev => {
      if (!Array.isArray(prev)) return prev;
      if (patch.curator_hidden === true) return prev.filter(g => g.id !== id);  // הוסתר → יורד מהתצוגה
      return prev.map(g => g.id === id ? { ...g, ...patch } : g);
    });
  }, []);

  useEffect(() => {
    // תמונות מוכנות (עמוד המספר) — לא טוענים שוב; אחרת טוענים לפי ערך (בתוך פוסט).
    if (provided) { setImgs(images); setIdx(0); return; }
    let alive = true;
    setImgs(null); setIdx(0);
    // מצב גלריה (wp_gallery_id) — טוען גלריה שלמה; אחרת לפי ערך-ראשי.
    const load = gallery ? getImagesByGallery(gallery) : getImagesByPrimaryValue(value);
    load.then(d => { if (alive) setImgs(d); }).catch(() => alive && setImgs([]));
    return () => { alive = false; };
  }, [value, gallery, provided, images]);

  // מיון: מאוצר (⭐) → מספרי-רקע (2701) לסוף → דומיננטי (primary, ממוקד) → כרונולוגי.
  const pics = useMemo(() => {
    if (!imgs) return [];
    // מצב גלריה — שומרים על סדר השאילתה (חשיבות↓ ואז הסדר הידני), לא ממיינים מחדש לפי ערך.
    if (gallery) return imgs;
    const BG = new Set([2701]);                                      // מספרי-רקע נפוצים (בראשית ברא) — "תוספת"
    const addon = g => (!BG.has(Number(value)) && (g.all_values || []).some(v => BG.has(Number(v))) ? 1 : 0);
    const prim = g => (Number(g.primary_value) === Number(value) ? 0 : 1);
    const focus = g => (g.all_values || []).length || 99;
    return [...imgs].sort((a, b) =>
      ((Number(b.importance) || 0) - (Number(a.importance) || 0))   // אצירה קודם
      || (addon(a) - addon(b))                                      // תמונות-רקע (2701) לסוף כשלא מחפשים אותן
      || (prim(a) - prim(b))                                        // הערך = primary → דומיננטי
      || (focus(a) - focus(b))                                      // פחות ערכים = ממוקד יותר
      || (dateVal(b) - dateVal(a)));                                // ואז חדש→ישן
  }, [imgs, value, gallery]);
  const total = pics.length;
  const go = useCallback(d => setIdx(i => total ? (i + d + total) % total : 0), [total]);
  const lbGo = useCallback(d => setLbIdx(i => i == null || !total ? i : (i + d + total) % total), [total]);

  // ריצה אוטומטית — אחת אחרי השנייה. עוצר במסך-מלא / מגע / ריחוף.
  useEffect(() => {
    if (paused || lbIdx != null || total < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % total), 4000);
    return () => clearInterval(id);
  }, [paused, lbIdx, total]);

  // אם תמונה הוסתרה/נמחקה והאינדקס חרג — להחזיר לטווח (לא להשאיר שקופית ריקה).
  useEffect(() => { if (total > 0 && idx >= total) setIdx(total - 1); }, [total, idx]);

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

  const lb = lbIdx != null ? pics[lbIdx] : null;
  const lbNm = cleanName(lb?.name);

  return (
    <div
      className="pic-carousel"
      style={{ maxWidth: 560, margin: "1.2em auto 0", direction: "rtl" }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {/* חיסון מפני כלל ניקוי תוכן WordPress (.sod-post-content div[style*=height] → max-height:24px).
          חייב ספציפיות גבוהה מ-0,2,1 — לכן כוללים .sod-post-content בסלקטור (0,3,0 מנצח). */}
      <style>{`
        /* הכלל של WP תופס גם divים עם line-height (מכיל "height") ומוחץ ל-24px —
           מסירים את התקרה מכל הקרוסלה (כולל כיתוב השם/ההסבר), ומחזירים גובה לבמה/למסילה. */
        .sod-post-content .pic-carousel div[style*="height"],
        .sod-post-content .pic-carousel button[style*="height"] { max-height: none !important; }
        .pic-carousel .pic-stage,
        .sod-post-content .pic-carousel .pic-stage { height: clamp(280px,62vw,440px) !important; max-height: none !important; }
        .pic-carousel .pic-track,
        .sod-post-content .pic-carousel .pic-track { height: 100% !important; max-height: none !important; }
      `}</style>
      {/* במה — שקופית אחת בכל פעם */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${P.borderStrong}`, background: P.cardSoft, boxShadow: `0 6px 26px ${P.glow}` }}>
        <div className="pic-stage" style={{ position: "relative", width: "100%", height: "clamp(280px,62vw,440px)", overflow: "hidden", direction: "ltr" }}>
          <div className="pic-track" style={{ display: "flex", height: "100%", transition: "transform .55s cubic-bezier(.22,.61,.36,1)", transform: `translateX(${-idx * 100}%)` }}>
            {pics.map((img, i) => (
              <button
                key={img.id || i}
                onClick={() => setLbIdx(i)}
                title="הגדל תמונה"
                style={{ flex: "0 0 100%", width: "100%", height: "100%", padding: 0, border: "none", background: "transparent", cursor: "zoom-in" }}
              >
                <img
                  src={img.image_url} alt={img.name || (value ? `רמז ${value}` : "תמונת גלריה")}
                  loading={i <= 1 ? "eager" : "lazy"}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              </button>
            ))}
          </div>
          {/* 🛠 כפתור עריכה — מנהל בלבד. עורך את התמונה הנוכחית (אותו מודל כמו בגלריה). */}
          {isAdmin && pics[idx] && (
            <button onClick={e => { e.stopPropagation(); setEditImg(pics[idx]); }}
              title="ערוך תמונה (מנהל) — תגיות, מספרים, הסתרה, מחיקה"
              style={{ position: "absolute", top: 8, insetInlineStart: 8, zIndex: 5, width: 38, height: 38, borderRadius: 10,
                border: "1px solid rgba(232,200,74,0.6)", background: "rgba(10,8,4,0.72)", color: "#f6e27a",
                fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(3px)" }}>
              ✏️
            </button>
          )}
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
        const cur = pics[idx] || pics[0];
        if (!cur) return null;
        const nums = imgNumbers(cur);
        const dt = uploadDate(cur);
        const nm = cleanName(cur.name);
        const desc = cur.description ? stripHtml(cur.description).trim() : "";
        return (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            {nm && <div style={{ color: P.ink, fontFamily: F.heading, fontSize: 14.5, fontWeight: 700, marginBottom: 8, lineHeight: 1.5 }}>{nm}</div>}
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
          {pics.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`תמונה ${i + 1}`}
              style={{ cursor: "pointer", width: i === idx ? 22 : 8, height: 8, borderRadius: 999, border: "none", padding: 0, background: i === idx ? P.accentBtn : P.border, transition: "all .3s" }} />
          ))}
        </div>
      )}

      {/* לייטבוקס — מסך מלא (portal ל-body כדי לכסות את הניווט), מדפדף תמונה-תמונה */}
      {lb && createPortal((
        <div
          onClick={() => setLbIdx(null)}
          onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={e => { const dx = touchX.current == null ? 0 : e.changedTouches[0].clientX - touchX.current; touchX.current = null; if (Math.abs(dx) > 45) lbGo(dx > 0 ? -1 : 1); }}
          style={{ position: "fixed", inset: 0, zIndex: 2147483600, background: "rgba(5,3,10,0.94)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 12px", direction: "rtl" }}
        >
          <img src={lb.image_url} alt={lbNm || ""} onClick={e => e.stopPropagation()} style={{ maxWidth: "96vw", maxHeight: lbNm || lb.description ? "64vh" : "80vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 10px 50px rgba(0,0,0,0.7)", cursor: "default" }} />

          {(lbNm || lb.description) && (
            <div onClick={e => e.stopPropagation()} style={{ maxWidth: 720, textAlign: "center", marginTop: 12, cursor: "default" }}>
              {lbNm && <div style={{ color: "#e8c840", fontFamily: F.heading, fontSize: 17, fontWeight: 700 }}>{lbNm}</div>}
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

          <button onClick={(e) => { e.stopPropagation(); setLbIdx(null); }} aria-label="סגור"
            style={{ position: "fixed", top: "max(14px, env(safe-area-inset-top))", insetInlineStart: 14, zIndex: 2147483601, width: 54, height: 54, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 30, lineHeight: 1,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(3px)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>×</button>

          {/* פס סגירה תחתון — שחור, תמיד גלוי (גם בתמונה בלי כיתוב) */}
          <button onClick={(e) => { e.stopPropagation(); setLbIdx(null); }} aria-label="סגור תמונה"
            style={{ position: "fixed", left: "50%", transform: "translateX(-50%)",
              bottom: "calc(14px + env(safe-area-inset-bottom))", zIndex: 2147483601,
              background: "rgba(0,0,0,0.72)", border: "2px solid rgba(255,255,255,0.7)", color: "#fff",
              fontFamily: F.heading, fontWeight: 800, fontSize: 15.5, borderRadius: 999, padding: "11px 34px",
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 9,
              boxShadow: "0 4px 18px rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}>✕ סגירה</button>
        </div>
      ), document.body)}

      {/* 🛠 מודל עריכת תמונה — מנהל בלבד (אותו רכיב כמו בגלריה/זרם המציאות) */}
      {editImg && (
        <ImageEditModal
          image={editImg}
          onClose={() => setEditImg(null)}
          onSave={async patch => {
            if (Object.keys(patch).length) {
              try { await setImageCuration(editImg.id, patch); applyPatch(editImg.id, patch); }
              catch (e) { alert("שגיאה בשמירה: " + (e.message || e)); return; }
            }
            setEditImg(null);
          }}
          onDelete={id => { applyPatch(id, { curator_hidden: true }); setEditImg(null); }}
        />
      )}
    </div>
  );
}
