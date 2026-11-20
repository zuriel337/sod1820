import React, { lazy, Suspense } from "react";
// Fixed height before and after load (no layout shift); the strip itself is loaded on demand (Speed Law).
const Strip = lazy(() => import("./SectionPulse2029.jsx"));
export const SECTION_PULSE_HEIGHT = 104;
export default function SectionPulseSlot2029(props) {
  return <div style={{ height: SECTION_PULSE_HEIGHT, overflow: "hidden", margin: "12px 0" }}><Suspense fallback={null}><Strip {...props} /></Suspense></div>;
}
