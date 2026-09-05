// src/components/spatial/TorahOccurrenceScene.jsx
// Torah Occurrence -> Spatial Runtime Adapter — dev/admin only. Two coexisting views on the SAME
// occurrence data: (1) the proven row/chunk Glyph Runtime (real Torah text, base-letter form, same
// technique as the Hebrew 10K Font Closure, work_log 2bc1a5cd) for the 100/1K/10K real-corpus
// performance proof + picking + ELS-path highlight; (2) the Semantic Scene Compiler's book/chunk/path
// LOD view (compileTorahOccurrenceScene) for the CORPUS/BOOK SUMMARY -> CHUNK/WINDOW LOD contract.
// Neither view ever renders one mesh per letter's semantic identity — rows are batched Text blocks.

import React, { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import { getCaretAtPoint } from "troika-three-text";
import * as THREE from "three";
import {
  buildOccurrenceRange, attachWitness, occurrenceKey, CORPUS_N,
} from "../../lib/spatial/torahOccurrenceAdapter.js";
import { BOOK_NAMES, BOOK_LETTER_START } from "../../lib/spatial/torahCorpusSource.js";
import { TORAH_ELS_PATH_FIXTURE, buildPathAnnotationMap } from "../../lib/spatial/torahElsPathFixture.js";
import { compileTorahOccurrenceScene, TRUTH_TIERS, TORAH_LENSES } from "../../lib/spatial/semanticSceneCompiler.js";

import HEEBO_800_TTF_URL from "../../../api/_assets/heebo-800.ttf?url";

const ROW_SIZE = 100; // same row width as the proven 10K prototype (work_log 2bc1a5cd)

function bookOf(corpusIndex) {
  for (let i = BOOK_LETTER_START.length - 1; i >= 0; i--) {
    if (corpusIndex >= BOOK_LETTER_START[i]) return { bookIndex: i, name: BOOK_NAMES[i] };
  }
  return { bookIndex: 0, name: BOOK_NAMES[0] };
}

function computeChunks(occurrences) {
  const chunks = [];
  for (let start = 0; start < occurrences.length; start += ROW_SIZE) {
    const slice = occurrences.slice(start, start + ROW_SIZE);
    const b = bookOf(slice[0].corpusIndex);
    chunks.push({
      id: Math.floor(start / ROW_SIZE),
      bookIndex: b.bookIndex,
      startIndex: slice[0].corpusIndex,
      endIndex: slice[slice.length - 1].corpusIndex + 1,
      count: slice.length,
      pathMemberCount: slice.filter((o) => o.pathMembership).length,
    });
  }
  return chunks;
}

function computeBooks(chunks) {
  const map = new Map();
  chunks.forEach((c) => {
    if (!map.has(c.bookIndex)) map.set(c.bookIndex, { bookIndex: c.bookIndex, name: BOOK_NAMES[c.bookIndex], chunkIds: [] });
    map.get(c.bookIndex).chunkIds.push(c.id);
  });
  return [...map.values()];
}

// ── Row/chunk Glyph Runtime (proven pattern) ──────────────────────────────────────────────────────
function GlyphRow({ row, y, pathPositions, onPick, onSync }) {
  const ref = useRef();
  const text = row.occurrences.map((o) => o.baseLetterFamily).join("");
  const colorRanges = useMemo(() => {
    const ranges = {};
    row.occurrences.forEach((o, i) => { if (pathPositions.has(o.corpusIndex)) ranges[i] = 0xffd27a; });
    return Object.keys(ranges).length ? ranges : undefined;
  }, [row, pathPositions]);

  return (
    <Text
      ref={ref}
      font={HEEBO_800_TTF_URL}
      fontSize={0.22}
      color="#cfd6e6"
      colorRanges={colorRanges}
      anchorX="left"
      anchorY="middle"
      position={[-9, y, 0]}
      maxWidth={20}
      onSync={(t) => onSync(row.id)}
      onPointerDown={(e) => {
        e.stopPropagation();
        const mesh = ref.current;
        if (!mesh?.textRenderInfo) return;
        const local = mesh.worldToLocal(e.point.clone());
        const caret = getCaretAtPoint(mesh.textRenderInfo, local.x, local.y);
        if (caret && caret.charIndex != null) onPick(row.startIndex + caret.charIndex);
      }}
    >
      {text}
    </Text>
  );
}

function GlyphRuntime({ chunks, occurrences, pathPositions, onPick, onSyncCount }) {
  const rows = useMemo(() => chunks.map((c) => ({
    id: c.id, startIndex: c.startIndex,
    occurrences: occurrences.slice(c.id * ROW_SIZE, c.id * ROW_SIZE + ROW_SIZE),
  })), [chunks, occurrences]);
  const synced = useRef(new Set());
  const handleSync = useCallback((id) => { synced.current.add(id); onSyncCount(synced.current.size); }, [onSyncCount]);
  return rows.map((row, i) => (
    <GlyphRow key={row.id} row={row} y={4 - i * 0.32} pathPositions={pathPositions} onPick={onPick} onSync={handleSync} />
  ));
}

// ── Semantic LOD scene (book/chunk/path nodes) ────────────────────────────────────────────────────
const TIER_COLOR = { [TRUTH_TIERS.FACT]: "#5ecbe0", [TRUTH_TIERS.FINDING]: "#e8dcb6" };
function LodNode({ node, onSelect }) {
  const color = node.kind === "corpus" ? "#f6e9c4" : node.kind === "path" ? "#ffd27a" : (TIER_COLOR[node.truthTier] || "#999");
  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}>
        <sphereGeometry args={[node.kind === "corpus" ? 0.5 : 0.26, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <Text font={HEEBO_800_TTF_URL} fontSize={0.2} color="#f3eee1" anchorX="center" anchorY="bottom" position={[0, 0.35, 0]} outlineWidth={0.006} outlineColor="#0a0812">
        {node.label}
      </Text>
    </group>
  );
}
function LodRelationLine({ from, to }) {
  if (!from || !to) return null;
  return <Line points={[[from.x, from.y, from.z], [to.x, to.y, to.z]]} color="#5a5468" lineWidth={0.8} transparent opacity={0.5} />;
}

function PerfCollector({ onStats }) {
  const { gl } = useThree();
  useFrame(() => {
    const info = gl.info;
    const raw = info.render.triangles;
    onStats({ drawCalls: info.render.calls, triangles: Number.isFinite(raw) ? raw : null, geometries: info.memory.geometries, textures: info.memory.textures });
  });
  return null;
}

export default function TorahOccurrenceScene() {
  const [windowSize, setWindowSize] = useState(100);
  const [mode, setMode] = useState("glyph"); // "glyph" | "lod"
  const [lens, setLens] = useState("summary");
  const [lodFocusId, setLodFocusId] = useState(null);
  const [occurrences, setOccurrences] = useState([]);
  const [buildMs, setBuildMs] = useState(0);
  const [compileMs, setCompileMs] = useState(0);
  const [syncedRows, setSyncedRows] = useState(0);
  const [stats, setStats] = useState({});
  const [picked, setPicked] = useState(null);
  const [pickCostMs, setPickCostMs] = useState(null);
  const [highlightOn, setHighlightOn] = useState(true);
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (!(c.getContext("webgl") || c.getContext("experimental-webgl"))) setWebglOk(false);
    } catch { setWebglOk(false); }
  }, []);

  const pathAnnotations = useMemo(() => buildPathAnnotationMap(TORAH_ELS_PATH_FIXTURE), []);
  const pathPositions = useMemo(() => new Set(TORAH_ELS_PATH_FIXTURE.positions), []);

  const loadWindow = useCallback((n) => {
    const t0 = performance.now();
    const occ = buildOccurrenceRange(0, n, pathAnnotations);
    const t1 = performance.now();
    setOccurrences(occ);
    setBuildMs(+(t1 - t0).toFixed(2));
    setSyncedRows(0);
    setWindowSize(n);
  }, [pathAnnotations]);

  useEffect(() => { loadWindow(100); }, [loadWindow]);

  const chunks = useMemo(() => computeChunks(occurrences), [occurrences]);
  const books = useMemo(() => computeBooks(chunks), [chunks]);

  const lodScene = useMemo(() => {
    if (!chunks.length) return null;
    const t0 = performance.now();
    const s = compileTorahOccurrenceScene({ books, chunks, pathFixture: TORAH_ELS_PATH_FIXTURE }, { lens, focusId: lodFocusId });
    setCompileMs(+(performance.now() - t0).toFixed(2));
    return s;
  }, [books, chunks, lens, lodFocusId]);

  const handlePick = useCallback(async (corpusIndex) => {
    const t0 = performance.now();
    const base = occurrences.find((o) => o.corpusIndex === corpusIndex);
    if (!base) return;
    const withWitness = await attachWitness(base);
    setPicked(withWitness);
    setPickCostMs(+(performance.now() - t0).toFixed(2));
  }, [occurrences]);

  useEffect(() => {
    window.__torahAdapterApi = {
      loadWindow,
      getOccurrences: () => occurrences,
      getChunks: () => chunks,
      getBooks: () => books,
      getLodScene: () => lodScene,
      pick: handlePick,
      getPicked: () => picked,
      getStats: () => stats,
      getTimings: () => ({ buildMs, compileMs, syncedRows, pickCostMs }),
      setLens, setMode, setHighlightOn,
      occurrenceKey,
      CORPUS_N,
      PATH_FIXTURE: TORAH_ELS_PATH_FIXTURE,
    };
    return () => { delete window.__torahAdapterApi; };
  }, [loadWindow, occurrences, chunks, books, lodScene, handlePick, picked, stats, buildMs, compileMs, syncedRows, pickCostMs]);

  if (!webglOk) {
    return <div style={{ padding: 20, color: "#e8dcb6" }}>WebGL לא זמין — נתוני-המופעים עדיין נגישים דרך window.__torahAdapterApi (DOM fallback).</div>;
  }

  const nodeById = lodScene ? Object.fromEntries(lodScene.sceneNodes.map((n) => [n.id, n])) : {};

  return (
    <div style={{ display: "flex", minHeight: "80vh", background: "#0a0812" }} dir="rtl">
      <div style={{ flex: "1 1 68%", position: "relative", minHeight: 520 }}>
        <Canvas camera={{ position: [0, 2, 14], fov: 50 }}>
          <color attach="background" args={["#0a0812"]} />
          <ambientLight intensity={0.6} />
          <pointLight position={[6, 8, 6]} intensity={1.1} />
          <Suspense fallback={null}>
            {mode === "glyph" && (
              <GlyphRuntime chunks={chunks} occurrences={occurrences} pathPositions={highlightOn ? pathPositions : new Set()} onPick={handlePick} onSyncCount={setSyncedRows} />
            )}
            {mode === "lod" && lodScene && (
              <>
                {lodScene.sceneRelations.map((r) => (
                  <LodRelationLine key={r.id} from={nodeById[r.from]?.position} to={nodeById[r.to]?.position} />
                ))}
                {lodScene.sceneNodes.map((n) => (
                  <LodNode key={n.id} node={n} onSelect={setLodFocusId} />
                ))}
              </>
            )}
            <PerfCollector onStats={setStats} />
          </Suspense>
          <OrbitControls enablePan={mode === "lod"} maxDistance={30} minDistance={3} />
        </Canvas>
      </div>

      <div style={{ flex: "1 1 32%", maxWidth: 380, background: "#100c1a", borderInlineStart: "1px solid #2a2438", padding: "16px 14px", overflowY: "auto", color: "#e8dcb6", fontFamily: "system-ui" }}>
        <div style={{ fontSize: 12, opacity: 0.6 }}>Torah Occurrence → Spatial Runtime Adapter</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f6e9c4", marginTop: 2 }}>{windowSize.toLocaleString()} מופעים אמיתיים</div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>גודל-חלון (בדיקה)</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {[100, 1000, 10000].map((n) => (
            <button key={n} onClick={() => loadWindow(n)} style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid " + (n === windowSize ? "#e8c357" : "#3a3450"), background: n === windowSize ? "#e8c35722" : "transparent", color: "#e8dcb6", cursor: "pointer", fontSize: 12.5 }}>
              {n.toLocaleString()}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>מצב-תצוגה</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <button onClick={() => setMode("glyph")} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid " + (mode === "glyph" ? "#5ecbe0" : "#3a3450"), background: mode === "glyph" ? "#5ecbe022" : "transparent", color: "#e8dcb6", cursor: "pointer", fontSize: 12.5 }}>גליפים (Row/Chunk)</button>
          <button onClick={() => setMode("lod")} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid " + (mode === "lod" ? "#5ecbe0" : "#3a3450"), background: mode === "lod" ? "#5ecbe022" : "transparent", color: "#e8dcb6", cursor: "pointer", fontSize: 12.5 }}>LOD סמנטי</button>
        </div>

        {mode === "lod" && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {Object.values(TORAH_LENSES).map((l) => (
              <button key={l.key} onClick={() => setLens(l.key)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid " + (l.key === lens ? "#ffd27a" : "#3a3450"), background: l.key === lens ? "#ffd27a22" : "transparent", color: "#e8dcb6", cursor: "pointer", fontSize: 12.5 }}>
                {l.label}
              </button>
            ))}
          </div>
        )}

        {mode === "glyph" && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12.5 }}>
            <input type="checkbox" checked={highlightOn} onChange={(e) => setHighlightOn(e.target.checked)} />
            הדגשת צופן-ELS אמיתי («{TORAH_ELS_PATH_FIXTURE.term}», דילוג {TORAH_ELS_PATH_FIXTURE.skip})
          </label>
        )}

        <div style={{ marginTop: 12, padding: "8px 10px", background: "#151020", borderRadius: 8, fontSize: 12 }}>
          buildMs={buildMs} · compileMs={compileMs} · syncedRows={syncedRows}/{chunks.length}
          <br />drawCalls={stats.drawCalls} · triangles={stats.triangles ?? "—"} · geoms={stats.geometries}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>נבחר (Picking)</div>
        {picked ? (
          <div style={{ marginTop: 4, padding: "8px 10px", background: "#141020", borderRadius: 8, fontSize: 12.5, lineHeight: 1.7 }}>
            <div>corpusIndex: <b>{picked.corpusIndex}</b> · אות-בסיס: <b>{picked.baseLetterFamily}</b></div>
            <div>גרפמה-מקור: <b>{picked.exactGrapheme ?? "…"}</b> {picked.isFinalForm ? "(סופית)" : ""}</div>
            {picked.locator && <div>מיקום: {picked.locator.ref} (היסט {picked.locator.offsetInVerse})</div>}
            <div>ניקוד: {picked.niqqud || "(אין)"} · תיעמים: {picked.teamimAvailable ? "זמין" : "נשמר, לא-זמין בגופן הנוכחי"}</div>
            {picked.pathMembership && <div style={{ color: "#ffd27a" }}>⚡ חבר בצופן {picked.pathMembership.pathId} — שלב {picked.pathMembership.step}</div>}
            <div style={{ opacity: 0.6, marginTop: 3 }}>עלות-בחירה: {pickCostMs}ms</div>
          </div>
        ) : <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>לחץ על אות בתצוגת-הגליפים</div>}
      </div>
    </div>
  );
}
