import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import Lightbox from "./Lightbox.jsx";
import HintCard from "./HintCard.jsx";

// ===== זרם המציאות — «קיר חי» (Masonry) של רמזים =====
// כל כרטיס = רמז: תמונה בגובה טבעי + מספר דומיננטי + תאריך + תגיות. גלילה אינסופית (IntersectionObserver).
// קיר טורים (column-count) → גבהים משתנים כמו Pinterest; אנימציית הופעה מדורגת.
// lightbox פנימי; השבב המספרי מקשר לדף המספר הקנוני (/number/:n) — חוק העץ האחד.

const PAGE = 12;

// onLightbox(hints, idx) — אם מסופק, הורה מנהל את הלייטבוקס (לתמיכה ב-hero מאוחד).
// אם לא מסופק, הרכיב מנהל לייטבוקס פנימי עם <Lightbox> ומאפשר ניווט בין כל הרמזים.
export default function RealityStream({ hints = [], cutoff, compact = false, onPick, palette, onLightbox, onAddToStream, onEdit }) {
  const auto = usePalette();
  const P = palette || auto;
  const [visible, setVisible] = useState(compact ? 8 : PAGE);
  const [lbIdx, setLbIdx] = useState(null);
  const sentinel = useRef(null);

  useEffect(() => { setVisible(compact ? 8 : PAGE); }, [hints, compact]);

  useEffect(() => {
    if (compact || !sentinel.current) return;
    const io = new IntersectionObserver(es => {
      if (es[0].isIntersecting) setVisible(v => Math.min(v + PAGE, hints.length));
    }, { rootMargin: "700px" });
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
        .rs-wall { column-count:4; column-gap:14px; }
        @media (max-width:980px){ .rs-wall{ column-count:3; } }
        @media (max-width:640px){ .rs-wall{ column-count:2; column-gap:10px; } }
        .rs-card { break-inside:avoid; -webkit-column-break-inside:avoid; margin-bottom:14px; display:block; width:100%;
          background:${P.card}; border:1px solid ${P.border}; border-radius:16px; overflow:hidden;
          transition:transform .18s, border-color .18s, box-shadow .18s; animation:rs-rise .5s cubic-bezier(.2,.7,.3,1) both; }
        @media (max-width:640px){ .rs-card{ margin-bottom:10px; border-radius:13px; } }
        @keyframes rs-rise { from{ opacity:0; transform:translateY(14px) scale(.985); } to{ opacity:1; transform:none; } }
        .rs-card:hover { transform:translateY(-4px); border-color:${P.accent}; box-shadow:0 14px 40px rgba(0,0,0,.4), 0 0 26px ${P.glow}; }
        .rs-card.fresh { border-color:#e0556a; box-shadow:0 0 0 1px #e0556a55; }
        .rs-imgwrap { position:relative; cursor:zoom-in; overflow:hidden; line-height:0; background:${P.cardSoft}; }
        .rs-imgwrap img { width:100%; height:auto; display:block; transition:transform .5s cubic-bezier(.2,.7,.3,1); }
        .rs-card:hover .rs-imgwrap img { transform:scale(1.05); }
        .rs-shade { position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,.32) 0%, transparent 26%, transparent 62%, rgba(0,0,0,.55) 100%); pointer-events:none; }
        .rs-new { position:absolute; top:9px; inset-inline-end:9px; background:#e0556a; color:#fff; font-family:${F.heading};
          font-size:10.5px; font-weight:800; border-radius:999px; padding:2px 9px; animation:hn-pulse 1.8s ease-in-out infinite; z-index:2; }
        .rs-num { position:absolute; top:9px; inset-inline-start:9px; text-decoration:none; background:rgba(212,175,55,0.96); color:#1a0e00;
          font-family:${F.mono}; font-size:13.5px; font-weight:800; border-radius:999px; padding:2px 11px; z-index:2;
          box-shadow:0 2px 10px rgba(0,0,0,.35); transition:transform .15s; }
        .rs-num:hover { transform:scale(1.08); }
        .rs-zoom { position:absolute; bottom:9px; inset-inline-start:9px; z-index:2; color:#fff; font-size:13px; opacity:0; transition:opacity .2s;
          background:rgba(0,0,0,.45); border-radius:999px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; }
        .rs-card:hover .rs-zoom { opacity:1; }
        .rs-body { padding:10px 12px; display:flex; flex-direction:column; gap:6px; }
        .rs-date { color:${P.inkSoft}; font-family:${F.heading}; font-size:11px; }
        .rs-title { color:${P.ink}; font-family:${F.regal}; font-size:14px; font-weight:700; line-height:1.4;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .rs-tags { display:flex; gap:5px; flex-wrap:wrap; }
        .rs-tag { font-family:${F.heading}; font-size:10.5px; color:${P.inkSoft}; background:${P.cardSoft};
          border:1px solid ${P.border}; border-radius:999px; padding:1px 8px; }
        button.rs-tag { cursor:pointer; }
        button.rs-tag:hover { border-color:${P.accent}; color:${P.accentText}; }
      `}</style>

      <div className="rs-wall">
        {shown.map((h, idx) => (
          <HintCard
            key={h.id}
            hint={h}
            idx={idx}
            cutoff={cutoff}
            palette={P}
            onPick={onPick}
            onOpen={() => onLightbox ? onLightbox(hints, idx) : setLbIdx(idx)}
            onAddToStream={onAddToStream ? () => onAddToStream(h) : null}
            onEdit={onEdit ? () => onEdit(h) : null}
          />
        ))}
      </div>

      {compact ? (
        hints.length > visible && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Link to="/archive" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 800, fontSize: 14 }}>אל זרם המציאות המלא · עוד {hints.length - visible} →</Link>
          </div>
        )
      ) : (
        visible < hints.length && <div ref={sentinel} style={{ height: 1 }} aria-hidden />
      )}

      {!onLightbox && lbIdx != null && (
        <Lightbox images={hints} initialIndex={lbIdx} onClose={() => setLbIdx(null)} />
      )}
    </div>
  );
}
