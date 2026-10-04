// Unified surface section navigation — clickable index, never a second pinned rail.
import React, { useEffect, useMemo } from "react";

export default function SurfaceSectionNav2029({
  items = [],
  activeId = null,
  onSelect = null,
  onActiveChange = null,
  ariaLabel = "ניווט בתוך הדף",
}) {
  const rows = useMemo(() => (items || []).filter((item) => item?.id && item?.label), [items]);

  useEffect(() => {
    if (!rows.length || typeof IntersectionObserver === "undefined") return undefined;
    const targets = rows
      .map((item) => ({ item, node: document.getElementById(item.targetId || item.id) }))
      .filter((row) => row.node);
    if (!targets.length) return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      if (!visible) return;
      const match = targets.find((row) => row.node === visible.target);
      if (match) onActiveChange?.(match.item);
    }, { rootMargin: "-18% 0px -64% 0px", threshold: [0, 0.01, 1] });

    targets.forEach((row) => observer.observe(row.node));
    return () => observer.disconnect();
  }, [rows, onActiveChange]);

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
