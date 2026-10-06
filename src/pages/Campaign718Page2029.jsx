import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BRAND_LOCKUP_2029 } from "../lib/brandAssets2029.js";
import { use2029Palette } from "../lib/palette.js";
import { buildCalculator2029FastPreview } from "../lib/research/calculator2029FastPreview.js";
import { signupAttribution, visitorId } from "../lib/acquisition.js";
import { SUPABASE_ANON, SUPABASE_URL, supabase } from "../lib/supabase.js";
import { captureAcquisition, captureArrivalSource, track } from "../lib/tracking.js";
import "./campaign718-2029.css";

const CAMPAIGN = "tiktok-melech-hamisparim-718";
const DEFAULT_EXPRESSION = "שביעי באוקטובר";
const CONVERGENCE = Object.freeze(["שביעי באוקטובר", "חדשות", "התשובה"]);
const WHATSAPP_URL = import.meta.env.VITE_WHATSAPP_CHANNEL || "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql";

// Human-Gate-selected intro asset: the YouTube video embedded in the canonical main SOD1820 post
// (posts.id=1799, slug="סוד-1820"). The post remains the source; this landing only projects it.
const INTRO_VIDEO = Object.freeze({
  youtubeId: "DClJVGBMCs0",
  embedSrc: "https://www.youtube-nocookie.com/embed/DClJVGBMCs0?rel=0&modestbranding=1",
  sourcePostSlug: "סוד-1820",
});

function validEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(value || "").trim());
}

function touchMeta(extra = {}) {
  return {
    campaign: CAMPAIGN,
    account: "מלך המספרים",
    platform: "tiktok",
    focal_value: 718,
    ...extra,
  };
}

