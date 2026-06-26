import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { C, F } from "../theme.js";
import { subscribeEmail } from "../lib/supabase.js";
import { trackSubscribe } from "../lib/marketing.js";

// 🔔 פס עדכונים דק עליון — לא מפריע לקריאה.
// מופיע רק אחרי שהמשתמש כבר ראה תוכן: גלילה > ~400px או 18ש'. דק, טקסט מינימלי.
// בלחיצה על "הרשמה" נפתח שדה מייל אינליין. אחרי סגירה — לא חוזר שבוע; אחרי הרשמה — 90 יום.
const KEY = "sod_updbar_until";
const HIDE = /^\/(admin|login|profile|traffic|numbers-report|theme-preview|enter|stream|heichal|היכל|galaxy)/;

const suppressed = () => {
  try { const u = parseInt(localStorage.getItem(KEY) || "0", 10); return u && Date.now() < u; } catch { return false; }
};
const suppress = days => { try { localStorage.setItem(KEY, String(Date.now() + days * 864e5)); } catch { /* noop */ } };

export default function UpdatesBar() {
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState("cta");   // cta | form | done
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (suppressed() || HIDE.test(pathname)) return;
    let fired = false;
    const reveal = () => { if (!fired) { fired = true; setShow(true); cleanup(); } };
    const onScroll = () => { if (window.scrollY > 400) reveal(); };
    const timer = setTimeout(reveal, 18000);
    window.addEventListener("scroll", onScroll, { passive: true });
    function cleanup() { clearTimeout(timer); window.removeEventListener("scroll", onScroll); }
    return cleanup;
  }, [pathname]);

  const close = useCallback(() => { setShow(false); suppress(7); }, []);

  const submit = useCallback(async (e) => {
    e?.preventDefault?.();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("מייל לא תקין"); return; }
    setBusy(true);
    try {
      await subscribeEmail({ email: email.trim(), source: "topbar" });
      trackSubscribe({ source: "topbar" });
      setMode("done"); suppress(90);
      setTimeout(() => setShow(false), 2600);
    } catch { setErr("נסו שוב"); }
    setBusy(false);
  }, [email]);

  if (!show || HIDE.test(pathname)) return null;

  return (
    <div className="upb" role="region" aria-label="הרשמה לעדכונים">
      {mode === "done" ? (
        <span className="upb-done">✓ תודה! נרשמתם לעדכונים 🙏</span>
      ) : mode === "form" ? (
        <form className="upb-form" onSubmit={submit}>
          <span className="upb-bell">🔔</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="המייל שלכם" dir="ltr" autoFocus className="upb-input" />
          <button type="submit" disabled={busy} className="upb-go">{busy ? "…" : "הרשמה"}</button>
          {err && <span className="upb-err">{err}</span>}
        </form>
      ) : (
        <>
          <span className="upb-txt"><span className="upb-bell">🔔</span> אל תפספסו תכנים חדשים — הרשמו לעדכונים</span>
          <button className="upb-cta" onClick={() => setMode("form")}>הרשמה לעדכונים</button>
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
        .upb-form { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .upb-input { padding: 6px 12px; border-radius: 8px; background: ${C.surface}; border: 1px solid ${C.border};
          color: ${C.goldLight}; font-family: ${F.body}; font-size: 13.5px; text-align: center; outline: none; width: 200px; max-width: 52vw; }
        .upb-go { cursor: pointer; border: none; border-radius: 8px; padding: 6px 16px;
          background: linear-gradient(135deg, #f6e27a, #caa030); color: #1a0e00; font-family: ${F.heading}; font-weight: 800; font-size: 12.5px; }
        .upb-err { color: #e0857a; font-family: ${F.body}; font-size: 12px; }
        .upb-done { color: ${C.goldBright}; font-family: ${F.heading}; font-weight: 700; font-size: 14px; }
        .upb-x { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); background: none; border: none;
          color: ${C.goldDim}; font-size: 22px; line-height: 1; cursor: pointer; padding: 2px 6px; }
        .upb-x:hover { color: ${C.goldBright}; }
        @keyframes upb-down { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (max-width: 560px) {
          .upb-txt { font-size: 12px; }
          .upb { gap: 9px; padding-right: 12px; }
        }
        @media (prefers-reduced-motion: reduce) { .upb { animation: none; } }
      `}</style>
    </div>
  );
}
