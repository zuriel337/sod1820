import React, { useState } from "react";
import { C, F } from "../theme.js";
import { subscribeEmail } from "../lib/supabase.js";

// 👑 חלון הרשמה למנוי — מלכותי ומזמין. הרשמה חינמית (subscribers); לא אזור "בני ההיכל" בתשלום.
export default function SubscribeInviteModal({ open, onClose, count }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  if (!open) return null;

  async function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const v = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { setErr("נא להזין כתובת מייל תקינה"); return; }
    setBusy(true); setErr("");
    try {
      await subscribeEmail({ email: v, source: "join-invite" });
      setDone(true);
      try { localStorage.setItem("sub_joined", "1"); } catch { /* noop */ }
    } catch { setErr("אירעה שגיאה — נסו שוב בעוד רגע"); }
    finally { setBusy(false); }
  }

  return (
    <div className="sim-ovl" role="dialog" aria-modal="true" aria-label="הרשמה למנוי" onClick={onClose}>
      <div className="sim-modal" onClick={e => e.stopPropagation()}>
        <button className="sim-x" onClick={onClose} aria-label="סגירה">×</button>
        <div className="sim-crown">👑</div>
        <div className="sim-kicker">כִּי לַה׳ הַמְּלוּכָה</div>

        {done ? (
          <>
            <h2 className="sim-title">ברוכים הבאים להיכל ✨</h2>
            <p className="sim-text">נרשמתם בהצלחה. מעכשיו תקבלו כל צופן, רמז וגילוי חדש — ראשונים.</p>
            <button className="sim-primary" onClick={onClose}>✦ נהדר, סגרו</button>
          </>
        ) : (
          <>
            <h2 className="sim-title">הירשמו וקבלו את הסודות</h2>
            <p className="sim-text">כל צופן, רמז וגילוי חדש — מגיע אליכם <b style={{ color: C.goldBright }}>ראשונים</b>.{count ? ` הצטרפו אל ${count.toLocaleString("he")} החוקרים.` : ""}</p>
            <form onSubmit={submit} className="sim-form">
              <input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="sim-input" autoFocus />
              <button type="submit" disabled={busy} className="sim-primary">{busy ? "רושם…" : "✦ הירשמו וקבלו"}</button>
            </form>
            {err && <div className="sim-err">{err}</div>}
            <div className="sim-fine">ללא תשלום · אימות פשוט · אפשר להסיר בכל עת</div>
          </>
        )}
      </div>
      <style>{`
        .sim-ovl { position: fixed; inset: 0; z-index: 10000; direction: rtl; display: flex;
          align-items: center; justify-content: center; padding: 20px;
          background: rgba(3,2,8,0.80); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
          animation: sim-fade .26s ease both; }
        .sim-modal { position: relative; width: 100%; max-width: 420px; text-align: center;
          background: radial-gradient(120% 90% at 50% 0%, #221606, #0c0805 72%);
          border: 1px solid ${C.borderGold}; border-radius: 22px; padding: 32px 26px 24px;
          box-shadow: 0 26px 80px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(233,200,74,0.14), 0 0 40px rgba(212,175,55,0.12);
          animation: sim-rise .36s cubic-bezier(.2,.8,.2,1) both; }
        .sim-x { position: absolute; top: 12px; left: 14px; background: none; border: none; color: ${C.goldDim}; font-size: 24px; cursor: pointer; }
        .sim-crown { font-size: 44px; filter: drop-shadow(0 0 18px rgba(233,200,74,0.5)); margin-bottom: 4px; animation: sim-float 3.4s ease-in-out infinite; }
        .sim-kicker { color: #c9a84a; font-family: ${F.heading}; letter-spacing: 6px; font-size: 12px; margin-bottom: 10px; }
        .sim-title { margin: 0 0 10px; color: ${C.goldBright}; font-family: ${F.royal || F.regal}; font-size: clamp(22px,5.2vw,28px); font-weight: 800; text-shadow: 0 0 34px rgba(212,175,55,0.35); }
        .sim-text { margin: 0 0 18px; color: ${C.goldLight}; font-family: ${F.body}; font-size: 15px; line-height: 1.9; }
        .sim-form { display: flex; flex-direction: column; gap: 10px; }
        .sim-input { direction: ltr; text-align: center; border-radius: 999px; padding: 13px 18px; border: 1px solid ${C.borderGold};
          background: rgba(0,0,0,0.35); color: ${C.goldBright}; font-family: ${F.mono}; font-size: 15px; outline: none; }
        .sim-input:focus { border-color: ${C.gold}; box-shadow: 0 0 14px rgba(212,175,55,0.25); }
        .sim-primary { cursor: pointer; border: none; border-radius: 999px; padding: 14px 22px;
          background: linear-gradient(135deg, #ffe9a8, #caa030 55%, #9a7818); color: #1a0e00;
          font-family: ${F.heading}; font-weight: 800; font-size: 16px; box-shadow: 0 8px 22px rgba(212,175,55,0.34);
          transition: transform .12s, box-shadow .15s; }
        .sim-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 30px rgba(212,175,55,0.5); }
        .sim-primary:disabled { opacity: .7; cursor: wait; }
        .sim-err { color: #ff9a8a; font-family: ${F.body}; font-size: 13.5px; margin-top: 10px; }
        .sim-fine { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 11.5px; margin-top: 14px; }
        @keyframes sim-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sim-rise { from { opacity: 0; transform: translateY(18px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes sim-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @media (prefers-reduced-motion: reduce) { .sim-ovl, .sim-modal, .sim-crown { animation: none !important; } }
      `}</style>
    </div>
  );
}
