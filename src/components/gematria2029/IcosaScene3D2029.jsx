// src/components/gematria2029/IcosaScene3D2029.jsx
// S4 — shape family 2 of the lab: the regular icosahedron (עשרימון). The SAME engine as StructureScene3D2029: same lazy 3D chunk graph, same Royal
// materials/environment/lights, same explode + camera drivers, same Hebrew glyph meshes with the readable text fallback, same quality tiers and looks.
// It adds NO semantics (Spatial v3 appendix §14.5: 3D is a derived display state):
//  - the solid has the 20 faces of an icosahedron by definition (lib/spatial/icosahedronLayout3D.js derives V=12, E=30, F=20); the spec arrives only
//    when the model declares an icosahedron (spatialRenderModel.icosahedronStructureSpec);
//  - the word on every face, its value, the quantity and the result arrive as props from the already-evaluated path (nothing is computed here);
//  - selecting a face is display state only: it never changes the path, the value or the verification status.
// ROUTE-SCOPED: reachable only through the lazy import in SpatialConvergenceStage2029.jsx after the explicit "תלת־ממד" action.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Color, ExtrudeGeometry, Matrix4, Quaternion, Shape, Vector3 } from "three";
import { prefersReducedMotion } from "../../lib/spatial/gpuCapability.js";
import { layoutPhraseLetters } from "../../lib/spatial/convergenceLayout3D.js";
import { ICOSA_3D, facePlacement, faceFrame, faceTriangle2D, icosaConnectorPoints, icosaFocusPose, icosaOverviewPose, icosahedronSolid } from "../../lib/spatial/icosahedronLayout3D.js";
import { ROYAL_LAB_DIRECTIONS } from "../../lib/spatial/royalLabDirections.js";
import { Controls, FALLBACK_COLORS, RoyalEnvironment, noRaycast, resolveTokenColors, useBadgeTexture, useRoyalMaterials } from "./MistaterScene3D2029.jsx";
import { Apex, PathConnector } from "./ConvergenceScene3D2029.jsx";
import { ExplodeDriver, GLYPH_DEPTH, GlyphWord, GpuStats, LabRig, PartTag, RoyalLights, useGlyphMap, useInView } from "./StructureScene3D2029.jsx";

const FACE_DEPTH = 7;
const BEZEL_DEPTH = 4;
const off = (path) => !path || path.status !== "verified";

// One extruded triangle per face, built from the face's REAL vertices (in the face's own frame), inset a little so a gold bezel shows around it.
function useFaceGeometries(solid, bevel) {
  const geometries = useMemo(() => solid.faces.map((face) => {
    const pts = faceTriangle2D(solid, face);
    const make = (scale, depth, bev) => {
      const shape = new Shape();
      pts.forEach(([x, y], i) => (i ? shape.lineTo(x * scale, y * scale) : shape.moveTo(x * scale, y * scale)));
      shape.closePath();
      const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 1 });
      g.translate(0, 0, -depth / 2);
      return g;
    };
    return { body: make(0.9, FACE_DEPTH, bevel), bezel: make(1.0, BEZEL_DEPTH, 0) };
  }), [solid, bevel]);
  useEffect(() => () => geometries.forEach((g) => { g.body.dispose(); g.bezel.dispose(); }), [geometries]);
  return geometries;
}

function faceQuaternion(face) {
  const { x, y, z } = faceFrame(face.normal);
  const m = new Matrix4().makeBasis(new Vector3(...x), new Vector3(...y), new Vector3(...z));
  return new Quaternion().setFromRotationMatrix(m);
}

function FaceMesh({ face, geometry, spec, glyphs, mats, colors, stateKey, dim, rig, explode, register, pick, hover, wordBox }) {
  const quaternion = useMemo(() => faceQuaternion(face), [face]);
  const p = facePlacement(face, explode);
  return <group ref={register(`face:${face.index}`)} position={[p.x, p.y, p.z]} quaternion={quaternion} name={`face:${face.index}`} onClick={pick} {...hover}>
    <mesh geometry={geometry.body} material={mats.body[stateKey]} castShadow={rig.shadows} receiveShadow={rig.shadows} />
    {rig.bezel ? <mesh geometry={geometry.bezel} position={[0, 0, -(FACE_DEPTH / 2) - 0.4]} material={mats.trim[stateKey === "off" ? "off" : "base"]} castShadow={rig.shadows} raycast={noRaycast} /> : null}
    <GlyphWord word={spec.word} width={wordBox.width} height={wordBox.height} glyphs={glyphs} material={mats.trim[stateKey]} textColor={colors.gold} dim={dim} z={FACE_DEPTH / 2 - GLYPH_DEPTH / 2 + 0.2} />
  </group>;
}

