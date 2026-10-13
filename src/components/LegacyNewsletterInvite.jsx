import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { subscribeEmail } from "../lib/supabase.js";

// Legacy-only invitation. This is an email opt-in, NOT browser push or account creation.
const DISMISS_UNTIL = "sod_legacy_newsletter_invite_until";
const OPTED_IN = "sod_legacy_newsletter_invite_joined";
const EXCLUDED = /^\/(?:2029(?:\/|$)|admin(?:\/|$)|login(?:\/|$)|profile(?:\/|$)|research(?:\/|$)|heichal(?:\/|$)|היכל(?:\/|$))/i;
const features = [
  "עולם הגילוי — מספרים וקשרים",
  "עץ הידע וההתכנסויות",
  "מחשבון גימטריה מתקדם",
  "רזיאל AI ומחקר חכם",
  "היכל המחקר, כתבים וצפנים",
  "מסעות גילוי ועולמות חדשים",
  "קהילה, אזור אישי ועדכונים חיים",
  "חיפוש, חיבור ומעקב מתקדמים",
];
const store = (key, value) => { try { localStorage.setItem(key, value); } catch { /* browser storage may be disabled */ } };
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

export default function LegacyNewsletterInvite() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setOpen(false);
    if (loading || user || EXCLUDED.test(pathname) || read(OPTED_IN) === "yes" ||
        Number(read(DISMISS_UNTIL) || 0) > Date.now()) return;
    // Show only after engagement, not on the initial paint.
    let triggered = false;
    const reveal = () => {
      if (triggered) return;
      triggered = true;
      setOpen(true);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
    const onScroll = () => {
      if (window.scrollY > 450) reveal();
    };
    const timer = window.setTimeout(reveal, 22000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("scroll", onScroll); };
  }, [loading, user, pathname]);

  const close = () => {
    setOpen(false);
    store(DISMISS_UNTIL, String(Date.now() + 14 * 86400000));
  };
  const submit = async e => {
    e.preventDefault();
    if (busy) return;
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setError("נא להזין כתובת מייל תקינה"); return; }
    setBusy(true);
    setError("");
    try {
      const result = await subscribeEmail({ email: value, source: "legacy_2029_invite" });
      if (!result?.ok) throw new Error("signup unavailable");
      store(OPTED_IN, "yes");
      store(DISMISS_UNTIL, String(Date.now() + 365 * 86400000));
      setSuccess(true);
    } catch {
      setError("לא הצלחנו להשלים את ההרשמה כרגע. אפשר לנסות שוב.");
    } finally {
      setBusy(false);
    }
  };

  if (!open || loading || user || EXCLUDED.test(pathname)) return null;
  return (
    <div className="lni-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <section className="lni-modal" role="dialog" aria-modal="true" aria-labelledby="lni-title" dir="rtl">
        <button type="button" className="lni-close" onClick={close} aria-label="סגירה">×</button>
        <div className="lni-brand" aria-label="SOD1820 כי לה׳ המלוכה">
          <span className="lni-crown" aria-hidden="true">♛</span>
          <strong>SOD1820</strong>
          <span className="lni-motto">כי לה׳ המלוכה</span>
          <span className="lni-subbrand">קוד המציאות</span>
          <div className="lni-orbit" aria-hidden="true"><span>∞</span></div>
          <small>גילוי · מחקר · תודעה</small>
        </div>
        <div className="lni-content">
          {success ? (
            <div className="lni-success" role="status">
              <h2 id="lni-title">ברוכים הבאים לעולם החדש</h2>
              <p>נרשמתם לקבלת עדכונים. נשלח רק חדשות משמעותיות על האתר והכלים החדשים.</p>
              <button className="lni-primary" type="button" onClick={() => setOpen(false)}>ממשיכים לגלות</button>
            </div>
          ) : (
            <>
              <h2 id="lni-title">עולם חדש של גילוי נבנה עכשיו</h2>
              <h3>הצטרפו לעדכונים הראשונים</h3>
              <p className="lni-intro">אנחנו בונים עולם חדש של מחקר, גילוי ותודעה. הצטרפו וקבלו עדכונים על פתיחת המערכת, התכנים, הכלים והעולמות שבדרך.</p>
              <p className="lni-list-title">מה מחכה לכם?</p>
              <ul>{features.map((feature, i) => <li key={feature}><span aria-hidden="true">{["◉","♧","▦","✧","▤","◇","♙","⌕"][i]}</span>{feature}</li>)}</ul>
              <p className="lni-promise">בלי הצפה — רק עדכונים חשובים באמת</p>
              <form onSubmit={submit}>
                <label className="lni-label" htmlFor="lni-email">כתובת מייל לקבלת עדכונים</label>
                <input id="lni-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="הכניסו כתובת מייל" required maxLength={254} />
                {error && <div className="lni-error" role="alert">{error}</div>}
                <div className="lni-actions">
                  <button className="lni-primary" type="submit" disabled={busy}>{busy ? "מצטרפים…" : "כן, אני רוצה להתעדכן"}</button>
                  <button className="lni-secondary" type="button" onClick={close}>אולי אחר כך</button>
                </div>
              </form>
              <small className="lni-foot">בהרשמה אתם מסכימים לקבל עדכוני מייל. ניתן להסיר את ההרשמה בכל עת.</small>
            </>
          )}
        </div>
      </section>
      <style>{`
        .lni-backdrop{position:fixed;inset:0;z-index:10015;display:grid;place-items:center;padding:16px;background:rgba(2,5,12,.66);font-family:Arial,sans-serif}
        .lni-modal{position:relative;display:grid;grid-template-columns:36% 64%;width:min(760px,96vw);max-height:min(88dvh,790px);overflow:auto;color:#f1eee6;background:#08131e;border:1px solid #a68748;border-radius:15px;box-shadow:0 18px 65px #000a}
        .lni-close{position:absolute;top:8px;left:9px;z-index:2;background:transparent;border:0;color:#e8d5a1;font-size:27px;cursor:pointer;width:40px;height:40px}
        .lni-brand{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:30px 14px;text-align:center;min-height:380px;background:radial-gradient(ellipse at center,#1b3850 0%,#091a2d 55%,#050b13 100%);border-left:1px solid #6b5938;color:#e5c17a}
        .lni-brand strong{font:normal clamp(24px,4vw,40px) Georgia,serif;letter-spacing:1px}.lni-crown{font-size:32px}.lni-motto{font-size:clamp(18px,2.7vw,26px);font-weight:700;white-space:nowrap}.lni-subbrand{letter-spacing:5px;font-size:12px}.lni-brand small{letter-spacing:1px;font-size:12px}
        .lni-orbit{width:150px;height:150px;border:1px solid #a98c51;border-radius:50%;display:grid;place-items:center;box-shadow:0 0 0 18px #d9b96f0a,inset 0 0 35px #d4ac5b30;background:radial-gradient(circle,#e0bc6533,transparent 70%)}.lni-orbit span{font:64px Georgia,serif;color:#f1d59b}
        .lni-content{padding:30px 28px 22px;text-align:right}.lni-content h2{margin:0;color:#f0ce8b;font-size:clamp(19px,2.5vw,24px);line-height:1.3}.lni-content h3{color:#e2bc76;font-size:17px;margin:4px 0 12px}.lni-intro{font-size:13px;line-height:1.7;color:#d2d8df;margin:0 0 12px}.lni-list-title{font-weight:700;font-size:17px;color:#eac780;margin:6px 0 8px}.lni-content ul{padding:0;margin:0;list-style:none;display:grid;gap:6px}.lni-content li{display:flex;align-items:center;gap:9px;font-size:13px;line-height:1.35}.lni-content li span{color:#e6bb6b;width:20px;flex:0 0 20px;font-size:17px;text-align:center}
        .lni-promise{color:#e5c17a;font-size:12px;border-top:1px solid #695839;margin:15px 0 9px;padding-top:11px}.lni-label{font-size:12px;display:block;margin-bottom:6px;color:#d6d9dd}.lni-content input{width:100%;box-sizing:border-box;background:#142331;color:#fff;padding:12px;border-radius:7px;border:1px solid #8c9297;font-size:14px;direction:rtl}.lni-content input:focus-visible,.lni-modal button:focus-visible{outline:2px solid #fff;outline-offset:2px}.lni-actions{display:flex;gap:8px;margin-top:10px}.lni-actions button,.lni-success button{cursor:pointer;border-radius:7px;font-weight:700;min-height:43px;padding:8px 12px}.lni-primary{flex:1;border:0;background:linear-gradient(130deg,#f1d08b,#bd9041);color:#171109}.lni-primary:disabled{opacity:.65}.lni-secondary{border:1px solid #a68748;background:transparent;color:#f1eee6}.lni-error{font-size:12px;color:#ffb6ac;margin-top:6px}.lni-foot{display:block;margin-top:10px;color:#b6bdc5;font-size:10px;line-height:1.5}.lni-success{display:grid;align-content:center;gap:20px;min-height:320px}.lni-success p{line-height:1.7}
        @media(max-width:620px){.lni-modal{grid-template-columns:1fr;max-height:85dvh;width:min(420px,95vw)}.lni-brand{min-height:0;padding:14px;gap:3px}.lni-brand strong{font-size:24px}.lni-crown{font-size:18px}.lni-motto{font-size:17px}.lni-subbrand,.lni-orbit,.lni-brand small{display:none}.lni-content{padding:17px 18px}.lni-content ul{grid-template-columns:1fr;gap:5px}.lni-intro{font-size:12px}.lni-close{top:3px;left:4px}}
        @media(prefers-reduced-motion:reduce){.lni-modal{scroll-behavior:auto}}
      `}</style>
    </div>
  );
}
