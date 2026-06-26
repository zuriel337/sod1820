import React, { useEffect, useRef, useState, useCallback } from "react";
import { C, F } from "../theme.js";
import { getShareCount, incrementShareCount, subscribeShareCount } from "../lib/supabase.js";
import { trackShare } from "../lib/tracking.js";

const shareSlug = (url, wpId) => { try { return new URL(url).pathname.replace(/^\//, ""); } catch { return String(wpId || ""); } };

// ── "העבירו את האור הלאה" — מערך שיתוף משולב לדפי תפילה/רפואה ──
// שני אלמנטים שחולקים מונה אחד ופעולת שיתוף אחת:
//   1. כפתור שיתוף צף קטן (קבוע לאורך הגלילה) עם מונה שיתופים אמיתי.
//   2. חלון קופץ עדין — מופיע פעם אחת ב-7 ימים, אחרי 20ש' או 70% מהעמוד.
// כך אין הצפת מידע: הפופאפ הוא הקריאה הרגשית, והכפתור הצף הוא תזכורת שקטה.

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const DELAY_MS = 20000;       // 20 שניות
const SCROLL_RATIO = 0.7;     // 70% מהעמוד
const COUNT_MIN = 1;          // מונה פתוח — מוצג תמיד כשיש ולו שיתוף אחד
const POPUP_KEY = "prayer_share_popup";

const SHARE_TEXT =
  "לפעמים שיתוף אחד קטן מגיע בדיוק לאדם שהיה צריך את התפילה הזו.\n" +
  "אם הרגשת שהמילים נגעו בך – שתפו עכשיו עם שני אנשים והיו שליחים של תקווה, חיזוק ואמונה.";

export default function PrayerSharePopup({ url, title, wpId }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState(0);
  const shownRef = useRef(false);

  // טעינת מונה השיתופים + מנוי Realtime (מתעדכן חי כשמישהו משתף)
  useEffect(() => {
    let alive = true;
    getShareCount(wpId).then(n => { if (alive) setCount(n || 0); }).catch(() => {});
    const unsub = subscribeShareCount(wpId, n => { if (alive) setCount(n); });
    return () => { alive = false; unsub(); };
  }, [wpId]);

  function seenRecently() {
    try {
      const ts = parseInt(localStorage.getItem(POPUP_KEY) || "0", 10);
      return ts && Date.now() - ts < SEVEN_DAYS;
    } catch { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(POPUP_KEY, String(Date.now())); } catch { /* noop */ }
  }

  // ── טריגרים לפופאפ (זמן / גלילה), פעם אחת ב-7 ימים ──
  const triggerPopup = useCallback(() => {
    if (shownRef.current || seenRecently()) return;
    shownRef.current = true;
    setOpen(true);
    markSeen();
  }, []);

  useEffect(() => {
    if (seenRecently()) return;
    const timer = setTimeout(triggerPopup, DELAY_MS);
    const onScroll = () => {
      const total = document.documentElement.scrollHeight;
      if (total > 0 && (window.scrollY + window.innerHeight) / total >= SCROLL_RATIO) triggerPopup();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { clearTimeout(timer); window.removeEventListener("scroll", onScroll); };
  }, [triggerPopup]);

  // ── פעולת שיתוף משותפת (כפתור צף + פופאפ) ──
  const doShare = useCallback(() => {
    incrementShareCount(wpId).then(n => { if (typeof n === "number") setCount(n); }).catch(() => {});
    const body = SHARE_TEXT + "\n" + url;
    if (typeof navigator !== "undefined" && navigator.share) {
      trackShare("native", shareSlug(url, wpId));
      navigator.share({ title: title || "העבירו את האור הלאה", text: SHARE_TEXT, url })
        .then(() => setOpen(false))
        .catch(() => { /* ביטול — משאירים פתוח */ });
    } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      trackShare("copy", shareSlug(url, wpId));
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
      }).catch(() => window.prompt("העתיקו את הקישור:", url));
    } else {
      window.prompt("העתיקו את הקישור:", url);
    }
  }, [url, title, wpId]);

  const showCount = count >= COUNT_MIN;

  return (
    <>
      {/* ── כפתור שיתוף צף (ממורכז בתחתית בדסקטופ, פינה במובייל) ── */}
      <div className="psp-fab-wrap">
        <button
          onClick={doShare}
          aria-label="שתפו את התפילה"
          className="psp-fab"
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
        >
          <span aria-hidden style={{ fontSize: 18 }}>🙏</span>
          <span>{copied ? "הועתק ✓" : "שתפו"}</span>
          {showCount && <span className="psp-fab-count">✨ כבר {count.toLocaleString("he-IL")} שיתפו</span>}
        </button>
      </div>

      {/* ── חלון קופץ ── */}
      {open && (
        <div
          role="dialog" aria-modal="true" aria-label="העבירו את האור הלאה"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999, direction: "rtl",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            background: "rgba(3,2,8,0.78)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            animation: "psp-fade .3s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "relative", width: "100%", maxWidth: 420, textAlign: "center",
              background: "linear-gradient(165deg, #110b06 0%, #0a0703 100%)",
              border: `1px solid ${C.borderGold}`, borderRadius: 20, padding: "34px 28px 26px",
              boxShadow: "0 24px 70px rgba(0,0,0,0.7), 0 0 28px rgba(212,175,55,0.12)",
              animation: "psp-rise .34s cubic-bezier(.2,.8,.2,1) both",
            }}
          >
            <button onClick={() => setOpen(false)} aria-label="סגירה" style={{
              position: "absolute", top: 12, left: 14, background: "none", border: "none",
              color: C.goldDim, fontSize: 22, lineHeight: 1, cursor: "pointer", padding: 4,
            }}>×</button>

            <div style={{ fontSize: 46, marginBottom: 10, filter: "drop-shadow(0 0 16px rgba(212,175,55,0.35))" }}>🙏</div>

            <h2 style={{
              margin: "0 0 16px", color: C.goldBright, fontFamily: F.royal || F.regal,
              fontSize: "clamp(22px,5vw,28px)", fontWeight: 700, lineHeight: 1.3,
              textShadow: "0 0 36px rgba(212,175,55,0.3)",
            }}>העבירו את האור הלאה</h2>

            <p style={{
              margin: "0 0 20px", color: C.goldLight, fontFamily: F.body,
              fontSize: 15.5, lineHeight: 1.95, whiteSpace: "pre-line",
            }}>{SHARE_TEXT}</p>

            {showCount && (
              <div style={{ margin: "0 0 20px", color: C.goldDim, fontFamily: F.heading, fontSize: 13 }}>
                ✨ כבר <b style={{ color: C.goldBright }}>{count.toLocaleString("he-IL")}</b> שלחו את התפילה הזו הלאה
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={doShare}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 10px 26px rgba(212,175,55,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(212,175,55,0.28)"; }}
                style={{
                  cursor: "pointer", border: "none", borderRadius: 999, padding: "13px 22px",
                  background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
                  fontFamily: F.heading, fontWeight: 800, fontSize: 16, letterSpacing: 0.5,
                  boxShadow: "0 6px 18px rgba(212,175,55,0.28)", transition: "transform .12s, box-shadow .15s",
                }}
              >{copied ? "הקישור הועתק ✓" : "✨ שתפו עכשיו"}</button>

              <button
                onClick={() => setOpen(false)}
                onMouseEnter={e => (e.currentTarget.style.color = C.goldLight)}
                onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                style={{
                  cursor: "pointer", border: "none", background: "none", color: C.muted,
                  fontFamily: F.heading, fontSize: 13.5, padding: "6px 0", transition: "color .2s",
                }}
              >אולי אחר כך</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* עוטף ממקם: פינה שמאלית-תחתונה במובייל, ממורכז בתחתית בדסקטופ (לא נוגע בפינה) */
        .psp-fab-wrap {
          position: fixed; bottom: 18px; left: 18px; right: auto; z-index: 900;
          padding-bottom: max(0px, env(safe-area-inset-bottom, 0px));
        }
        @media (min-width: 900px) {
          .psp-fab-wrap { left: 0; right: 0; display: flex; justify-content: center; pointer-events: none; }
          .psp-fab-wrap .psp-fab { pointer-events: auto; }
        }
        .psp-fab {
          direction: rtl;
          display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
          padding: 10px 16px; border-radius: 999px; border: 1px solid ${C.borderGold};
          background: linear-gradient(135deg, rgba(20,13,6,0.96), rgba(8,5,2,0.96));
          color: ${C.goldBright}; font-family: ${F.heading}; font-weight: 800; font-size: 14px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 18px rgba(212,175,55,0.14);
          transition: transform .14s, box-shadow .18s; animation: psp-fab-in .5s ease both;
          white-space: nowrap;
        }
        .psp-fab:hover { box-shadow: 0 12px 30px rgba(0,0,0,0.55), 0 0 24px rgba(212,175,55,0.28); }
        .psp-fab-count {
          display: inline-flex; align-items: center; min-width: 20px; justify-content: center;
          padding: 1px 8px; border-radius: 999px; font-family: ${F.mono}; font-size: 12px; font-weight: 800;
          background: ${C.gold}; color: #1a0e00;
        }
        @keyframes psp-fab-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes psp-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes psp-rise { from { opacity: 0; transform: translateY(18px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .psp-fab, [role="dialog"] > div { animation: none !important; }
        }
        @media (max-width: 480px) { .psp-fab { font-size: 13px; padding: 9px 14px; } }
      `}</style>
    </>
  );
}
