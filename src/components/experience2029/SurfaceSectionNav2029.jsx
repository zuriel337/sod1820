import React from "react";

export default function SurfaceSectionNav2029({ items = [], activeId = null, onSelect = null, ariaLabel = "ניווט בתוך הדף" }) {
  const rows = (items || []).filter((item) => item?.id && item?.label);
  if (!rows.length) return null;
  return <nav className="sod29-surface-tabs" aria-label={ariaLabel} data-experience-capability="surface-section-nav">
    {rows.map((item) => <button
      key={item.id}
      type="button"
      className={item.id === activeId ? "is-active" : ""}
      aria-current={item.id === activeId ? "page" : undefined}
      onClick={() => {
        onSelect?.(item);
        document.getElementById(item.targetId || item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >{item.label}</button>)}
  </nav>;
}
