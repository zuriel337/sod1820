import React, { useEffect, useRef, useState } from "react";
import { TYPEFACE } from "../lib/designTokens.js";
import { accentRoles2029 } from "../lib/paletteRoles2029.js";
import { use2029Palette } from "../lib/palette2029.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { subscribeEmail, SUPABASE_URL } from "../lib/supabase.js";
import { submitNewsletterSignup, probeSiteUpdatesSignup } from "../lib/newsletterSignup.js";
import { trackSubscribe, trackConversion } from "../lib/marketing.js";
import { PUSH_CONFIGURED, pushSupported, enablePush } from "../lib/push.js";

// Native presentation of the same newsletter owner. Consent is separate from
// login and following. Tests substitute the transport; never send a test email.
export function NewsletterSignup2029({ submitLabel = "הרשמה לעדכוני האתר", onSubscribed = null, variant = "card", children = null } = {}) {
  const compact = variant === "compact";
  const { user } = useAuth();
  const [availability, setAvailability] = useState("idle");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState("idle");
  const pending = useRef(null);
  useEffect(() => {
    pending.current?.abort(); pending.current = null;
    setEmail(""); setConsent(false); setState("idle"); setAvailability("idle");
    return () => { pending.current?.abort(); pending.current = null; };
  }, [user?.id]);
  async function prepareForm() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller; setAvailability("checking"); setState("idle");
    try {
      await probeSiteUpdatesSignup({ endpoint: `${SUPABASE_URL}/functions/v1/newsletter-signup`, signal: controller.signal });
      if (!controller.signal.aborted) setAvailability("ready");
    } catch {
      if (!controller.signal.aborted) { setAvailability("unavailable"); setState("unavailable"); }
    } finally { if (pending.current === controller) pending.current = null; }
  }
  async function submit(event) {
    event.preventDefault();
    if (availability !== "ready") return;
    if (pending.current || !consent) return;
    const controller = new AbortController();
    pending.current = controller; setState("loading");
    try {
      const result = await submitNewsletterSignup({ email, consent, purpose: "site-updates" }, {
        endpoint: `${SUPABASE_URL}/functions/v1/newsletter-signup`, signal: controller.signal,
      });
      if (!controller.signal.aborted) { setState(result.status); setEmail(""); setConsent(false); onSubscribed?.(result); }
    } catch (error) {
      if (!controller.signal.aborted) {
        const unavailable = error?.message === "newsletter-purpose-unavailable";
        if (unavailable) setAvailability("unavailable");
        setState(error?.message === "newsletter-verification-required" ? "verification-required" : unavailable ? "unavailable" : "error");
      }
    }
    finally { if (pending.current === controller) pending.current = null; }
  }
  const label = submitLabel;
  const saved = state === "new" || state === "exists";
  const askButton = <button type="button" className="sod29-action" onClick={prepareForm} disabled={availability === "checking"} aria-busy={availability === "checking"}>{availability === "checking" ? "בודקים זמינות…" : availability === "unavailable" ? "בדיקת זמינות מחדש" : label}</button>;
  // Contract: a control and the text/link next to it always sit in one `sod29-action-row` (gap owned by the primitive),
  // never as bare siblings that rely on whitespace.
  const privacyLink = <a href="/privacy">פרטיות</a>;
  const form = <form onSubmit={submit} className={compact ? "sod29-actions sod29-updates-form" : "sod29-actions"} aria-busy={state === "loading"}>
    <label>כתובת דוא״ל <input type="email" autoComplete="email" dir="ltr" required maxLength={120} value={email} onChange={e => setEmail(e.target.value)} disabled={state === "loading"} /></label>
    <label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={state === "loading"} style={{ width: "auto", minHeight: "auto", accentColor: "var(--s29-accent)" }} /> אני רוצה לקבל במייל את עדכוני האתר.</label>
    <button type="submit" className="sod29-action" disabled={!consent || state === "loading"}>{state === "loading" ? "רושמים…" : label}</button>
  </form>;
  const notices = <>
    {state === "verification-required" ? <p role="alert">נדרש אימות בעלות על הכתובת לפני שינוי העדפות הרשמה קיימות.</p> : null}
    {state === "unavailable" ? <p role="alert">ההרשמה לעדכוני האתר עדיין אינה זמינה. הכתובת לא נשלחה להרשמה כללית.</p> : null}
    {state === "error" ? <p role="alert">ההרשמה לא הושלמה. אפשר לבדוק את הכתובת ולנסות שוב.</p> : null}
  </>;
  if (compact) {
    // Footer strip: one line on desktop, two short lines on a phone. No heading block, no card.
    return <section className="sod29-site-updates sod29-site-updates--compact" aria-label="עדכוני האתר">
      <strong className="sod29-updates-title">עדכונים</strong>
      {availability === "ready" && !saved ? form : null}
      <div className="sod29-action-row">
        {saved ? <span role="status">ההרשמה לעדכוני האתר נשמרה.</span> : availability === "ready" ? null : askButton}
        {children}
        {privacyLink}
      </div>
      {notices}
    </section>;
  }
  return <section className="sod29-section sod29-site-updates" aria-label="עדכוני האתר">
    <h2>עדכוני האתר</h2>
    <p>פרסומים חדשים וחלקים שנפתחים, במייל.</p>
    {availability !== "ready" ? <div className="sod29-action-row">{askButton}{privacyLink}</div> : saved ? <p role="status">ההרשמה לעדכוני האתר נשמרה.</p> : form}
    {notices}
    {availability === "ready" || saved ? <div className="sod29-action-row">{privacyLink}</div> : null}
  </section>;
}

