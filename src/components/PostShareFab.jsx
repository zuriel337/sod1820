import React, { useEffect, useState, useCallback } from "react";
import { C, F } from "../theme.js";
import { getShareCount, incrementShareCount, subscribeShareCount } from "../lib/supabase.js";

// 🔥 כפתור שיתוף צף לכל פוסט — מונה שיתופים חי (הוכחה חברתית) + כיתוב מלכותי-ויראלי.
// ממוקם בפינה שמאלית-תחתונה במובייל, ממורכז בתחתית בדסקטופ (לא מתנגש במחשבון הצף בימין).
export default function PostShareFab({ url, title, wpId }) {
  const [count, setCount] = useState(0);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    let alive = true;
    if (wpId) getShareCount(wpId).then(n => { if (alive) setCount(n || 0); }).catch(() => {});
    const unsub = wpId ? subscribeShareCount(wpId, n => { if (alive) setCount(n); }) : () => {};
    return () => { alive = false; unsub(); };
  }, [wpId]);

  const doShare = useCallback(() => {
    if (wpId) incrementShareCount(wpId).then(n => { if (typeof n === "number") setCount(n); }).catch(() => {});
    setPop(true); setTimeout(() => setPop(false), 650);
    const text = `${title || "סוד 1820"} 👑✨`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: title || "סוד 1820", text, url }).catch(() => {});
    } else {
      try { navigator.clipboard?.writeText(url); } catch { /* noop */ }
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank", "noopener");
    }
  }, [url, title, wpId]);

  return (
    <div className="psf-wrap">
      <button onClick={doShare} className={`psf${pop ? " psf-pop" : ""}`} aria-label="שתפו את הפוסט">
        <span aria-hidden style={{ fontSize: 17 }}>🔥</span>
        <span>שתפו את הסוד</span>
        {count > 0 && <span className="psf-count">✨ {count.toLocaleString("he-IL")}</span>}
      </button>
      <style>{`
        .psf-wrap { position: fixed; bottom: 18px; left: 18px; right: auto; z-index: 900;
          padding-bottom: max(0px, env(safe-area-inset-bottom, 0px)); }
        @media (min-width: 900px) {
          .psf-wrap { left: 0; right: 0; display: flex; justify-content: center; pointer-events: none; }
          .psf-wrap .psf { pointer-events: auto; }
        }
        .psf { direction: rtl; display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
          padding: 11px 18px; border-radius: 999px; border: 1px solid ${C.borderGold};
          background: linear-gradient(135deg, #e9c84a, #9a7818); color: #1a0e00;
          font-family: ${F.heading}; font-weight: 800; font-size: 14.5px; white-space: nowrap;
          box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 18px rgba(212,175,55,0.35);
          animation: psf-pulse 2.6s ease-in-out infinite; transition: transform .14s, box-shadow .18s; }
        .psf:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(0,0,0,0.55), 0 0 26px rgba(212,175,55,0.5); }
        .psf-pop { animation: psf-bump .6s ease; }
        .psf-count { display: inline-flex; align-items: center; padding: 1px 9px; border-radius: 999px;
          font-family: ${F.mono}; font-size: 12.5px; font-weight: 800; background: rgba(26,14,0,0.20); color: #1a0e00; }
        @keyframes psf-pulse { 0%,100% { box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 14px rgba(212,175,55,0.30); }
          50% { box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 28px rgba(212,175,55,0.6); } }
        @keyframes psf-bump { 0% { transform: scale(1); } 40% { transform: scale(1.13); } 100% { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .psf { animation: none; } }
        @media (max-width: 480px) { .psf { font-size: 13px; padding: 9px 14px; } }
      `}</style>
    </div>
  );
}
