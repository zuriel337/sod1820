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
        <circle className="sod29-gate-orbit" cx="24" cy="24" r="22.5" />
        <path className="sod29-gate-wing is-left" d="M14 4H8a4 4 0 0 0-4 4v6m0 20v6a4 4 0 0 0 4 4h6" />
        <path className="sod29-gate-wing is-right" d="M34 4h6a4 4 0 0 1 4 4v6m0 20v6a4 4 0 0 1-4 4h-6" />
        <path className="sod29-gate-light" d="M20 3h8M20 45h8" />
        <circle className="sod29-gate-node" cx="24" cy="2.5" r="1" />
        <circle className="sod29-gate-node" cx="24" cy="45.5" r="1" />
      </svg>
      <i className="sod29-gate-scan" />
    </span>
  );
}
