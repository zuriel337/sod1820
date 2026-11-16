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
import { CanvasTexture, Color, ExtrudeGeometry, Object3D, SRGBColorSpace, Shape } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { buildGlyphAssetRef, resolveGlyphAssetRef } from "../../lib/spatial/hebrewGlyphAssets.js";
import { prefersReducedMotion } from "../../lib/spatial/gpuCapability.js";
import { layoutPhraseLetters } from "../../lib/spatial/convergenceLayout3D.js";
import { STRUCTURE_3D, connectorPoints, focusPose, overviewPose, partCenter, partsPresent, ringPetals, trianglePositions } from "../../lib/spatial/structureLayout3D.js";
import { ROYAL_LAB_DIRECTIONS } from "../../lib/spatial/royalLabDirections.js";
import { Controls, FALLBACK_COLORS, RoyalEnvironment, buildGlyphGeometry, noRaycast, resolveTokenColors, useBadgeTexture, useRoyalMaterials, useTextTexture } from "./MistaterScene3D2029.jsx";
import { Apex, PathConnector } from "./ConvergenceScene3D2029.jsx";

const GLYPH_DEPTH = 6;
const key = (char, size) => `${char}|${size.width.toFixed(1)}x${size.height.toFixed(1)}`;
const off = (path) => path.status !== "verified";

