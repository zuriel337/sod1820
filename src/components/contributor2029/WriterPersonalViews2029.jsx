import React, { useId, useState } from "react";
import { use2029Palette } from "../../lib/palette.js";
import "./writerPersonalViews2029.css";

const NAME_MAX = 60;
const BIO_MAX = 600;
const text = (value) => typeof value === "string" ? value.trim() : "";
const safeHref = (href) => typeof href === "string" && (/^\/(?!\/)/.test(href) || /^https:\/\//i.test(href)) ? href : "";
const looksLikeEmail = (value) => /\S+@\S+/.test(value);
const hasValue = (value) => value !== null && value !== undefined && value !== "" && !(typeof value === "number" && Number.isNaN(value));

// Appends view=public to the anonymous writer URL without touching existing query/hash.
const withPublicView = (href) => {
  const base = safeHref(href);
  if (!base) return "";
  const hashAt = base.indexOf("#");
  const path = hashAt === -1 ? base : base.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : base.slice(hashAt);
  if (/[?&]view=/.test(path)) return base;
  return `${path}${path.includes("?") ? "&" : "?"}view=public${hash}`;
};

const useScope = () => {
  const P = use2029Palette();
  return { "--wp-card": P.card, "--wp-soft": P.cardSoft, "--wp-ink": P.ink, "--wp-muted": P.inkSoft,
    "--wp-border": P.border, "--wp-accent": P.accentText, "--wp-gold": P.brandGold, "--wp-focus": P.focusRing || P.accent };
};

// Page-local wrapper (no shell): title, honest state, six-module nav and the visitor link.
export function WriterPersonalLayout2029({ title = "", description = "", state = "ready", onRetry, publicHref = "", returnHref = "", nav = [], children }) {
  const scope = useScope();
  const headingId = useId();
  const visitor = withPublicView(publicHref);
  const back = safeHref(returnHref);
  const items = Array.isArray(nav) ? nav.filter((item) => item && safeHref(item.href) && text(item.label)) : [];
  return <section className="wp-layout" dir="rtl" style={scope} aria-labelledby={headingId} data-state={state}>
    <header className="wp-head">
      {back ? <a className="wp-link" href={back}>חזרה</a> : null}
      <h1 id={headingId} className="wp-title">{text(title)}</h1>
      {text(description) ? <p className="wp-muted">{text(description)}</p> : null}
      {visitor ? <a className="wp-link" href={visitor}>איך זה נראה לאורחים</a> : null}
    </header>
    {items.length ? <nav className="wp-nav" aria-label="האזור האישי">
      {items.map((item) => <a key={item.id || item.href} className="wp-nav-link" href={item.href} aria-current={item.active ? "page" : undefined}>{item.label}</a>)}
    </nav> : null}
    {state === "loading" ? <p className="wp-status" role="status">טוען…</p> : null}
    {state === "error" ? <div className="wp-status" role="alert" data-state="error">
      <p>לא הצלחנו לטעון את האזור הזה.</p>
      {typeof onRetry === "function" ? <button type="button" className="wp-btn" onClick={() => onRetry()}>נסו שוב</button> : null}
    </div> : null}
    {state === "login_required" ? <p className="wp-status" role="status">נדרשת התחברות כדי לראות את האזור האישי.</p> : null}
    {state === "ready" ? <div className="wp-body">{children}</div> : null}
  </section>;
}

export function WriterPersonalHome2029({ writer = null, onCreate, state = "ready", onEdit }) {
  const scope = useScope();
  const nameId = useId();
  const bioId = useId();
  const consentId = useId();
  const errId = useId();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const w = writer && typeof writer === "object" ? writer : {};
  const kind = state !== "ready" ? state : (w.state || "unavailable");

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const displayName = text(name);
    const about = text(bio);
    if (!displayName) { setError("יש להזין שם."); return; }
    if (displayName.length > NAME_MAX) { setError(`השם ארוך מדי (עד ${NAME_MAX} תווים).`); return; }
    if (looksLikeEmail(displayName)) { setError("השם הציבורי לא יכול להיות כתובת מייל."); return; }
    if (about.length > BIO_MAX) { setError(`הקצרה ארוכה מדי (עד ${BIO_MAX} תווים).`); return; }
    if (!consent) { setError("יש לאשר שהשם והקצרה יופיעו בדף ציבורי."); return; }
    setError("");
    setSubmitting(true);
    try {
      const result = await onCreate?.({ displayName, bio: about });
      if (result && result.ok === false) setError(text(result.error) || "היצירה נכשלה. נסו שוב.");
    } catch { setError("היצירה נכשלה. נסו שוב."); }
    finally { setSubmitting(false); }
  };

  let body;
  if (kind === "loading") body = <p className="wp-status" role="status">טוען…</p>;
  else if (kind === "ready") {
    const href = safeHref(w.href);
    body = <>
      <div className="wp-card">
        <h2 className="wp-h">{text(w.name) || "הדף שלי"}</h2>
        {text(w.bio) ? <p>{text(w.bio)}</p> : <p className="wp-muted">עדיין אין קצרה.</p>}
        <p className="wp-muted">{w.publicVisible === false ? "הדף שלך פרטי כרגע ואינו מוצג לאורחים." : "כך הדף שלך מוצג לאורחים."}</p>
      </div>
      <div className="wp-row">
        {href && w.publicVisible !== false ? <a className="wp-btn" href={withPublicView(href)}>צפייה בדף הציבורי</a> : null}
        {typeof onEdit === "function" ? <button type="button" className="wp-btn wp-primary" onClick={() => onEdit()}>עריכה</button> : null}
      </div>
    </>;
  } else if (kind === "unlinked") {
    body = <form className="wp-card" onSubmit={submit} noValidate aria-describedby={error ? errId : undefined}>
      <h2 className="wp-h">יצירת דף ציבורי</h2>
      <p className="wp-muted">עדיין אין לך דף ציבורי. הוא נוצר רק אחרי אישור שלך.</p>
      <label className="wp-field" htmlFor={nameId}>שם ציבורי (עד {NAME_MAX} תווים, לא כתובת מייל)</label>
      <input id={nameId} className="wp-input" value={name} maxLength={NAME_MAX} autoComplete="nickname" disabled={submitting} onChange={(e) => setName(e.target.value)} />
      <label className="wp-field" htmlFor={bioId}>קצרה על עצמך (עד {BIO_MAX} תווים)</label>
      <textarea id={bioId} className="wp-input wp-area" value={bio} maxLength={BIO_MAX} disabled={submitting} onChange={(e) => setBio(e.target.value)} />
      <label className="wp-check" htmlFor={consentId}>
        <input id={consentId} type="checkbox" checked={consent} disabled={submitting} onChange={(e) => setConsent(e.target.checked)} />
        <span>אני מאשר/ת שהשם והקצרה יופיעו בדף ציבורי שכל אחד יכול לראות.</span>
      </label>
      {error ? <p id={errId} className="wp-status" role="alert" data-state="error">{error}</p> : null}
      <button type="submit" className="wp-btn wp-primary" disabled={submitting || typeof onCreate !== "function"}>{submitting ? "יוצר…" : "יצירת הדף הציבורי"}</button>
    </form>;
  } else if (kind === "ambiguous") {
    body = <p className="wp-status" role="alert" data-state="error">נמצאו כמה דפים שמתאימים לחשבון הזה, ולכן לא נבחר אחד מהם אוטומטית. פנו אלינו כדי לאחד אותם.</p>;
  } else {
    body = <p className="wp-status" role="alert" data-state="error">מצב הדף הציבורי אינו זמין כרגע. לא נוצר או שונה דבר.</p>;
  }
  return <div className="wp-home" dir="rtl" style={scope}>{body}</div>;
}

