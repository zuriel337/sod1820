import React, { useEffect, useState } from "react";
import { C, F } from "../theme.js";
import { getLiveStats, displayJoinedToday } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";
import SubscribeInviteModal from "./SubscribeInviteModal.jsx";

// 🔔 תג הצטרפות לגולשים — הוכחה חברתית ("X הצטרפו היום") + לחיצה פותחת הרשמה מלכותית.
// גלוי לגולשים בלבד (לאדמין יש מוניטור משלו); נעלם אחרי הרשמה.
export default function JoinInvite() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem("sub_joined") === "1"; } catch { return false; } });

  useEffect(() => {
    let a = true;
    getLiveStats().then(s => { if (a) setStats(s); }).catch(() => {});
    return () => { a = false; };
  }, []);

  if (isAdmin || hidden) return null;

  const today = displayJoinedToday(stats?.members_today);
  const total = stats?.members_total || 0;
  const label = `${today.toLocaleString("he")} הצטרפו היום — הצטרפו גם אתם`;

  return (
    <>
      <div className="ji-wrap">
        <button className="ji-badge" onClick={() => setOpen(true)} aria-label="הרשמה למנוי">
          <span aria-hidden style={{ fontSize: 14 }}>🔔</span>
          <span className="ji-text">{label}</span>
          <span aria-hidden className="ji-go">הירשמו ←</span>
        </button>
      </div>
      <SubscribeInviteModal open={open} count={total}
        onClose={() => { setOpen(false); try { if (localStorage.getItem("sub_joined") === "1") setHidden(true); } catch { /* noop */ } }} />
      <style>{`
        .ji-wrap { position: fixed; bottom: 16px; left: 0; right: 0; z-index: 880; display: flex; justify-content: center;
          pointer-events: none; padding: 0 12px; padding-bottom: max(0px, env(safe-area-inset-bottom, 0px)); }
        .ji-badge { pointer-events: auto; direction: rtl; display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
          max-width: 94vw; padding: 9px 16px; border-radius: 999px; border: 1px solid ${C.borderGold};
          background: linear-gradient(135deg, rgba(20,13,6,0.96), rgba(8,5,2,0.96)); color: ${C.goldBright};
          font-family: ${F.heading}; font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden;
          box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 18px rgba(212,175,55,0.20); animation: ji-pulse 2.8s ease-in-out infinite; }
        .ji-badge:hover { box-shadow: 0 12px 32px rgba(0,0,0,0.55), 0 0 26px rgba(212,175,55,0.4); }
        .ji-text { overflow: hidden; text-overflow: ellipsis; }
        .ji-go { flex-shrink: 0; background: linear-gradient(135deg, #ffe9a8, #caa030); color: #1a0e00; font-weight: 800;
          border-radius: 999px; padding: 2px 10px; font-size: 12px; }
        @keyframes ji-pulse { 0%,100% { box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 14px rgba(212,175,55,0.18); }
          50% { box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 26px rgba(212,175,55,0.4); } }
        @media (prefers-reduced-motion: reduce) { .ji-badge { animation: none; } }
        @media (max-width: 480px) { .ji-badge { font-size: 12px; padding: 8px 13px; } .ji-go { font-size: 11px; } }
      `}</style>
    </>
  );
}
