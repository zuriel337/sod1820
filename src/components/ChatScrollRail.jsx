import React, { useEffect, useRef, useState, useCallback } from "react";

// 🛤️ כפתור-רכבל משולב לדף הצ'אט (בקשת צוריאל):
//   • אגודל זהב תלת-מימדי עבה — עבה במיוחד במחשב, נראה גם בנייד (רכיב משלנו, לא סרגל מערכת).
//   • גרירה לכל אורך הדף = גלילה (גוללים את כל השיחה).
//   • לחיצה אחת (בלי גרירה) = קפיצה חלקה לתחתית.
// שולט בגלילת המסמך (window). מופיע רק כשיש מה לגלול. מוסיף לעצמו class ל-<html>
// כדי להסתיר את סרגל המערכת — כך נשאר רק הרכבל שלנו.

const TOP = 86;     // מתחת לסרגל העליון/ניווט
const BOTTOM = 22;
const MIN_THUMB = 60;

export default function ChatScrollRail() {
  const [m, setM] = useState({ thumbH: MIN_THUMB, thumbTop: 0, visible: false });
  const drag = useRef({ on: false, moved: false, startY: 0, startScroll: 0 });

  const recompute = useCallback(() => {
    if (typeof window === "undefined") return;
    const winH = window.innerHeight;
    const docH = document.documentElement.scrollHeight;
    const scrollable = docH - winH;
    if (scrollable <= 60) { setM(p => (p.visible ? { ...p, visible: false } : p)); return; }
    const trackH = winH - TOP - BOTTOM;
    const thumbH = Math.max(MIN_THUMB, Math.min(trackH, trackH * (winH / docH)));
    const prog = window.scrollY / scrollable;             // 0..1
    const thumbTop = prog * (trackH - thumbH);
    setM({ thumbH, thumbTop, visible: true });
  }, []);

  useEffect(() => {
    recompute();
    const onScroll = () => recompute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recompute);
    // התוכן (Spot.IM) נטען מאוחר ומשנה גובה — נעקוב גם דרך ResizeObserver + טיימר ביטחון.
    let ro;
    try { ro = new ResizeObserver(recompute); ro.observe(document.body); } catch { /* noop */ }
    const id = setInterval(recompute, 1500);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recompute);
      if (ro) ro.disconnect();
      clearInterval(id);
    };
  }, [recompute]);

  const onDown = e => {
    drag.current = { on: true, moved: false, startY: e.clientY, startScroll: window.scrollY };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
    e.preventDefault();
  };
  const onMove = e => {
    const d = drag.current;
    if (!d.on) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    const winH = window.innerHeight;
    const scrollable = document.documentElement.scrollHeight - winH;
    const travel = (winH - TOP - BOTTOM) - m.thumbH;
    if (travel > 0) window.scrollTo({ top: d.startScroll + (dy / travel) * scrollable });
  };
  const onUp = e => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    if (!d.moved) {
      // לחיצה (בלי גרירה) → קפיצה חלקה לתחתית.
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    }
  };

  if (!m.visible) return null;

  return (
    <div className="sod-rail" aria-hidden>
      <div className="sod-rail-track" />
      <button
        className="sod-rail-thumb"
        style={{ top: m.thumbH ? `${m.thumbTop}px` : 0, height: `${m.thumbH}px` }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        title="גרור לגלילה · לחיצה אחת קופצת לתחתית"
        aria-label="גלילה — גרור או לחץ לקפיצה לתחתית"
      >
        <span className="sod-rail-ic">↓</span>
      </button>
      <style>{`
        .sod-rail { position:fixed; right:6px; top:${TOP}px; bottom:${BOTTOM}px;
          width:30px; z-index:60; pointer-events:none; }
        .sod-rail-track { position:absolute; inset:0; border-radius:999px; pointer-events:none;
          background:linear-gradient(90deg,#0a0814,#171228 48%,#0a0814);
          box-shadow: inset 0 0 12px rgba(0,0,0,.85), 0 0 0 1px rgba(150,110,255,.22),
                      inset 2px 0 0 rgba(150,110,255,.15), inset -2px 0 0 rgba(150,110,255,.15); }
        .sod-rail-thumb { position:absolute; inset-inline:0; margin:0; padding:0 0 9px; border-radius:999px;
          pointer-events:auto; cursor:grab; touch-action:none; -webkit-tap-highlight-color:transparent;
          display:flex; align-items:flex-end; justify-content:center;
          border:1px solid rgba(120,80,10,.75);
          background:
            linear-gradient(90deg, transparent 44%, rgba(90,55,0,.4) 50%, transparent 56%),
            linear-gradient(180deg, rgba(255,255,255,.38), rgba(255,255,255,0) 15%),
            radial-gradient(130% 46% at 50% 24%, #fff4c2, #ffd86b 44%, #c8901c 78%, #8a5e0f 100%);
          box-shadow:
            inset 0 3px 5px rgba(255,255,255,.72),
            inset 0 -7px 12px rgba(70,40,0,.72),
            inset 4px 0 6px rgba(255,255,255,.22),
            inset -4px 0 8px rgba(70,40,0,.5),
            0 5px 16px rgba(0,0,0,.5),
            0 0 16px rgba(255,200,80,.6), 0 0 36px rgba(255,170,40,.34);
          transition: box-shadow .18s ease, filter .18s ease; }
        .sod-rail-thumb:hover { filter:brightness(1.06);
          box-shadow: inset 0 3px 6px rgba(255,255,255,.82), inset 0 -7px 13px rgba(70,40,0,.78),
                      0 5px 18px rgba(0,0,0,.5), 0 0 22px rgba(255,210,90,.85), 0 0 46px rgba(255,180,50,.5); }
        .sod-rail-thumb:active { cursor:grabbing; }
        .sod-rail-ic { font-size:21px; line-height:1; color:#3a2600; font-weight:900;
          filter: drop-shadow(0 1px 0 rgba(255,255,255,.6)); }
        @media (max-width:640px) {
          .sod-rail { width:20px; right:4px; top:72px; }
          .sod-rail-ic { font-size:14px; }
        }
        @media (prefers-reduced-motion: reduce) { .sod-rail-thumb { transition:none; } }
      `}</style>
    </div>
  );
}
