// Compatibility wrapper: Post/Topic consume the canonical Page Map family.
// Keep this name temporarily so existing surface call sites do not fork navigation semantics.
import React from "react";
import SurfaceMapBar2029 from "./SurfaceMapBar2029.jsx";

export default function SurfaceSectionNav2029({
  items = [],
  activeId = null,
  onSelect = null,
  onActiveChange = null,
  ariaLabel = "מפת הדף",
  currentLabel = "אתה כאן",
}) {
  return <SurfaceMapBar2029
    items={items}
    activeId={activeId}
    onSelect={onSelect}
    onActiveChange={onActiveChange}
    ariaLabel={ariaLabel}
    currentLabel={currentLabel}
    compact
  />;
}
