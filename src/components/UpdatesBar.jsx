import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { C, F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { PUSH_CONFIGURED, pushSupported, enablePush } from "../lib/push.js";
import { trackConversion } from "../lib/marketing.js";
import { installOfferActive, isStandalone, isIOS } from "../lib/install.js";

// 🔔 הפעלת התראות דפדפן — לא מייל, לא מפריע לקריאה.
//   📱 מובייל  → פס עליון דק ("שם המשתמש רגיל לבקשות הרשאה").
//   🖥️ דסקטופ → בועה קטנה בפינה ימנית-תחתונה (לא מסתירה תוכן).
// מופיע רק אחרי מעורבות: גלילת ~40% מהעמוד או ~25 שניות. מוצג רק אם push נתמך+מוגדר.
// סגירה → לא חוזר שבוע; הפעלה → לא חוזר שנה.
const KEY = "sod_updbar_until";
const HIDE = /^\/(admin|login|profile|traffic|numbers-report|theme-preview|enter|stream|heichal|היכל|galaxy)/;
const DELAY_MS = 25000;

const suppressed = () => {
  try { const u = parseInt(localStorage.getItem(KEY) || "0", 10); return u && Date.now() < u; } catch { return false; }
};
const suppress = days => { try { localStorage.setItem(KEY, String(Date.now() + days * 864e5)); } catch { /* noop */ } };

export default function UpdatesBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState("cta");   // cta | done | denied
  const [busy, setBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 640);

  const pushReady = PUSH_CONFIGURED && pushSupported();

  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // טריגר: גלילת 40% או 25 שניות מתחילת הביקור (המוקדם מביניהם) — רק אחרי מעורבות.
  // הטיימר מבוסס-סשן (sessionStorage), כך שניווט בין דפים לא מאפס אותו —
  // משתמש פעיל שגולש בין כמה דפים עדיין יגיע לסף הזמן.
  useEffect(() => {
    if (!pushReady || suppressed()) return;
    let fired = false;
    const reveal = () => { if (!fired) { fired = true; setShow(true); cleanup(); } };
    let start;
    try {
      start = parseInt(sessionStorage.getItem("sod_session_start") || "0", 10);
      if (!start) { start = Date.now(); sessionStorage.setItem("sod_session_start", String(start)); }
    } catch { start = Date.now(); }
    const remaining = Math.max(0, DELAY_MS - (Date.now() - start));
    const onScroll = () => {
      const doc = document.documentElement;
      const pct = (window.scrollY + window.innerHeight) / (doc.scrollHeight || 1);
      if (pct >= 0.4) reveal();
    };
    const t = setTimeout(reveal, remaining);
    window.addEventListener("scroll", onScroll, { passive: true });
    function cleanup() { clearTimeout(t); window.removeEventListener("scroll", onScroll); }
    return cleanup;
  }, [pushReady]);

  const close = useCallback(() => { setShow(false); suppress(7); }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    const r = await enablePush({ userId: user?.id || null, topics: [] });
    setBusy(false);
    if (r.ok) {
      trackConversion("push_enabled", { source: isMobile ? "topbar" : "corner" });
      setMode("done"); suppress(365);
      setTimeout(() => setShow(false), 2800);
    } else {
      setMode("denied"); suppress(r.reason === "denied" ? 30 : 1);
    }
  }, [user, isMobile]);

  if (!show || !pushReady || HIDE.test(pathname)) return null;
  // קודם התקנה, פוש אחר כך:
  //  • iOS — פוש עובד רק כשהאפליקציה מותקנת; לא מבקשים לפני התקנה.
  //  • מובייל — לא מתחרים בהצעת ההתקנה הפעילה (שיופיע קודם פס ההתקנה).
  if (isIOS() && !isStandalone()) return null;
  if (isMobile && !isStandalone() && installOfferActive()) return null;

  const Style = (
    <style>{`
      /* ===== מובייל — פס עליון דק ===== */
      .upb { position: fixed; top: 0; left: 0; right: 0; z-index: 950; direction: rtl;
        display: flex; align-items: center; justify-content: center; gap: 12px;
        min-height: 64px; padding: 8px 44px 8px 14px;
        background: linear-gradient(90deg, ${C.royal}, ${C.surface} 55%, ${C.royal});
        border-bottom: 1px solid ${C.borderGold}; box-shadow: 0 4px 18px rgba(0,0,0,0.45);
        font-family: ${F.heading}; animation: upb-down .45s cubic-bezier(.2,.8,.2,1) both; }
      .upb-txt { color: ${C.goldLight}; font-size: 13px; font-weight: 600; }
      .upb-bell { filter: drop-shadow(0 0 6px rgba(233,200,74,0.5)); }
      .upb-cta { cursor: pointer; border: none; border-radius: 999px; padding: 5px 18px;
        background: linear-gradient(135deg, #f6e27a, #caa030); color: #1a0e00;
        font-family: ${F.heading}; font-weight: 800; font-size: 12.5px; white-space: nowrap; }
      .upb-msg { color: ${C.goldBright}; font-family: ${F.heading}; font-weight: 700; font-size: 13.5px; }
      .upb-x { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: none;
        border: none; color: ${C.goldDim}; font-size: 21px; line-height: 1; cursor: pointer; padding: 2px 6px; }
      .upb-x:hover { color: ${C.goldBright}; }
      @keyframes upb-down { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

      /* ===== דסקטופ — בועה בפינה ימנית-תחתונה ===== */
      .upb-bubble { position: fixed; right: 18px; bottom: 96px; z-index: 945; direction: rtl;
        width: 252px; text-align: center; padding: 18px 18px 16px;
        background: linear-gradient(180deg, rgba(34,20,52,0.97), rgba(12,8,20,0.98));
        border: 1px solid rgba(233,200,74,0.34); border-radius: 18px;
        box-shadow: 0 18px 50px rgba(0,0,0,0.6), 0 0 32px rgba(123,76,176,0.2);
        animation: upb-rise .4s cubic-bezier(.2,.8,.2,1) both; }
      .upb-b-bell { font-size: 30px; filter: drop-shadow(0 0 12px rgba(233,200,74,0.55)); }
      .upb-b-ttl { color: ${C.goldBright}; font-family: ${F.heading}; font-weight: 800; font-size: 17px; margin-top: 4px; }
      .upb-b-sub { color: #cbb8e6; font-family: ${F.body}; font-size: 12.5px; line-height: 1.6; margin: 5px 0 13px; }
      .upb-b-go { cursor: pointer; border: none; border-radius: 999px; padding: 9px 18px; width: 100%;
        background: linear-gradient(135deg, #f6e27a, #caa030); color: #1a0e00;
        font-family: ${F.heading}; font-weight: 800; font-size: 14px; }
      .upb-b-done { color: ${C.goldBright}; font-family: ${F.heading}; font-weight: 700; font-size: 14px; line-height: 1.6; }
      .upb-bx { position: absolute; left: 11px; top: 9px; background: none; border: none; color: #9a85bf;
        font-size: 20px; line-height: 1; cursor: pointer; }
      .upb-bx:hover { color: ${C.goldBright}; }
      @keyframes upb-rise { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { .upb, .upb-bubble { animation: none; } }
    `}</style>
  );

  // 🖥️ דסקטופ — בועה
  if (!isMobile) {
    return (
      <div className="upb-bubble" role="region" aria-label="התראות בדפדפן">
        <button className="upb-bx" onClick={close} aria-label="סגירה">×</button>
        {mode === "done" ? (
          <div className="upb-b-done">✓ ההתראות הופעלו!<br />נעדכן אתכם כשיֵצא חדש 🔔</div>
        ) : mode === "denied" ? (
          <div className="upb-b-done" style={{ color: C.goldLight, fontWeight: 600, fontSize: 13 }}>🔔 הדפדפן חסם התראות — אפשר לאשר בהגדרות האתר</div>
        ) : (
          <>
            <div className="upb-b-bell">🔔</div>
            <div className="upb-b-ttl">רוצים לדעת ראשונים?</div>
            <div className="upb-b-sub">קבלו התראה כשעולה תוכן חדש</div>
            <button className="upb-b-go" onClick={enable} disabled={busy}>{busy ? "מפעיל…" : "הפעלת התראות"}</button>
          </>
        )}
        {Style}
      </div>
    );
  }

  // 📱 מובייל — פס עליון
  return (
    <div className="upb" role="region" aria-label="התראות בדפדפן">
      {mode === "done" ? (
        <span className="upb-msg">✓ ההתראות הופעלו! 🔔</span>
      ) : mode === "denied" ? (
        <span className="upb-msg" style={{ fontWeight: 600, fontSize: 12.5 }}>🔔 הדפדפן חסם — אפשר לאשר בהגדרות</span>
      ) : (
        <>
          <span className="upb-txt"><span className="upb-bell">🔔</span> קבלו התראה כשעולה תוכן חדש</span>
          <button className="upb-cta" onClick={enable} disabled={busy}>{busy ? "…" : "הפעל"}</button>
        </>
      )}
      <button className="upb-x" onClick={close} aria-label="סגירה">×</button>
      {Style}
    </div>
  );
}
