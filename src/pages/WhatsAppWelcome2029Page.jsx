import React, { useEffect, useState } from "react";
import { BRAND_LOCKUP_2029 } from "../lib/brandAssets2029.js";
import { use2029Palette } from "../lib/palette.js";
import { signupAttribution, visitorId } from "../lib/acquisition.js";
import { SUPABASE_ANON, SUPABASE_URL } from "../lib/supabase.js";
import { captureAcquisition, captureArrivalSource, track } from "../lib/tracking.js";
import "./whatsapp-welcome-2029.css";

const CAMPAIGN = "welcome-2029";
const VIDEO_URL = "https://d2ol7oe51mr4n9.cloudfront.net/user_3K6QdKjtRzXBDRzO9MYVhCqEOG4/0524acef-077d-49f8-9be5-5dad2c8fe538.mp4";
const WHATSAPP_URL = import.meta.env.VITE_WHATSAPP_CHANNEL || "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql";
const TIKTOK_URL = "https://www.tiktok.com/@sod_1820";

function validEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(value || "").trim());
}

export default function WhatsAppWelcome2029Page() {
  const P = use2029Palette();
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");

  useEffect(() => {
    document.title = "סוד 1820 — המערכת החדשה נבנית";
    try {
      captureArrivalSource();
      captureAcquisition();
      track("campaign_landing", CAMPAIGN, "view", {
        landing: window.location.pathname,
        source: "whatsapp",
      });
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
          source: "whatsapp-welcome-2029",
          back: "/whatsapp/kod-hametsiut",
          acquisition: signupAttribution(),
          visitor_id: visitorId(),
        }),
      });
      const data = await response.json().catch(() => ({ ok: false, status: "error" }));
      const next = data.status === "exists" ? "exists" : data.ok || data.status === "new" ? "new" : "error";
      setState(next);
      if (next === "new" || next === "exists") {
        try { track("campaign_landing", CAMPAIGN, "signup", { result: next, source: "whatsapp" }); } catch { /* noop */ }
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
    <main className="sod29-wa-welcome" style={themeVars} dir="rtl">
      <div className="sod29-wa-welcome-ambient" aria-hidden="true" />

      <header className="sod29-wa-welcome-brand">
        <img
          src={BRAND_LOCKUP_2029.src}
          width={BRAND_LOCKUP_2029.width}
          height={BRAND_LOCKUP_2029.height}
          alt={BRAND_LOCKUP_2029.alt}
          className="sod29-wa-welcome-lockup"
        />
        <p>סוד 1820 · המערכת החדשה</p>
      </header>

      <section className="sod29-wa-welcome-hero" aria-labelledby="wa-welcome-title">
        <div className="sod29-wa-welcome-badge">האתר בבנייה · אתם נכנסים לפני כולם</div>
        <h1 id="wa-welcome-title">אנחנו בונים דרך חדשה <span>לחקור את המציאות.</span></h1>
        <p>
          סוד 1820 נבנה מחדש כמערכת מחקר חכמה שמחברת תוכן, רמזים, מספרים, מקורות,
          מסעות וכלי AI במקום אחד.
        </p>
      </section>

      <section className="sod29-wa-welcome-video" aria-labelledby="wa-video-title">
        <div className="sod29-wa-welcome-section-head">
          <span>צפו עכשיו</span>
          <h2 id="wa-video-title">הסרטון שמתפוצץ ברשת</h2>
          <p>הסרטון החדש שמציג את אחד החיבורים שאנחנו חוקרים במערכת.</p>
        </div>
        <div className="sod29-wa-welcome-video-frame">
          <video controls playsInline preload="metadata" src={VIDEO_URL}>
            הדפדפן שלכם לא תומך בניגון וידאו.
          </video>
        </div>
        <a
          className="sod29-wa-welcome-text-link"
          href={TIKTOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { try { track("campaign_landing", CAMPAIGN, "tiktok_open", { account: "@sod_1820" }); } catch { /* noop */ } }}
        >
          לעמוד הראשי שלנו ב־TikTok · @sod_1820 ←
        </a>
      </section>

      <section className="sod29-wa-welcome-coming" aria-labelledby="wa-coming-title">
        <div className="sod29-wa-welcome-section-head">
          <span>מה נפתח בקרוב</span>
          <h2 id="wa-coming-title">לא עוד אתר לקריאה בלבד.</h2>
          <p>חלק מהכלים כבר נבנים ונבדקים עכשיו, והם ייפתחו לציבור בהדרגה.</p>
        </div>

        <div className="sod29-wa-welcome-grid">
          <article>
            <b>✦</b>
            <h3>שלחו רמזים למערכת</h3>
            <p>בקרוב תוכלו לשלוח תמונה, מספר, תיאור או מקור — והמערכת תכניס אותו למסלול מחקר מסודר.</p>
          </article>
          <article>
            <b>◎</b>
            <h3>מסע החיים</h3>
            <p>כלי אישי שכבר נבנה במערכת החדשה ומחבר שמות, תאריכים, משפחה והקשרים למפת מחקר אחת.</p>
          </article>
          <article>
            <b>⌁</b>
            <h3>חיפוש בתורה</h3>
            <p>בקרוב: חיפוש מתקדם בפסוקים, מילים, דילוגים וחיבורים — עם הקשר ולא רק רשימת תוצאות.</p>
          </article>
          <article>
            <b>AI</b>
            <h3>מחקר עם בינה מלאכותית</h3>
            <p>בקרוב: AI שיעזור לאתר קשרים, להסביר מה נמצא ולהוביל להמשך המחקר — כשהמקורות נשארים במרכז.</p>
          </article>
        </div>
      </section>

      <section className="sod29-wa-welcome-signup" aria-labelledby="wa-signup-title">
        <span>רוצים לדעת ראשונים?</span>
        <h2 id="wa-signup-title">קבלו עדכון כשהשלב הבא של המערכת נפתח.</h2>
        <p>השאירו מייל ונשלח לכם את העדכון הראשון כשהכלים החדשים נפתחים לציבור.</p>

        {state === "new" || state === "exists" ? (
          <div className="sod29-wa-welcome-success" role="status">
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

      <section className="sod29-wa-welcome-whatsapp">
        <div>
          <span>רוצים להישאר קרובים בינתיים?</span>
          <h2>הצטרפו לקבוצת סוד 1820 ב־WhatsApp.</h2>
          <p>רמזים, גילויים ועדכונים חדשים בזמן שהמערכת ממשיכה להיבנות.</p>
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { try { track("campaign_landing", CAMPAIGN, "whatsapp_join", { source: "landing" }); } catch { /* noop */ } }}
        >
          הצטרפו לקבוצה ←
        </a>
      </section>

      <footer className="sod29-wa-welcome-footer">
        <span>סוד 1820</span>
        <span>·</span>
        <span>המערכת החדשה נבנית עכשיו</span>
      </footer>
    </main>
  );
}