export function WriterPublicPortrait2029({ accountAvatar = "", publicAvatar = "", state = "ready", onApply, onHide }) {
  const scope = useScope();
  const consentId = useId();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const account = safeHref(accountAvatar);
  const pub = safeHref(publicAvatar);
  const run = async (fn, failure) => {
    if (busy || typeof fn !== "function") return;
    setBusy(true); setError("");
    try {
      const result = await fn();
      if (result && result.ok === false) setError(failure);
      else setConsent(false);
    } catch { setError(failure); }
    finally { setBusy(false); }
  };
  const locked = busy || state === "loading" || state === "saving";
  return <section className="wp-card wp-portrait" dir="rtl" style={scope} aria-label="תמונה ציבורית" aria-busy={locked || undefined}>
    <h2 className="wp-h">תמונה ציבורית</h2>
    <p className="wp-muted">תמונת החשבון שלך פרטית ואינה הופכת לציבורית אוטומטית. היא תוצג בדף הציבורי רק אם תאשר זאת כאן.</p>
    <div className="wp-row wp-avatars">
      <figure className="wp-fig">{account ? <img className="wp-avatar" src={account} alt="תמונת החשבון (פרטית)" /> : <span className="wp-avatar wp-avatar-empty" aria-hidden="true" />}<figcaption>תמונת החשבון</figcaption></figure>
      <figure className="wp-fig">{pub ? <img className="wp-avatar" src={pub} alt="התמונה הציבורית" /> : <span className="wp-avatar wp-avatar-empty" aria-hidden="true" />}<figcaption>{pub ? "התמונה הציבורית" : "ללא תמונה ציבורית"}</figcaption></figure>
    </div>
    {state === "error" ? <p className="wp-status" role="alert" data-state="error">מצב התמונה אינו זמין כרגע.</p> : null}
    {account && !pub ? <>
      <label className="wp-check" htmlFor={consentId}>
        <input id={consentId} type="checkbox" checked={consent} disabled={locked} onChange={(e) => setConsent(e.target.checked)} />
        <span>אני מאשר/ת להציג את תמונת החשבון שלי בדף הציבורי.</span>
      </label>
      <button type="button" className="wp-btn wp-primary" disabled={!consent || locked || typeof onApply !== "function"} onClick={() => run(onApply, "הפרסום נכשל. נסו שוב.")}>פרסום התמונה בדף הציבורי</button>
    </> : null}
    {!account && !pub ? <p className="wp-muted">אין תמונת חשבון. העלאה מתבצעת בהגדרות הפרופיל.</p> : null}
    {pub ? <button type="button" className="wp-btn" disabled={locked || typeof onHide !== "function"} onClick={() => run(onHide, "ההסתרה נכשלה. נסו שוב.")}>הסתרת התמונה מהדף הציבורי</button> : null}
    {error ? <p className="wp-status" role="alert" data-state="error">{error}</p> : null}
  </section>;
}

