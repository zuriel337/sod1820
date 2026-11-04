import React from "react";
import { NewsletterSignup2029 } from "../StayUpdatedCTA.jsx";
import { confirmGuestNewsletterInvite2029 } from "./useGuestNewsletterInvite2029.js";
import { BRAND_LOCKUP_NAV_2029, HOME_ATMOSPHERE_2029 } from "../../lib/brandAssets2029.js";
import "./guestNewsletterInvite2029.css";

// Same invitation as the mounted Legacy popup, using the existing 2029 form.
// Loading this sheet never subscribes, creates an account, or starts push/AI.
export default function GuestNewsletterInvite2029({ onClose }) {
  return <section className="sod29-newsletter-invite" dir="rtl" data-newsletter-invite="site-updates">
    <div className="sod29-newsletter-invite-brand">
      <img className="sod29-newsletter-invite-atmosphere" src={HOME_ATMOSPHERE_2029.mobile} alt="" width="800" height="1200" />
      <img className="sod29-newsletter-invite-logo" src={BRAND_LOCKUP_NAV_2029.src} alt={BRAND_LOCKUP_NAV_2029.alt} width={BRAND_LOCKUP_NAV_2029.width} height={BRAND_LOCKUP_NAV_2029.height} />
      <strong>SOD1820</strong><small>גילוי · מחקר · תודעה</small>
    </div>
    <div className="sod29-newsletter-invite-content">
    <div className="sod29-panel-lead">
      <h3>הצטרפו לעדכונים הראשונים</h3>
      <p>אנחנו בונים עולם חדש של מחקר, גילוי ותודעה. הצטרפו וקבלו עדכונים על פתיחת המערכת, התכנים, הכלים והעולמות שבדרך.</p>
    </div>
    <h3>מה מחכה לכם?</h3>
    <ul>
      <li>עולם הגילוי — מספרים וקשרים</li><li>עץ הידע וההתכנסויות</li>
      <li>מחשבון גימטריה מתקדם</li><li>רזיאל AI ומחקר חכם</li>
      <li>היכל המחקר, כתבים וצפנים</li><li>מסעות גילוי ועולמות חדשים</li>
      <li>קהילה, אזור אישי ועדכונים חיים</li><li>חיפוש, חיבור ומעקב מתקדמים</li>
    </ul>
    <p className="sod29-muted">בלי הצפה — רק עדכונים חשובים באמת</p>
    <NewsletterSignup2029 submitLabel="כן, אני רוצה להתעדכן" onSubscribed={confirmGuestNewsletterInvite2029} />
    <button type="button" className="sod29-action" onClick={onClose}>אולי אחר כך</button>
    </div>
  </section>;
}
