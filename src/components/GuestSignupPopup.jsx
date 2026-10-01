import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { trackWhatsappJoin } from "../lib/tracking.js";
import { C, F, LOGO_URL } from "../theme.js";

const DISMISS_KEY = "sod_guest_signup_popup_dismissed";
const WHATSAPP_URL = import.meta.env.VITE_WHATSAPP_CHANNEL || "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql";

export default function GuestSignupPopup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || user) {
      setOpen(false);
      return;
    }
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch { /* storage may be unavailable */ }
    const timer = window.setTimeout(() => setOpen(true), 1400);
    return () => window.clearTimeout(timer);
  }, [loading, user]);

  function close() {
    setOpen(false);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
  }

  function go(path) {
    close();
    navigate(path);
  }

  if (!open || loading || user) return null;

  return (
    <div role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()} style={{
      position: "fixed", inset: 0, zIndex: 10020, display: "grid", placeItems: "center",
      padding: 18, background: "rgba(5,3,12,.72)", backdropFilter: "blur(7px)", direction: "rtl",
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="guest-signup-title" style={{
        width: "min(92vw, 460px)", position: "relative", textAlign: "center",
        background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`,
        border: `1px solid ${C.borderGold}`, borderRadius: 22, padding: "30px 24px 24px",
        boxShadow: "0 24px 80px rgba(0,0,0,.5), 0 0 50px rgba(212,175,55,.08) inset",
      }}>
        <button type="button" onClick={close} aria-label="סגירה" style={{
          position: "absolute", top: 12, left: 12, width: 34, height: 34, borderRadius: "50%",
          border: `1px solid ${C.border}`, background: "transparent", color: C.muted,
          fontSize: 20, cursor: "pointer",
        }}>×</button>
        <img src={LOGO_URL} alt="" width={52} height={52} style={{
          borderRadius: "50%", objectFit: "cover", marginBottom: 12,
          filter: "drop-shadow(0 0 16px rgba(232,200,74,.45))",
        }} />
        <h2 id="guest-signup-title" style={{
          margin: 0, color: C.goldBright, fontFamily: F.regal,
          fontSize: "clamp(22px,5vw,28px)", lineHeight: 1.35,
        }}>האתר בבנייה — ואתם מוזמנים להיות חלק מהדרך</h2>
        <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 15, lineHeight: 1.85, margin: "12px auto 20px" }}>
          אנחנו ממשיכים לבנות, לפתח ולהוסיף תכנים, כלים ורמזים חדשים. הירשמו לאתר כדי להישאר מעודכנים וליהנות מהאפשרויות החדשות שנפתחות.
        </p>
        <button type="button" onClick={() => go("/login")} style={{
          width: "100%", padding: "13px 18px", border: 0, borderRadius: 12, cursor: "pointer",
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
          fontFamily: F.heading, fontSize: 16, fontWeight: 800,
        }}>הרשמה לאתר</button>
        <div style={{ margin: "18px 0 9px", color: C.muted, fontFamily: F.body, fontSize: 13.5 }}>
          רוצים לקבל עדכונים שוטפים, חדשות ורמזים חדשים?
        </div>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
          onClick={() => trackWhatsappJoin("guest-signup-popup")} style={{
            display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
            padding: "11px 16px", borderRadius: 12, textDecoration: "none",
            background: "#1f8a4c", color: "#fff", fontFamily: F.heading, fontSize: 14.5, fontWeight: 750,
          }}>הצטרפו אלינו בוואטסאפ</a>
        <button type="button" onClick={() => go("/login")} style={{
          marginTop: 15, border: 0, background: "transparent", color: C.goldDim,
          fontFamily: F.body, fontSize: 13, cursor: "pointer", textDecoration: "underline",
        }}>כבר רשומים? התחברות</button>
      </section>
    </div>
  );
}