const STAT_FIELDS = [["xp", "XP"], ["credits", "קרדיטים"], ["streak", "רצף"], ["tier", "מסלול"]];

export function WriterPrivateProgress2029({ rank = null, stats = null, children = null }) {
  const scope = useScope();
  const r = rank && typeof rank === "object" ? rank : null;
  const rankLabel = text(r?.label) || text(r?.name) || text(r?.title);
  const s = stats && typeof stats === "object" ? stats : {};
  return <section className="wp-card wp-progress" dir="rtl" style={scope} aria-label="ההתקדמות שלי">
    <h2 className="wp-h">ההתקדמות שלי</h2>
    <p className="wp-muted">האזור הזה פרטי: רק את/ה רואה אותו, והוא אינו מוצג בדף הציבורי.</p>
    <p>{rankLabel ? <>דרגה: <strong>{rankLabel}</strong></> : "הדרגה אינה זמינה כרגע."}</p>
    {children ? <div className="wp-medallion">{children}</div> : null}
    <dl className="wp-stats">
      {STAT_FIELDS.map(([key, label]) => <div key={key} className="wp-stat"><dt>{label}</dt><dd>{hasValue(s[key]) ? String(s[key]) : "לא זמין"}</dd></div>)}
    </dl>
  </section>;
}
