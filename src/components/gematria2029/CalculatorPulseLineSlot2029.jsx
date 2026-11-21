import React, { lazy, Suspense } from "react";
// The line loads on demand (Speed Law). "row": its own fixed 44px row (phones). "inline": a content-wide item inside an
// existing row (desktop, next to the word of the day) — Dense Row Law: no wide, mostly empty row on a computer.
const Line = lazy(() => import("./CalculatorPulseLine2029.jsx"));
export default function CalculatorPulseLineSlot2029({ inline = false }) {
  return inline
    ? <span className="sod29-calcpro-pulse-inline"><Suspense fallback={null}><Line /></Suspense></span>
    : <div className="sod29-calcpro-pulse-row" style={{ height: 44, overflow: "hidden" }}><Suspense fallback={null}><Line /></Suspense></div>;
}
