import React, { useEffect, useState, useCallback } from "react";
import { C, F } from "../theme.js";
import { getShareCount, incrementShareCount, subscribeShareCount } from "../lib/supabase.js";

// 👑 שיתוף מלכותי לכל פוסט — כפתור צף עם כתר ומונה חי, ובלחיצה חלון שיתוף מלכותי.
export default function PostShareFab({ url, title, wpId }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    if (wpId) getShareCount(wpId).then(n => { if (alive) setCount(n || 0); }).catch(() => {});
    const unsub = wpId ? subscribeShareCount(wpId, n => { if (alive) setCount(n); }) : () => {};
    return () => { alive = false; unsub(); };
  }, [wpId]);

  const bump = useCallback(() => {
    if (wpId) incrementShareCount(wpId).then(n => { if (typeof n === "number") setCount(n); }).catch(() => {});
  }, [wpId]);

  const shareNow = useCallback(() => {
    bump();
    const text = `${title || "סוד 1820"} 👑✨`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: title || "סוד 1820", text, url }).then(() => setOpen(false)).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank", "noopener");
    }
  }, [bump, url, title]);

  const copyLink = useCallback(() => {
    bump();
    try { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { window.prompt("העתיקו את הקישור:", url); }
  }, [bump, url]);

  return (
    <>
      <div className="psf-wrap">
        <button onClick={() => setOpen(true)} className="psf" aria-label="שתפו את הפוסט">
          <span aria-hidden style={{ fontSize: 17 }}>👑</span>
          <span>שתפו את הסוד</span>
          {count > 0 && <span className="psf-count">✨ {count.toLocaleString("he-IL")}</span>}
        </button>
      </div>

      {open && (
        <div className="psf-ovl" role="dialog" aria-modal="true" aria-label="שיתוף מלכותי" onClick={() => setOpen(false)}>
          <div className="psf-modal" onClick={e => e.stopPropagation()}>
            <button className="psf-x" onClick={() => setOpen(false)} aria-label="סגירה">×</button>
            <div className="psf-crown">👑</div>
            <div className="psf-kicker">כִּי לַה׳ הַמְּלוּכָה</div>
            <h2 className="psf-title">הפיצו את הסוד</h2>
            <p className="psf-text">כל שיתוף הוא ניצוץ — שעוד נשמה תגלה את סוד 1820 ואת ההצלבות שמאחורי המציאות.</p>
            {count > 0 && <div className="psf-social">✨ כבר <b>{count.toLocaleString("he-IL")}</b> שיתפו את הסוד</div>}
            <div className="psf-actions">
              <button className="psf-primary" onClick={shareNow}>📲 שתפו עכשיו</button>
              <button className="psf-copy" onClick={copyLink}>{copied ? "✓ הקישור הועתק" : "🔗 העתק קישור"}</button>
            </div>
            <button className="psf-later" onClick={() => setOpen(false)}>אולי אחר כך</button>
          </div>
        </div>
      )}

      <style>{`
        .psf-wrap { position: fixed; bottom: 18px; left: 18px; right: auto; z-index: 900;
          padding-bottom: max(0px, env(safe-area-inset-bottom, 0px)); }
        @media (min-width: 900px) {
          .psf-wrap { left: 0; right: 0; display: flex; justify-content: center; pointer-events: none; }
          .psf-wrap .psf { pointer-events: auto; }
        }
        .psf { direction: rtl; display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
          padding: 11px 18px; border-radius: 999px; border: 1px solid ${C.borderGold};
          background: linear-gradient(135deg, #ffe9a8, #caa030 55%, #9a7818); color: #1a0e00;
          font-family: ${F.heading}; font-weight: 800; font-size: 14.5px; white-space: nowrap;
          box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 18px rgba(212,175,55,0.40);
          animation: psf-pulse 2.6s ease-in-out infinite; transition: transform .14s, box-shadow .18s; }
        .psf:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(0,0,0,0.55), 0 0 28px rgba(212,175,55,0.6); }
        .psf-count { display: inline-flex; align-items: center; padding: 1px 9px; border-radius: 999px;
          font-family: ${F.mono}; font-size: 12.5px; font-weight: 800; background: rgba(26,14,0,0.20); color: #1a0e00; }
        @keyframes psf-pulse { 0%,100% { box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 14px rgba(212,175,55,0.32); }
          50% { box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 30px rgba(212,175,55,0.62); } }

        .psf-ovl { position: fixed; inset: 0; z-index: 9999; direction: rtl; display: flex;
          align-items: center; justify-content: center; padding: 20px;
          background: rgba(3,2,8,0.80); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
          animation: psf-fade .28s ease both; }
        .psf-modal { position: relative; width: 100%; max-width: 430px; text-align: center;
          background: radial-gradient(120% 90% at 50% 0%, #221606, #0c0805 72%);
          border: 1px solid ${C.borderGold}; border-radius: 22px; padding: 34px 28px 24px;
          box-shadow: 0 26px 80px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(233,200,74,0.14), 0 0 40px rgba(212,175,55,0.12);
          animation: psf-rise .36s cubic-bezier(.2,.8,.2,1) both; }
        .psf-x { position: absolute; top: 12px; left: 14px; background: none; border: none;
          color: ${C.goldDim}; font-size: 24px; line-height: 1; cursor: pointer; padding: 4px; }
        .psf-crown { font-size: 48px; line-height: 1; filter: drop-shadow(0 0 18px rgba(233,200,74,0.5)); margin-bottom: 6px;
          animation: psf-float 3.4s ease-in-out infinite; }
        .psf-kicker { color: #c9a84a; font-family: ${F.heading}; letter-spacing: 6px; font-size: 12px; margin-bottom: 8px; }
        .psf-title { margin: 0 0 12px; color: ${C.goldBright}; font-family: ${F.royal || F.regal};
          font-size: clamp(24px,5.5vw,30px); font-weight: 800; text-shadow: 0 0 34px rgba(212,175,55,0.35); }
        .psf-text { margin: 0 0 16px; color: ${C.goldLight}; font-family: ${F.body}; font-size: 15px; line-height: 1.9; }
        .psf-social { margin: 0 0 18px; color: ${C.goldDim}; font-family: ${F.heading}; font-size: 13px; }
        .psf-social b { color: ${C.goldBright}; }
        .psf-actions { display: flex; flex-direction: column; gap: 10px; }
        .psf-primary { cursor: pointer; border: none; border-radius: 999px; padding: 14px 22px;
          background: linear-gradient(135deg, #ffe9a8, #caa030 55%, #9a7818); color: #1a0e00;
          font-family: ${F.heading}; font-weight: 800; font-size: 16px; letter-spacing: .5px;
          box-shadow: 0 8px 22px rgba(212,175,55,0.34); transition: transform .12s, box-shadow .15s; }
        .psf-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 30px rgba(212,175,55,0.5); }
        .psf-copy { cursor: pointer; border: 1px solid ${C.borderGold}; border-radius: 999px; padding: 11px 20px;
          background: rgba(212,175,55,0.10); color: ${C.goldBright}; font-family: ${F.heading}; font-weight: 700; font-size: 14px; }
        .psf-copy:hover { background: rgba(212,175,55,0.18); }
        .psf-later { cursor: pointer; border: none; background: none; color: ${C.muted};
          font-family: ${F.heading}; font-size: 13.5px; padding: 12px 0 2px; }
        .psf-later:hover { color: ${C.goldLight}; }

        @keyframes psf-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes psf-rise { from { opacity: 0; transform: translateY(18px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes psf-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @media (prefers-reduced-motion: reduce) { .psf, .psf-crown, .psf-modal, .psf-ovl { animation: none !important; } }
        @media (max-width: 480px) { .psf { font-size: 13px; padding: 9px 14px; } }
      `}</style>
    </>
  );
}
