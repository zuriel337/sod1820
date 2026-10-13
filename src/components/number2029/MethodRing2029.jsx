import React from "react";

// Six primary methods around the active result. Presentation only: every value comes from the engine-returned
// method profile the Number page already holds. Missing stays "—", a pending load shows "…", a real 0 stays 0.
const CX = 160;
const CY = 160;
const RING = 112;
const NODE = 37;
const hasValue = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

function nodePoint(index, count) {
  const angle = (-90 + (360 / Math.max(1, count)) * index) * (Math.PI / 180);
  return [CX + RING * Math.cos(angle), CY + RING * Math.sin(angle)];
}

export default function MethodRing2029({ methods = [], activeKey = null, loading = false, result = null, activeLabel = "", labelOf, onSelect }) {
  const list = (methods || []).slice(0, 6);
  if (!list.length && !loading) return null;
  const count = Math.max(list.length, loading ? 6 : 0);
  const activeIndex = list.findIndex((method) => method.methodKey === activeKey);
  const label = (method) => (labelOf ? labelOf(method) : method.displayLabel || method.methodKey);
  const aria = loading
    ? "טבעת השיטות: מחשב את השיטות"
    : `טבעת השיטות: ${activeLabel || "שיטה פעילה"}${hasValue(result) ? ` = ${result}` : ""}`;
  return <figure className={`sod29-method-ring${loading ? " is-loading" : ""}`} data-experience-capability="number-method-ring" aria-label={aria}>
    <svg viewBox="0 0 320 320" role="group" aria-label={aria} focusable="false">
      <circle className="ring-halo" cx={CX} cy={CY} r={RING + NODE + 6} />
      <circle className="ring-orbit" cx={CX} cy={CY} r={RING} />
      {Array.from({ length: count }, (_, index) => {
        const [x, y] = nodePoint(index, count);
        const method = list[index];
        const on = method && index === activeIndex;
        return <line key={`spoke-${index}`} className={`ring-spoke${on ? " is-active" : ""}`} x1={CX} y1={CY} x2={x} y2={y} />;
      })}
      <g className="ring-core">
        <circle cx={CX} cy={CY} r="56" />
        <text className="ring-core-label" x={CX} y={CY - 22} textAnchor="middle">{activeLabel || "התוצאה"}</text>
        <text className="ring-core-value" x={CX} y={CY + 12} textAnchor="middle">{loading ? "…" : hasValue(result) ? String(result) : "—"}</text>
        <text className="ring-core-caption" x={CX} y={CY + 34} textAnchor="middle">תוצאה פעילה</text>
      </g>
      {Array.from({ length: count }, (_, index) => {
        const [x, y] = nodePoint(index, count);
        const method = list[index];
        if (!method) return <g key={`ph-${index}`} className="ring-node is-placeholder" aria-hidden="true"><circle cx={x} cy={y} r={NODE} /></g>;
        const on = index === activeIndex;
        const text = label(method);
        const select = () => { if (!loading) onSelect?.(method); };
        return <g
          key={method.methodKey}
          className={`ring-node${on ? " is-active" : ""}`}
          role="button"
          tabIndex={loading ? -1 : 0}
          aria-pressed={on}
          aria-disabled={loading}
          aria-label={`${text}${hasValue(method.computedValue) ? ` ${method.computedValue}` : " לא חושב"}`}
          onClick={select}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } }}
        >
          <circle cx={x} cy={y} r={NODE} />
          <text className="ring-node-label" x={x} y={y - 6} textAnchor="middle" style={{ fontSize: String(text).length > 6 ? 10.5 : 12 }}>{text}</text>
          <text className="ring-node-value" x={x} y={y + 14} textAnchor="middle">{hasValue(method.computedValue) ? String(method.computedValue) : "—"}</text>
        </g>;
      })}
    </svg>
  </figure>;
}
