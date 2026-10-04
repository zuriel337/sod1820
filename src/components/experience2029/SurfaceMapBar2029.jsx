import React, { useEffect, useMemo } from "react";
import "./surfaceMapBar2029.css";

function normalizeItems(items = []) {
  return (items || []).map((item) => {
    if (Array.isArray(item)) return { label: item[0], id: item[1], targetId: item[1] };
    return item;
  }).filter((item) => item?.id && item?.label);
}

export default function SurfaceMapBar2029({
  items = [],
  activeId = null,
  onSelect = null,
  onActiveChange = null,
  ariaLabel = "מפת הדף",
  currentLabel = "אתה כאן",
  compact = false,
}) {
  const rows = useMemo(() => normalizeItems(items), [items]);
  const activeIndex = Math.max(0, rows.findIndex((item) => item.id === activeId));
  const activeItem = rows[activeIndex] || rows[0] || null;
  const progress = rows.length ? Math.max(7, ((activeIndex + 1) / rows.length) * 100) : 0;

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
    }, { rootMargin: "-20% 0px -62% 0px", threshold: [0, .01, .35] });

    targets.forEach((row) => observer.observe(row.node));
    return () => observer.disconnect();
  }, [rows, onActiveChange]);

  if (!rows.length) return null;

  const jump = (item) => {
    onSelect?.(item);
    document.getElementById(item.targetId || item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <nav
    className={`sod29-surface-map${compact ? " is-compact" : ""}`}
    aria-label={ariaLabel}
    data-experience-capability="surface-page-map"
  >
    <button type="button" className="sod29-surface-map-current" onClick={() => activeItem && jump(activeItem)}>
      <span>{currentLabel}</span>
      <strong>{activeItem?.label || rows[0].label}</strong>
    </button>

    <div className="sod29-surface-map-progress" aria-hidden="true">
      <i style={{ width: `${progress}%` }} />
    </div>

    <div className="sod29-surface-map-links" role="list">
      {rows.map((item) => <button
        key={item.id}
        type="button"
        role="listitem"
        className={item.id === activeId ? "is-active" : ""}
        aria-current={item.id === activeId ? "step" : undefined}
        onClick={() => jump(item)}
      >{item.label}</button>)}
    </div>
  </nav>;
}
