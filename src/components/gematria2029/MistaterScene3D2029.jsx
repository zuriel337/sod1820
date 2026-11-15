// src/components/gematria2029/MistaterScene3D2029.jsx
// S4 — GPU 3D projection of the SAME precompiled scene.v1 that the S2 DOM/SVG stage consumes (work_log ca95608e).
// ROUTE-SCOPED: this module (and three / @react-three/fiber) is reachable ONLY through the dynamic import in
// SpatialMethodStage2029.jsx after an explicit "תלת־ממד" action. It adds NO semantics:
//  - hierarchy → nested <group> local TRS transforms; letters → real box meshes with depth;
//  - connectors → tubes along resolveSceneConnectorCurve() (socket-derived, renderer-neutral control points);
//  - every displayed number is resolved through resolveSceneTraceValue(scene, identityRef) — no arithmetic here;
//  - glyph/value planes are a TRANSITIONAL deterministic canvas texture (projection-only). Canonical identity stays
//    node.identityRef (letter codepoint). M3: when node.asset_ref resolves against the Hebrew glyph manifest the letter is the
//    manifest's path-only SVG vector (same lineage as Blender); otherwise the canvas text below remains the truthful fallback.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CanvasTexture, Color, CubicBezierCurve3, DoubleSide, ExtrudeGeometry, MeshPhysicalMaterial, PMREMGenerator, SRGBColorSpace, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { glyphPlacement, resolveGlyphAssetRef } from "../../lib/spatial/hebrewGlyphAssets.js";
import { prefersReducedMotion } from "../../lib/spatial/gpuCapability.js";
import { resolveSceneConnectorCurve, resolveSceneTraceValue } from "../../lib/spatial/semanticSceneCompiler.js";

// gold / sapphire are the canonical brand roles (--s29-brand-gold / --s29-brand-sapphire via --sms-gold / --sms-sapphire); the literals below are only
// the Design Contract fallback used when a token cannot be resolved (same values as lib/paletteTokens2029.js Night).
export const FALLBACK_COLORS = Object.freeze({ ink: "#e8ecf4", hero: "#f4f1e8", accent: "#d4af37", panel: "#1b2233", line: "#4a5570", gold: "#F9BA3F", sapphire: "#1957D9" });

// Design Contract tokens → colors, resolved through a probe element so var() fallbacks/currentColor resolve to rgb().
export function resolveTokenColors(host) {
  const out = { ...FALLBACK_COLORS };
  if (!host || typeof getComputedStyle !== "function") return out;
  const probe = document.createElement("i");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  host.appendChild(probe);
  try {
    const tokens = { ink: "--sms-ink", hero: "--sms-hero", accent: "--sms-accent", panel: "--sms-panel-soft", line: "--sms-line-strong", gold: "--sms-gold", sapphire: "--sms-sapphire" };
    for (const [key, token] of Object.entries(tokens)) {
      probe.style.color = "";
      probe.style.color = `var(${token})`;
      if (!probe.style.color) continue; // token undefined in this subtree → keep the Design Contract fallback
      const resolved = getComputedStyle(probe).color;
      // a token with alpha (rgba) is used as its opaque color: three ignores alpha on Color and warns, so drop it here
      if (resolved && /^rgb/.test(resolved) && resolved !== "rgba(0, 0, 0, 0)") out[key] = resolved.replace(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)$/, "rgb($1, $2, $3)");
    }
  } finally { host.removeChild(probe); }
  return out;
}

export function useTextTexture(lines, { width = 128, height = 160, fonts = [] } = {}) {
  const key = JSON.stringify(lines);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    lines.forEach((line, i) => {
      ctx.fillStyle = line.color;
      ctx.font = `${line.weight || 600} ${line.size}px ${fonts[i] || "serif"}`;
      ctx.fillText(line.text, width / 2, line.y);
    });
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, width, height]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// ---- ROYAL kit (shared by the lab scenes): sapphire + gold physical materials, image-based lighting, badge and halo textures ----
// Every color is derived from the resolved brand tokens (a darker/brighter shade of the SAME token, never a new literal).
const shade = (css, k) => new Color(css).multiplyScalar(k);

