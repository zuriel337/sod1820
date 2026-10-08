import React, { useEffect, useRef } from "react";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";

// The protected full lockup stays intact; SystemFrame2029 owns navigation.
export default function DiscoveryGateMark2029({ open = false }) {
  const markRef = useRef(null);
  const previousOpen = useRef(open);

  useEffect(() => {
    if (previousOpen.current === open) return;
    previousOpen.current = open;
    const mark = markRef.current;
    if (!mark || window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        mark.closest("[data-frame-reduced-motion=\"true\"]")) return;
    const glint = mark.querySelector(".sod29-gate-glint");
    if (!glint?.animate) return;
    const direction = open ? 1 : -1;
    const animation = glint.animate([
      { transform: `translateX(${-46 * direction}px) skewX(-18deg)`, opacity: 0 },
      { opacity: 0.45, offset: 0.45 },
      { transform: `translateX(${46 * direction}px) skewX(-18deg)`, opacity: 0 },
    ], { duration: 360, easing: "cubic-bezier(.2,.7,.3,1)" });
    return () => animation.cancel();
  }, [open]);

  return (
    <span ref={markRef} className="sod29-discovery-gate" data-open={open} aria-hidden="true">
      <span className="sod29-gate-halo" />
      <span className="sod29-gate-artwork">
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
        <i className="sod29-gate-glint" />
      </span>
      <svg className="sod29-gate-menu" viewBox="0 0 20 20" width="20" height="20" fill="none" focusable="false">
        <path className="is-top" d="M3 5h14" />
        <path className="is-middle" d="M3 10h14" />
        <path className="is-bottom" d="M3 15h14" />
      </svg>
    </span>
  );
}