// "הישאר מעודכן" — מייל הוא הקריאה הראשית והישירה (שדה גלוי, בלי מודאל).
// Push = אופציה משנית קטנה מתחת (רק אם מוגדר VAPID). בלי popup אוטומטי.
// variant: "home" (קריאה ראשית) | "footer" (עדין). source נשמר ל-subscribers.
// non-footer variants use the semantic page palette, so light surfaces do not inherit legacy gold chrome.
export default function StayUpdatedCTA({ variant = "home", source: sourceOverride = null, title = null, description = null }) {
  const P = use2029Palette();
  const cc = accentRoles2029(P);
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");   // "" | "email" | "push"
  const [err, setErr] = useState("");

  const source = sourceOverride || (variant === "footer" ? "footer-stay" : "home-stay");
  const pushReady = PUSH_CONFIGURED && pushSupported();

  async function submitEmail(e) {
    e?.preventDefault?.();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("נא להזין כתובת אימייל תקינה"); return; }
    setBusy(true);
    try {
      await subscribeEmail({ email: email.trim(), source });
      trackSubscribe({ source });
      setDone("email");
    } catch { setErr("משהו השתבש — נסו שוב בעוד רגע"); }
    setBusy(false);
  }

  async function choosePush() {
    setErr(""); setBusy(true);
    const r = await enablePush({ userId: user?.id || null, topics: [] });
    setBusy(false);
    if (r.ok) { trackConversion("push_enabled", { source }); setDone("push"); }
    else setErr(r.reason === "denied" ? "הדפדפן חסם התראות — אפשר לאשר בהגדרות" : "לא ניתן להפעיל התראות כרגע");
  }

  const successMsg = done === "push" ? "מעולה! תקבלו התראות כשיֵצא חדש 🔔" : "אתם בפנים! נעדכן אתכם כשיֵצא חדש 🙏";

  // ===== פוטר — דסקטופ: פרוס על הרוחב (טקסט מימין, טופס משמאל) · נייד: ממורכז =====
  // חשוב: הפוטר אינו רשאי לעצב מחדש global navbar chrome. BuildProgressBadge חי רק ב-Navbar.
  if (variant === "footer") {
    return (
      <div className="sucta-foot">
        <style>{`
          .sucta-foot { max-width: 980px; margin: 0 auto; padding: 9px 24px 12px; direction: rtl;
            display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: nowrap; }
          .sucta-txt { text-align: right; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .sucta-side { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
          .sucta-form { display: flex; gap: 7px; flex-wrap: nowrap; align-items: center; }
          .sucta-input { width: 190px; padding: 8px 12px; border-radius: 9px; font-size: 13.5px; text-align: center; outline: none; }
          .sucta-btn { padding: 8px 20px; border-radius: 9px; font-weight: 800; font-size: 13.5px; white-space: nowrap; border: none; }
          .sucta-note { color: ${cc.muted}; font-family: ${TYPEFACE.body}; font-size: 10.5px; white-space: nowrap; }

          @media (max-width: 760px) {
            .sucta-foot { flex-direction: column; text-align: center; gap: 9px; padding: 12px 16px 22px; flex-wrap: wrap; }
            .sucta-txt { text-align: center; white-space: normal; }
            .sucta-side { flex-direction: column; align-items: center; width: 100%; }
            .sucta-form { justify-content: center; width: 100%; }
            .sucta-input { flex: 1 1 auto; width: auto; min-width: 0; }
          }
        `}</style>
        {done ? (
          <div style={{ width: "100%", textAlign: "center", color: cc.goldBright, fontFamily: TYPEFACE.ui, fontSize: 14, fontWeight: 700 }}>✦ {successMsg}</div>
        ) : (
          <>
            <div className="sucta-txt">
              <span style={{ color: cc.goldLight, fontFamily: TYPEFACE.ui, fontSize: 14, fontWeight: 700 }}>
                <span style={{ color: "#1faa55" }}>●</span> מערכת חיה — מתעדכנת באופן שוטף
              </span>
            </div>
            <div className="sucta-side">
              <form onSubmit={submitEmail} className="sucta-form">
                <input className="sucta-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="האימייל שלך" dir="ltr"
                  style={{ background: cc.surface || "#0d0a0e", border: `1px solid ${cc.border}`, color: cc.goldLight, fontFamily: TYPEFACE.body }} />
                <button className="sucta-btn" type="submit" disabled={busy} style={{ cursor: busy ? "wait" : "pointer", background: cc.accentBtn || cc.goldBright, color: cc.onAccent || "#1a0e00", fontFamily: TYPEFACE.ui }}>{busy ? "רגע…" : "הצטרפו"}</button>
                <span className="sucta-note">
                  חינם
                  {pushReady && (
                    <>
                      {" · "}
                      <button onClick={choosePush} disabled={busy} style={{ cursor: busy ? "wait" : "pointer", background: "none", border: "none", padding: 0, color: "inherit", fontFamily: TYPEFACE.body, fontSize: 10.5, textDecoration: "underline", textUnderlineOffset: 2 }}>
                        התראות
                      </button>
                    </>
                  )}
                </span>
              </form>
            </div>
            {err && <div style={{ width: "100%", textAlign: "center", color: "#e0857a", fontFamily: TYPEFACE.body, fontSize: 12 }}>{err}</div>}
          </>
        )}
      </div>
    );
  }

  // ===== עמודים/משטחים — semantic palette, מתאים אוטומטית לבהיר/כהה =====
  return (
    <div style={{ textAlign: "center", direction: "rtl" }}>
      <div style={{ color: P.ink, fontFamily: TYPEFACE.display, fontSize: "clamp(20px,3vw,27px)", fontWeight: 800, marginBottom: 10 }}>
        {title || "אל תפספסו את מה שנכנס למערכת"}
      </div>
      <p style={{ color: P.inkSoft, fontFamily: TYPEFACE.body, fontSize: 15, lineHeight: 1.9, maxWidth: 520, margin: "0 auto 18px" }}>
        {description || "בכל שבוע מתווספים תכנים חדשים, חיפושי גימטריה, תגליות ועדכונים. השאירו מייל — ותהיו תמיד מעודכנים."}
      </p>

      {done ? (
        <div style={{ color: P.accentText, fontFamily: TYPEFACE.display, fontSize: 18, fontWeight: 700 }}>✦ {successMsg}</div>
      ) : (
        <>
          <form onSubmit={submitEmail} style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", maxWidth: 480, margin: "0 auto" }}>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="האימייל שלכם" dir="ltr"
              style={{ flex: "1 1 240px", minWidth: 200, padding: "13px 16px", borderRadius: 12, background: P.card, border: `1px solid ${P.borderStrong}`, color: P.ink, fontFamily: TYPEFACE.body, fontSize: 16, textAlign: "center", outline: "none", boxShadow: `0 0 0 3px transparent` }} />
            <button type="submit" disabled={busy} style={{
              cursor: busy ? "wait" : "pointer", border: `1px solid ${P.borderStrong}`, borderRadius: 12, padding: "13px 34px",
              background: P.accentBtn, color: P.onAccent,
              fontFamily: TYPEFACE.ui, fontWeight: 800, fontSize: 16, whiteSpace: "nowrap", boxShadow: `0 8px 24px ${P.glow}`,
            }}>{busy ? "רושם…" : "עדכנו אותי"}</button>
          </form>
          {err && <div style={{ color: "#c65349", fontFamily: TYPEFACE.body, fontSize: 13, marginTop: 12 }}>{err}</div>}
          <div style={{ color: P.inkSoft, fontFamily: TYPEFACE.body, fontSize: 12, marginTop: 12 }}>חינם · אימות חד-פעמי · אפשר לבטל בכל רגע</div>
          {pushReady && (
            <button onClick={choosePush} disabled={busy} style={{ marginTop: 16, cursor: "pointer", background: "none", border: "none", color: P.accentText, fontFamily: TYPEFACE.ui, fontSize: 13, textDecoration: "underline", textUnderlineOffset: 3 }}>
              🔔 או קבלו התראות מיידיות בדפדפן
            </button>
          )}
        </>
      )}
    </div>
  );
}
