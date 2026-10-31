import React, { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { claimLegacyContributor, isLegacyContributorId } from "../../lib/community/legacyClaim.js";
import { VERIFIED_ARCHIVE_PROFILES } from "../../lib/community/communityArchive.js";
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
      {!loading && !user && import.meta.env.VITE_INTEGRATED_PREVIEW === "true" ? <p className="sod29-community-claim-help">כדי לחבר פרופיל ישן צריך חשבון באתר עם אותו מייל. בגרסת הבדיקה הזו אפשר להיכנס לחשבון קיים; פתיחת חשבון חדש עדיין אינה זמינה כאן.</p> : null}
      <CommunitySignIn />
      {!loading && user ? <div className="sod29-community-claim-actions"><p>החיבור יאושר רק אם המייל המאומת שלכם תואם לפרופיל הישן והוא עדיין לא מחובר לחשבון אחר.</p><button type="button" className="sod29-community-primary" disabled={claiming} onClick={claim}>{claiming ? "מאמתים בעלות…" : "אימות וחיבור החשבון הישן"}</button></div> : null}
      {error ? <p role="alert" className="sod29-community-status">{error} <a href="mailto:zyz997@gmail.com">פנייה לתמיכה</a></p> : null}
    </> : null}
    {claimed ? <div className="sod29-community-claim-editor" role="status"><h3>החשבון הישן קושר בהצלחה</h3><p>ההודעות הישנות משויכות כעת לחשבון המחובר. אפשר להמשיך לפרופיל או לאזור האישי.</p><Link to={communityPersonHref(contributorId)}>הפרופיל הציבורי ←</Link><br /><Link to={writerPersonalHref("profile", { returnTo: back })}>האזור האישי שלי ←</Link></div> : null}
  </section>;
}

export function LegacyAccountClaimEntry({ rows = [], onClaimed }) {
  const dialog = useRef(null), trigger = useRef(null);
  const [open, setOpen] = useState(false), [selected, setSelected] = useState("");
  const titleId = useId(), selectId = useId();
  const candidates = new Map(Object.entries(VERIFIED_ARCHIVE_PROFILES).filter(([, p]) => p.publicBio && p.name).map(([id, p]) => [id, p.name]));
  for (const row of rows) if (row.origin === "openweb" && isLegacyContributorId(row.authorKey) && row.authorName) candidates.set(row.authorKey, row.authorName);
  useEffect(() => {
    if (open) dialog.current?.showModal(); else if (dialog.current?.open) dialog.current.close();
  }, [open]);
  const close = () => { setOpen(false); setSelected(""); requestAnimationFrame(() => trigger.current?.focus()); };
  return <>
    <button ref={trigger} type="button" className="sod29-community-text-action sod29-community-claim-entry" aria-haspopup="dialog" onClick={() => setOpen(true)}>החשבון שלי מהצ׳אט הישן</button>
    <dialog ref={dialog} className="sod29-community-claim-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }}>
      {open ? <div className="sod29-community-claim-dialog-content">
        <header><h2 id={titleId}>חיבור החשבון מהצ׳אט הישן</h2><button type="button" className="sod29-community-secondary" aria-label="סגירת חלון חיבור החשבון הישן" onClick={close}>×</button></header>
        <p>בחרו את הפרופיל שבו כתבתם בעבר. החיבור דורש את המייל המאומת ששימש אז.</p>
        <label htmlFor={selectId}>הפרופיל הישן שלי</label>
        <select id={selectId} value={selected} onChange={event => setSelected(event.target.value)}><option value="">בחירת פרופיל…</option>{[...candidates].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        <p className="sod29-community-claim-help">הפרופיל אינו ברשימה? פתחו את שמכם דרך הודעה ישנה ובחרו ״זה החשבון הישן שלי״.</p>
        {selected ? <LegacyAccountClaim key={selected} contributorId={selected} embedded onClaimed={onClaimed} /> : null}
      </div> : null}
    </dialog>
  </>;
}
