import React, { useEffect, useRef, useState } from "react";
import { C, F } from "../theme.js";

// ── חלון "העבירו את האור הלאה" — קריאה לשיתוף בפוסטי תפילה/רפואה ──
// מופיע פעם אחת בכל 7 ימים (localStorage), אחרי 20 שניות או בהגעה ל-70% מהעמוד.
// עיצוב: רקע כהה + מסגרת זהב עדינה · אייקון 🙏 · כותרת "העבירו את האור הלאה".

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const DELAY_MS = 20000;       // 20 שניות
const SCROLL_RATIO = 0.7;     // 70% מהעמוד

const SHARE_TEXT =
  "לפעמים שיתוף אחד קטן מגיע בדיוק לאדם שהיה צריך את התפילה הזו.\n" +
  "אם הרגשת שהמילים נגעו בך – שתפו עכשיו עם שני אנשים והיו שליחים של תקווה, חיזוק ואמונה.";

export default function PrayerSharePopup({ url, title, storageKey = "prayer_share_popup" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shownRef = useRef(false);   // מבטיח הצגה אחת בלבד בכל טעינת עמוד

  // נראה כבר ב-7 הימים האחרונים?
  function seenRecently() {
    try {
      const ts = parseInt(localStorage.getItem(storageKey) || "0", 10);
      return ts && Date.now() - ts < SEVEN_DAYS;
    } catch {
      return false;
    }
  }
  function markSeen() {
    try { localStorage.setItem(storageKey, String(Date.now())); } catch { /* noop */ }
  }

  function trigger() {
    if (shownRef.current || seenRecently()) return;
    shownRef.current = true;
    setOpen(true);
    markSeen();
  }

  useEffect(() => {
    if (seenRecently()) return;

    // טריגר זמן — 20 שניות
    const timer = setTimeout(trigger, DELAY_MS);

    // טריגר גלילה — 70% מהעמוד
    const onScroll = () => {
      const doc = document.documentElement;
      const scrolled = window.scrollY + window.innerHeight;
      const total = doc.scrollHeight;
      if (total > 0 && scrolled / total >= SCROLL_RATIO) trigger();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();  // בדיקה ראשונית (עמוד קצר)

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function close() { setOpen(false); }

  function share() {
    const body = SHARE_TEXT + "\n" + url;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: title || "העבירו את האור הלאה", text: SHARE_TEXT, url })
        .then(close)
        .catch(() => { /* המשתמש ביטל — משאירים פתוח */ });
    } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(close, 1400);
      }).catch(() => window.prompt("העתיקו את הקישור:", url));
    } else {
      window.prompt("העתיקו את הקישור:", url);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="העבירו את האור הלאה"
      onClick={close}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, direction: "rtl",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, background: "rgba(3,2,8,0.78)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        animation: "psp-fade .3s ease both",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth: 420, textAlign: "center",
          background: "linear-gradient(165deg, #110b06 0%, #0a0703 100%)",
          border: `1px solid ${C.borderGold}`, borderRadius: 20,
          padding: "34px 28px 26px",
          boxShadow: "0 24px 70px rgba(0,0,0,0.7), 0 0 28px rgba(212,175,55,0.12)",
          animation: "psp-rise .34s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <button
          onClick={close}
          aria-label="סגירה"
          style={{
            position: "absolute", top: 12, left: 14, background: "none", border: "none",
            color: C.goldDim, fontSize: 22, lineHeight: 1, cursor: "pointer", padding: 4,
          }}
        >×</button>

        <div style={{ fontSize: 46, marginBottom: 10, filter: "drop-shadow(0 0 16px rgba(212,175,55,0.35))" }}>
          🙏
        </div>

        <h2 style={{
          margin: "0 0 16px", color: C.goldBright, fontFamily: F.royal || F.regal,
          fontSize: "clamp(22px,5vw,28px)", fontWeight: 700, lineHeight: 1.3,
          textShadow: "0 0 36px rgba(212,175,55,0.3)",
        }}>
          העבירו את האור הלאה
        </h2>

        <p style={{
          margin: "0 0 24px", color: C.goldLight, fontFamily: F.body,
          fontSize: 15.5, lineHeight: 1.95, whiteSpace: "pre-line",
        }}>
          {SHARE_TEXT}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={share}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 10px 26px rgba(212,175,55,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(212,175,55,0.28)"; }}
            style={{
              cursor: "pointer", border: "none", borderRadius: 999, padding: "13px 22px",
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
              fontFamily: F.heading, fontWeight: 800, fontSize: 16, letterSpacing: 0.5,
              boxShadow: "0 6px 18px rgba(212,175,55,0.28)", transition: "transform .12s, box-shadow .15s",
            }}
          >
            {copied ? "הקישור הועתק ✓" : "✨ שתפו עכשיו"}
          </button>

          <button
            onClick={close}
            onMouseEnter={e => (e.currentTarget.style.color = C.goldLight)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
            style={{
              cursor: "pointer", border: "none", background: "none", color: C.muted,
              fontFamily: F.heading, fontSize: 13.5, padding: "6px 0", transition: "color .2s",
            }}
          >
            אולי אחר כך
          </button>
        </div>
      </div>

      <style>{`
        @keyframes psp-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes psp-rise { from { opacity: 0; transform: translateY(18px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"] > div { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
