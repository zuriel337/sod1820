import React from "react";
import "./opening2029.css";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";
// Royal opening shell, not another System Frame. It paints only what the real Frame's closed bar paints (dark glass bar, the approved crown on the
// centre line, the gold arc and line) and is the same markup and the same stylesheet as the static twin in 2029.html, so the document opening,
// this Suspense fallback and the Frame look alike: no temporary navigation bar, no skeleton, no jump between layouts. The actual Frame owns all
// account, context, tools and Now actions. The public links are kept for keyboard and screen-reader users (hidden until focused).
export default function Opening2029() {
  return <div className="sod29-opening" dir="rtl" aria-busy="true">
    <header className="sod29-opening-bar">
      <a href="/2029" className="sod29-opening-crown" aria-label="SOD1820 · בית">
        <svg className="sod29-opening-dip" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path className="arc" d="M0 0H320C276 0 250 62 160 62S44 0 0 0Z" /><path className="line" d="M0 0C44 0 70 62 160 62S276 0 320 0" /></svg>
        <img src={BRAND_LOCKUP_NAV_2029.src} width={BRAND_LOCKUP_NAV_2029.width} height={BRAND_LOCKUP_NAV_2029.height} alt="" />
      </a>
    </header>
    <nav className="sod29-opening-nav" aria-label="ניווט בזמן פתיחת העמוד"><a href="/2029">בית</a><a href="/world">העולם</a><a href="/2029/posts">פוסטים</a></nav>
    <span className="sod29-opening-status" role="status">פותח את העמוד</span>
  </div>;
}