export default function IcosaScene3D2029({
  spec, paths, value, verifiedCount, total, focusIndex = 0, onSelect, view = "overview", explode = false, spin = false,
  resetToken = 0, reducedMotion = false, onFallback, look = ROYAL_LAB_DIRECTIONS.v1.look, quality = "rich", glyphs3D = true,
}) {
  const hostRef = useRef(null);
  const controlsRef = useRef(null);
  const closing = useRef(false);
  useEffect(() => { closing.current = false; return () => { closing.current = true; }; }, []);
  const groups = useRef(new Map());
  const [colors, setColors] = useState(FALLBACK_COLORS);
  const [motionReduced, setMotionReduced] = useState(() => reducedMotion || prefersReducedMotion());
  const [face, setFace] = useState(null);
  const [hover, setHover] = useState(null);
  const active = useInView(hostRef);
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

  const royal = look.style === "royal";
  const rig = useMemo(() => ({ royal, bezel: Boolean(look.bezel), shadows: Boolean(look.shadows) && quality === "rich" }), [royal, look.bezel, look.shadows, quality]);
  const mats = useRoyalMaterials(colors, royal ? "royal" : "v1", quality);
  const solid = useMemo(() => icosahedronSolid(ICOSA_3D.radius), []);
  const geometries = useFaceGeometries(solid, royal ? 1.4 : 0);
  // the label must fit a face whatever its orientation: its bounding circle stays inside the triangle's incircle
  const wordBox = useMemo(() => { const r = solid.faceTriangle.inradius * 0.86; return { width: r * 1.5, height: r * 0.9 }; }, [solid]);
  const requests = useMemo(() => { const { letters, size } = layoutPhraseLetters(spec.word, { maxAdvance: wordBox.width, maxHeight: wordBox.height }); return letters.map((l) => ({ char: l.char, size })); }, [spec.word, wordBox]);
  const glyphs = useGlyphMap(requests, glyphs3D);
  const path = paths.find((p) => p.part === "solid") || null;
  const pathIndex = path ? paths.indexOf(path) : 0;
  const dim = off(path);
  const explodeValue = explode ? 1 : 0;
  const keyLight = useMemo(() => new Color(colors.hero).lerp(new Color(colors.gold), royal && look.rig !== "lab" ? 0.4 : 0), [colors.hero, colors.gold, royal, look.rig]);
  const pose = useMemo(() => ({ elevation: look.elevation, padding: look.padding }), [look.elevation, look.padding]);
  const poses = useMemo(() => ({ overview: icosaOverviewPose, focus: (_part, aspect, k) => icosaFocusPose(solid, face ?? 0, aspect, k) }), [solid, face]);
  const register = (name) => (node) => { if (node) groups.current.set(name, node); else groups.current.delete(name); };
  const placer = (name, group, k) => { const f = solid.faces[Number(name.split(":")[1])]; if (!f) return; const p = facePlacement(f, k); group.position.set(p.x, p.y, p.z); };
  const keyFor = (i) => { const sel = face === i; return dim ? (sel ? "offOn" : "off") : sel ? "on" : royal && hover === i ? "hover" : "base"; };
  const tagState = { dim, on: face !== null };
  const badge = useBadgeTexture(face === null ? `${spec.faces} פאות` : `פאה ${face + 1} מתוך ${spec.faces}`, { color: dim ? colors.line : colors.hero, border: dim ? colors.line : colors.gold,
    fill: new Color(colors.sapphire).multiplyScalar(face === null ? 0.16 : 0.34).getStyle(), width: 384, height: 96, size: 44 });
  const connector = useMemo(() => ({ id: "route:solid", points: icosaConnectorPoints() }), []);
  const fallbackPath = path || { status: "no_phrase" };

  return <div ref={hostRef} className="sod29-spatial-method-stage__s4" dir="ltr" role="img" data-renderer="r3f" data-scene="structure" data-family="icosahedron"
    aria-label={`עשרימון תלת־ממדי: ${spec.faces} פאות, על כל פאה «${spec.word}»`}
    data-reduced-motion={String(motionReduced)} data-view={view} data-explode={String(explode)} data-spin={String(spin)} data-selected-part="solid" data-selected-face={face === null ? "" : String(face)}
    data-parts="solid" data-face-count={spec.faces} data-verified-paths={verifiedCount} data-total-paths={total}
    data-look={look.style} data-rig={look.rig} data-quality={quality} data-shadows={String(rig.shadows)} data-glyph-status={glyphs.status} data-hover-part={hover === null ? "" : "solid"}>
    <Canvas
      frameloop="demand"
      dpr={quality === "rich" ? [1, 2] : [1, 1.5]}
      shadows={rig.shadows ? "percentage" : false}
      camera={{ fov: ICOSA_3D.fovDeg, near: 1, far: 9000, position: [0, 200, 1000] }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); if (!closing.current) onFallback?.("context_lost"); }); }}
    >
      <RoyalEnvironment tint={royal && look.rig !== "lab" ? colors.gold : null} intensity={royal ? 0.7 : 0.85} />
      <GpuStats hostRef={hostRef} />
      <RoyalLights royal={royal} look={look} quality={quality} colors={colors} keyLight={keyLight} shadows={rig.shadows} />
      {solid.faces.map((f) => <FaceMesh key={f.index} face={f} geometry={geometries[f.index]} spec={spec} glyphs={glyphs} mats={mats} colors={colors} stateKey={keyFor(f.index)} dim={dim} rig={rig}
        explode={explodeValue} register={register} wordBox={wordBox}
        pick={(event) => { event.stopPropagation(); setFace(f.index); onSelect?.(pathIndex); }}
        hover={{ onPointerOver: (event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; if (royal) setHover(f.index); }, onPointerOut: () => { document.body.style.cursor = ""; if (royal) setHover((now) => (now === f.index ? null : now)); } }} />)}
      <mesh position={[0, ICOSA_3D.plinthY, 0]} material={mats.plinth} receiveShadow={rig.shadows} raycast={noRaycast}><cylinderGeometry args={[110, 124, 9, 56]} /></mesh>
      <mesh position={[0, ICOSA_3D.plinthY + 5.4, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.trim.base} raycast={noRaycast}><torusGeometry args={[110, 1.4, 8, 72]} /></mesh>
      <PartTag position={[ICOSA_3D.radius * 0.72, ICOSA_3D.radius + 52, 0]} text={`× ${spec.faces}`} colors={colors} state={tagState} />
      <sprite position={[0, ICOSA_3D.plinthY + 44, 0]} scale={[100, 25, 1]}><spriteMaterial map={badge} transparent depthWrite={false} /></sprite>
      <PathConnector connector={connector} path={fallbackPath} colors={colors} focused />
      <Apex apex={ICOSA_3D.apex} value={value} verifiedCount={verifiedCount} total={total} colors={colors} labelSide="above" />
      <ExplodeDriver target={explodeValue} reduced={motionReduced} groups={groups} onPhase={() => {}} placer={placer} />
      <Controls target={{ x: 0, y: 0, z: 0 }} reducedMotion={motionReduced} controlsRef={controlsRef} />
      <LabRig view={view} part={`solid:${face ?? 0}`} explode={explodeValue} resetToken={resetToken} spin={spin} active={active} reduced={motionReduced} controlsRef={controlsRef} pose={pose} poses={poses} />
    </Canvas>
    <ul className="sod29-spatial-method-stage__sr-only" aria-label="המסלול ופאות העשרימון">
      {paths.map((p) => <li key={p.id}>{p.phrase || "ללא ביטוי"} {p.operand} × {p.quantity} = {p.result} · {p.partLabel} — {p.label}</li>)}
      <li>{spec.faces} פאות, על כל פאה «{spec.word}»{face === null ? "" : `; נבחרה פאה ${face + 1}`}</li>
    </ul>
  </div>;
}