// Room-style environment for PBR reflections (gold is a metal: without an environment it renders as flat yellow). Generated once per canvas,
// disposed with it. three's own addon — no @react-three/drei. `tint` (a brand-token color) warms the environment's light panels, so gold reflects
// warm museum light instead of white room light.
export function RoyalEnvironment({ intensity = 0.85, tint = null }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const room = new RoomEnvironment();
    if (tint) {
      const warm = new Color(tint);
      room.traverse((object) => { const color = object.material?.color; if (color && color.r > 1) color.multiply(warm); });
    }
    const pmrem = new PMREMGenerator(gl);
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    invalidate();
    return () => { scene.environment = null; target.dispose(); pmrem.dispose(); room.dispose?.(); };
  }, [gl, scene, intensity, tint, invalidate]);
  return null;
}

// A darker / richer shade of a brand-token color (same hue family; lightness scaled, saturation nudged). Never a new literal.
const rich = (css, lightness, saturation = 0) => { const c = new Color(css), hsl = {}; c.getHSL(hsl); return c.setHSL(hsl.h, Math.max(0, Math.min(1, hsl.s + saturation)), Math.min(1, hsl.l * lightness)); };

// state: base (verified, not selected) · on (selected) · hover · off (unverified: shown, dimmed, not counted) · offOn (unverified + selected)
// style "v1": the previous sapphire/gold look (kept for rollback). style "royal": deeper sapphire (gem-like: clearcoat, sheen, ior 1.77) and antique gold.
export function useRoyalMaterials(colors, style = "v1") {
  const mats = useMemo(() => {
    const sap = colors.sapphire, gold = colors.gold;
    if (style === "royal") {
      const body = (color, extra = {}) => new MeshPhysicalMaterial({ color, metalness: 0.12, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06, ior: 1.77, sheen: 0.6, sheenRoughness: 0.5,
        sheenColor: rich(sap, 1.1, -0.1), envMapIntensity: 0.85, ...extra });
      const trim = (color, extra = {}) => new MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.32, envMapIntensity: 1.1, side: DoubleSide, emissive: rich(gold, 0.62), emissiveIntensity: 0.13, ...extra });
      const deepSap = rich(sap, 0.42, -0.06), litSap = rich(sap, 0.66, -0.03), antique = rich(gold, 0.74, -0.05);
      return {
        body: { base: body(deepSap), hover: body(rich(sap, 0.54, -0.05), { emissive: new Color(sap), emissiveIntensity: 0.08 }), on: body(litSap, { emissive: new Color(sap), emissiveIntensity: 0.14 }),
          off: body(rich(sap, 0.3, -0.1), { transparent: true, opacity: 0.5 }), offOn: body(rich(sap, 0.5, -0.08), { emissive: new Color(sap), emissiveIntensity: 0.1, transparent: true, opacity: 0.72 }) },
        trim: { base: trim(antique), hover: trim(rich(gold, 0.88, -0.04), { emissiveIntensity: 0.16 }), on: trim(rich(gold, 0.95, 0), { emissiveIntensity: 0.26 }),
          off: trim(rich(gold, 0.42, -0.1), { transparent: true, opacity: 0.55 }), offOn: trim(rich(gold, 0.62, -0.06), { emissiveIntensity: 0.12, transparent: true, opacity: 0.78 }) },
        plinth: new MeshPhysicalMaterial({ color: rich(sap, 0.28, -0.1), metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.5, envMapIntensity: 1.7, transparent: true, opacity: 0.62 }),
      };
    }
    const body = (color, extra = {}) => new MeshPhysicalMaterial({ color, metalness: 0.3, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1, ...extra });
    const trim = (color, extra = {}) => new MeshPhysicalMaterial({ color, metalness: 0.9, roughness: 0.34, envMapIntensity: 1.15, side: DoubleSide, emissive: new Color(gold), emissiveIntensity: 0.24, ...extra });
    const v1 = {
      body: { base: body(shade(sap, 0.55)), on: body(shade(sap, 0.85), { emissive: new Color(sap), emissiveIntensity: 0.2 }), off: body(shade(sap, 0.4), { transparent: true, opacity: 0.5 }),
        offOn: body(shade(sap, 0.7), { emissive: new Color(sap), emissiveIntensity: 0.22, transparent: true, opacity: 0.72 }) },
      trim: { base: trim(new Color(gold)), on: trim(shade(gold, 1.05), { emissiveIntensity: 0.4 }), off: trim(shade(gold, 0.5), { transparent: true, opacity: 0.55 }),
        offOn: trim(shade(gold, 0.75), { emissive: new Color(gold), emissiveIntensity: 0.14, transparent: true, opacity: 0.78 }) },
      plinth: body(shade(sap, 0.1), { metalness: 0.6, roughness: 0.5, clearcoat: 0, envMapIntensity: 0.22 }),
    };
    v1.body.hover = v1.body.base; v1.trim.hover = v1.trim.base; // v1 has no hover state (same material object; disposed once below)
    return v1;
  }, [colors.sapphire, colors.gold, style]);
  useEffect(() => () => {
    const all = new Set([...Object.values(mats.body), ...Object.values(mats.trim), mats.plinth]);
    all.forEach((m) => m.dispose());
  }, [mats]);
  return mats;
}

