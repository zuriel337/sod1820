// src/components/dev/GlyphPrototypeScene.jsx
// 10K Glyph Runtime Golden Prototype — Spatial 3D Slice 0 contract validation.
// SYNTHETIC DATA ONLY. No Supabase read/write. No production Torah/ELS corpus touched.
// No auth logic here on purpose — the page wrapper (GlyphPrototypePage.jsx) owns the admin gate.
//
// Exposes window.__glyphProtoApi / window.__glyphProtoStats / window.__glyphProtoTimings
// so this can be driven and measured deterministically (dev/QA/Playwright), in addition to
// the real pointer/keyboard UI below (same code path either way — nothing is faked for tests).

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, OrbitControls } from "@react-three/drei";
import { getCaretAtPoint, configureTextBuilder } from "troika-three-text";
import {
  ROWS, COLS, TOTAL_OCCURRENCES, GOLDEN_SET,
  buildOccurrences, buildSyntheticElsPath,
} from "../../lib/dev/glyphPrototypeData.js";
import { HEEBO_LATIN_HEBREW_WOFF1_DATA_URI } from "../../lib/dev/heeboFontDataUri.js";

// ---- DIAGNOSTIC-ONLY config hooks (10K Glyph Runtime Diagnostic Delta v1) ----
// URL-param driven so the exact same build can be re-run under different Troika configurations
// without a rebuild, per the discriminating test matrix (row-2 sync-stall investigation). NOT
// production configuration — every value here defaults to Troika's own normal default when the
// param is absent, so a plain visit to /dev/glyph-prototype behaves exactly as before this delta.
const _params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
const DIAG_MODE = _params?.get("mode") === "single" ? "single" : "rows";
const DIAG_GPU_SDF = _params?.get("gpuSDF") === "0" ? false : true; // Troika default: true
const DIAG_USE_WORKER = _params?.get("worker") === "0" ? false : true; // Troika default: true
if (_params?.get("worker") === "0") {
  // Must be called before the first font/typesetting request — diagnostic only, see AFTER report.
  configureTextBuilder({ useWorker: false });
}

// Explicit Hebrew-capable font, reused from the site's own already-licensed choice (Heebo, OFL,
// already loaded site-wide via index.html's Google Fonts <link>) — same font, now also given
// directly to troika as a file URL, since troika's automatic per-script CDN font-resolver
// (unicode-font-resolver via cdn.jsdelivr.net) is a SEPARATE network dependency from the CSS
// @font-face the rest of the site uses, and is not reachable in every environment (see AFTER
// report, Golden Set / Technology Decision sections). No coverage claim for niqqud/te'amim/Arabic —
// tested explicitly below (Golden Set rows 5/6/10) and reported honestly, not assumed.
const HEBREW_FONT_URL = HEEBO_LATIN_HEBREW_WOFF1_DATA_URI;

const CELL = 0.34;
const GRID_W = COLS * CELL;
const GRID_H = ROWS * CELL;
const HIGHLIGHT_COLOR = 0x2f9e5a;
const BASE_COLOR = 0xe8dcb6;
const WITNESS_COLOR = 0xffb347;

function rowOrigin(row) {
  // grid centered at origin; RTL rows still laid out left-to-right in local text space —
  // troika's own bidi handling takes care of visual glyph order within the string.
  const x = -GRID_W / 2;
  const y = GRID_H / 2 - row * CELL;
  return [x, y, 0];
}

// One troika Text block per row = the "few Troika text blocks" batching strategy (Option A/B).
const RowText = React.memo(function RowText({ row, text, colorRanges, onSynced, registerRef }) {
  const ref = useRef(null);
  return (
    <Text
      ref={(m) => { ref.current = m; registerRef(row, m); }}
      text={text}
      position={rowOrigin(row)}
      fontSize={CELL * 0.82}
      font={HEBREW_FONT_URL}
      gpuAccelerateSDF={DIAG_GPU_SDF}
      color={BASE_COLOR}
      colorRanges={colorRanges}
      anchorX="left"
      anchorY="top"
      letterSpacing={0.02}
      onSync={(mesh) => onSynced(row, mesh)}
    />
  );
});

// Single-mega-block mode: ALL 10,000 glyphs in ONE troika Text via multi-line string —
// the other end of the batching spectrum, measured for direct comparison.
const SingleBlockText = React.memo(function SingleBlockText({ text, colorRanges, onSynced, registerRef }) {
  const ref = useRef(null);
  return (
    <Text
      ref={(m) => { ref.current = m; registerRef("single", m); }}
      text={text}
      position={[-GRID_W / 2, GRID_H / 2, 0]}
      fontSize={CELL * 0.82}
      font={HEBREW_FONT_URL}
      gpuAccelerateSDF={DIAG_GPU_SDF}
      color={BASE_COLOR}
      colorRanges={colorRanges}
      anchorX="left"
      anchorY="top"
      lineHeight={1}
      letterSpacing={0.02}
      onSync={(mesh) => onSynced("single", mesh)}
    />
  );
});

