import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { cleanName } from "../lib/galleryName.js";
import { shortDate, domNum, hintNums } from "../lib/reality.js";

// ===== לייטבוקס מסך-מלא — ניווט ←→ + מגע + מקלדת =====
// RTL: ציר התמונות direction:ltr, translateX(-idx*100%) — חוק ה-CLAUDE.md (carousel_rtl).
// ניווט: לחצנים + ArrowLeft/ArrowRight + swipe. Escape לסגירה.

export default function Lightbox({ images = [], initialIndex = 0, onClose }) {
  const [idx, setIdx] = useState(initialIndex);
  const touchStart = useRef(null);

  useEffect(() => { setIdx(initialIndex); }, [initialIndex]);

  const prev = () => setIdx(i => (i > 0 ? i - 1 : images.length - 1));
  const next = () => setIdx(i => (i < images.length - 1 ? i + 1 : 0));

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
  const nums = [...new Set(hintNums(h || {}))].slice(0, 6);

  return (
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(2,1,6,0.97)",
        display: "flex", flexDirection: "column",
        direction: "rtl",
      }}
    >
      {/* ===== Header ===== */}
      <div
        style={{ display: "flex", alignItems: "center", padding: "10px 14px", gap: 10, flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={closeBtn}
          aria-label="סגור"
        >✕</button>
        {images.length > 1 && (
          <span style={{ color: "#ffffff55", fontFamily: F.heading, fontSize: 12.5 }}>
            {idx + 1} / {images.length}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {v != null && (
          <Link
            to={`/number/${v}`}
            onClick={onClose}
            style={{
              background: "rgba(212,175,55,0.88)", color: "#1a0e00",
              fontFamily: F.mono, fontWeight: 800, fontSize: 14,
              borderRadius: 999, padding: "4px 16px", textDecoration: "none",
            }}
          >{v}</Link>
        )}
      </div>

      {/* ===== Image + nav ===== */}
      <div
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", minHeight: 0, overflow: "hidden" }}
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

        {/* track direction:ltr + translateX(-idx*100%) כחוק ה-CLAUDE.md */}
        <div style={{ width: "min(90vw, 1000px)", height: "calc(100vh - 160px)", overflow: "hidden", position: "relative" }}>
          <div
            style={{
              display: "flex", direction: "ltr",
              width: `${images.length * 100}%`,
              height: "100%",
              transition: "transform .35s cubic-bezier(.25,.8,.25,1)",
              transform: `translateX(-${(idx / images.length) * 100}%)`,
            }}
          >
            {images.map((img, i) => (
              <div
                key={img?.id ?? i}
                style={{ width: `${100 / images.length}%`, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                {img?.image_url
                  ? <img
                      src={img.image_url}
                      alt={cleanName(img?.name) || ""}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 10, display: "block" }}
                    />
                  : <div style={{ width: 360, height: 240, background: "#1a1a1a", borderRadius: 10 }} />
                }
              </div>
            ))}
          </div>
        </div>

        {images.length > 1 && (
          <button onClick={next} style={navBtnStyle("left")} aria-label="הבא">&#8249;</button>
        )}
      </div>

      {/* ===== Footer info ===== */}
      {(title || date || nums.length > 0) && (
        <div
          style={{ padding: "10px 20px 18px", textAlign: "center", flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {title && (
            <div style={{ color: "#fff", fontFamily: F.regal, fontSize: 16.5, fontWeight: 700, marginBottom: 5 }}>
              {title}
            </div>
          )}
          {date && (
            <div style={{ color: "#ffffff66", fontFamily: F.heading, fontSize: 12, marginBottom: 7 }}>
              🗓️ {date}
            </div>
          )}
          {nums.length > 0 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {nums.map(n => (
                <Link
                  key={n}
                  to={`/number/${n}`}
                  onClick={onClose}
                  style={{
                    background: "rgba(212,175,55,0.15)",
                    border: "1px solid rgba(212,175,55,0.45)",
                    color: "#d4af37",
                    fontFamily: F.mono, fontWeight: 800, fontSize: 13,
                    borderRadius: 999, padding: "3px 13px",
                    textDecoration: "none",
                  }}
                >{n}</Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dots navigation */}
      {images.length > 1 && images.length <= 20 && (
        <div
          style={{ display: "flex", justifyContent: "center", gap: 6, padding: "0 16px 14px", flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 20 : 7, height: 7,
                borderRadius: 999,
                background: i === idx ? "#d4af37" : "#ffffff33",
                border: "none", cursor: "pointer",
                transition: "all .25s",
              }}
              aria-label={`תמונה ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const closeBtn = {
  background: "none",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
  fontSize: 18,
  cursor: "pointer",
  borderRadius: 8,
  width: 38, height: 38,
  display: "flex", alignItems: "center", justifyContent: "center",
  lineHeight: 1,
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