// A pill-shaped badge (gold hairline on a deep sapphire ground) with centered text; used for "× quantity" tags.
export function useBadgeTexture(text, { color, border, fill, width = 256, height = 96, size = 50 }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    const r = height / 2 - 4;
    ctx.beginPath();
    ctx.moveTo(4 + r, 4); ctx.lineTo(width - 4 - r, 4); ctx.arc(width - 4 - r, height / 2, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(4 + r, height - 4); ctx.arc(4 + r, height / 2, r, Math.PI / 2, -Math.PI / 2); ctx.closePath();
    ctx.fillStyle = fill; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 3; ctx.strokeStyle = border; ctx.stroke();
    ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 ${size}px serif`;
    ctx.fillText(text, width / 2, height / 2 + 3);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [text, color, border, fill, width, height, size]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// Soft radial glow (alpha falloff built from stacked translucent discs, so no rgba literal is needed); additive sprite material.
export function useHaloTexture(color, size = 128) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = color;
    const steps = 36;
    for (let i = steps; i > 0; i--) { ctx.globalAlpha = 0.045 * (1 - i / (steps + 1)) + 0.004; ctx.beginPath(); ctx.arc(size / 2, size / 2, (size / 2) * (i / steps), 0, Math.PI * 2); ctx.fill(); }
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [color, size]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// Lazy raw SVG assets (path-only, canonical lineage). A missing/failed/mismatched asset resolves to null => fallback.
const GLYPH_SVG_LOADERS = import.meta.glob("../../lib/spatial/hebrewGlyph/v1/*.svg", { query: "?raw", import: "default" });

export async function buildGlyphGeometry(glyph, bounds) {
  const load = GLYPH_SVG_LOADERS[`../../lib/spatial/hebrewGlyph/v1/${glyph.vector_asset_ref.split("/").pop()}`];
  if (!load) return null;
  const data = new SVGLoader().parse(await load());
  const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
  if (!shapes.length) return null;
  const geo = new ExtrudeGeometry(shapes, { depth: bounds.depth, bevelEnabled: false, curveSegments: 8 });
  const pl = glyphPlacement(bounds, glyph); // same placement formula as the Blender importer (hebrew_glyph_lineage.py)
  geo.scale(pl.scale, -pl.scale, 1);
  geo.translate(-(pl.advance / 2) * pl.scale, pl.baseline * pl.scale + pl.baselineLocalY, -bounds.depth / 2);
  return geo;
}

export function useGlyphGeometry(assetRef, bounds) {
  const glyph = useMemo(() => resolveGlyphAssetRef(assetRef), [assetRef]);
  const [geometry, setGeometry] = useState(null);
  useEffect(() => {
    let live = true, made = null;
    setGeometry(null);
    if (!glyph) return undefined;
    buildGlyphGeometry(glyph, bounds).then((g) => { made = g; if (live) setGeometry(g); else g?.dispose(); }).catch(() => { if (live) setGeometry(null); });
    return () => { live = false; made?.dispose(); };
  }, [glyph, bounds.width, bounds.height, bounds.depth]); // eslint-disable-line react-hooks/exhaustive-deps
  return geometry;
}

function LetterBody({ node, scene, colors }) {
  const { value } = resolveSceneTraceValue(scene, node.identityRef);
  const { width, height, depth } = node.bounds;
  const glyphGeometry = useGlyphGeometry(node.asset_ref, node.bounds);
  // exact codepoint comes from node identity, never from a font mesh; with an asset the plane carries the value only
  const tex = useTextTexture(glyphGeometry ? [
    { text: String(value), size: 26, y: 130, color: colors.accent, weight: 700 },
  ] : [
    { text: node.identityRef.letter, size: 78, y: 62, color: colors.hero },
    { text: String(value), size: 26, y: 130, color: colors.accent, weight: 700 },
  ]);
  return <group userData={{ glyphId: glyphGeometry ? node.asset_ref.glyph_id : null, codepoint: node.identityRef.letter }}>
    {glyphGeometry ? <mesh geometry={glyphGeometry}>
      <meshStandardMaterial color={colors.hero} roughness={0.5} metalness={0.2} side={DoubleSide} />
    </mesh> : <mesh>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={colors.panel} roughness={0.55} metalness={0.15} />
    </mesh>}
    <mesh position={[0, 0, depth / 2 + 0.4]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} transparent side={DoubleSide} depthWrite={false} />
    </mesh>
  </group>;
}

function ResultBody({ node, scene, colors }) {
  const { value } = resolveSceneTraceValue(scene, node.identityRef);
  const tex = useTextTexture([{ text: String(value), size: 64, y: 40, color: colors.accent, weight: 700 }], { width: 256, height: 80 });
  return <mesh>
    <planeGeometry args={[96, 30]} />
    <meshBasicMaterial map={tex} transparent side={DoubleSide} depthWrite={false} />
  </mesh>;
}

function NodeTree({ scene, node, colors }) {
  const t = node.transform;
  const children = scene.nodes.filter((n) => n.parent === node.id);
  return <group
    name={node.id}
    position={[t.position.x, t.position.y, t.position.z]}
    rotation={[t.rotation.x, t.rotation.y, t.rotation.z]}
    scale={[t.scale.x, t.scale.y, t.scale.z]}
  >
    {node.kind === "letter_anchor" ? <LetterBody node={node} scene={scene} colors={colors} /> : null}
    {node.kind === "engine_result" ? <ResultBody node={node} scene={scene} colors={colors} /> : null}
    {children.map((child) => <NodeTree key={child.id} scene={scene} node={child} colors={colors} />)}
  </group>;
}

function Connector({ scene, connector, colors }) {
  const { curve, mid } = useMemo(() => {
    const { points } = resolveSceneConnectorCurve(scene, connector);
    const c = new CubicBezierCurve3(...points.map((p) => new Vector3(p.x, p.y, p.z)));
    return { curve: c, mid: c.getPoint(0.5) };
  }, [scene, connector]);
  const { difference } = resolveSceneTraceValue(scene, connector.identityRef);
  const tex = useTextTexture([{ text: String(difference), size: 44, y: 32, color: colors.accent, weight: 700 }], { width: 160, height: 64 });
  const accent = useMemo(() => new Color(colors.accent), [colors.accent]);
  return <group name={connector.id}>
    <mesh>
      <tubeGeometry args={[curve, 40, connector.style.width * 0.9, 8, false]} />
      <meshStandardMaterial color={accent} emissive={connector.style.glow ? accent : "#000000"} emissiveIntensity={connector.style.glow ? 0.35 : 0} roughness={0.4} />
    </mesh>
    <sprite position={[mid.x, mid.y + 12, mid.z]} scale={[40, 16, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  </group>;
}

export function Controls({ target, reducedMotion, controlsRef: externalRef = null }) {
  const { camera, gl, invalidate } = useThree();
  const controlRef = useRef(null);
  useFrame(() => { if (controlRef.current?.enableDamping) controlRef.current.update(); });
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlRef.current = controls;
    if (externalRef) externalRef.current = controls; // lets a lab rig animate camera poses on the SAME controls instance
    controls.target.set(target.x, target.y, target.z);
    controls.enableDamping = !reducedMotion; // reduced-motion: no inertia/auto-motion, interaction remains
    controls.autoRotate = false;
    controls.minDistance = 60;
    controls.maxDistance = 2400;
    controls.update();
    const onChange = () => invalidate();
    controls.addEventListener("change", onChange);
    return () => { controlRef.current = null; if (externalRef) externalRef.current = null; controls.removeEventListener("change", onChange); controls.dispose(); };
  }, [camera, gl, invalidate, target.x, target.y, target.z, reducedMotion, externalRef]);
  return null;
}

export default function MistaterScene3D2029({ scene, reducedMotion = false, onFallback }) {
  const hostRef = useRef(null);
  const [colors, setColors] = useState(FALLBACK_COLORS);
  const [motionReduced, setMotionReduced] = useState(() => reducedMotion || prefersReducedMotion());
  // tokens (--sms-*) are scoped to the stage subtree, so resolve against the host element once it is mounted
  useLayoutEffect(() => {
    const refresh = () => {
      setColors(resolveTokenColors(hostRef.current));
      setMotionReduced(reducedMotion || prefersReducedMotion());
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true });
    const frame = hostRef.current?.closest(".sod29-root");
    if (frame) observer.observe(frame, { attributes: true });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", refresh);
    return () => { observer.disconnect(); media.removeEventListener("change", refresh); };
  }, [reducedMotion]);
  const { extent } = scene;
  const center = useMemo(() => ({ x: (extent.minX + extent.maxX) / 2, y: (extent.minY + extent.maxY) / 2, z: 0 }), [extent]);
  const span = Math.max(extent.maxX - extent.minX, (extent.maxY - extent.minY) * 1.6);
  const distance = span * 0.9 + 140;
  const root = scene.nodes.find((n) => n.id === scene.subjectId);
  const letters = scene.nodes.filter((n) => n.kind === "letter_anchor");

  return <div ref={hostRef} className="sod29-spatial-method-stage__s4" dir="ltr"
    data-renderer="r3f" data-reduced-motion={String(motionReduced)} data-scene-id={scene.scene_id} data-projection-signature={scene.projection_signature}
    data-node-count={scene.nodes.length} data-connector-count={scene.connectors.length}>
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 40, near: 1, far: 8000, position: [center.x, center.y + span * 0.12, center.z + distance] }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); onFallback?.("context_lost"); });
      }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[center.x + 120, center.y + 220, 260]} intensity={1.6} />
      <NodeTree scene={scene} node={root} colors={colors} />
      {scene.connectors.map((connector) => <Connector key={connector.id} scene={scene} connector={connector} colors={colors} />)}
      <Controls target={center} reducedMotion={motionReduced} />
    </Canvas>
    <ul className="sod29-spatial-method-stage__sr-only" aria-label="קשרי ההפרש בין אותיות סמוכות">
      {letters.map((node) => <li key={node.id}>{node.identityRef.letter} {resolveSceneTraceValue(scene, node.identityRef).value}</li>)}
      {scene.connectors.map((connector) => <li key={connector.id}>הפרש {resolveSceneTraceValue(scene, connector.identityRef).difference}</li>)}
    </ul>
  </div>;
}
