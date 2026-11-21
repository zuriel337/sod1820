import React from "react";
import { mapUnitReading } from "../../lib/research/mapUnitReading2029.js";

export default function MapUnitContext2029({ postId, unitKey }) {
  const unit = mapUnitReading(postId, unitKey);
  return unit ? <section aria-label="קשר במפת המציאות">
    <strong>{unit.label}</strong><p>{unit.reason}</p>
    <a href={unit.href}>{unit.relatedLabel} ←</a>
  </section> : null;
}
