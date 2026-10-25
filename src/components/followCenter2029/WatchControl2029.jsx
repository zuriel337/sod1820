import React from "react";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";
import IconTile2029 from "../experience2029/IconTile2029.jsx";
import { use2029Palette, treatmentVars } from "../../lib/palette.js";
import "./watchControl2029.css";

// Design V2 presentation of the canonical WatchButton (variant="2029"). It owns no state, IO or consent: the WatchButton
// keeps the follow engine, scope guards and strict states and hands this view what it needs. Colour comes only from the
// shared treatment resolver; status is always visible text (colour never states availability or success).
export default function WatchControl2029({
  following, busy, known, loadFailed, toggleError, justFollowed, signedIn, showReg, pushOn, pushOffered, pushMsg,
  label, followLabel, explainer, onToggle, onRetry, onTurnOnPush, onVerifyIdentity, identitySlot,
}) {
  const palette = use2029Palette();
  const unknown = !known && !loadFailed;
  const state = busy || unknown ? "loading" : loadFailed || toggleError ? "unknown" : "active";
  const vars = treatmentVars(palette, { purpose: "action", state });
  const message = toggleError || (loadFailed ? "לא ניתן לאמת את מצב המעקב כרגע." : "");
  const confirmed = justFollowed && following && !busy;
  return <div className="sod29-watch" style={vars} data-following={following} data-state={state}>
    <button type="button" className="sod29-watch-btn" onClick={onToggle} disabled={busy || !known} aria-pressed={following} aria-busy={busy || unknown || undefined}>
      <NavigationIcon2029 name={following ? "check" : "add"} size={20} />
      <span>{busy ? (following ? "מעדכן…" : "מבטל…") : following ? (followLabel || "עוקב") : (label || "מעקב")}</span>
    </button>
    {unknown ? <p className="sod29-watch-note" role="status">בודק את מצב המעקב…</p> : null}
    {!following && explainer && !unknown ? <p className="sod29-watch-note">{explainer}</p> : null}
    {message ? <p className="sod29-watch-alert" role="alert">{message}{!busy ? <button type="button" className="sod29-watch-retry" onClick={onRetry}>ניסיון נוסף</button> : null}</p> : null}
    {confirmed ? <p className="sod29-watch-note" role="status">המעקב אושר. ערוץ עדכון נבחר בנפרד, בהסכמה מפורשת.</p> : null}
    {confirmed && !signedIn ? <div className="sod29-watch-card">
      <div className="sod29-watch-card-head"><IconTile2029 name="personal" purpose="discovery" /><strong>שמרו את המעקב בזהות שלכם</strong></div>
      <p>הצעד הבא הוא אימות זהות בלבד. אימות לא מפעיל מייל או התראות.</p>
      {showReg ? identitySlot : <button type="button" className="sod29-watch-btn sod29-watch-btn-secondary" onClick={onVerifyIdentity}>אימות חשבון</button>}
    </div> : null}
    {confirmed && signedIn && pushOffered && !pushOn ? <div className="sod29-watch-card">
      <div className="sod29-watch-card-head"><IconTile2029 name="signal" purpose="ordinary" /><strong>התראה בדפדפן, אם תרצו</strong></div>
      <p>זו בחירה נפרדת מהמעקב. היא פועלת רק במכשיר הזה ואפשר לבטל אותה.</p>
      <button type="button" className="sod29-watch-btn sod29-watch-btn-secondary" onClick={onTurnOnPush}>הפעלת התראות בדפדפן</button>
    </div> : null}
    {pushMsg ? <p className="sod29-watch-note" role="status">{pushMsg}</p> : null}
  </div>;
}
