import React, { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { claimLegacyContributor, isLegacyContributorId } from "../../lib/community/legacyClaim.js";
import { VERIFIED_ARCHIVE_PROFILES, fetchClaimedContributorIds, locallyKnownLinkedContributorIds } from "../../lib/community/communityArchive.js";
import { hasReviewedCommunityHistory } from "../../lib/community/communityCanonicalIdentity2029.js";
import { communityPersonHref, communityPersonReturnHref } from "../../lib/community/communityPersonNavigation.js";
import { writerPersonalHref } from "../../lib/userCenter/writerPersonal2029.js";
import CommunitySignIn from "./CommunitySignIn.jsx";

// Public name selection chooses a source ID. Only the existing server grants ownership.
export default function LegacyAccountClaim({ contributorId, embedded = false, onClaimed }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const scope = `${user?.id || "guest"}:${contributorId}`;
  const [operation, setOperation] = useState({ scope: null, state: "idle", error: "" });
  const claiming = operation.scope === scope && operation.state === "pending";
  const claimed = operation.scope === scope && operation.state === "claimed";
  const error = operation.scope === scope ? operation.error : "";
  const current = useRef(scope); current.current = scope;
  useEffect(() => {
    current.current = scope;
    return () => { current.current = null; };
  }, [scope]);
  const known = VERIFIED_ARCHIVE_PROFILES[contributorId];
  const valid = isLegacyContributorId(contributorId);
  const back = communityPersonReturnHref(location.pathname, location.search, location.hash);
  const claim = async () => {
    if (!valid || !user || claiming) return;
    const requestScope = scope;
    setOperation({ scope, state: "pending", error: "" });
    try {
      await claimLegacyContributor(contributorId);
      if (current.current !== requestScope) return;
      setOperation({ scope, state: "claimed", error: "" }); onClaimed?.();
    } catch (reason) {
      if (current.current !== requestScope) return;
      const message = reason?.message === "caller_email_not_confirmed"
        ? "יש לאמת את כתובת המייל של החשבון לפני החיבור."
        : reason?.message === "not_authenticated" ? "יש להתחבר מחדש כדי לאמת את הבעלות."
        : "לא ניתן לחבר את הפרופיל לחשבון הזה. התחברו במייל המאומת ששימש בצ׳אט הישן. אם אין אליו גישה, אפשר לפנות לתמיכה לבדיקת הבעלות.";
      setOperation({ scope, state: "error", error: message });
    }
  };
  const Title = embedded ? "h3" : "h1";
  return <section className={`sod29-community-claim${embedded ? " sod29-community-claim--embedded" : ""}`} aria-label="תביעת חשבון ישן">
    {!embedded ? <Link className="sod29-community-text-action" to={back}>→ חזרה לקהילה</Link> : null}
    {!embedded ? <><Title>אימות החשבון הישן</Title><p>ההודעות והלייקים מהצ׳אט הישן נשמרו. מחברים אותם לחשבון הנוכחי באמצעות המייל המאומת ששימש אז.</p></> : null}
    {known?.name ? <div className="sod29-community-claim-person"><strong>{known.name}</strong></div> : null}
    {!valid ? <p role="alert">הקישור אינו תקין. פתחו את הפרופיל מתוך הודעה ישנה ונסו שוב.</p> : null}
    {valid && !claimed ? <>
      {!loading && !user && import.meta.env.VITE_INTEGRATED_PREVIEW === "true" && import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW !== "true" ? <p className="sod29-community-claim-help">כדי לחבר פרופיל ישן צריך חשבון באתר עם אותו מייל. בגרסת הבדיקה הזו אפשר להיכנס לחשבון קיים; פתיחת חשבון חדש עדיין אינה זמינה כאן.</p> : null}
      <CommunitySignIn />
      {!loading && user ? <div className="sod29-community-claim-actions"><p>החיבור יאושר רק אם המייל המאומת שלכם תואם לפרופיל הישן והוא עדיין לא מחובר לחשבון אחר.</p><button type="button" className="sod29-community-primary" disabled={claiming} onClick={claim}>{claiming ? "מאמתים בעלות…" : "אימות וחיבור החשבון הישן"}</button></div> : null}
      {error ? <p role="alert" className="sod29-community-status">{error} <a href="mailto:zyz997@gmail.com">פנייה לתמיכה</a></p> : null}
    </> : null}
    {claimed ? <div className="sod29-community-claim-editor" role="status"><h3>החשבון הישן קושר בהצלחה</h3><p>ההודעות הישנות משויכות כעת לחשבון המחובר. אפשר להמשיך לפרופיל או לאזור האישי.</p><Link to={communityPersonHref(contributorId)}>הפרופיל הציבורי ←</Link><br /><Link to={writerPersonalHref("profile", { returnTo: back })}>האזור האישי שלי ←</Link></div> : null}
  </section>;
}

export function LegacyAccountClaimEntry({ rows = [], onClaimed }) {
  const dialog = useRef(null), trigger = useRef(null);
  const { user } = useAuth();
  const [open, setOpen] = useState(false), [selected, setSelected] = useState("");
  const [oldName, setOldName] = useState("");
  const [newName, setNewName] = useState("");
  const [replyEmail, setReplyEmail] = useState(user?.email || "");
  const [reviewRequest, setReviewRequest] = useState({ state: "idle", error: "" });
  useEffect(() => { if (user?.email) setReplyEmail(current => current || user.email); }, [user?.email]);
  const sendReviewRequest = async event => {
    event.preventDefault();
    if (reviewRequest.state === "pending") return;
    const previous = oldName.trim(), current = newName.trim(), email = replyEmail.trim();
    if (!previous || !current || !email) return;
    setReviewRequest({ state: "pending", error: "" });
    try {
      // Reuse the existing protected admin contact inbox, not a new identity
      // store. Contact requests have no authority to link accounts.
      const { sendContactMessage } = await import("../../lib/supabaseApi2029.js");
      await sendContactMessage({
        name: current,
        email,
        subject: "בקשת בדיקת שיוך חשבון מהצ׳אט הישן",
        message: `בקשת בדיקה ידנית בלבד — ללא חיבור אוטומטי.
שם בצ׳אט הישן: ${previous}
שם בחשבון החדש: ${current}
מייל לחזרה: ${email}
מקור: /community/chat
יש לבדוק הוכחת בעלות ולקבל אישור בעל האתר לפני כל שיוך חשבונות.`,
      });
      setReviewRequest({ state: "sent", error: "" });
    } catch {
      setReviewRequest({ state: "error", error: "הבקשה לא נשמרה. בדקו את החיבור ונסו שוב." });
    }
  };
  const [claimed, setClaimed] = useState(null);   // null = not checked yet; a Set = contributors that already have an account
  const titleId = useId(), selectId = useId();
  const candidates = new Map(Object.entries(VERIFIED_ARCHIVE_PROFILES).filter(([id, p]) => !id.startsWith("user:") && p.publicBio && p.name).map(([id, p]) => [id, p.name]));
  for (const row of rows) if (row.origin === "openweb" && isLegacyContributorId(row.authorKey) && row.authorName) candidates.set(row.authorKey, row.authorName);
  const candidateKey = [...candidates.keys()].sort().join(",");
  useEffect(() => {
    if (open) dialog.current?.showModal(); else if (dialog.current?.open) dialog.current.close();
  }, [open]);
  // Only profiles that are not connected yet are offered: the server's answer (when available) plus the reviewed links.
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setClaimed(null);
    fetchClaimedContributorIds(candidateKey ? candidateKey.split(",") : []).then(set => { if (alive) setClaimed(set); }).catch(() => { if (alive) setClaimed(locallyKnownLinkedContributorIds()); });
    return () => { alive = false; };
  }, [open, candidateKey]);
  const close = () => { setOpen(false); setSelected(""); requestAnimationFrame(() => trigger.current?.focus()); };
  // An account that already owns its history has nothing to connect.
  if (user?.id && hasReviewedCommunityHistory(`user:${user.id}`)) return null;
  const offered = [...candidates].filter(([id]) => !(claimed || locallyKnownLinkedContributorIds()).has(id));
  return <>
    <button ref={trigger} type="button" className="sod29-community-text-action sod29-community-claim-entry" aria-haspopup="dialog" onClick={() => setOpen(true)}>החשבון שלי מהצ׳אט הישן</button>
    <dialog ref={dialog} className="sod29-community-claim-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }}>
      {open ? <div className="sod29-community-claim-dialog-content">
        <header><h2 id={titleId}>חיבור החשבון מהצ׳אט הישן</h2><button type="button" className="sod29-community-secondary" aria-label="סגירת חלון חיבור החשבון הישן" onClick={close}>×</button></header>
        <p>כתבו את שם המשתמש מהצ׳אט הישן ואת השם שלכם כיום. הבקשה תישמר בתיבת הפניות לאישור בעל האתר; היא לא מחברת חשבונות באופן אוטומטי.</p>
        {reviewRequest.state === "sent" ? <p role="status" className="sod29-community-claim-success">הבקשה נשמרה לבדיקה. שיוך ההודעות יתבצע רק לאחר אימות בעלות ואישור.</p> : <form className="sod29-community-claim-review-form" onSubmit={sendReviewRequest}>
          <label htmlFor="community-old-name">השם שלי בצ׳אט הישן</label>
          <input id="community-old-name" name="oldName" autoComplete="off" required maxLength={80} value={oldName} onChange={e => setOldName(e.target.value)} placeholder="השם שבו פרסמתם בעבר" />
          <label htmlFor="community-new-name">השם שלי באתר החדש</label>
          <input id="community-new-name" name="newName" autoComplete="nickname" required maxLength={80} value={newName} onChange={e => setNewName(e.target.value)} placeholder="שם החשבון החדש" />
          <label htmlFor="community-claim-email">מייל לחזרה</label>
          <input id="community-claim-email" name="email" type="email" autoComplete="email" required maxLength={200} value={replyEmail} onChange={e => setReplyEmail(e.target.value)} placeholder="כתובת המייל שלכם" />
          <button type="submit" className="sod29-action primary" disabled={reviewRequest.state === "pending"}>{reviewRequest.state === "pending" ? "שולחים בקשה…" : "שליחת בקשה לאישור"}</button>
          {reviewRequest.error ? <p role="alert">{reviewRequest.error}</p> : null}
        </form>}
        <details className="sod29-community-claim-verified">
          <summary>אפשרות נוספת: חיבור באמצעות מייל ישן מאומת</summary>
          <p className="sod29-community-claim-help">אם יש לכם גישה למייל המאומת מהצ׳אט הישן, אפשר לנסות את מנגנון החיבור הקיים.</p>
          <label htmlFor={selectId}>הפרופיל הישן שלי</label>
          <select id={selectId} value={selected} disabled={claimed === null} onChange={event => setSelected(event.target.value)}><option value="">{claimed === null ? "בודקים אילו פרופילים פנויים…" : offered.length ? "בחירת פרופיל…" : "אין כרגע פרופילים פנויים"}</option>{offered.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
          <p className="sod29-community-claim-help">הפרופיל אינו ברשימה? אפשר לשלוח את הבקשה שמעל לבדיקה ידנית.</p>
          {selected ? <LegacyAccountClaim key={selected} contributorId={selected} embedded onClaimed={onClaimed} /> : null}
        </details>
      </div> : null}
    </dialog>
  </>;
}
