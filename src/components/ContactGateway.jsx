import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { sendContactMessage } from "../lib/supabase.js";
import { getMyCommunityHintStatuses } from "../lib/community.js";
import IssueReport from "./IssueReport.jsx";
import ReportHint from "./ReportHint.jsx";

const MAX_INTAKE = 800;

const normalize = (value) => String(value ?? "").trim().slice(0, MAX_INTAKE);
const CONTEXT_KEY_RE = /[^a-zA-Z0-9_.:-]/g;
const boundContextKey = (value) => {
  const text = String(value ?? "").replace(CONTEXT_KEY_RE, "").slice(0, 64);
  return text || null;
};

export function buildContactGatewayContext({ surface = null, capability = null, concept = null, learnStage = null, actionTried = null } = {}) {
  return {
    surface: boundContextKey(surface),
    capability: boundContextKey(capability),
    concept: boundContextKey(concept),
    learn_stage: boundContextKey(learnStage),
    action_tried: boundContextKey(actionTried),
  };
}

const HINT_RE = /(רמז|מצאתי|מספר|שלט|צילום|תמונה|פסוק|גימטר|source|hint|number)/i;
const ISSUE_RE = /(לא עובד|תקלה|שגיא|בעיה|נשבר|לא נפתח|לא מגיב|איטי|נתקע|באג|bug|error|broken|לא\s+(?:היה\s+לי\s+)?ברור|מבלבל|לא הבנתי)/i;
const IDEA_RE = /(חסר|רעיון|הצעה|הלוואי|צריך שיהיה|feature|idea|suggest|improve|שיפור)/i;

export function classifyContactIntent(raw) {
  const text = normalize(raw);
  if (!text) return null;
  if (ISSUE_RE.test(text)) return "issue";
  if (IDEA_RE.test(text)) return "idea";
  if (HINT_RE.test(text)) return "hint";
  return "contact";
}

export const CONTACT_GATEWAY_CHOICES = Object.freeze([
  { id: "issue", icon: "!", label: "משהו לא עובד", hint: "תקלה, שגיאה או משהו שלא ברור" },
  { id: "hint", icon: "✦", label: "מצאתי רמז", hint: "מספר, תמונה, מקור או חיבור שמצאתם" },
  { id: "idea", icon: "+", label: "חסר לי משהו / יש לי רעיון", hint: "בקשה, שיפור או יכולת שהייתם רוצים" },
  { id: "contact", icon: "✉", label: "רוצה לכתוב לנו", hint: "פנייה כללית לצוות" },
]);

const HINT_STATUS_COPY = Object.freeze({
  pending: { label: "התקבל", detail: "ממתין לבדיקה" },
  approved: { label: "אושר", detail: "עבר בדיקה" },
  published: { label: "פורסם", detail: "נכנס למערכת הציבורית" },
  rejected: { label: "לא אושר", detail: "נבדק ולא פורסם" },
});

function MyCommunityHintStatusLoop({ user }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!open || !user) return undefined;
    setItems(null);
    getMyCommunityHintStatuses(20).then((rows) => { if (alive) setItems(rows); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [open, user]);

  if (!user) return null;
  return <section className="sod29-contact-status-loop">
    <button type="button" className="sod29-contact-status-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
      <span>הדיווחים שלי</span><strong>{open ? "סגור" : "הצג סטטוס"}</strong>
    </button>
    {open ? <div className="sod29-contact-status-list" role="status">
      {items === null ? <div className="sod29-contact-status-empty">טוען…</div> : null}
      {items?.map((item) => {
        const meta = HINT_STATUS_COPY[item.status] || { label: item.status || "התקבל", detail: "סטטוס הדיווח" };
        return <article key={item.id} className="sod29-contact-status-row" data-status={item.status || "unknown"}>
          <div><strong>{item.number ? `רמז · ${item.number}` : "רמז ששלחתם"}</strong><small>{String(item.description || "").slice(0, 100) || "ללא תיאור"}</small></div>
          <div className="sod29-contact-status-state"><b>{meta.label}</b><small>{meta.detail}</small></div>
          {item.review_note ? <p>{item.review_note}</p> : null}
        </article>;
      })}
      {items?.length === 0 ? <div className="sod29-contact-status-empty">עדיין אין דיווחי רמז שמורים לחשבון הזה.</div> : null}
    </div> : null}
  </section>;
}


