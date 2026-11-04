import React from "react";
import { Link } from "react-router-dom";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import "./WorldZviApprovedFindings2029.css";

// The same public finding presentation serves the source, World and number
// surfaces. Callers decide eligibility; this component never creates relations.
function groupPublicFindingWording(rows = []) {
  const groups = new Map(), seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    const key = row.exactTextFingerprint || `finding:${row.id}`;
    const members = groups.get(key) || [];
    members.push(row);
    groups.set(key, members);
  }
  return [...groups.values()];
}

export default function ZviFindingCards2029({
  rows = [],
  returnTo,
  claimedNumber = null,
  showSource = true,
  sourceHrefAllowed = null,
  singleColumn = false,
  groupExactWording = false,
}) {
  const groups = groupExactWording ? groupPublicFindingWording(rows) : rows.map((row) => [row]);
  return <ul className="zvi-research__grid" style={singleColumn ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined}>{groups.map((members) => {
    const row = members[0];
    const publication = row.publicationState ?? row.status;
    const sourceAllowed = showSource && row.sourceHref
      && (typeof sourceHrefAllowed !== "function" || sourceHrefAllowed(row.sourceHref));
    return <li className="zvi-research__card" key={row.id}>
      <div className="zvi-research__card-labels">
        <span>{row.kindLabel || "ממצא מחקר"}</span>
        {publication === "canonical" ? <span>קנוני</span> : publication === "approved" ? <span>מאושר</span> : null}
        {claimedNumber != null ? <span>מספר המופיע בממצא: {claimedNumber}</span> : null}
      </div>
      <span className="zvi-research__excerpt-label">תקציר הממצא · לחצו לקריאה</span>
      <Link className="zvi-research__excerpt" to={row.findingHref} state={{ returnTo }}>{row.title || "ממצא ציבורי"}{row.summaryTruncated ? "…" : ""}</Link>
      {row.contributor ? <p className="zvi-research__byline">ייחוס ברשומה: <bdi>{row.contributor}</bdi></p> : null}
      {row.roleLabel ? <p className="zvi-research__note">{row.roleLabel}</p> : null}
      {row.ocrNeedsReview ? <p className="zvi-research__note">סריקת OCR — נדרשת בדיקה מול המקור; אינו ציטוט מאומת.</p> : null}
      {sourceAllowed ? <div className="zvi-research__actions"><Link className="zvi-research__action" to={row.sourceHref}>פתיחת המקור</Link></div> : null}
      {members.length > 1 ? <details className="zvi-research__note">
        <summary>{members.length} מופעים באותו נוסח מוצג</summary>
        <ul>{members.map((occurrence, index) => {
          const allowed = showSource && occurrence.sourceHref
            && (typeof sourceHrefAllowed !== "function" || sourceHrefAllowed(occurrence.sourceHref));
          return <li key={occurrence.id}>
            <Link to={occurrence.findingHref} state={{ returnTo }}>פריט {index + 1}</Link>
            {occurrence.contributor ? <> · <bdi>{occurrence.contributor}</bdi></> : null}
            {occurrence.createdAt ? <> · {bilingualDateLabel(occurrence.createdAt)}</> : null}
            {occurrence.publicationState ? <> · {occurrence.publicationState === "canonical" ? "קנוני" : "מאושר"}</> : null}
            {allowed ? <> · <Link to={occurrence.sourceHref}>פתיחת המקור</Link></> : null}
          </li>;
        })}</ul>
      </details> : null}
    </li>;
  })}</ul>;
}
