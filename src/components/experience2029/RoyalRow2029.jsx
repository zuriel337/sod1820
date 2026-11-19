import React, { useId } from "react";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";

// The compact royal row of the Personal Area 2029 (#1314), shared so every surface uses the same component (Design V2 §14.1):
// a gold-ringed medallion, a title and a hint, and a chevron; a closed row is a labelled status with its real reason, never a dead button.
// Styles: royal2029.css (.r29-card, .r29-medal, .r29-badge) + personalArea2029.css (.pa29-card and its parts).
const STATE_LABEL = { locked: "נעול", building: "בבנייה", unavailable: "לא זמין" };

export default function RoyalRow2029({ icon, title, hint, state = "live", reason = null, kind = "me", onPress, data = {} }) {
  const hintId = useId();
  const closed = state !== "live";
  const body = <>
    <span className="pa29-medal r29-medal" aria-hidden="true"><NavigationIcon2029 name={icon} size={20} /></span>
    <span className="pa29-card-text"><strong>{title}</strong><small id={hintId}>{hint}</small></span>
    {closed ? <span className="pa29-state r29-badge" data-pa29-state={state}>{STATE_LABEL[state] || "סגור"}</span>
      : <span className="pa29-chev" aria-hidden="true" />}
  </>;
  const common = { className: `pa29-card r29-card${closed ? " is-closed" : ""}`, "data-r29-kind": kind, ...data,
    "aria-describedby": hintId, title: closed && reason ? reason : undefined };
  if (closed) return <div {...common} role="group" aria-disabled="true" aria-label={`${title}: ${STATE_LABEL[state] || "סגור"}`}>{body}</div>;
  return <button type="button" {...common} onClick={onPress}>{body}</button>;
}
