import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { claimLegacyContributor, isLegacyContributorId } from "../../lib/community/legacyClaim.js";
import { VERIFIED_ARCHIVE_PROFILES } from "../../lib/community/communityArchive.js";
import ProfileSettings from "../ProfileSettings.jsx";
import CommunitySignIn from "./CommunitySignIn.jsx";

export default function LegacyAccountClaim({ contributorId, palette }) {
  const { user, loading } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState("");
  const known = VERIFIED_ARCHIVE_PROFILES[contributorId];
  const valid = isLegacyContributorId(contributorId);

  const claim = async () => {
    if (!valid || claiming) return;
    setError(""); setClaiming(true);
    try { await claimLegacyContributor(contributorId); setClaimed(true); }
    catch (reason) {
      setError(reason?.message === "caller_email_not_confirmed"
        ? "יש לאמת את כתובת המייל של החשבון לפני התביעה."
        : "לא ניתן לתבוע את הפרופיל עם החשבון הזה. יש להיכנס במייל המאומת של החשבון הישן, או לפנות לתמיכה.");
    } finally { setClaiming(false); }
  };

  return <section className="sod29-community-claim" aria-label="תביעת חשבון ישן">
    <Link className="sod29-community-text-action" to="/2029?preview=community&data=live">→ חזרה לקהילה</Link>
    <h1>אימות החשבון הישן</h1>
    <p>הודעות ולייקים שפורסמו בעבר נשמרים בארכיון. כדי לקשר פרופיל ישן לחשבון באתר, יש להיכנס עם כתובת המייל ששימשה אותו.</p>
    {known ? <div className="sod29-community-claim-person"><strong>{known.name}</strong>{known.handle ? <span dir="ltr">@{known.handle}</span> : null}</div> : null}
    {!valid ? <p role="alert">הקישור אינו תקין. פתחו את הפרופיל הישן מתוך הודעה בקהילה ונסו שוב.</p> : null}
    {valid && !claimed ? <>
      <CommunitySignIn />
      {!loading && user ? <div className="sod29-community-claim-actions"><p>התביעה תתבצע רק אם המייל המאומת של החשבון המחובר תואם למייל השמור בפרופיל הישן. הקישור לבדו אינו מקנה בעלות.</p><button type="button" className="sod29-community-primary" disabled={claiming} onClick={claim}>{claiming ? "בודק שיוך…" : "אימות ותביעת החשבון הישן"}</button></div> : null}
      {error ? <p role="alert" className="sod29-community-sign-in-error">{error} <a href="mailto:zyz997@gmail.com">פנייה במייל</a></p> : null}
    </> : null}
    {claimed ? <div className="sod29-community-claim-editor"><h2>החשבון הישן קושר בהצלחה</h2><p>אפשר כעת לקבוע את שם המשתמש, שם התצוגה והתמונה בחשבון הקיים.</p><ProfileSettings t={{ fieldBg: palette.cardRaised, ink: palette.ink, line: palette.line, sub: palette.ink, acc: palette.accent || "#ba8b42", btnText: "#fff" }} /><Link to={`/2029?preview=community&data=live&member=${contributorId}`}>הפרופיל הציבורי ←</Link><br /><Link to="/profile">הגדרות החשבון המלאות ←</Link></div> : null}
  </section>;
}
