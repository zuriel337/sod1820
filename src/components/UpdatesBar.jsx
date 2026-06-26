import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { C, F } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { PUSH_CONFIGURED, pushSupported, enablePush } from "../lib/push.js";
import { trackConversion } from "../lib/marketing.js";

// 🔔 פס עדכונים דק עליון — התראות דפדפן בלבד (לא מייל). לא מפריע לקריאה.
// מופיע רק אחרי 20 שניות (לא בגלילה). מוצג רק אם push נתמך+מוגדר.
// סגירה → לא חוזר שבוע; הפעלת התראות → לא חוזר (כבר רשום).
const KEY = "sod_updbar_until";
const HIDE = /^\/(admin|login|profile|traffic|numbers-report|theme-preview|enter|stream|heichal|היכל|galaxy)/;
const DELAY_MS = 20000;

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

  const pushReady = PUSH_CONFIGURED && pushSupported();

  useEffect(() => {
    if (!pushReady || suppressed() || HIDE.test(pathname)) return;
    const t = setTimeout(() => setShow(true), DELAY_MS);   // אחרי 20 שניות בלבד
    return () => clearTimeout(t);
  }, [pathname, pushReady]);

  const close = useCallback(() => { setShow(false); suppress(7); }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    const r = await enablePush({ userId: user?.id || null, topics: [] });
    setBusy(false);
    if (r.ok) {
      trackConversion("push_enabled", { source: "topbar" });
      setMode("done"); suppress(365);
      setTimeout(() => setShow(false), 2800);
    } else {
      setMode("denied"); suppress(r.reason === "denied" ? 30 : 1);
    }
  }, [user]);

  if (!show || !pushReady || HIDE.test(pathname)) return null;

  return (
    <div className="upb" role="region" aria-label="התראות בדפדפן">
      {mode === "done" ? (
        <span className="upb-done">✓ ההתראות הופעלו! נעדכן אתכם כשיֵצא חדש 🔔</span>
      ) : mode === "denied" ? (
        <span className="upb-denied">🔔 הדפדפן חסם התראות — אפשר לאשר בהגדרות האתר</span>
      ) : (
        <>
          <span className="upb-txt"><span className="upb-bell">🔔</span> אל תפספסו תכנים חדשים — קבלו התראות בדפדפן</span>
          <button className="upb-cta" onClick={enable} disabled={busy}>{busy ? "מפעיל…" : "🔔 הפעלת התראות"}</button>
        </>
      )}
      <button className="upb-x" onClick={close} aria-label="סגירה">×</button>

      <style>{`
        .upb { position: fixed; top: 0; left: 0; right: 0; z-index: 950; direction: rtl;
          display: flex; align-items: center; justify-content: center; gap: 14px;
          min-height: 38px; padding: 6px 46px 6px 16px;
          background: linear-gradient(90deg, ${C.royal}, ${C.surface} 55%, ${C.royal});
          border-bottom: 1px solid ${C.borderGold};
          box-shadow: 0 4px 18px rgba(0,0,0,0.45);
          font-family: ${F.heading}; animation: upb-down .45s cubic-bezier(.2,.8,.2,1) both; }
        .upb-bell { filter: drop-shadow(0 0 6px rgba(233,200,74,0.5)); }
        .upb-txt { color: ${C.goldLight}; font-size: 13.5px; font-weight: 600; }
        .upb-cta { cursor: pointer; border: 1px solid ${C.borderGold}; border-radius: 999px;
          padding: 5px 16px; background: linear-gradient(135deg, #f6e27a, #caa030); color: #1a0e00;
          font-family: ${F.heading}; font-weight: 800; font-size: 12.5px; white-space: nowrap; transition: transform .12s; }
        .upb-cta:hover { transform: translateY(-1px); }
        .upb-done { color: ${C.goldBright}; font-family: ${F.heading}; font-weight: 700; font-size: 14px; }
        .upb-denied { color: ${C.goldLight}; font-family: ${F.heading}; font-weight: 600; font-size: 13px; }
        .upb-x { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); background: none; border: none;
          color: ${C.goldDim}; font-size: 22px; line-height: 1; cursor: pointer; padding: 2px 6px; }
        .upb-x:hover { color: ${C.goldBright}; }
        @keyframes upb-down { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (max-width: 560px) { .upb-txt { font-size: 12px; } .upb { gap: 9px; padding-right: 12px; } }
        @media (prefers-reduced-motion: reduce) { .upb { animation: none; } }
      `}</style>
    </div>
  );
}
