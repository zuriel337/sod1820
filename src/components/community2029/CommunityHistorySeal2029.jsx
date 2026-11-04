import React from "react";
import { hasReviewedCommunityHistory } from "../../lib/community/communityCanonicalIdentity2029.js";
import "./communityHistorySeal2029.css";

// This seal certifies an administrator-reviewed association of published
// Community history to this account. It does not certify legal identity,
// email-provider ownership, post truth or pending-message publication.
export default function CommunityHistorySeal2029({ authorKey, compact = false }) {
  if (!hasReviewedCommunityHistory(authorKey)) return null;
  return <details className={`sod29-history-seal${compact ? " sod29-history-seal--compact" : ""}`}
    onClick={(event) => event.stopPropagation()}>
    <summary title="היסטוריית הקהילה קושרה לחשבון" aria-label="היסטוריית הקהילה אוחדה — לחצו להסבר">
      <span className="sod29-history-seal-icon" aria-hidden="true">✓</span>
      <span>{compact ? "אוחד" : "היסטוריה אוחדה"}</span>
    </summary>
    <div className="sod29-history-seal-description" role="note">
      פרסומים היסטוריים מהקהילה הישנה קושרו לחשבון הנוכחי לאחר אישור מנהל.
      החותמת מעידה על שיוך ההיסטוריה בלבד — לא על אימות זהות רשמי או על נכונות התוכן.
      פרסומים שטרם אושרו נשארים בהמתנה.
    </div>
  </details>;
}
