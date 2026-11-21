import React from "react";
import "./selectedRoyalItem2029.css";

// The capability owner validates identity/visibility and renders its existing row.
// Keep the exact target object (including entity and unit metadata); never infer a unit from a hash.
export default function SelectedRoyalItem2029({ projection, placement = "card" }) {
  const { target, renderActions } = projection || {};
  if (!target?.ref || !target?.href || typeof renderActions !== "function") return null;
  return <section className="sod29-selected-royal" aria-label="הפריט שנבחר" data-selected-ref={target.ref} data-placement={placement}>
    <strong>{target.title || target.label}</strong>
    <div className="sod29-selected-royal-row">{renderActions({ target, placement })}</div>
  </section>;
}
