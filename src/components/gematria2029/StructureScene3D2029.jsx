// src/components/gematria2029/StructureScene3D2029.jsx
// S4 — the STRUCTURE view of a compound pentagon model (the 3060 lab). A GPU projection of the SAME already-evaluated and already-bound
// paths that the S2 stage draws (Spatial v3 appendix §14.5: 3D is a derived display state). It adds NO semantics:
//  - every displayed value (phrase, operand, quantity, result, status) arrives as props from evaluateConvergencePaths / bindPathsToStructure;
//  - shapes come from the model's own spec: a ring has exactly `panels` petals, the triangle cluster exactly `count` triangles, the cube
//    exactly 6 faces; a path without approved geometry is a flat RELATION panel, never a shape;
//  - placement and camera poses are the pure lib/spatial/structureLayout3D.js; letters are the same path-only Hebrew glyph SVGs as M3;
//  - every color comes from the stage's design tokens (resolveTokenColors); there is no color literal in this file.
// ROUTE-SCOPED: reachable only through the lazy import in SpatialConvergenceStage2029.jsx after the explicit "תלת־ממד" action.
// Shared S4 toolkit (token colors, text texture, glyph geometry, controls) comes from MistaterScene3D2029; route/apex parts from ConvergenceScene3D2029.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Color } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { buildGlyphAssetRef, resolveGlyphAssetRef } from "../../lib/spatial/hebrewGlyphAssets.js";
import { prefersReducedMotion } from "../../lib/spatial/gpuCapability.js";
import { layoutPhraseLetters } from "../../lib/spatial/convergenceLayout3D.js";
import { STRUCTURE_3D, connectorPoints, focusPose, overviewPose, partCenter, partsPresent, ringPetals, trianglePositions } from "../../lib/spatial/structureLayout3D.js";
import { Controls, FALLBACK_COLORS, RoyalEnvironment, buildGlyphGeometry, resolveTokenColors, useBadgeTexture, useRoyalMaterials, useTextTexture } from "./MistaterScene3D2029.jsx";
import { Apex, PathConnector } from "./ConvergenceScene3D2029.jsx";

const GLYPH_DEPTH = 6;
const key = (char, size) => `${char}|${size.width.toFixed(1)}x${size.height.toFixed(1)}`;
const off = (path) => path.status !== "verified";