// Layer 6 "promoted" high-detail representation for ONE selected occurrence — built on demand,
// never pre-built for all 10,000. Honest limitation: true vector/extruded Hebrew geometry needs a
// font-outline pipeline that does not exist yet (LATER per the frozen Glyph Foundation audit); this
// uses a larger high-fidelity SDF render + an extruded backing plate as the smallest available proxy
// for "promoted to high-detail slot", not a claim of true per-glyph 3D letterform extrusion.
function PromotedGlyph({ occurrence }) {
  if (!occurrence) return null;
  return (
    <group position={[GRID_W / 2 + 1.6, 0, 0]}>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[1.3, 1.5, 0.15]} />
        <meshStandardMaterial color={0x1c1608} metalness={0.3} roughness={0.5} />
      </mesh>
      <Text
        text={occurrence.char}
        fontSize={1.0}
        font={HEBREW_FONT_URL}
        color={occurrence.sourceWitness ? WITNESS_COLOR : "#f4e7c6"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000"
      />
    </group>
  );
}

function PerfCollector({ statsRef, timingsRef }) {
  const { gl } = useThree();
  const frames = useRef(0);
  const lastFpsSample = useRef(performance.now());
  const fps = useRef(0);
  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - lastFpsSample.current >= 500) {
      fps.current = Math.round((frames.current * 1000) / (now - lastFpsSample.current));
      frames.current = 0;
      lastFpsSample.current = now;
      statsRef.current = {
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        fps: fps.current,
        ts: now,
      };
      if (typeof window !== "undefined") window.__glyphProtoStats = statsRef.current;
    }
  });
  return null;
}

function LodTracker({ onChange }) {
  const { camera } = useThree();
  const last = useRef(null);
  useFrame(() => {
    const dist = camera.position.length();
    const tier = dist > 22 ? "far" : dist > 10 ? "near" : "close";
    if (tier !== last.current) { last.current = tier; onChange(tier); }
  });
  return null;
}