// ---- glyph geometries shared by every instance of the same letter at the same size; disposed once, on unmount ----
// status: "loading" until every requested letter settled; "ready" when all resolved; "failed" when any asset is missing/failed (the readable text
// fallback below is then used for that word — a letter that cannot be drawn as 3D never becomes an invisible face).
function useGlyphMap(requests) {
  const signature = requests.map((r) => key(r.char, r.size)).sort().join("~");
  const [state, setState] = useState(() => ({ map: new Map(), status: "loading" }));
  useEffect(() => {
    let live = true;
    const made = [];
    const unique = new Map(requests.map((r) => [key(r.char, r.size), r]));
    setState((prev) => (prev.status === "loading" ? prev : { map: prev.map, status: "loading" }));
    Promise.all([...unique].map(async ([k, r]) => {
      try {
        const glyph = resolveGlyphAssetRef(buildGlyphAssetRef(r.char));
        if (!glyph) return null;
        const geometry = await buildGlyphGeometry(glyph, { ...r.size, depth: GLYPH_DEPTH });
        if (geometry) made.push(geometry);
        return geometry ? [k, geometry] : null;
      } catch { return null; }
    })).then((entries) => {
      if (!live) { made.forEach((g) => g.dispose()); return; }
      const ok = entries.filter(Boolean);
      setState({ map: new Map(ok), status: ok.length === unique.size ? "ready" : "failed" });
    });
    return () => { live = false; made.forEach((g) => g.dispose()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return state;
}

// one shared bevelled box per size (a part with n petals owns ONE geometry, not n); disposed with the part
function useRounded(width, height, depth, radius) {
  const geometry = useMemo(() => new RoundedBoxGeometry(width, height, depth, 4, radius), [width, height, depth, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

// Readable fallback for a word whose 3D letters did not load: the same word as a flat text plane (canvas text), sized to the same box.
function useWordTexture(word, color) {
  const texture = useMemo(() => {
    const width = 512, height = 192, canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    const family = '"Noto Sans Hebrew", Rubik, Arial, sans-serif';
    let size = 150;
    ctx.font = `800 ${size}px ${family}`;
    const measured = ctx.measureText(word).width;
    if (measured > width * 0.92) size = Math.floor(size * (width * 0.92) / measured);
    ctx.font = `800 ${size}px ${family}`;
    ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(word, width / 2, height / 2 + 6);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [word, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function TextWord({ word, width, height, color, z, y, opacity = 1 }) {
  const texture = useWordTexture(word, color);
  return <mesh position={[0, y, z + GLYPH_DEPTH / 2 + 0.3]} data-glyph-fallback="true" raycast={noRaycast}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
  </mesh>;
}

// letters of one word on a face, reading right-to-left; `size` is per letter. Falls back to a text plane when a letter's 3D glyph is unavailable.
function GlyphWord({ word, width, height, glyphs, material, z = 0, y = 0, textColor, dim = false }) {
  const { letters, size } = useMemo(() => layoutPhraseLetters(word, { maxAdvance: width, maxHeight: height }), [word, width, height]);
  const missing = glyphs.status !== "loading" && letters.some((letter) => !glyphs.map.get(key(letter.char, size)));
  if (missing) return <TextWord word={word} width={width} height={Math.min(height, width / Math.max(2, letters.length * 0.62))} color={textColor} z={z - GLYPH_DEPTH / 2} y={y} opacity={dim ? 0.55 : 1} />;
  return <group position={[0, y, z]}>
    {letters.map((letter, i) => {
      const geometry = glyphs.map.get(key(letter.char, size));
      return geometry ? <mesh key={`${i}:${letter.char}`} geometry={geometry} material={material} position={[letter.x, 0, GLYPH_DEPTH / 2]} dispose={null} raycast={noRaycast} /> : null;
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

// Gold hardware (Royal V2): thin gold bars along the cube's 12 edges and a gold bezel behind every petal. Both are ONE instanced draw each and are
// pure ornament of the SAME shapes the model declares (6 faces; `panels` petals) — they add no part, count or meaning.
function useInstances(count, fill, deps) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    for (let i = 0; i < count; i++) { dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); fill(dummy, i); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function CubeEdges({ size, material, cast }) {
  const bar = 4, h = size / 2;
  const ref = useInstances(12, (dummy, i) => {
    const axis = Math.floor(i / 4), a = i % 4, sa = a & 1 ? 1 : -1, sb = a & 2 ? 1 : -1;
    if (axis === 0) { dummy.position.set(0, sa * h, sb * h); dummy.scale.set(size + bar, bar, bar); }
    else if (axis === 1) { dummy.position.set(sa * h, 0, sb * h); dummy.scale.set(bar, size + bar, bar); }
    else { dummy.position.set(sa * h, sb * h, 0); dummy.scale.set(bar, bar, size + bar); }
  }, [size]);
  return <instancedMesh ref={ref} args={[undefined, undefined, 12]} material={material} castShadow={cast} raycast={noRaycast}><boxGeometry args={[1, 1, 1]} /></instancedMesh>;
}

function PetalBezels({ petals, size, depth, material, cast }) {
  const geometry = useRounded(size * 1.1, size * 1.1, depth, 2.6);
  const ref = useInstances(petals.length, (dummy, i) => {
    const p = petals[i], back = -(depth / 2) - 1.2;
    dummy.position.set(p.x + Math.sin(p.rotY) * back, 0, p.z + Math.cos(p.rotY) * back);
    dummy.rotation.y = p.rotY;
  }, [petals, depth]);
  return <instancedMesh ref={ref} args={[geometry, undefined, petals.length]} material={material} castShadow={cast} raycast={noRaycast} />;
}

function useTriangleGeometry({ size, depth, bevel }) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2, x = Math.sin(t) * size, y = -Math.cos(t) * size; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); }
    shape.closePath();
    const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 1 });
    g.translate(0, 0, -depth / 2);
    g.rotateX(-Math.PI / 2); // lie flat in the xz-plane, one vertex toward +z (as the original 3-sided prism)
    return g;
  }, [size, depth, bevel]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function CubePart({ spec, glyphs, mats, colors, state, path, rig }) {
  const d = STRUCTURE_3D, s = d.cube.size, h = s / 2;
  const geometry = useRounded(s, s, s, rig.royal ? 5 : 7);
  const faces = [[0, 0, h, 0, 0, 0], [0, 0, -h, 0, Math.PI, 0], [h, 0, 0, 0, Math.PI / 2, 0], [-h, 0, 0, 0, -Math.PI / 2, 0], [0, h, 0, -Math.PI / 2, 0, 0], [0, -h, 0, Math.PI / 2, 0, 0]];
  return <group>
    <mesh geometry={geometry} material={mats.body[state.key]} castShadow={rig.shadows} />
    {rig.bezel ? <CubeEdges size={s} material={mats.trim[state.key === "off" ? "off" : "base"]} cast={rig.shadows} /> : null}
    {faces.map(([x, y, z, rx, ry, rz], i) => <group key={i} position={[x, y, z]} rotation={[rx, ry, rz]}>
      <GlyphWord word={spec.cube.word} width={s * 0.8} height={s * 0.5} glyphs={glyphs} material={mats.trim[state.key]} textColor={colors.gold} dim={state.dim} z={rig.bezel ? 1.5 : 0} />
    </group>)}
    <mesh position={[0, -h - 5, 0]} material={mats.plinth} receiveShadow={rig.shadows}><cylinderGeometry args={[s * 0.92, s * 1.02, 8, 56]} /></mesh>
    <mesh position={[0, -h - 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.trim.base}><torusGeometry args={[s * 0.92, 1.3, 8, 72]} /></mesh>
    <PartTag position={[0, h + 36, 0]} text={`× ${path.quantity}`} colors={colors} state={state} />
  </group>;
}

function RingPart({ ring, kind, glyphs, mats, colors, state, path, rig }) {
  const d = STRUCTURE_3D, radius = kind === "outer" ? d.outerR : d.innerR, size = kind === "outer" ? d.petal.outer : d.petal.inner;
  const petals = useMemo(() => ringPetals(ring.panels, radius), [ring.panels, radius]);
  const geometry = useRounded(size, size, d.petal.depth, rig.royal ? 3 : 2.4);
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={mats.trim[state.key]}><ringGeometry args={[radius - 1.6, radius + 1.6, ring.panels]} /></mesh>
    {rig.bezel ? <PetalBezels petals={petals} size={size} depth={d.petal.depth} material={mats.trim[state.key === "off" ? "off" : "base"]} cast={rig.shadows} /> : null}
    {petals.map((p, i) => <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.rotY, 0]}>
      <mesh geometry={geometry} material={mats.body[state.key]} castShadow={rig.shadows} receiveShadow={rig.shadows} />
      <GlyphWord word={ring.assignment} width={size * 0.84} height={size * 0.5} glyphs={glyphs} material={mats.trim[state.key]} textColor={colors.gold} dim={state.dim} z={d.petal.depth / 2 - GLYPH_DEPTH / 2 + 0.2} />
    </group>)}
    <PartTag position={[radius + size * 0.62, 28, 0]} text={`× ${path.quantity}`} colors={colors} state={state} />
  </group>;
}

function TrianglePart({ tri, mats, colors, state, path, rig }) {
  const d = STRUCTURE_3D;
  const items = useMemo(() => trianglePositions(tri.count, d.tri.r), [tri.count, d.tri.r]);
  const geometry = useTriangleGeometry({ size: d.tri.size, depth: d.tri.depth, bevel: rig.royal ? 1.6 : 0 });
  const label = useBadgeTexture(tri.assignment, { color: state.dim ? colors.line : colors.hero, border: state.dim ? colors.line : colors.gold,
    fill: new Color(colors.sapphire).multiplyScalar(state.on ? 0.34 : 0.16).getStyle(), width: 192, size: 54 });
  return <group>
    {items.map((p, i) => <mesh key={i} position={[p.x, 0, p.z]} rotation={[0, p.rotY, 0]} material={mats.trim[state.key]} geometry={geometry} castShadow={rig.shadows} receiveShadow={rig.shadows} />)}
    <sprite position={[0, 34, 0]} scale={[52, 19.5, 1]}><spriteMaterial map={label} transparent depthWrite={false} /></sprite>
    <PartTag position={[-(d.tri.r + 62), 14, 0]} text={`× ${path.quantity}`} colors={colors} state={state} />
  </group>;
}

function RelationPart({ path, glyphs, mats, colors, state, rig }) {
  const d = STRUCTURE_3D;
  const geometry = useRounded(d.relation.w, d.relation.h, 5, 5);
  return <group>
    <mesh geometry={geometry} material={mats.body[state.key]} castShadow={rig.shadows} />
    {rig.bezel ? <mesh position={[0, 0, -1.4]} material={mats.trim[state.key === "off" ? "off" : "base"]}><boxGeometry args={[d.relation.w + 5, d.relation.h + 5, 3.4]} /></mesh> : null}
    {path.phrase ? <GlyphWord word={path.phrase} width={d.relation.w * 0.86} height={d.relation.h * 0.46} glyphs={glyphs} material={mats.trim[state.key]} textColor={colors.gold} dim={state.dim} z={-GLYPH_DEPTH / 2 + 3} y={6} /> : null}
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
function LabRig({ view, part, explode, resetToken, spin, active, reduced, controlsRef, pose: poseOpts }) {
  const { camera, size, invalidate } = useThree();
  const tween = useRef(null);
  const aspect = Math.round((size.width / Math.max(1, size.height)) * 20) / 20;
  const poseKey = `${view}:${part}:${explode}:${aspect}:${resetToken}:${poseOpts?.elevation}:${poseOpts?.padding}`;
  const first = useRef(true);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const to = view === "focus" ? focusPose(part, aspect, explode) : overviewPose(aspect, explode, poseOpts);
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
  // gentle drift (spin): runs only while the scene is visible, never with reduced motion, and pauses for 8 s after the person touches the scene
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return undefined;
    const enabled = Boolean(spin && active && !reduced);
    controls.autoRotate = enabled;
    controls.autoRotateSpeed = 0.5;
    invalidate();
    if (!enabled) return undefined;
    let timer = null;
    const pause = () => { controls.autoRotate = false; clearTimeout(timer); timer = setTimeout(() => { controls.autoRotate = true; invalidate(); }, 8000); };
    controls.addEventListener("start", pause);
    return () => { controls.removeEventListener("start", pause); clearTimeout(timer); controls.autoRotate = false; };
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
  layers = {}, resetToken = 0, reducedMotion = false, onFallback, look = ROYAL_LAB_DIRECTIONS.v1.look, quality = "rich",
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
  const royal = look.style === "royal";
  const rig = useMemo(() => ({ royal, bezel: Boolean(look.bezel), shadows: Boolean(look.shadows) && quality === "rich" }), [royal, look.bezel, look.shadows, quality]);
  const mats = useRoyalMaterials(colors, royal ? "royal" : "v1", quality);
  const [hover, setHover] = useState(null);
  const keyLight = useMemo(() => new Color(colors.hero).lerp(new Color(colors.gold), royal && look.rig !== "lab" ? 0.4 : 0), [colors.hero, colors.gold, royal, look.rig]);
  const pose = useMemo(() => ({ elevation: look.elevation, padding: look.padding }), [look.elevation, look.padding]);
  const selected = paths[focusIndex]?.part || null;
  const explodeValue = explode ? 1 : 0;
  const registerGroup = (part) => (node) => { if (node) groups.current.set(part, node); else groups.current.delete(part); };
  const settled = phase.settled;
  const stateOf = (part) => {
    const entry = byPart.get(part);
    const on = selected === part;
    const dim = !entry || off(entry.path);
    return { on, dim, key: dim ? (on ? "offOn" : "off") : on ? "on" : royal && hover === part ? "hover" : "base" };
  };
  const select = (part) => (event) => { event.stopPropagation(); const entry = byPart.get(part); if (entry) onSelect?.(entry.index); };
  const pointer = (part) => ({
    onPointerOver: (event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; if (royal) setHover(part); },
    onPointerOut: () => { document.body.style.cursor = ""; if (royal) setHover((now) => (now === part ? null : now)); },
  });
  const hidden = (part) => layers[part] === false;
  return <div ref={hostRef} className="sod29-spatial-method-stage__s4" dir="ltr" role="img" data-renderer="r3f" data-scene="structure"
    aria-label={`מבנה תלת־ממדי של ${value}: ${present.map((p) => ({ cube: "קובייה", outer: "מחומש חיצוני", inner: "מחומש פנימי", triangles: "משולשים", relation: "שכבת קשר" }[p])).join(", ")}`}
    data-reduced-motion={String(motionReduced)} data-view={view} data-explode={String(explode)} data-spin={String(spin)} data-selected-part={selected || ""}
    data-parts={present.join(",")} data-verified-paths={verifiedCount} data-total-paths={total}
    data-look={look.style} data-rig={look.rig} data-quality={quality} data-shadows={String(rig.shadows)} data-glyph-status={glyphs.status} data-hover-part={hover || ""}>
    <Canvas
      frameloop="demand"
      dpr={quality === "rich" ? [1, 2] : [1, 1.5]}
      shadows={rig.shadows ? "percentage" : false}
      camera={{ fov: STRUCTURE_3D.fovDeg, near: 1, far: 9000, position: [0, 200, 1000] }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); if (!closing.current) onFallback?.("context_lost"); });
      }}
    >
      <RoyalEnvironment tint={royal && look.rig !== "lab" ? colors.gold : null} intensity={royal ? 0.7 : 0.85} />
      <GpuStats hostRef={hostRef} />
      {royal ? <>
        <ambientLight intensity={0.16} />
        <directionalLight position={[200, 380, 280]} intensity={1.7} color={keyLight} castShadow={rig.shadows}
          shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0006} shadow-camera-left={-460} shadow-camera-right={460} shadow-camera-top={460} shadow-camera-bottom={-460} shadow-camera-near={50} shadow-camera-far={1400} />
        <directionalLight position={[-320, 160, -280]} intensity={look.rig === "lab" ? 1.8 : 1.3} color={colors.sapphire} />
        {quality === "rich" ? <pointLight position={[0, 360, 140]} intensity={look.rig === "museum" ? 52000 : 36000} distance={950} color={colors.gold} /> : <ambientLight intensity={0.2} color={colors.gold} />}
      </> : <>
        <ambientLight intensity={0.35} />
        <directionalLight position={[160, 320, 360]} intensity={2.2} color={colors.hero} />
        <directionalLight position={[-300, 140, -260]} intensity={1.6} color={colors.sapphire} />
        <pointLight position={[0, 330, 120]} intensity={60000} distance={900} color={colors.gold} />
      </>}
      {present.map((part) => {
        const entry = byPart.get(part);
        const c = partCenter(part, explodeValue);
        const st = stateOf(part);
        return <group key={part} ref={registerGroup(part)} position={[c.x, c.y, c.z]} visible={!hidden(part)} name={`part:${part}`} onClick={select(part)} {...pointer(part)}>
          {part === "cube" ? <CubePart spec={spec} glyphs={glyphs} mats={mats} colors={colors} state={st} path={entry.path} rig={rig} /> : null}
          {part === "outer" ? <RingPart ring={spec.outer} kind="outer" glyphs={glyphs} mats={mats} colors={colors} state={st} path={entry.path} rig={rig} /> : null}
          {part === "inner" ? <RingPart ring={spec.inner} kind="inner" glyphs={glyphs} mats={mats} colors={colors} state={st} path={entry.path} rig={rig} /> : null}
          {part === "triangles" ? <TrianglePart tri={spec.triangles} mats={mats} colors={colors} state={st} path={entry.path} rig={rig} /> : null}
          {part === "relation" ? <RelationPart path={entry.path} glyphs={glyphs} mats={mats} colors={colors} state={st} rig={rig} /> : null}
        </group>;
      })}
      {!phase.moving ? present.filter((part) => !hidden(part)).map((part) => {
        const entry = byPart.get(part);
        return <PathConnector key={`route:${part}`} connector={{ id: `route:${part}`, points: connectorPoints(part, settled) }} path={entry.path} colors={colors} focused={selected === part} />;
      }) : null}
      <Apex apex={STRUCTURE_3D.apex} value={value} verifiedCount={verifiedCount} total={total} colors={colors} labelSide="above" />
      <ExplodeDriver target={explodeValue} reduced={motionReduced} groups={groups} onPhase={(moving, value2) => setPhase({ moving, settled: moving ? settled : value2 })} />
      <Controls target={{ x: 0, y: 0, z: 0 }} reducedMotion={motionReduced} controlsRef={controlsRef} />
      <LabRig view={view} part={selected && present.includes(selected) ? selected : present[0]} explode={explodeValue} resetToken={resetToken} spin={spin} active={active} reduced={motionReduced} controlsRef={controlsRef} pose={pose} />
    </Canvas>
    <ul className="sod29-spatial-method-stage__sr-only" aria-label="מסלולי ההתכנסות והחלק במבנה שנושא כל אחד">
      {paths.map((path) => <li key={path.id}>{path.phrase || "ללא ביטוי"} {path.operand} × {path.quantity} = {path.result} · {path.partLabel} — {path.label}</li>)}
    </ul>
  </div>;
}