export default function Campaign718Page2029() {
  const P = use2029Palette();
  const [sp] = useSearchParams();
  const ref = sp.get("ref") || "";
  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [verified, setVerified] = useState({ phrase: DEFAULT_EXPRESSION, value: null, loading: true, error: null });
  const [convergence, setConvergence] = useState([]);
  const [email, setEmail] = useState("");
  const [signupState, setSignupState] = useState("idle");
  const verifySeq = useRef(0);

  const preview = useMemo(() => buildCalculator2029FastPreview(expression), [expression]);
  const instantRagil = preview?.methods?.find((method) => method.methodKey === "רגיל")?.computedValue ?? null;
  const is718 = Number(verified.value) === 718 && verified.phrase === expression.trim();

  useEffect(() => {
    document.title = "718 · מלך המספרים × SOD1820";
    try {
      captureArrivalSource();
      captureAcquisition();
      track("campaign_landing", CAMPAIGN, "view", touchMeta({ landing: window.location.pathname }));
    } catch { /* analytics never blocks landing */ }
  }, []);

  useEffect(() => {
    let live = true;
    Promise.all(CONVERGENCE.map(async (phrase) => {
      const { data, error } = await supabase.rpc("fn_method_value", {
        p_method_key: "רגיל",
        p_phrase: phrase,
      });
      return { phrase, value: Number(data), verified: !error && Number(data) === 718 };
    })).then((rows) => {
      if (!live) return;
      setConvergence(rows);
    }).catch(() => {
      if (live) setConvergence([]);
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const phrase = expression.trim();
    const seq = ++verifySeq.current;
    if (!phrase) {
      setVerified({ phrase: "", value: null, loading: false, error: null });
      return undefined;
    }

    setVerified((state) => ({ ...state, phrase, loading: true, error: null }));
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("fn_method_value", {
        p_method_key: "רגיל",
        p_phrase: phrase,
      });
      if (seq !== verifySeq.current) return;
      const value = Number(data);
      setVerified({
        phrase,
        value: !error && Number.isFinite(value) ? value : null,
        loading: false,
        error: error || null,
      });
      if (!error && Number.isFinite(value)) {
        try { track("campaign_landing", CAMPAIGN, "calculator_verify", touchMeta({ phrase, value })); } catch { /* noop */ }
      }
    }, 260);

    return () => window.clearTimeout(timer);
  }, [expression]);

  async function submitEmail(event) {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!validEmail(value)) {
      setSignupState("invalid");
      return;
    }

    setSignupState("sending");
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
          source: CAMPAIGN,
          ref,
          back: "/melech-hamisparim/718",
          acquisition: signupAttribution(),
          visitor_id: visitorId(),
        }),
      });
      const data = await response.json().catch(() => ({ ok: false, status: "error" }));
      const next = data.status === "exists" ? "exists" : data.ok || data.status === "new" ? "unlocked" : "error";
      setSignupState(next);
      if (next === "unlocked" || next === "exists") {
        try {
          track("campaign_landing", CAMPAIGN, "signup", touchMeta({ result: next }));
          track("campaign_landing", CAMPAIGN, "video_unlock", touchMeta({
            asset_ready: Boolean(INTRO_VIDEO?.youtubeId),
            video_asset: INTRO_VIDEO?.youtubeId || null,
          }));
        } catch { /* noop */ }
      }
    } catch {
      setSignupState("error");
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
    "--c-brand-sapphire": P.brandSapphire,
    "--c-brand-gold": P.brandGold,
    "--c-brand-glow": P.brandGlow,
  };

  const unlocked = signupState === "unlocked" || signupState === "exists";

  return (
    <main className="sod29-campaign718" style={themeVars} dir="rtl">
      <div className="sod29-campaign718-ambient" aria-hidden="true" />

      <header className="sod29-campaign718-brand">
        <div className="sod29-campaign718-brand-kicker">מלך המספרים × SOD1820 · 2029</div>
        <img
          src={BRAND_LOCKUP_2029.src}
          width={BRAND_LOCKUP_2029.width}
          height={BRAND_LOCKUP_2029.height}
          alt={BRAND_LOCKUP_2029.alt}
          className="sod29-campaign718-lockup"
        />
        <p>לגלות את המציאות בשפת המספרים</p>
      </header>

      <section className="sod29-campaign718-hero" aria-labelledby="campaign718-title">
        <div className="sod29-campaign718-eyebrow">כתבתם 718 בתגובות? עכשיו תראו למה.</div>
        <h1 id="campaign718-title">
          מספר אחד.<br />
          <span>שלושה חיבורים.</span>
        </h1>
        <p>
          זה לא צילום מסך של מחשבון. זה מנוע הגימטריה של SOD1820.
          נסו את הביטוי שכבר פתחנו בשבילכם — ואז שנו אותו לכל מילה שתרצו.
        </p>
      </section>

      <section className="sod29-campaign718-calc" aria-label="מחשבון גימטריה 718">
        <div className="sod29-campaign718-calc-head">
          <div>
            <span>גימטריה · רגיל</span>
            <strong>המחשבון כבר פתוח</strong>
          </div>
          <div className={`sod29-campaign718-status ${verified.loading ? "is-loading" : verified.error ? "is-error" : "is-verified"}`}>
            {verified.loading ? "מאמת…" : verified.error ? "לא זמין כרגע" : "מאומת במנוע"}
          </div>
        </div>

        <label htmlFor="campaign718-input">שם, מילה או ביטוי</label>
        <input
          id="campaign718-input"
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
          spellCheck="false"
          autoComplete="off"
        />

        <div className="sod29-campaign718-result" aria-live="polite">
          <div>
            <small>{verified.loading ? "תוצאה מיידית" : verified.error ? "תצוגה מיידית" : "תוצאה מאומתת"}</small>
            <strong>{verified.loading || verified.error ? instantRagil ?? "—" : verified.value ?? "—"}</strong>
          </div>
          <span>{expression.trim() || "הקלידו ביטוי"}</span>
        </div>

        <div className="sod29-campaign718-chips" aria-label="נסו את חיבורי 718">
          {CONVERGENCE.map((phrase) => (
            <button type="button" key={phrase} onClick={() => setExpression(phrase)}>
              {phrase}
            </button>
          ))}
        </div>

        {is718 ? (
          <div className="sod29-campaign718-reveal">
            <div className="sod29-campaign718-reveal-title">718 נפתח לעוד שתי נקודות באותו מנוע</div>
            <div className="sod29-campaign718-reveal-grid">
              {convergence.filter((item) => item.phrase !== expression.trim()).map((item) => (
                <div key={item.phrase} className={item.verified ? "is-verified" : ""}>
                  <span>{item.phrase}</span>
                  <strong>{item.verified ? item.value : "—"}</strong>
                  <small>{item.verified ? "רגיל · מאומת" : "אימות לא זמין"}</small>
                </div>
              ))}
            </div>
            <p>השוויון המספרי מאומת. החיבור בין הביטויים הוא שכבת גילוי ופרשנות — לא טענה שהם אותו דבר.</p>
          </div>
        ) : null}

        <Link
          className="sod29-campaign718-text-link"
          to={`/2029/gematria?q=${encodeURIComponent(expression.trim() || DEFAULT_EXPRESSION)}`}
        >
          פתחו את אותו ביטוי במחשבון 2029 המלא ←
        </Link>
      </section>

      <section className="sod29-campaign718-story">
        <span>מה זה SOD1820?</span>
        <h2>מערכת שמחברת מספרים, מילים, פסוקים, אנשים ואירועים לעץ מחקר אחד.</h2>
        <p>
          718 הוא רק שער קטן. מאחוריו נמצאים דף המספר, העולם, פוסטים, צפנים, ELS,
          מסעות מחקר ורזיאל — כולם נשענים על אותם מנועים ואותו גוף ידע.
        </p>
      </section>

      <section className="sod29-campaign718-gate" aria-labelledby="campaign718-video-title">
        {!unlocked ? (
          <>
            <span>המשך למי שרוצה להבין את התמונה</span>
            <h2 id="campaign718-video-title">קבלו את הסרטון שמסביר מהו סוד 1820</h2>
            <p>השאירו מייל. הסרטון ייפתח כאן באותו דף, ותצטרפו לעדכונים על הרמזים והכלים החדשים.</p>
            <form onSubmit={submitEmail}>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (signupState === "invalid" || signupState === "error") setSignupState("idle");
                }}
                placeholder="האימייל שלכם"
                dir="ltr"
                aria-label="אימייל לקבלת הסרטון והעדכונים"
              />
              <button type="submit" disabled={signupState === "sending"}>
                {signupState === "sending" ? "פותח…" : "פתחו את הסרטון ←"}
              </button>
            </form>
            {signupState === "invalid" ? <small className="is-error">כתובת המייל לא נראית תקינה.</small> : null}
            {signupState === "error" ? <small className="is-error">ההרשמה לא הושלמה. נסו שוב.</small> : null}
            <small>חינם · אפשר להסיר בכל רגע · המייל משמש לעדכוני SOD1820.</small>
          </>
        ) : (
          <div className="sod29-campaign718-video">
            <span>נפתח ✓</span>

            <div className="sod29-campaign718-secret">
              <small>לפני הסרטון — למה דווקא 1820?</small>
              <h2 id="campaign718-video-title">1820 הוא המספר שממנו התחיל הסוד.</h2>
              <p>
                שם הוי״ה מופיע בתורה 1,820 פעמים. מכאן נולד השם SOD1820 —
                ומשם נפתח מחקר שמחבר מספרים, מילים, פסוקים ואירועים.
              </p>
              <strong>למדו על הסוד ↓</strong>
            </div>

            <div className="sod29-campaign718-video-frame">
              <iframe
                src={INTRO_VIDEO.embedSrc}
                title="סוד 1820 — סרטון ההיכרות"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <small className="sod29-campaign718-video-source">הסרטון המקורי מתוך הפוסט הראשי של סוד 1820.</small>
          </div>
        )}
      </section>

      <section className="sod29-campaign718-whatsapp" aria-label="עדכונים שוטפים בוואטסאפ">
        <div>
          <span>רוצים לקבל את הרמז הבא כשהוא עולה?</span>
          <h2>עדכונים שוטפים על רמזים — ישר לוואטסאפ.</h2>
          <p>הצטרפו לקבוצת SOD1820 וקבלו רמזים, גילויים ועדכונים חדשים.</p>
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            try { track("campaign_landing", CAMPAIGN, "whatsapp_join", touchMeta({ destination: "canonical_group" })); } catch { /* noop */ }
          }}
        >
          הצטרפו לקבוצת הוואטסאפ ←
        </a>
      </section>

      <section className="sod29-campaign718-next">
        <div>
          <span>רוצים להמשיך לחקור?</span>
          <h2>היכנסו ל־2029.</h2>
        </div>
        <div className="sod29-campaign718-actions">
          <Link to="/topic/gapfill-718">פתחו את ציר 718 ←</Link>
          <Link to="/2029">היכנסו ל־SOD1820 2029</Link>
        </div>
      </section>

      <footer className="sod29-campaign718-footer">
        <span>מלך המספרים · TikTok</span>
        <span>×</span>
        <span>SOD1820 · 2029</span>
      </footer>
    </main>
  );
}
