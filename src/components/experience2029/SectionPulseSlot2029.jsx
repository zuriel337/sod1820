import React, { lazy, Suspense, useEffect, useState } from "react";
import { afterReadableContent2029 } from "../../lib/publicReadingRelease2029.js";
// Fixed height before and after load (no layout shift); the strip itself is loaded on demand (Speed Law).
// Dense Row Law (ZURIEL 21.11.2026): one thin, content-wide line. "inline": an item inside an existing row (number page
// top row: way back, share, save, statistics) with its 36px height reserved, so nothing moves when it loads.
const Strip = lazy(() => import("./SectionPulse2029.jsx"));
export const SECTION_PULSE_HEIGHT = 44;
export default function SectionPulseSlot2029({ inline = false, ...props }) {
  const [ready, setReady] = useState(false);
  useEffect(() => afterReadableContent2029(window.location.pathname, () => setReady(true)), []);
  const content = ready && <Suspense fallback={null}><Strip {...props} /></Suspense>;
  return inline
    ? <span className="sod29-section-pulse-inline">{content}</span>
    : <div style={{ height: SECTION_PULSE_HEIGHT, overflow: "hidden", margin: "8px 0" }}>{content}</div>;
}
