import React, { useEffect, useState } from "react";
import { C, F } from "../theme.js";
import { subscribeJoins } from "../lib/joinEvents.js";

// חגיגת הצטרפות גלובלית — קופצת לכל המבקרים בזמן אמת כשמישהו חדש מצטרף (אימות מייל).
export default function JoinCelebration() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer;
    const unsub = subscribeJoins(() => {
      setShow(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShow(false), 6500);
    });
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  if (!show) return null;

  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", top: 84, left: "50%", transform: "translateX(-50%)",
      zIndex: 400, direction: "rtl", maxWidth: "92vw",
      display: "flex", alignItems: "center", gap: 11,
      background: "linear-gradient(160deg, rgba(30,22,6,0.98), rgba(10,7,0,0.98))",
      border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "11px 22px",
      boxShadow: `0 14px 44px rgba(0,0,0,0.6), 0 0 28px rgba(212,175,55,0.32)`,
      animation: "joincele-in .5s cubic-bezier(.2,.8,.2,1)",
    }}>
      <span style={{ fontSize: 22, lineHeight: 1 }}>🎉</span>
      <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800 }}>
        נשמה חדשה הצטרפה למשפחת סוד 1820
      </span>
      <span style={{ fontSize: 18, lineHeight: 1 }}>✨</span>
      <style>{`@keyframes joincele-in {
        from { opacity: 0; transform: translate(-50%, -14px) scale(.96); }
        to   { opacity: 1; transform: translate(-50%, 0) scale(1); }
      }`}</style>
    </div>
  );
}
