import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { cleanName } from "../lib/galleryName.js";
import { shortDate, domNum, hintNums } from "../lib/reality.js";

export default function Lightbox({ images = [], initialIndex = 0, onClose }) {
  const [idx, setIdx] = useState(initialIndex);
  const [fadeKey, setFadeKey] = useState(0);
  const touchStart = useRef(null);

  useEffect(() => { setIdx(initialIndex); }, [initialIndex]);

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
      <style>{`
        @keyframes lb-fade { from { opacity: 0; transform: scale(.975); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Header */}
      <div
        style={{ display: "flex", alignItems: "center", padding: "10px 14px", gap: 10, flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={closeBtn} aria-label="סגור">✕</button>
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

      {/* Image */}
      <div
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", minHeight: 0 }}
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
          ? <img
              key={fadeKey}
              src={h.image_url}
              alt={title || ""}
              style={{
                maxWidth: "min(90vw, 1000px)", maxHeight: "calc(100vh - 160px)",
                objectFit: "contain", borderRadius: 10, display: "block",
                animation: "lb-fade .25s ease",
              }}
            />
          : <div style={{ width: 360, height: 240, background: "#1a1a1a", borderRadius: 10 }} />
        }

        {images.length > 1 && (
          <button onClick={next} style={navBtnStyle("left")} aria-label="הבא">&#8249;</button>
        )}
      </div>

      {/* Footer info */}
      {(title || h?.name || date || h?.description || nums.length > 0) && (
        <div
          style={{ padding: "10px 20px 14px", textAlign: "center", flexShrink: 0, maxWidth: 720, margin: "0 auto", width: "100%" }}
          onClick={e => e.stopPropagation()}
        >
          {title
            ? <div style={{ color: "#fff", fontFamily: F.regal, fontSize: 16.5, fontWeight: 700, marginBottom: 4 }}>{title}</div>
            : h?.name
              ? <div style={{ color: "#ffffffaa", fontFamily: F.body, fontSize: 14, marginBottom: 4 }}>{h.name}</div>
              : null
          }
          {date && (
            <div style={{ color: "#ffffff66", fontFamily: F.heading, fontSize: 12, marginBottom: 6 }}>
              🗓️ {date}
            </div>
          )}
          {h?.description && (
            <div style={{ color: "#ffffffaa", fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, marginBottom: 6,
              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {h.description.replace(/<[^>]+>/g, "")}
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
          style={{ display: "flex", justifyContent: "center", gap: 6, padding: "0 16px 12px", flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
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
