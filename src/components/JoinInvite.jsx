import React, { useEffect, useState } from "react";
import { C, F } from "../theme.js";
import { getLiveStats, displayJoinedToday } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";
import SubscribeInviteModal from "./SubscribeInviteModal.jsx";

// 🔔 הזמנת הצטרפות לגולשים — ממוקדת: רק לא־רשום, מהביקור ה-2 ואילך, ופעם ב-3 ימים.
// ממוקמת מעל כפתורי הפינה (לא חוסמת אותם). נעלמת אחרי הרשמה/סגירה.
const COOLDOWN_MS = 3 * 86400000; // פעם ב-3 ימים
const MIN_VISIT = 2;              // מהביקור השני (חוזר ולא רשום)

export default function JoinInvite() {
  const { isAdmin, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [open, setOpen] = useState(false);
  const [eligible, setEligible] = useState(false);

  // ביקור נספר פעם אחת לכל גלישה (session); זכאות = ביקור ≥2 + עברו 3 ימים מההצגה האחרונה.
  useEffect(() => {
    let show = false;
    try {
      if (localStorage.getItem("sub_joined") === "1") { setEligible(false); return; }
      let visits = parseInt(localStorage.getItem("ji_visits") || "0", 10);
      if (!sessionStorage.getItem("ji_session")) {
        sessionStorage.setItem("ji_session", "1");
        visits += 1; localStorage.setItem("ji_visits", String(visits));
      }
      const last = parseInt(localStorage.getItem("ji_last") || "0", 10);
      show = visits >= MIN_VISIT && (Date.now() - last > COOLDOWN_MS);
      if (show) localStorage.setItem("ji_last", String(Date.now()));
    } catch { show = false; }
    setEligible(show);
  }, []);

  useEffect(() => {
    if (!eligible) return;
    let a = true;
    getLiveStats().then(s => { if (a) setStats(s); }).catch(() => {});
    return () => { a = false; };
  }, [eligible]);

  if (isAdmin || user || !eligible) return null;

  const today = displayJoinedToday(stats?.members_today);
  const total = stats?.members_total || 0;
  const label = `${today.toLocaleString("he")} הצטרפו היום — הצטרפו גם אתם`;

  return (
    <>
      <div className="ji-wrap">
        <div className="ji-pill">
          <button className="ji-badge" onClick={() => setOpen(true)} aria-label="הרשמה למנוי">
            <span aria-hidden style={{ fontSize: 14 }}>🔔</span>
            <span className="ji-text">{label}</span>
            <span aria-hidden className="ji-go">הירשמו ←</span>
          </button>
          <button className="ji-x" onClick={() => setEligible(false)} aria-label="סגירה">×</button>
        </div>
      </div>
      <SubscribeInviteModal open={open} count={total}
        onClose={() => { setOpen(false); try { if (localStorage.getItem("sub_joined") === "1") setEligible(false); } catch { /* noop */ } }} />
      <style>{`
        .ji-wrap { position: fixed; bottom: 80px; left: 0; right: 0; z-index: 870; display: flex; justify-content: center;
          pointer-events: none; padding: 0 12px; }
        .ji-pill { pointer-events: auto; display: inline-flex; align-items: center; gap: 4px; max-width: 94vw; }
        .ji-badge { direction: rtl; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; min-width: 0;
          padding: 9px 16px; border-radius: 999px; border: 1px solid ${C.borderGold};
          background: linear-gradient(135deg, rgba(20,13,6,0.96), rgba(8,5,2,0.96)); color: ${C.goldBright};
          font-family: ${F.heading}; font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden;
          box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 18px rgba(212,175,55,0.20); animation: ji-pulse 2.8s ease-in-out infinite; }
        .ji-badge:hover { box-shadow: 0 12px 32px rgba(0,0,0,0.55), 0 0 26px rgba(212,175,55,0.4); }
        .ji-text { overflow: hidden; text-overflow: ellipsis; }
        .ji-go { flex-shrink: 0; background: linear-gradient(135deg, #ffe9a8, #caa030); color: #1a0e00; font-weight: 800;
          border-radius: 999px; padding: 2px 10px; font-size: 12px; }
        .ji-x { flex-shrink: 0; width: 26px; height: 26px; border-radius: 999px; cursor: pointer;
          border: 1px solid ${C.borderGold}; background: rgba(8,5,2,0.92); color: ${C.goldDim};
          font-size: 16px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; }
        .ji-x:hover { color: ${C.goldBright}; }
        @keyframes ji-pulse { 0%,100% { box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 14px rgba(212,175,55,0.18); }
          50% { box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 26px rgba(212,175,55,0.4); } }
        @media (prefers-reduced-motion: reduce) { .ji-badge { animation: none; } }
        @media (max-width: 480px) { .ji-wrap { bottom: 74px; } .ji-badge { font-size: 12px; padding: 8px 13px; } .ji-go { font-size: 11px; } }
      `}</style>
    </>
  );
}
