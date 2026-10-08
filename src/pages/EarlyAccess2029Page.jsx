import React, { useEffect, useState } from "react";
import { BRAND_LOCKUP_2029 } from "../lib/brandAssets2029.js";
import { use2029Palette } from "../lib/palette.js";
import { signupAttribution, visitorId } from "../lib/acquisition.js";
import { SUPABASE_ANON, SUPABASE_URL } from "../lib/supabase.js";
import { captureAcquisition, captureArrivalSource, track } from "../lib/tracking.js";
import "./early-access-2029.css";

const CAMPAIGN = "early-access-2029";
const SIGNUP_SOURCE = "whatsapp-early-access-2029";
const VIDEO_URL = "https://d2ol7oe51mr4n9.cloudfront.net/user_3K6QdKjtRzXBDRzO9MYVhCqEOG4/0524acef-077d-49f8-9be5-5dad2c8fe538.mp4";
const WHATSAPP_URL = import.meta.env.VITE_WHATSAPP_CHANNEL || "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql";
const TIKTOK_URL = "https://www.tiktok.com/@sod_1820";
const RETURN_KEY = "sod_early_access_last_seen";

function validEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(value || "").trim());
}

export default function EarlyAccess2029Page() {
  const P = use2029Palette();
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");

  useEffect(() => {
    document.title = "SOD1820 — המערכת החדשה נבנית";
    try {
      captureArrivalSource();
      captureAcquisition();
      const lastSeen = Number(localStorage.getItem(RETURN_KEY) || 0);
      const now = Date.now();
      track("campaign_landing", CAMPAIGN, "landing_view", { landing: window.location.pathname, source: "whatsapp" });
      if (lastSeen > 0 && now - lastSeen >= 30 * 60 * 1000) {
        track("campaign_landing", CAMPAIGN, "returned", { landing: window.location.pathname, previous_seen_at: new Date(lastSeen).toISOString() });
      }
      localStorage.setItem(RETURN_KEY, String(now));
    } catch { /* analytics never blocks landing */ }
  }, []);

  async function submitEmail(event) {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!validEmail(value)) {
      setState("invalid");
      return;
    }

    setState("sending");
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-signup?format=json`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: SUPABASE_ANON,
          authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          email: value,
          source: SIGNUP_SOURCE,
          back: "/early-access",
          acquisition: signupAttribution(),
          visitor_id: visitorId(),
        }),
      });
      const data = await response.json().catch(() => ({ ok: false, status: "error" }));
      const next = data.status === "exists" ? "exists" : data.ok || data.status === "new" ? "new" : "error";
      setState(next);
      if (next === "new" || next === "exists") {
        try { track("campaign_landing", CAMPAIGN, "email_signup", { result: next, source: "whatsapp" }); } catch { /* noop */ }
      }
    } catch {
      setState("error");
    }
  }

  const themeVars = {
    "--c-page": P.pageBg,
    "--c-surface": P.card,
    "--c-surface-soft": P.cardSoft,
    "--c-raised": P.cardRaised,
    "--c-border": P.border,
    "--c-border-strong": P.borderStrong,
    "--c-text": P.ink,
    "--c-text-soft": P.inkSoft,
    "--c-primary": P.accent,
    "--c-secondary": P.accentSecondary,
    "--c-discovery": P.accentDiscovery,
    "--c-on-primary": P.onAccent,
    "--c-focus": P.focusRing,
    "--c-brand-gold": P.brandGold,
    "--c-brand-glow": P.brandGlow,
  };

  return (
    <main className="sod29-early-access" style={themeVars} dir="rtl">
      <div className="sod29-early-access-ambient" aria-hidden="true" />

      <header className="sod29-early-access-brand">
        <img
          src={BRAND_LOCKUP_2029.src}
          width={BRAND_LOCKUP_2029.width}
          height={BRAND_LOCKUP_2029.height}
          alt={BRAND_LOCKUP_2029.alt}
          className="sod29-early-access-lockup"
        />
        <p>המערכת החדשה של סוד 1820</p>
      </header>

      <section className="sod29-early-access-hero" aria-labelledby="early-access-title">
        <div className="sod29-early-access-badge">האתר בבנייה · אתם נכנסים לפני כולם</div>
        <h1 id="early-access-title">אנחנו בונים דרך חדשה <span>לחקור את המציאות.</span></h1>
        <p>
          SOD1820 נבנה מחדש כמערכת מחקר חכמה שמחברת תוכן, רמזים, מספרים,
          מקורות, מסעות וכלי AI במקום אחד.
        </p>
      </section>

      <section className="sod29-early-access-card sod29-early-access-video" aria-labelledby="early-access-video-title">
        <div className="sod29-early-access-section-head">
          <span>צפו עכשיו</span>
          <h2 id="early-access-video-title">הסרטון שמתפוצץ ברשת</h2>
          <p>הסרטון החדש שמציג את אחד החיבורים שאנחנו חוקרים במערכת.</p>
        </div>
        <div className="sod29-early-access-video-frame">
          <video controls playsInline preload="metadata" src={VIDEO_URL}>
            הדפדפן שלכם לא תומך בניגון וידאו.
          </video>
        </div>
        <a
          className="sod29-early-access-text-link"
          href={TIKTOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { try { track("campaign_landing", CAMPAIGN, "tiktok_open", { account: "@sod_1820" }); } catch { /* noop */ } }}
        >
          לעמוד הראשי שלנו ב־TikTok · @sod_1820 ←
        </a>
      </section>

      <section className="sod29-early-access-card" aria-labelledby="early-access-coming-title">
        <div className="sod29-early-access-section-head">
          <span>מה נפתח בקרוב</span>
          <h2 id="early-access-coming-title">לא עוד אתר לקריאה בלבד.</h2>
          <p>המטרה היא לתת לכם מערכת שאפשר לחקור איתה, לשמור בה ולהוסיף לה חומר חדש.</p>
        </div>

        <div className="sod29-early-access-grid">
          <article>
            <b>✦</b>
            <h3>שלחו רמזים למערכת</h3>
            <p>תוכלו לשלוח תמונה, מספר, תיאור או מקור — והמערכת תכניס אותו למסלול מחקר מסודר.</p>
          </article>
          <article>
            <b>◎</b>
            <h3>מסע החיים</h3>
            <p>מסע אישי שמחבר שמות, תאריכים, משפחה והקשרים לאורך החיים למפת מחקר אחת.</p>
          </article>
          <article>
            <b>⌁</b>
            <h3>חיפוש בתורה</h3>
            <p>חיפוש מתקדם בפסוקים, מילים, דילוגים וחיבורים — עם הקשר ולא רק רשימת תוצאות.</p>
          </article>
          <article>
            <b>AI</b>
            <h3>מחקר עם בינה מלאכותית</h3>
            <p>AI שיעזור לאתר קשרים, להסביר מה נמצא ולהוביל אתכם להמשך המחקר בלי להחליף את המקורות.</p>
          </article>
        </div>
      </section>

      <section className="sod29-early-access-card sod29-early-access-signup" aria-labelledby="early-access-signup-title">
        <span>רוצים לדעת ראשונים?</span>
        <h2 id="early-access-signup-title">קבלו עדכון כשהשלב הבא של המערכת נפתח.</h2>
        <p>השאירו מייל ונשלח לכם את העדכון הראשון כשהכלים החדשים נפתחים לציבור.</p>

        {state === "new" || state === "exists" ? (
          <div className="sod29-early-access-success" role="status">
            {state === "new" ? "נרשמתם ✓ העדכון הראשון בדרך אליכם." : "אתם כבר רשומים ✓ נתראה בעדכון הבא."}
          </div>
        ) : (
          <form onSubmit={submitEmail}>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (state === "invalid" || state === "error") setState("idle");
              }}
              placeholder="האימייל שלכם"
              dir="ltr"
              aria-label="אימייל להרשמה לעדכונים"
              autoComplete="email"
            />
            <button type="submit" disabled={state === "sending"}>
              {state === "sending" ? "רושם…" : "רשמו אותי לעדכון הראשון ←"}
            </button>
          </form>
        )}

        {state === "invalid" ? <small className="is-error">כתובת המייל לא נראית תקינה.</small> : null}
        {state === "error" ? <small className="is-error">ההרשמה לא הושלמה. נסו שוב בעוד רגע.</small> : null}
        <small>חינם · אפשר להסיר בכל רגע · בלי ספאם.</small>
      </section>

      <section className="sod29-early-access-card sod29-early-access-whatsapp">
        <div>
          <span>רוצים להישאר קרובים בינתיים?</span>
          <h2>הצטרפו לקבוצת SOD1820 ב־WhatsApp.</h2>
          <p>רמזים, גילויים ועדכונים חדשים בזמן שהמערכת ממשיכה להיבנות.</p>
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { try { track("campaign_landing", CAMPAIGN, "whatsapp_click", { source: "landing" }); } catch { /* noop */ } }}
        >
          הצטרפו לקבוצה ←
        </a>
      </section>

      <footer className="sod29-early-access-footer">
        <span>SOD1820</span><span>·</span><span>המערכת החדשה נבנית עכשיו</span>
      </footer>
    </main>
  );
}
