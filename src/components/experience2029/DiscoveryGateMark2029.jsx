import React from "react";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";

// The complete canonical lockup remains intact. Only its decorative gate moves;
// navigation state continues to belong to SystemFrame2029.
export default function DiscoveryGateMark2029({ open = false }) {
  return (
    <span className="sod29-discovery-gate" data-open={open} aria-hidden="true">
      <img
        className="sod29-gate-lockup"
        src={BRAND_LOCKUP_NAV_2029.src}
        width={BRAND_LOCKUP_NAV_2029.width}
        height={BRAND_LOCKUP_NAV_2029.height}
        alt=""
        loading="eager"
        decoding="async"
        draggable="false"
        data-brand-asset-state={BRAND_LOCKUP_NAV_2029.state}
      />
      <svg className="sod29-gate-frame" viewBox="0 0 48 48" width="48" height="48" fill="none" focusable="false">
        <path className="sod29-gate-wing is-left" d="M13 5H8a3 3 0 0 0-3 3v32a3 3 0 0 0 3 3h5" />
        <path className="sod29-gate-wing is-right" d="M35 5h5a3 3 0 0 1 3 3v32a3 3 0 0 1-3 3h-5" />
        <path className="sod29-gate-light" d="M19 3h10M19 45h10" />
      </svg>
    </span>
  );
}