function ContactForm({ kind, initialText, pathname, contactContext, user, onDone }) {
  const idea = kind === "idea";
  const [name, setName] = useState(() => user?.user_metadata?.display_name || user?.user_metadata?.full_name || "");
  const [email, setEmail] = useState(() => user?.email || "");
  const [message, setMessage] = useState(() => normalize(initialText));
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const body = normalize(message);
    if (!body) { setError("כתבו לנו כמה מילים כדי שנדע במה לעזור."); return; }
    if (!idea && email.trim().length < 3) { setError("כדי שנוכל לחזור אליכם, הוסיפו אימייל."); return; }
    setBusy(true);
    setError("");
    try {
      const safePath = String(pathname || "").split(/[?#]/)[0].slice(0, 200);
      const contextLine = [
        contactContext?.surface ? `surface=${contactContext.surface}` : null,
        contactContext?.capability ? `capability=${contactContext.capability}` : null,
        contactContext?.concept ? `concept=${contactContext.concept}` : null,
        contactContext?.learn_stage ? `learn_stage=${contactContext.learn_stage}` : null,
        contactContext?.action_tried ? `action_tried=${contactContext.action_tried}` : null,
        safePath ? `path=${safePath}` : null,
      ].filter(Boolean).join(" · ");
      await sendContactMessage({
        name: name.trim() || "גולש",
        email: email.trim() || "no-reply@sod1820.co.il",
        subject: idea ? "💡 רעיון / משהו חסר ב-SOD1820" : "✉️ פנייה מ-SOD1820",
        message: contextLine ? `${body}\n\n[${contextLine}]` : body,
      });
      setSent(true);
    } catch {
      setError("לא הצלחנו לשלוח כרגע. נסו שוב בעוד רגע.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return <section className="sod29-frame-state state-empty" role="status">
      <span className="sod29-frame-state-icon" aria-hidden="true">✓</span>
      <div><strong>קיבלנו, תודה</strong><div>{idea ? "הרעיון נכנס לבדיקה." : "הפנייה הגיעה לצוות."}</div></div>
      {onDone ? <button className="sod29-action" type="button" onClick={onDone}>סגור</button> : null}
    </section>;
  }

  return <form className="sod29-contact-form" onSubmit={submit}>
    <div className="sod29-panel-lead">
      <div className="sod29-kicker">{idea ? "רעיון / משהו חסר" : "כתבו לנו"}</div>
      <h3>{idea ? "מה הייתם רוצים שיהיה כאן?" : "מה תרצו לספר לנו?"}</h3>
      <p>{idea ? "ספרו במילים שלכם. המיקום באתר מצורף אוטומטית כדי שנבין את ההקשר." : "אפשר לכתוב כאן פנייה כללית לצוות."}</p>
    </div>
    <label className="sod29-contact-field">
      <span>הודעה</span>
      <textarea data-autofocus rows={5} maxLength={MAX_INTAKE} value={message} onChange={(e) => setMessage(e.target.value)} />
      <small>{message.length}/{MAX_INTAKE}</small>
    </label>
    <div className="sod29-contact-row">
      <label className="sod29-contact-field"><span>שם (לא חובה)</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="sod29-contact-field"><span>{idea ? "אימייל (לא חובה)" : "אימייל"}</span><input dir="ltr" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    </div>
    {error ? <div className="sod29-contact-error" role="alert">{error}</div> : null}
    <button className="sod29-action primary" type="submit" disabled={busy}>{busy ? "שולח…" : "שליחה"}</button>
  </form>;
}

export default function ContactGateway({
  pathname,
  surface = null,
  capability = null,
  concept = null,
  learnStage = null,
  actionTried = null,
  initialText = "",
  locale = null,
  onDone,
}) {
  const { user } = useAuth() || {};
  const [text, setText] = useState(() => normalize(initialText));
  const [mode, setMode] = useState(null);
  const [hintMounted, setHintMounted] = useState(false);

  const contactContext = useMemo(() => buildContactGatewayContext({
    surface,
    capability,
    concept,
    learnStage,
    actionTried,
  }), [surface, capability, concept, learnStage, actionTried]);
  const suggested = useMemo(() => classifyContactIntent(text), [text]);

  const choose = (id) => {
    setMode(id);
    if (id === "hint") setHintMounted(true);
  };

  if (mode === "issue") {
    return <div className="sod29-contact-gateway-detail">
      <button className="sod29-contact-back" type="button" onClick={() => setMode(null)}>← חזרה</button>
      <IssueReport
        pathname={pathname}
        surface={surface}
        capability={capability}
        concept={contactContext.concept}
        learnStage={contactContext.learn_stage}
        actionTried={contactContext.action_tried}
        locale={locale}
        initialText={text}
        onDone={onDone}
      />
    </div>;
  }

  if (mode === "hint") {
    return <div className="sod29-contact-gateway-detail">
      <button className="sod29-contact-back" type="button" onClick={() => { setMode(null); setHintMounted(false); }}>← חזרה</button>
      <div className="sod29-panel-lead">
        <div className="sod29-kicker">מצאתי רמז</div>
        <h3>שלחו אותו לבדיקה.</h3>
        <p>זה נשאר מסלול תרומה נפרד — לא תקלה ולא מחקר אוטומטי.</p>
      </div>
      <ReportHint label="פתחו דיווח רמז" initialDescription={text} autoOpen={hintMounted} />
    </div>;
  }

  if (mode === "idea" || mode === "contact") {
    return <div className="sod29-contact-gateway-detail">
      <button className="sod29-contact-back" type="button" onClick={() => setMode(null)}>← חזרה</button>
      <ContactForm kind={mode} initialText={text} pathname={pathname} contactContext={contactContext} user={user} onDone={onDone} />
    </div>;
  }

  return <section className="sod29-contact-gateway" data-contact-gateway="true" data-contact-learn-context={contactContext.concept ? "true" : "false"}>
    <div className="sod29-panel-lead">
      <div className="sod29-kicker">דווחו על בעיה · דברו איתנו</div>
      <h3>מה קרה כאן?</h3>
      <p>תקלה, משהו לא ברור, רעיון או רמז — כתבו במילים שלכם, והמערכת תציע את המסלול המתאים.</p>
    </div>

    <label className="sod29-contact-field">
      <span>ספרו לנו מה קרה או מה חסר לכם…</span>
      <textarea data-autofocus rows={4} maxLength={MAX_INTAKE} value={text} onChange={(e) => setText(e.target.value)} />
      <small>{text.length}/{MAX_INTAKE}</small>
    </label>

    {text.trim() ? <button className="sod29-contact-suggest" type="button" onClick={() => choose(suggested || "contact")}>
      <span>ניתוב מוצע</span>
      <strong>{CONTACT_GATEWAY_CHOICES.find((item) => item.id === suggested)?.label || "רוצה לכתוב לנו"}</strong>
      <span aria-hidden="true">←</span>
    </button> : null}

    <div className="sod29-contact-choice-grid" aria-label="אפשרויות דיווח ופנייה">
      {CONTACT_GATEWAY_CHOICES.map((choice) => <button key={choice.id} type="button" onClick={() => choose(choice.id)}>
        <span className="sod29-contact-choice-icon" aria-hidden="true">{choice.icon}</span>
        <span><strong>{choice.label}</strong><small>{choice.hint}</small></span>
      </button>)}
    </div>

    <MyCommunityHintStatusLoop user={user} />

    <p className="sod29-contact-privacy">המיקום הנוכחי באתר יכול להצטרף לפנייה כדי שלא תצטרכו להסביר מאיפה הגעתם. הודעה, רמז, תקלה ומחקר נשארים סוגים נפרדים במערכת.</p>
  </section>;
}
