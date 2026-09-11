import React, { useMemo, useState } from "react";

const PLANE_OPTIONS = [1, 2, 3, 5, 10];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function sliceRows(rows, rowsPerPlane, count) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const size = Math.max(1, Number(rowsPerPlane) || rows.length);
  const limit = Math.max(1, Number(count) || 1);
  const out = [];
  for (let i = 0; i < rows.length && out.length < limit; i += size) {
    out.push({
      id: `slice-${i}`,
      rowStart: i,
      rows: rows.slice(i, i + size),
    });
  }
  return out;
}

/**
 * MatrixStack3D is a renderer-only preview for the ELS Work Area.
 *
 * Contract:
 * - It never searches/calculates ELS.
 * - It never persists Matrix/Finding truth.
 * - `planes` may later be supplied by a virtualized corpus-window adapter.
 * - Until then it can safely preview depth by slicing the CURRENT canonical
 *   matrix snapshot into sequential row windows (no duplicated/fake letters).
 *
 * `planes` shape: [{ id, rowStart, rows: string[] }]
 */
export default function MatrixStack3D({
  rows = [],
  planes = null,
  cellSize = 24,
  rowsPerPlane = 12,
  initialPlaneCount = 3,
  ink = "currentColor",
  surface = "rgba(255,255,255,.72)",
  border = "rgba(127,127,127,.28)",
  accent = "currentColor",
}) {
  const [layout, setLayout] = useState("stack");
  const [planeCount, setPlaneCount] = useState(initialPlaneCount);
  const [gap, setGap] = useState(52);
  const [baseOpacity, setBaseOpacity] = useState(82);
  const [focusPlane, setFocusPlane] = useState(0);
  const [tilt, setTilt] = useState(58);
  const [spread, setSpread] = useState(210);

  const availablePlanes = useMemo(() => {
    if (Array.isArray(planes) && planes.length) return planes;
    return sliceRows(rows, rowsPerPlane, planeCount);
  }, [planes, rows, rowsPerPlane, planeCount]);

  const visible = availablePlanes.slice(0, planeCount);
  const size = clamp(Number(cellSize) || 24, 12, 48);

  if (!visible.length) return null;

  return (
    <section aria-label="Matrix Stack 3D preview" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <strong style={{ fontSize: 12 }}>Matrix Stack · Preview</strong>
        <button type="button" onClick={() => setLayout("stack")} aria-pressed={layout === "stack"}>▱ עומק</button>
        <button type="button" onClick={() => setLayout("spread")} aria-pressed={layout === "spread"}>▤ פריסה</button>
        <span style={{ fontSize: 11, opacity: .72 }}>מישורים:</span>
        {PLANE_OPTIONS.map((n) => (
          <button key={n} type="button" onClick={() => { setPlaneCount(n); setFocusPlane((v) => Math.min(v, n - 1)); }} aria-pressed={planeCount === n}>{n}</button>
        ))}
        <label style={{ fontSize: 11 }}>שקיפות <input type="range" min="25" max="100" value={baseOpacity} onChange={(e) => setBaseOpacity(Number(e.target.value))} /></label>
        <label style={{ fontSize: 11 }}>מרחק <input type="range" min="18" max="120" value={gap} onChange={(e) => setGap(Number(e.target.value))} /></label>
        {layout === "spread" && <label style={{ fontSize: 11 }}>פריסה <input type="range" min="80" max="420" value={spread} onChange={(e) => setSpread(Number(e.target.value))} /></label>}
        <label style={{ fontSize: 11 }}>זווית <input type="range" min="22" max="72" value={tilt} onChange={(e) => setTilt(Number(e.target.value))} /></label>
      </div>

      <div style={{ overflow: "auto", minHeight: 520, padding: "90px 80px 150px", perspective: "2200px" }}>
        <div style={{ position: "relative", minWidth: 720, minHeight: 390, transformStyle: "preserve-3d", transform: `rotateX(${tilt}deg)`, transformOrigin: "50% 35%" }}>
          {visible.map((plane, pi) => {
            const focused = pi === focusPlane;
            const fade = Math.max(.18, (baseOpacity / 100) - (pi * .14));
            const opacity = focused ? Math.max(.82, baseOpacity / 100) : fade;
            const tx = layout === "spread" ? (pi - ((visible.length - 1) / 2)) * spread : 0;
            const tz = layout === "stack" ? -pi * gap : -Math.abs(pi - focusPlane) * 8;
            return (
              <button
                key={plane.id || pi}
                type="button"
                onClick={() => setFocusPlane(pi)}
                title={`מישור ${pi + 1}${Number.isFinite(plane.rowStart) ? ` · rows ${plane.rowStart}–${plane.rowStart + plane.rows.length - 1}` : ""}`}
                style={{
                  position: "absolute", inset: "0 auto auto 50%", padding: 12,
                  border: `1px solid ${focused ? accent : border}`,
                  background: surface,
                  color: ink,
                  opacity,
                  transform: `translateX(calc(-50% + ${tx}px)) translateZ(${tz}px)`,
                  transformStyle: "preserve-3d",
                  boxShadow: focused ? "0 24px 60px rgba(0,0,0,.24)" : "0 12px 34px rgba(0,0,0,.12)",
                  cursor: "pointer",
                  textAlign: "initial",
                  backdropFilter: "blur(2px)",
                  transition: "transform .28s ease, opacity .2s ease, box-shadow .2s ease",
                }}
              >
                <div style={{ fontSize: 10, opacity: .72, marginBottom: 7 }}>מישור {pi + 1}{Number.isFinite(plane.rowStart) ? ` · שורה ${plane.rowStart + 1}` : ""}</div>
                <div style={{ display: "grid", gap: 1 }}>
                  {plane.rows.map((row, ri) => (
                    <div key={ri} dir="rtl" style={{ display: "flex", justifyContent: "center", lineHeight: 1 }}>
                      {Array.from(row || "").map((letter, ci) => (
                        <span key={ci} style={{ width: size, height: size + 2, display: "inline-grid", placeItems: "center", flex: `0 0 ${size}px`, fontSize: Math.max(12, Math.round(size * .68)), border: `1px solid ${border}`, background: focused ? "rgba(255,255,255,.16)" : "transparent" }}>{letter}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 11, opacity: .68 }}>
        {Array.isArray(planes) && planes.length
          ? "מקור המישורים: corpus-window/planes שסופקו לרנדרר."
          : "Peek v1: המישורים הם חלונות רציפים מתוך Matrix Snapshot הקנוני הנוכחי; אין שכפול אותיות ואין מנוע נוסף."}
      </div>
    </section>
  );
}
