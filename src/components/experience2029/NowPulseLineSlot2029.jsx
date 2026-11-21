import React, { lazy, Suspense } from "react";
// Fixed 44px (36px line + 8px gap) before and after load: no layout shift; the line loads on demand (Speed Law).
const Line = lazy(() => import("./NowPulseLine2029.jsx"));
export default function NowPulseLineSlot2029() {
  return <div style={{ height: 44, overflow: "hidden" }}><Suspense fallback={null}><Line /></Suspense></div>;
}
