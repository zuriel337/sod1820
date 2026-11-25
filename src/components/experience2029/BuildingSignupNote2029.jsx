import React, { lazy, Suspense, useId, useState } from "react";
import "./buildingSignupNote2029.css";

// ZURIEL 25.11.2026 (D5/D9, approved on a branch): ONE construction note and ONE sign-up entry, shown at the foot of the Home's "עדכונים אחרונים"
// and of the "עכשיו" panel. The button opens the EXISTING sign-up component (NewsletterSignup2029: the site-updates purpose, EmailVerify/OTP,
// subscription_funnel_law v22). Nothing here subscribes anyone and nothing here reports success: the component reports what the server answered.
// The Home passes `onSignup` (it scrolls to its single sign-up section); "עכשיו" has none and opens the component inline, on demand.
export const BUILDING_NOTE_TEXT = "האתר נבנה מבפנים. המערכת מתפתחת ומתחדשת כל הזמן. במהלך הבנייה ייתכנו תקלות זמניות. הצטרפו אלינו וקבלו עדכונים על חידושים ופתיחת אזורים נוספים.";
export const BUILDING_NOTE_ACTION = "הרשמה לעדכונים";
const Signup = lazy(() => import("../StayUpdatedCTA.jsx").then(module => ({ default: module.NewsletterSignup2029 })));

export default function BuildingSignupNote2029({ onSignup = null, scope = "home" }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const press = () => { if (onSignup) onSignup(); else setOpen(value => !value); };
  return <div className="bn29 r29" role="note" data-building-note={scope}>
    <div className="r29-rule" aria-hidden="true">◆</div>
    <div className="bn29-row">
      <p className="bn29-text">{BUILDING_NOTE_TEXT}</p>
      <button type="button" className="r29-btn is-primary bn29-btn" onClick={press} aria-expanded={onSignup ? undefined : open} aria-controls={onSignup ? undefined : panel}
        data-building-signup={scope}>{BUILDING_NOTE_ACTION}</button>
    </div>
    {!onSignup && open ? <div id={panel} className="bn29-form"><Suspense fallback={<p className="bn29-text" role="status">טוען את טופס ההרשמה…</p>}><Signup /></Suspense></div> : null}
  </div>;
}
