import React, { useEffect, useState } from "react";

const DISMISS_KEY = "sod-legacy-claim-dismissed";
const readDismissed = () => { try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; } };
const SUPPORT = "mailto:zyz997@gmail.com";

// Calm entry card for people who wrote in the old chat. The account link itself is decided by the server from the
// signed-in account's confirmed email; this card only explains and starts it. No blinking: one soft highlight, played
// twice, and only when the reader has not asked for reduced motion.
export default function LegacyClaimCard({ user, legacy, onCheck, onSignInFocus }) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    const reopen = () => { if (window.location.hash === "#legacy-claim") { try { localStorage.removeItem(DISMISS_KEY); } catch { /* ignore */ } setDismissed(false); setAsked(true); } };
    reopen();
    window.addEventListener("hashchange", reopen);
    return () => window.removeEventListener("hashchange", reopen);
  }, []);
  const done = legacy.status === "claimed";
  if (dismissed && !done) return null;
  // A signed-in reader was already checked silently on arrival: show the card only for a result or on request.
  if (user && legacy.status === "idle" && !asked) return null;

  const close = () => { try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ } setDismissed(true); };
  const busy = legacy.status === "checking";
  let body;
  if (legacy.status === "claimed") body = <p role="status">מצאנו את החשבון שלך בצ׳אט הוותיק וקישרנו אליו {legacy.messages > 0 ? `${legacy.messages.toLocaleString("he-IL")} הודעות` : "את הפרופיל"}. מעכשיו ההודעות הישנות מופיעות בשמך.</p>;
  else if (legacy.status === "has_contributor") body = <p role="status">לחשבון שלך כבר מקושר פרופיל. אם חסרות לך הודעות מהצ׳אט הוותיק, <a href={SUPPORT}>כתבו לנו</a>.</p>;
  else if (legacy.status === "no_match") body = <p role="status">לא מצאנו חשבון ישן שמתאים למייל הזה. נסו להתחבר עם המייל שבו השתמשתם בצ׳אט הוותיק, או <a href={SUPPORT}>כתבו לנו</a> ונעזור.</p>;
  else if (legacy.status === "email_not_confirmed") body = <p role="status">צריך לאמת את כתובת המייל של החשבון לפני החיבור.</p>;
  else if (legacy.status === "unavailable") body = <p role="status">החיבור האוטומטי עדיין לא פעיל. <a href={SUPPORT}>כתבו לנו</a> ונחבר ידנית.</p>;
  else if (legacy.status === "error") body = <p role="alert">הבדיקה לא הושלמה. נסו שוב בעוד רגע.</p>;
  else body = <p>ההודעות והלייקים שלך מהצ׳אט הוותיק שמורים אצלנו. {user ? "נחפש אותם לפי המייל של החשבון שלך." : "התחברו עם המייל שבו השתמשתם שם, ואנחנו נחבר אותם אוטומטית."}</p>;

  return <section id="legacy-claim" className={`sod29-community-legacy-card${done ? " is-done" : ""}`} aria-labelledby="legacy-claim-title" data-legacy-claim={legacy.status}>
    <h2 id="legacy-claim-title">{done ? "החשבון הישן חובר" : "היית בצ׳אט הוותיק?"}</h2>
    {body}
    <div className="sod29-community-editor-actions">
      {!done ? <button type="button" className="sod29-community-primary" disabled={busy} onClick={() => (user ? onCheck() : onSignInFocus())}>{busy ? "בודק…" : "מצא את החשבון הישן שלי"}</button> : null}
      <button type="button" className="sod29-community-secondary" onClick={done ? () => setDismissed(true) : close}>{done ? "סגירה" : "לא רלוונטי"}</button>
    </div>
  </section>;
}