// ---- glyph geometries shared by every instance of the same letter at the same size; disposed once, on unmount ----
function useGlyphMap(requests) {
  const signature = requests.map((r) => key(r.char, r.size)).sort().join("~");
  const [map, setMap] = useState(() => new Map());
  useEffect(() => {
    let live = true;
    const made = [];
    const unique = new Map(requests.map((r) => [key(r.char, r.size), r]));
    Promise.all([...unique].map(async ([k, r]) => {
      const glyph = resolveGlyphAssetRef(buildGlyphAssetRef(r.char));
      if (!glyph) return null;
      const geometry = await buildGlyphGeometry(glyph, { ...r.size, depth: GLYPH_DEPTH });
      if (geometry) made.push(geometry);
      return geometry ? [k, geometry] : null;
    })).then((entries) => { if (live) setMap(new Map(entries.filter(Boolean))); else made.forEach((g) => g.dispose()); }).catch(() => {});
    return () => { live = false; made.forEach((g) => g.dispose()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return map;
}

// one shared bevelled box per size (a part with n petals owns ONE geometry, not n); disposed with the part
function useRounded(width, height, depth, radius) {
  const geometry = useMemo(() => new RoundedBoxGeometry(width, height, depth, 4, radius), [width, height, depth, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

// letters of one word on a face, reading right-to-left; `size` is per letter
function GlyphWord({ word, width, height, glyphs, material, z = 0, y = 0 }) {
  const { letters, size } = useMemo(() => layoutPhraseLetters(word, { maxAdvance: width, maxHeight: height }), [word, width, height]);
  return <group position={[0, y, z]}>
    {letters.map((letter, i) => {
      const geometry = glyphs.get(key(letter.char, size));
      return geometry ? <mesh key={`${i}:${letter.char}`} geometry={geometry} material={material} position={[letter.x, 0, GLYPH_DEPTH / 2]} dispose={null} /> : null;
    })}
  </group>;
}

function PartTag({ position, text, colors, state }) {
  const texture = useBadgeTexture(text, { color: state.dim ? colors.line : colors.hero, border: state.dim ? colors.line : colors.gold,
    fill: new Color(colors.sapphire).multiplyScalar(state.on ? 0.34 : 0.16).getStyle() });
  return <sprite position={position} scale={[60, 22.5, 1]}><spriteMaterial map={texture} transparent depthWrite={false} /></sprite>;
}

// ---- parts (local coordinates around the part centre; the wrapper group carries the explode position) ----
function wordRequests(spec, relationPath) {
  const d = STRUCTURE_3D, out = [];
  const add = (word, width, height) => { const { letters, size } = layoutPhraseLetters(word, { maxAdvance: width, maxHeight: height }); letters.forEach((l) => out.push({ char: l.char, size })); };
  if (spec.cube) add(spec.cube.word, d.cube.size * 0.8, d.cube.size * 0.5);
  if (spec.outer) add(spec.outer.assignment, d.petal.outer * 0.84, d.petal.outer * 0.5);
  if (spec.inner) add(spec.inner.assignment, d.petal.inner * 0.84, d.petal.inner * 0.5);
  if (relationPath?.phrase) add(relationPath.phrase, d.relation.w * 0.86, d.relation.h * 0.46);
  return out;
}

function CubePart({ spec, glyphs, mats, colors, state, path }) {
  const d = STRUCTURE_3D, s = d.cube.size, h = s / 2;
  const geometry = useRounded(s, s, s, 7);
  const faces = [[0, 0, h, 0, 0, 0], [0, 0, -h, 0, Math.PI, 0], [h, 0, 0, 0, Math.PI / 2, 0], [-h, 0, 0, 0, -Math.PI / 2, 0], [0, h, 0, -Math.PI / 2, 0, 0], [0, -h, 0, Math.PI / 2, 0, 0]];
  return <group>
    <mesh geometry={geometry} material={mats.body[state.key]} />
    {faces.map(([x, y, z, rx, ry, rz], i) => <group key={i} position={[x, y, z]} rotation={[rx, ry, rz]}>
      <GlyphWord word={spec.cube.word} width={s * 0.8} height={s * 0.5} glyphs={glyphs} material={mats.trim[state.key]} />
    </group>)}
    <mesh position={[0, -h - 5, 0]} material={mats.plinth}><cylinderGeometry args={[s * 0.92, s * 1.02, 8, 56]} /></mesh>
    <mesh position={[0, -h - 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.trim.base}><torusGeometry args={[s * 0.92, 1.3, 8, 72]} /></mesh>
    <PartTag position={[0, h + 36, 0]} text={`× ${path.quantity}`} colors={colors} state={state} />
  </group>;
}

function RingPart({ ring, kind, glyphs, mats, colors, state, path }) {
  const d = STRUCTURE_3D, radius = kind === "outer" ? d.outerR : d.innerR, size = kind === "outer" ? d.petal.outer : d.petal.inner;
  const petals = useMemo(() => ringPetals(ring.panels, radius), [ring.panels, radius]);
  const geometry = useRounded(size, size, d.petal.depth, 2.4);
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={mats.trim[state.key]}><ringGeometry args={[radius - 1.6, radius + 1.6, ring.panels]} /></mesh>
    {petals.map((p, i) => <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.rotY, 0]}>
      <mesh geometry={geometry} material={mats.body[state.key]} />
      <GlyphWord word={ring.assignment} width={size * 0.84} height={size * 0.5} glyphs={glyphs} material={mats.trim[state.key]} z={d.petal.depth / 2 - GLYPH_DEPTH / 2 + 0.2} />
    </group>)}
    <PartTag position={[radius + size * 0.62, 28, 0]} text={`× ${path.quantity}`} colors={colors} state={state} />
  </group>;
}

function TrianglePart({ tri, mats, colors, state, path }) {
  const d = STRUCTURE_3D;
  const items = useMemo(() => trianglePositions(tri.count, d.tri.r), [tri.count, d.tri.r]);
  const label = useBadgeTexture(tri.assignment, { color: state.dim ? colors.line : colors.hero, border: state.dim ? colors.line : colors.gold,
    fill: new Color(colors.sapphire).multiplyScalar(state.on ? 0.34 : 0.16).getStyle(), width: 192, size: 54 });
  return <group>
    {items.map((p, i) => <mesh key={i} position={[p.x, 0, p.z]} rotation={[0, p.rotY, 0]} material={mats.trim[state.key]}>
      <cylinderGeometry args={[d.tri.size, d.tri.size, d.tri.depth, 3]} />
    </mesh>)}
    <sprite position={[0, 34, 0]} scale={[52, 19.5, 1]}><spriteMaterial map={label} transparent depthWrite={false} /></sprite>
    <PartTag position={[-(d.tri.r + 62), 14, 0]} text={`× ${path.quantity}`} colors={colors} state={state} />
  </group>;
}

function RelationPart({ path, glyphs, mats, colors, state }) {
  const d = STRUCTURE_3D;
  const geometry = useRounded(d.relation.w, d.relation.h, 5, 5);
  return <group>
    <mesh geometry={geometry} material={mats.body[state.key]} />
    {path.phrase ? <GlyphWord word={path.phrase} width={d.relation.w * 0.86} height={d.relation.h * 0.46} glyphs={glyphs} material={mats.trim[state.key]} z={-GLYPH_DEPTH / 2 + 3} y={8} /> : null}
    <PartTag position={[0, -d.relation.h / 2 - 18, 0]} text={`× ${path.quantity}`} colors={colors} state={state} />
  </group>;
}

// ---- explode: layers glide to / from their exploded positions. Demand rendering: frames are requested only while a layer is moving ----
function ExplodeDriver({ target, reduced, groups, onPhase }) {
  const { invalidate } = useThree();
  const current = useRef(target);
  const moving = useRef(false);
  useLayoutEffect(() => {
    if (reduced) { current.current = target; place(); moving.current = false; onPhase(false, target); invalidate(); return; }
    if (current.current !== target) { moving.current = true; onPhase(true, target); invalidate(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduced]);
  function place() {
    for (const [part, group] of groups.current) { const p = partCenter(part, current.current); group.position.set(p.x, p.y, p.z); }
  }
  useFrame((state, delta) => {
    if (!moving.current) return;
    const diff = target - current.current;
    if (Math.abs(diff) < 0.003) { current.current = target; moving.current = false; place(); onPhase(false, target); state.invalidate(); return; }
    current.current += diff * Math.min(1, delta * 7);
    place(); state.invalidate();
  });
  return null;
}

// ---- camera: tweens between overview / focus poses on the shared OrbitControls; gentle optional spin; nothing runs at rest ----
function LabRig({ view, part, explode, resetToken, spin, active, reduced, controlsRef }) {
  const { camera, size, invalidate } = useThree();
  const tween = useRef(null);
  const aspect = Math.round((size.width / Math.max(1, size.height)) * 20) / 20;
  const poseKey = `${view}:${part}:${explode}:${aspect}:${resetToken}`;
  const first = useRef(true);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const to = view === "focus" ? focusPose(part, aspect, explode) : overviewPose(aspect, explode);
    if (first.current || reduced) {
      first.current = false;
      camera.position.set(to.position.x, to.position.y, to.position.z);
      controls.target.set(to.target.x, to.target.y, to.target.z);
      controls.update(); tween.current = null; invalidate();
      return;
    }
    tween.current = { t: 0, dur: 0.75, from: { p: camera.position.clone(), t: controls.target.clone() }, to };
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poseKey, reduced]);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.autoRotate = Boolean(spin && active && !reduced);
    controls.autoRotateSpeed = 0.6;
    invalidate();
  }, [spin, active, reduced, controlsRef, invalidate]);
  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const tw = tween.current;
    if (tw) {
      tw.t = Math.min(1, tw.t + delta / tw.dur);
      const e = tw.t < 0.5 ? 2 * tw.t * tw.t : 1 - Math.pow(-2 * tw.t + 2, 2) / 2;
      camera.position.set(tw.from.p.x + (tw.to.position.x - tw.from.p.x) * e, tw.from.p.y + (tw.to.position.y - tw.from.p.y) * e, tw.from.p.z + (tw.to.position.z - tw.from.p.z) * e);
      controls.target.set(tw.from.t.x + (tw.to.target.x - tw.from.t.x) * e, tw.from.t.y + (tw.to.target.y - tw.from.t.y) * e, tw.from.t.z + (tw.to.target.z - tw.from.t.z) * e);
      controls.update(); state.invalidate();
      if (tw.t >= 1) tween.current = null;
    } else if (controls.autoRotate) { controls.update(); state.invalidate(); }
  });
  return null;
}

// Test/ops probe only: mirrors the renderer's own counters of the LAST drawn frame onto data-* attributes (no state, no re-render).
// Read in onAfterRender, because the renderer resets its per-frame counters at the start of every render.
function GpuStats({ hostRef }) {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    scene.onAfterRender = (renderer) => {
      const host = hostRef.current;
      if (!host) return;
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.gpuGeometries = String(renderer.info.memory.geometries);
      host.dataset.gpuTextures = String(renderer.info.memory.textures);
    };
    return () => { scene.onAfterRender = () => {}; };
  }, [scene, hostRef]);
  return null;
}

