import React, { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import {
  ACCOUNT_LINK_ENABLED, fetchAccountLinkOffer, dismissAccountLinkOffer, beginAccountLink,
  createProofClient, sendPrimaryOtp, verifyPrimaryOtp, confirmAccountLink,
} from "../../lib/accountLink.js";
import "./accountLinkOffer2029.css";

// Offer shown ONLY to a signed-in account that has an owner-asserted link offer for itself. Historical link only:
// the explanation says so before any proof is asked. "Not now" is recorded and the offer is not shown again.
export default function AccountLinkOffer2029({ enabled = ACCOUNT_LINK_ENABLED, client = supabase }) {
  const { user } = useAuth();
  const [offer, setOffer] = useState(null);
  const [step, setStep] = useState("offer");     // offer | email | code | consent | done | failed
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState(null);
  const [token, setToken] = useState(null);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!enabled || !user?.id) { setOffer(null); return undefined; }
    let alive = true;
    fetchAccountLinkOffer(client).then((found) => { if (alive) setOffer(found); });
    return () => { alive = false; };
  }, [enabled, user?.id, client]);

  if (!enabled || !user?.id || !offer) return null;
  const run = async (task) => { setBusy(true); try { await task(); } catch { setStep("failed"); } finally { setBusy(false); } };
  const dismiss = () => run(async () => { await dismissAccountLinkOffer(client, offer.id); setOffer(null); });
  const sendCode = (event) => { event.preventDefault(); return run(async () => {
    const p = proof || await createProofClient(); setProof(p);
    setStep((await sendPrimaryOtp(p, email)) ? "code" : "failed");
  }); };
  const checkCode = (event) => { event.preventDefault(); return run(async () => {
    const t = await verifyPrimaryOtp(proof, email, code); setToken(t); setStep(t ? "consent" : "failed");
  }); };
  const confirm = () => run(async () => {
    const nonce = await beginAccountLink(client, offer.id);
    const { data } = await client.auth.getSession();
    const ok = Boolean(nonce && data?.session?.access_token && token)
      && await confirmAccountLink({ secondaryAccessToken: data.session.access_token, offerId: offer.id, nonce, primaryAccessToken: token });
    setToken(null); setStep(ok ? "done" : "failed");
  });

  return <section className="a29-link" role="region" aria-label="איחוד היסטוריה בין חשבונות" data-account-link-offer="true">
    {step === "offer" ? <>
      <strong>ייתכן שיש לך חשבון נוסף באתר.</strong>
      <p>אפשר לאחד את <b>ההיסטוריה</b> של החשבונות. זה איחוד היסטוריה בלבד: לא מוחקים ולא ממזגים חשבון התחברות, ולא משנים התראות, קרדיטים או תשלומים. נבקש הוכחה שהחשבון השני שלך.</p>
      <div className="sod29-action-row">
        <button type="button" className="sod29-action primary" onClick={() => setStep("email")} disabled={busy}>בדיקת איחוד</button>
        <button type="button" className="sod29-action" onClick={dismiss} disabled={busy}>לא עכשיו</button>
      </div>
    </> : null}
    {step === "email" ? <form onSubmit={sendCode}>
      <label>כתובת הדוא״ל של החשבון השני <input type="email" dir="ltr" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <p>נשלח לשם קוד חד־פעמי. הוא נועד רק להוכיח שהחשבון שלך.</p>
      <div className="sod29-action-row"><button type="submit" className="sod29-action primary" disabled={busy}>שליחת קוד</button><button type="button" className="sod29-action" onClick={dismiss} disabled={busy}>ביטול</button></div>
    </form> : null}
    {step === "code" ? <form onSubmit={checkCode}>
      <label>הקוד שהגיע במייל <input inputMode="numeric" dir="ltr" required autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} /></label>
      <div className="sod29-action-row"><button type="submit" className="sod29-action primary" disabled={busy}>אימות</button></div>
    </form> : null}
    {step === "consent" ? <>
      <strong>שני החשבונות אומתו.</strong>
      <p>מה יקרה: ההיסטוריה המאושרת תיחשב אחת. מה לא ישתנה: חשבונות ההתחברות, ההתראות, הקרדיטים, התשלומים והתוכן הממתין לאישור.</p>
      <label className="a29-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> אני מאשר/ת איחוד היסטוריה בין שני החשבונות שלי.</label>
      <div className="sod29-action-row"><button type="button" className="sod29-action primary" onClick={confirm} disabled={!consent || busy}>אישור סופי</button><button type="button" className="sod29-action" onClick={dismiss} disabled={busy}>ביטול</button></div>
    </> : null}
    {step === "done" ? <p role="status"><span className="a29-stamp">היסטוריה אוחדה</span> ההיסטוריה של שני החשבונות אוחדה. חשבונות ההתחברות נשארו נפרדים.</p> : null}
    {step === "failed" ? <p role="alert">לא הצלחנו לאמת. אפשר לנסות שוב מאוחר יותר. לא בוצע שינוי. <button type="button" className="sod29-nowpub-link" onClick={() => { setStep("offer"); setConsent(false); setCode(""); }}>חזרה</button></p> : null}
  </section>;
}