export default function GlyphPrototypeScene() {
  const dataRef = useRef(buildOccurrences(1820));
  const { occurrences, rowStrings, sourceWitnessIndex } = dataRef.current;

  const [mode, setMode] = useState(DIAG_MODE); // 'rows' | 'single'
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [highlighted, setHighlighted] = useState(() => new Set());
  const [lod, setLod] = useState("far");
  const [inspectInput, setInspectInput] = useState("");

  const statsRef = useRef({});
  const timingsRef = useRef({ buildStart: performance.now(), allSyncedAt: null, lastHighlightAppliedAt: null, lastHighlightMs: null, lastPromotionSyncedAt: null, lastPromotionMs: null });
  const meshRefs = useRef({}); // row/‘single’ -> troika Text mesh instance
  const syncedRows = useRef(new Set());

  const registerRef = useCallback((key, mesh) => { if (mesh) meshRefs.current[key] = mesh; }, []);
  const onSynced = useCallback((key, mesh) => {
    syncedRows.current.add(key);
    const expected = mode === "rows" ? ROWS : 1;
    if (syncedRows.current.size >= expected && !timingsRef.current.allSyncedAt) {
      timingsRef.current.allSyncedAt = performance.now();
      timingsRef.current.buildMs = timingsRef.current.allSyncedAt - timingsRef.current.buildStart;
      if (typeof window !== "undefined") window.__glyphProtoTimings = { ...timingsRef.current };
    }
  }, [mode]);

  // Reset sync tracking when mode changes (new set of blocks to build/sync).
  useEffect(() => {
    syncedRows.current = new Set();
    timingsRef.current = { ...timingsRef.current, buildStart: performance.now(), allSyncedAt: null, buildMs: null };
  }, [mode]);

  const selectedOccurrence = selectedIndex != null ? occurrences[selectedIndex] : null;

  const selectIndex = useCallback((i) => {
    if (i == null || i < 0 || i >= TOTAL_OCCURRENCES) return;
    const t0 = performance.now();
    setSelectedIndex(i);
    // promotion "cost" measured as time from selection to next paint frame (rAF), since the
    // promoted glyph is a fresh small Text mesh built only for this one occurrence on demand.
    requestAnimationFrame(() => {
      const t1 = performance.now();
      timingsRef.current.lastPromotionSyncedAt = t1;
      timingsRef.current.lastPromotionMs = t1 - t0;
      if (typeof window !== "undefined") window.__glyphProtoTimings = { ...timingsRef.current };
    });
  }, []);

  const applyHighlight = useCallback(() => {
    const t0 = performance.now();
    const path = buildSyntheticElsPath(occurrences, { count: 64, skip: 17, startIndex: 1234, direction: 1 });
    setHighlighted(new Set(path.map((p) => p.index)));
    requestAnimationFrame(() => {
      const t1 = performance.now();
      timingsRef.current.lastHighlightAppliedAt = t1;
      timingsRef.current.lastHighlightMs = t1 - t0;
      timingsRef.current.lastHighlightPathLength = path.length;
      timingsRef.current.lastHighlightRowsTouched = new Set(path.map((p) => p.row)).size;
      if (typeof window !== "undefined") window.__glyphProtoTimings = { ...timingsRef.current };
    });
    return path;
  }, [occurrences]);

  const clearHighlight = useCallback(() => setHighlighted(new Set()), []);

  // Real click-to-pick via troika's own getCaretAtPoint, mapped from the world-space
  // intersection point into the clicked row/block's local text space.
  const handlePointerDown = useCallback((event) => {
    event.stopPropagation();
    const mesh = event.object;
    const local = mesh.worldToLocal(event.point.clone());
    const info = mesh.textRenderInfo;
    if (!info) return;
    const caret = getCaretAtPoint(info, local.x, local.y);
    if (!caret) return;
    const charIndex = caret.charIndex != null ? caret.charIndex : caret.x != null ? Math.round(caret.x / CELL) : null;
    const row = mesh.userData.rowIndex;
    if (row == null || charIndex == null) return;
    const col = Math.max(0, Math.min(COLS - 1, Math.round(charIndex)));
    const idx = row * COLS + col;
    selectIndex(idx);
  }, [selectIndex]);

  // Imperative test/QA + accessibility API — same functions the real UI uses.
  useEffect(() => {
    window.__glyphProtoApi = {
      selectIndex,
      applyHighlight,
      clearHighlight,
      setMode,
      getOccurrence: (i) => occurrences[i],
      getSourceWitnessIndex: () => sourceWitnessIndex,
      getStats: () => statsRef.current,
      getTimings: () => timingsRef.current,
      getSyncedCount: () => syncedRows.current.size,
      totalOccurrences: TOTAL_OCCURRENCES,
    };
    return () => { delete window.__glyphProtoApi; };
  }, [selectIndex, applyHighlight, clearHighlight, occurrences, sourceWitnessIndex]);

  const rowColorRanges = useMemo(() => {
    const ranges = {};
    for (let row = 0; row < ROWS; row++) {
      const cols = [];
      highlighted.forEach((idx) => {
        const r = Math.floor(idx / COLS), c = idx % COLS;
        if (r === row) cols.push(c);
      });
      if (cols.length) {
        const map = {};
        cols.sort((a, b) => a - b).forEach((c) => { map[c] = HIGHLIGHT_COLOR; map[c + 1] = BASE_COLOR; });
        ranges[row] = map;
      }
    }
    return ranges;
  }, [highlighted]);

  const singleColorRanges = useMemo(() => {
    if (mode !== "single") return undefined;
    const map = {};
    highlighted.forEach((idx) => {
      const row = Math.floor(idx / COLS), col = idx % COLS;
      const charIdx = row * (COLS + 1) + col; // +1 per row for the '\n'
      map[charIdx] = HIGHLIGHT_COLOR;
      map[charIdx + 1] = BASE_COLOR;
    });
    return map;
  }, [highlighted, mode]);

  const singleText = useMemo(() => rowStrings.join("\n"), [rowStrings]);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0b0805" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <Canvas camera={{ position: [0, 0, 26], fov: 50 }}>
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={0.6} />
          <PerfCollector statsRef={statsRef} timingsRef={timingsRef} />
          <LodTracker onChange={setLod} />
          <OrbitControls enablePan enableZoom enableRotate maxDistance={60} minDistance={2} />
          {mode === "rows" ? (
            Array.from({ length: ROWS }).map((_, row) => (
              <group key={row} onPointerDown={handlePointerDown} onUpdate={(g) => { if (g.children[0]) g.children[0].userData.rowIndex = row; }}>
                <RowText
                  row={row}
                  text={rowStrings[row]}
                  colorRanges={rowColorRanges[row]}
                  onSynced={(k, m) => { m.userData.rowIndex = row; onSynced(k, m); }}
                  registerRef={registerRef}
                />
              </group>
            ))
          ) : (
            <group onPointerDown={(e) => { e.object.userData.rowIndex = 0; handlePointerDown(e); }}>
              <SingleBlockText
                text={singleText}
                colorRanges={singleColorRanges}
                onSynced={onSynced}
                registerRef={registerRef}
              />
            </group>
          )}
          {selectedOccurrence && <PromotedGlyph occurrence={selectedOccurrence} />}
        </Canvas>
      </div>

      {/* Accessibility / DOM fallback surface — always available, never depends on WebGL/picking. */}
      <div style={{
        width: 380, background: "#12100b", color: "#e8dcb6", padding: 16, overflowY: "auto",
        fontFamily: "system-ui, sans-serif", fontSize: 13, direction: "ltr", borderLeft: "1px solid #333",
      }}>
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>10K Glyph Runtime Prototype</h2>
        <p style={{ opacity: 0.7, marginBottom: 12 }}>Dev/admin only · synthetic data · {TOTAL_OCCURRENCES} occurrences · mode={mode}</p>

        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setMode(mode === "rows" ? "single" : "rows")}>
            Switch batching mode (currently: {mode === "rows" ? "100 row blocks" : "1 mega block"})
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <button onClick={applyHighlight}>Apply ELS-style highlight (~64 occurrences)</button>{" "}
          <button onClick={clearHighlight}>Clear</button>
          <div style={{ opacity: 0.7 }}>highlighted: {highlighted.size}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <input type="number" min={0} max={TOTAL_OCCURRENCES - 1} value={inspectInput}
            onChange={(e) => setInspectInput(e.target.value)}
            placeholder="occurrence index" style={{ width: 140 }} />{" "}
          <button onClick={() => selectIndex(Number(inspectInput))}>Inspect index</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <button onClick={() => selectIndex(sourceWitnessIndex)}>Jump to synthetic Source/Witness occurrence ({sourceWitnessIndex})</button>
        </div>

        <h3 style={{ fontSize: 14 }}>Selected occurrence</h3>
        {selectedOccurrence ? (
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#1a1610", padding: 8, borderRadius: 6 }}>
{`index:     ${selectedOccurrence.index}
row/col:   ${selectedOccurrence.row}/${selectedOccurrence.col}
family:    ${selectedOccurrence.family}  (Layer 1 — base identity)
grapheme:  ${selectedOccurrence.char}  (Layer 2 — exact occurrence form)
variant:   ${selectedOccurrence.variant || "(none)"}  (Layer 3 — representation variant taxonomy)`}
          </pre>
        ) : <p style={{ opacity: 0.6 }}>None selected.</p>}

        <h3 style={{ fontSize: 14 }}>Source/Witness claim (Layer 4) — only if attached</h3>
        {selectedOccurrence?.sourceWitness ? (
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#241a08", padding: 8, borderRadius: 6, color: "#ffb347" }}>
{JSON.stringify(selectedOccurrence.sourceWitness, null, 2)}
          </pre>
        ) : (
          <p style={{ opacity: 0.6 }}>No Source/Witness claim on this occurrence — this rendering
            choice (e.g. LOD scale) was never inferred as a claim.</p>
        )}

        <h3 style={{ fontSize: 14 }}>LOD tier (camera-driven)</h3>
        <p>{lod}</p>

        <h3 style={{ fontSize: 14 }}>Live perf (real, from renderer.info)</h3>
        <PerfReadout statsRef={statsRef} timingsRef={timingsRef} />

        <h3 style={{ fontSize: 14 }}>Golden set legend</h3>
        <ul style={{ fontSize: 11, opacity: 0.8 }}>
          <li>Rows 0-4: final-form contract demo (one family per row, alternating base/final)</li>
          <li>Row 5: niqqud combining-mark demo</li>
          <li>Row 6: te'amim combining-mark demo</li>
          <li>Row 7: digits</li>
          <li>Row 8: Latin</li>
          <li>Row 9: mixed Hebrew+digits+Latin, RTL/LTR</li>
          <li>Row 10: Arabic shaping probe (capability test only)</li>
          <li>Row 11: source/witness demo row (col 42 carries the synthetic claim)</li>
          <li>Rows 12-99: plain Hebrew field</li>
        </ul>
      </div>
    </div>
  );
}

function PerfReadout({ statsRef }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 500);
    return () => clearInterval(id);
  }, []);
  const s = statsRef.current || {};
  return (
    <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#1a1610", padding: 8, borderRadius: 6 }}>
{`drawCalls:  ${s.drawCalls ?? "…"}
triangles:  ${s.triangles ?? "…"}
geometries: ${s.geometries ?? "…"}
textures:   ${s.textures ?? "…"}
fps:        ${s.fps ?? "…"}`}
    </pre>
  );
}
