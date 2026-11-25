import React, { lazy, Suspense } from "react";
// A fixed-height slot before and after the line loads (no layout shift): the line loads on demand (Speed Law), inside "עכשיו" only.
const Line = lazy(() => import("./NowPulseLine2029.jsx"));
export default function NowPulseLineSlot2029({ onOpen = null }) {
  return <div className="nowpulse29-slot"><Suspense fallback={null}><Line onOpen={onOpen} /></Suspense></div>;
}
