import React from "react";
import "./opening2029.css";
import { use2029Palette } from "../../lib/palette.js";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";
// Temporary document opening, not another System Frame. The actual Frame owns
// all account, context, tools and Now actions. Plain public navigation is usable
// while component code is arriving; no fake article or busy fullscreen overlay.
export default function Opening2029() {
  const palette = use2029Palette();
  return <div className="sod29-opening" dir="rtl" aria-busy="true" style={{ backgroundColor: palette.pageBg, color: palette.ink }}>
    <header className="sod29-opening-header"><a href="/2029" className="sod29-opening-identity"><img src={BRAND_LOCKUP_NAV_2029.src} width="40" height="40" alt={BRAND_LOCKUP_NAV_2029.alt} />סוד 1820</a>
      <nav aria-label="ניווט בזמן פתיחת העמוד"><a href="/2029">בית</a><a href="/world">העולם</a><a href="/2029/posts">פוסטים</a></nav>
    </header>
    <span className="sod29-opening-status" role="status">פותח את העמוד</span>
    <div className="sod29-opening-content" aria-hidden="true"><div className="sod29-opening-card" /><div className="sod29-opening-row" /><div className="sod29-opening-row" /></div>
  </div>;
}
