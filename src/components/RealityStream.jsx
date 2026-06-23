import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { cleanName } from "../lib/galleryName.js";
import { stripHtml } from "../lib/format.js";
import { isNewSince } from "../lib/crossesNew.js";
import { domNum, hintNums, hintTags, shortDate } from "../lib/reality.js";

// ===== זרם המציאות — גלריה אחת אינסופית של «רמזים» =====
// כל כרטיס = רמז: תמונה + מספר דומיננטי + תאריך + תגיות. גלילה אינסופית (IntersectionObserver).
// lightbox פנימי; השבב המספרי מקשר לדף המספר הקנוני (/number/:n) — חוק העץ האחד.

const PAGE = 12;

export default function RealityStream({ hints = [], cutoff, compact = false, onPick }) {
  const P = usePalette();
  const [visible, setVisible] = useState(compact ? 8 : PAGE);
  const [lightbox, setLightbox] = useState(null);
  const sentinel = useRef(null);

  useEffect(() => { setVisible(compact ? 8 : PAGE); }, [hints, compact]);

  useEffect(() => {
    if (compact || !sentinel.current) return;
    const io = new IntersectionObserver(es => {
      if (es[0].isIntersecting) setVisible(v => Math.min(v + PAGE, hints.length));
    }, { rootMargin: "600px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [compact, hints.length]);

  if (!hints.length) {
    return <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: "36px 16px", fontSize: 14 }}>אין רמזים תואמים.</div>;
  }

  const shown = hints.slice(0, visible);

  return (
    <div style={{ direction: "rtl" }}>
      <style>{`
        .rs-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        @media (max-width:820px){ .rs-grid{ grid-template-columns:repeat(3,1fr); } }
        @media (max-width:520px){ .rs-grid{ grid-template-columns:1fr 1fr; } }
        .rs-card { background:${P.card}; border:1px solid ${P.border}; border-radius:14px; overflow:hidden; display:flex; flex-direction:column;
          transition:transform .15s,border-color .15s; }
        .rs-card.fresh { border-color:#e0556a; box-shadow:0 0 0 1px #e0556a55; }
        .rs-card:hover { transform:translateY(-3px); border-color:${P.accent}; }
        .rs-thumb { height:140px; position:relative; cursor:zoom-in; background-size:cover; background-position:center; }
        .rs-new { position:absolute; top:8px; inset-inline-end:8px; background:#e0556a; color:#fff; font-family:${F.heading};
          font-size:10.5px; font-weight:800; border-radius:999px; padding:2px 9px; animation:hn-pulse 1.8s ease-in-out infinite; }
        .rs-num { position:absolute; top:8px; inset-inline-start:8px; text-decoration:none; background:rgba(212,175,55,0.95); color:#1a0e00;
          font-family:${F.mono}; font-size:13px; font-weight:800; border-radius:999px; padding:2px 10px; }
        .rs-body { padding:10px 12px; display:flex; flex-direction:column; gap:6px; flex:1; }
        .rs-date { color:${P.inkSoft}; font-family:${F.heading}; font-size:11px; }
        .rs-title { color:${P.ink}; font-family:${F.regal}; font-size:14px; font-weight:700; line-height:1.4;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .rs-tags { display:flex; gap:5px; flex-wrap:wrap; margin-top:auto; }
        .rs-tag { font-family:${F.heading}; font-size:10.5px; color:${P.inkSoft}; background:${P.cardSoft};
          border:1px solid ${P.border}; border-radius:999px; padding:1px 8px; }
      `}</style>

      <div className="rs-grid">
        {shown.map(h => {
          const fresh = cutoff ? isNewSince(h, cutoff) : false;
          const v = domNum(h);
          const title = cleanName(h.name);
          const tags = hintTags(h);
          const extraNums = hintNums(h).filter(n => n !== v).slice(0, 3);
          return (
            <article key={h.id} className={`rs-card${fresh ? " fresh" : ""}`}>
              <div className="rs-thumb" style={{ backgroundImage: h.image_url ? `url(${h.image_url})` : "none", background: h.image_url ? undefined : P.cardGrad }} onClick={() => setLightbox(h)}>
                {fresh && <span className="rs-new">🆕 חדש</span>}
                {v != null && <Link to={`/number/${v}`} className="rs-num" onClick={e => e.stopPropagation()} title="לדף המספר">{v}</Link>}
              </div>
              <div className="rs-body">
                {shortDate(h) && <div className="rs-date">🗓️ {shortDate(h)}</div>}
                {title && <div className="rs-title">{title}</div>}
                {h.description && !title && <div className="rs-title">{stripHtml(h.description)}</div>}
                {(tags.length > 0 || extraNums.length > 0) && (
                  <div className="rs-tags">
                    {tags.map((t, i) => <span key={`t${i}`} className="rs-tag">{t}</span>)}
                    {extraNums.map(n => <button key={`n${n}`} className="rs-tag" style={{ cursor: "pointer" }} onClick={() => onPick?.(n)}>#{n}</button>)}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {compact ? (
        hints.length > visible && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Link to="/gallery-updates" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 800, fontSize: 14 }}>אל זרם המציאות המלא · עוד {hints.length - visible} →</Link>
          </div>
        )
      ) : (
        visible < hints.length && <div ref={sentinel} style={{ height: 1 }} aria-hidden />
      )}

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,2,8,0.95)", overflowY: "auto", padding: "32px 16px", direction: "rtl" }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ textAlign: "left", marginBottom: 8 }}>
              <button onClick={() => setLightbox(null)} style={{ background: "none", border: "1px solid #ffffff55", color: "#fff", fontSize: 22, cursor: "pointer", borderRadius: 8, width: 42, height: 42 }}>×</button>
            </div>
            <img src={lightbox.image_url} alt={cleanName(lightbox.name) || ""} style={{ width: "100%", display: "block", borderRadius: 12 }} />
            {(cleanName(lightbox.name) || lightbox.description) && (
              <div style={{ color: "#eee", fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, marginTop: 12, whiteSpace: "pre-wrap" }}>
                {cleanName(lightbox.name) && <div style={{ fontFamily: F.regal, fontWeight: 700, marginBottom: 6 }}>{cleanName(lightbox.name)}</div>}
                {lightbox.description && stripHtml(lightbox.description)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
