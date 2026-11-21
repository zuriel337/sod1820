import React from "react";
import { Link } from "react-router-dom";
import { mapUnitReading, mapWorldHref } from "../../lib/research/mapUnitReading2029.js";

export default function MapUnitContext2029({ postId, unitKey }) {
  const unit = mapUnitReading(postId, unitKey || undefined);
  return unit ? <section aria-label="קשר במפת המציאות">
    <div className="sod29-context-inspector-kicker">המשך המחקר</div>
    <strong>{unit.label}</strong><p>{unit.reason}</p>
    <Link to={mapWorldHref(unit.key)}>לקשר בעולם · {unit.relatedLabel} ←</Link>
  </section> : null;
}