function useInView(ref) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof IntersectionObserver !== "function" || !ref.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)));
    observer.observe(ref.current);
    const onHide = () => { if (document.hidden) setVisible(false); else setVisible(true); };
    document.addEventListener("visibilitychange", onHide);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onHide); };
  }, [ref]);
  return visible;
}

export default function StructureScene3D2029({
  spec, paths, value, verifiedCount, total, focusIndex = 0, onSelect, view = "overview", explode = false, spin = false,
  layers = {}, resetToken = 0, reducedMotion = false, onFallback,
}) {
  const hostRef = useRef(null);
  const controlsRef = useRef(null);
  // R3F releases the GPU context when this scene unmounts; that deliberate release must not look like a lost context (false fallback note).
  const closing = useRef(false);
  useEffect(() => { closing.current = false; return () => { closing.current = true; }; }, []);
  const groups = useRef(new Map());
  const [colors, setColors] = useState(FALLBACK_COLORS);
  const [motionReduced, setMotionReduced] = useState(() => reducedMotion || prefersReducedMotion());
  const [phase, setPhase] = useState({ moving: false, settled: explode ? 1 : 0 });
  const active = useInView(hostRef);
  // --sms-* tokens are scoped to the stage subtree: resolve against the mounted host and refresh when the theme changes
  useLayoutEffect(() => {
    const refresh = () => { setColors(resolveTokenColors(hostRef.current)); setMotionReduced(reducedMotion || prefersReducedMotion()); };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true });
    const frame = hostRef.current?.closest(".sod29-root");
    if (frame) observer.observe(frame, { attributes: true });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", refresh);
    return () => { observer.disconnect(); media.removeEventListener("change", refresh); document.body.style.cursor = ""; };
  }, [reducedMotion]);

  const byPart = useMemo(() => new Map(paths.map((p, i) => [p.part, { path: p, index: i }])), [paths]);
  const present = useMemo(() => partsPresent(spec, byPart.has("relation")), [spec, byPart]);
  const requests = useMemo(() => wordRequests(spec, byPart.get("relation")?.path), [spec, byPart]);
  const glyphs = useGlyphMap(requests);
  const mats = useRoyalMaterials(colors);
  const selected = paths[focusIndex]?.part || null;
  const explodeValue = explode ? 1 : 0;
  const registerGroup = (part) => (node) => { if (node) groups.current.set(part, node); else groups.current.delete(part); };
  const settled = phase.settled;
  const stateOf = (part) => {
    const entry = byPart.get(part);
    const on = selected === part;
    const dim = !entry || off(entry.path);
    return { on, dim, key: dim ? (on ? "offOn" : "off") : on ? "on" : "base" };
  };
  const select = (part) => (event) => { event.stopPropagation(); const entry = byPart.get(part); if (entry) onSelect?.(entry.index); };
  const pointer = { onPointerOver: () => { document.body.style.cursor = "pointer"; }, onPointerOut: () => { document.body.style.cursor = ""; } };
  const hidden = (part) => layers[part] === false;
  return <div ref={hostRef} className="sod29-spatial-method-stage__s4" dir="ltr" role="img" data-renderer="r3f" data-scene="structure"
    aria-label={`מבנה תלת־ממדי של ${value}: ${present.map((p) => ({ cube: "קובייה", outer: "מחומש חיצוני", inner: "מחומש פנימי", triangles: "משולשים", relation: "שכבת קשר" }[p])).join(", ")}`}
    data-reduced-motion={String(motionReduced)} data-view={view} data-explode={String(explode)} data-spin={String(spin)} data-selected-part={selected || ""}
    data-parts={present.join(",")} data-verified-paths={verifiedCount} data-total-paths={total}>
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: STRUCTURE_3D.fovDeg, near: 1, far: 9000, position: [0, 200, 1000] }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); if (!closing.current) onFallback?.("context_lost"); });
      }}
    >
      <RoyalEnvironment />
      <GpuStats hostRef={hostRef} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[160, 320, 360]} intensity={2.2} color={colors.hero} />
      <directionalLight position={[-300, 140, -260]} intensity={1.6} color={colors.sapphire} />
      <pointLight position={[0, 330, 120]} intensity={60000} distance={900} color={colors.gold} />
      {present.map((part) => {
        const entry = byPart.get(part);
        const c = partCenter(part, explodeValue);
        const st = stateOf(part);
        return <group key={part} ref={registerGroup(part)} position={[c.x, c.y, c.z]} visible={!hidden(part)} name={`part:${part}`} onClick={select(part)} {...pointer}>
          {part === "cube" ? <CubePart spec={spec} glyphs={glyphs} mats={mats} colors={colors} state={st} path={entry.path} /> : null}
          {part === "outer" ? <RingPart ring={spec.outer} kind="outer" glyphs={glyphs} mats={mats} colors={colors} state={st} path={entry.path} /> : null}
          {part === "inner" ? <RingPart ring={spec.inner} kind="inner" glyphs={glyphs} mats={mats} colors={colors} state={st} path={entry.path} /> : null}
          {part === "triangles" ? <TrianglePart tri={spec.triangles} mats={mats} colors={colors} state={st} path={entry.path} /> : null}
          {part === "relation" ? <RelationPart path={entry.path} glyphs={glyphs} mats={mats} colors={colors} state={st} /> : null}
        </group>;
      })}
      {!phase.moving ? present.filter((part) => !hidden(part)).map((part) => {
        const entry = byPart.get(part);
        return <PathConnector key={`route:${part}`} connector={{ id: `route:${part}`, points: connectorPoints(part, settled) }} path={entry.path} colors={colors} focused={selected === part} />;
      }) : null}
      <Apex apex={STRUCTURE_3D.apex} value={value} verifiedCount={verifiedCount} total={total} colors={colors} labelSide="above" />
      <ExplodeDriver target={explodeValue} reduced={motionReduced} groups={groups} onPhase={(moving, value2) => setPhase({ moving, settled: moving ? settled : value2 })} />
      <Controls target={{ x: 0, y: 0, z: 0 }} reducedMotion={motionReduced} controlsRef={controlsRef} />
      <LabRig view={view} part={selected && present.includes(selected) ? selected : present[0]} explode={explodeValue} resetToken={resetToken} spin={spin} active={active} reduced={motionReduced} controlsRef={controlsRef} />
    </Canvas>
    <ul className="sod29-spatial-method-stage__sr-only" aria-label="מסלולי ההתכנסות והחלק במבנה שנושא כל אחד">
      {paths.map((path) => <li key={path.id}>{path.phrase || "ללא ביטוי"} {path.operand} × {path.quantity} = {path.result} · {path.partLabel} — {path.label}</li>)}
    </ul>
  </div>;
}
