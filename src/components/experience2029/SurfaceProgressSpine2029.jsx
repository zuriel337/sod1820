import React, { useEffect, useMemo, useState } from "react";

export default function SurfaceProgressSpine2029({
  items = [],
  activeId = null,
  onSelect = null,
  onActiveChange = null,
  ariaLabel = "התקדמות בדף",
  interactive = true,
}) {
  const rows = useMemo(() => (items || []).filter((item) => item?.id && item?.label), [items]);
  const [observedId, setObservedId] = useState(activeId || rows[0]?.id || null);

  useEffect(() => {
    if (activeId) setObservedId(activeId);
  }, [activeId]);

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
      if (!match || match.item.id === observedId) return;
      setObservedId(match.item.id);
      onActiveChange?.(match.item);
    }, { rootMargin: "-18% 0px -66% 0px", threshold: [0, 0.01, 1] });

    targets.forEach((row) => observer.observe(row.node));
    return () => observer.disconnect();
  }, [rows, onActiveChange, observedId]);

  if (!rows.length) return null;
  const currentId = observedId || activeId || rows[0]?.id;

  return <nav className="sod29-surface-progress-spine" aria-label={ariaLabel} data-experience-capability="surface-progress-spine">
    <span className="sod29-surface-progress-line" aria-hidden="true" />
    {rows.map((item) => interactive ? <button
      key={item.id}
      type="button"
      className={`sod29-surface-progress-point${item.id === currentId ? " is-active" : ""}`}
      aria-label={item.label}
      aria-current={item.id === currentId ? "step" : undefined}
      title={item.label}
      data-context-map-item={item.id}
      onClick={() => {
        setObservedId(item.id);
        onSelect?.(item);
        document.getElementById(item.targetId || item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    ><span /><small>{item.label}</small></button> : <div
      key={item.id}
      className={`sod29-surface-progress-point${item.id === currentId ? " is-active" : ""}`}
      aria-current={item.id === currentId ? "step" : undefined}
    ><span /><small>{item.label}</small></div>)}
  </nav>;
}
