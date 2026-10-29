import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AHAVAT_DS01_BOOKS } from "../../data/ahavatTorahDs01Source2029.js";

const STATUS_COLORS = Object.freeze({
  closed: "#d9b65d",
  partial: "#70a9d8",
  open: "#8b82d7",
  unknown: "#a69d91",
});

class SpatialErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? <p role="status">לא ניתן לפתוח את המבנה במכשיר הזה. הטבלה ועמוד המקור זמינים בהמשך.</p> : this.props.children; }
}

function ContextLossGuard({ onLost }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = event => { event.preventDefault(); onLost(); };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.dataset.ahavatContextGuard = "ready";
    return () => { canvas.removeEventListener("webglcontextlost", lost); delete canvas.dataset.ahavatContextGuard; };
  }, [gl, onLost]);
  return null;
}

function towerPosition(index) {
  const column = index % 5;
  const row = Math.floor(index / 5);
  return [(column - 2) * 1.42, 0, (row - 1) * 1.55];
}

function pageHeight(dataset) {
  return .72 + Math.min(dataset.pages.length, 9) * .34;
}

function DatasetTowers({ datasets, activeId, onSelect, reducedMotion }) {
  const group = useRef(null);

  useFrame((state) => {
    if (!group.current || reducedMotion) return;
    group.current.position.y = Math.sin(state.clock.elapsedTime * .34) * .035;
  });

  return <group ref={group} rotation={[0, -.12, 0]}>
    {datasets.map((dataset, index) => {
      const height = pageHeight(dataset);
      const [x, , z] = towerPosition(index);
      const color = STATUS_COLORS[dataset.state] || STATUS_COLORS.unknown;
      const selected = dataset.id === activeId;
      return <group key={dataset.id} position={[x, 0, z]}>
        <mesh
          position={[0, height / 2, 0]}
          scale={selected ? [1.08, 1.04, 1.08] : [1, 1, 1]}
          onClick={event => {
            event.stopPropagation();
            onSelect?.(dataset.id);
          }}
        >
          <boxGeometry args={[.86, height, .86]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={selected ? .58 : .12}
            metalness={.22}
            roughness={.34}
          />
        </mesh>
        <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[.62, 32]} />
          <meshBasicMaterial color={color} transparent opacity={selected ? .55 : .18} />
        </mesh>
      </group>;
    })}
    <gridHelper args={[9, 18, "#5c5140", "#27241f"]} position={[0, 0, 0]} />
  </group>;
}

function SourceBookTowers({ activeId, onSelect }) {
  return <group>
    {AHAVAT_DS01_BOOKS.map((book, index) => {
      const height = .62 + book.count / 165;
      const color = book.reading === "closed" ? STATUS_COLORS.closed : STATUS_COLORS.partial;
      return <group key={book.id} position={[(index - 2) * 1.38, 0, 0]}>
        <mesh position={[0, height / 2, 0]} onClick={event => { event.stopPropagation(); onSelect?.(book.id); }}>
          <boxGeometry args={[.94, height, .94]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={activeId === book.id ? .56 : .12} roughness={.34} metalness={.2} />
        </mesh>
        <mesh position={[0, .03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[.68, 32]} />
          <meshBasicMaterial color={color} transparent opacity={activeId === book.id ? .55 : .18} />
        </mesh>
      </group>;
    })}
    <gridHelper args={[9, 18, "#5c5140", "#27241f"]} />
  </group>;
}

function SceneControls({ reducedMotion, command }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef(null);

  useFrame(() => controlsRef.current?.update());
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlsRef.current = controls;
    controls.enableDamping = !reducedMotion;
    controls.dampingFactor = .07;
    controls.enablePan = false;
    controls.minDistance = 6.5;
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI * .48;
    controls.target.set(0, 1.15, 0);
    controls.update();
    return () => {
      controlsRef.current = null;
      controls.dispose();
    };
  }, [camera, gl, reducedMotion]);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!command || !controls) return;
    // Flush drag inertia before an explicit keyboard/touch camera command.
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    if (command.action === "front") camera.position.set(0, 3, 14);
    else if (command.action === "oblique" || command.action === "reset") camera.position.set(7.4, 6.2, 9.6);
    else {
      const direction = camera.position.clone().sub(controls.target);
      const factor = command.action === "closer" ? .8 : 1.25;
      direction.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, direction.length() * factor)));
      camera.position.copy(controls.target).add(direction);
    }
    controls.update();
    controls.enableDamping = damping;
    gl.domElement.dataset.ahavatCameraCommand = command.action;
    gl.domElement.dataset.ahavatCameraCommandId = String(command.id);
    gl.domElement.dataset.ahavatCameraPosition = JSON.stringify(camera.position.toArray());
    gl.domElement.dataset.ahavatCameraDistance = String(camera.position.distanceTo(controls.target));
  }, [command, camera, gl]);
  return null;
}

function LetterCountBars({ bars, activeId, onSelect, theme }) {
  const maximum = Math.max(1, ...bars.map(bar => bar.count));
  const spacing = Math.min(1.35, 8 / Math.max(bars.length, 1));
  return <group>{bars.map((bar, index) => {
    const height = bar.count / maximum * 4;
    const color = theme ? (activeId === bar.id ? theme.depth : theme.accent) : STATUS_COLORS.closed;
    return <mesh key={bar.id} position={[(theme ? -1 : 1) * (index - (bars.length - 1) / 2) * spacing, height / 2, 0]} onClick={event => { event.stopPropagation(); onSelect?.(bar.id); }}>
      <boxGeometry args={[spacing * .68, height, .72]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={theme ? (activeId === bar.id ? .25 : .04) : (activeId === bar.id ? .6 : .12)} metalness={theme ? .25 : .2} roughness={theme ? .3 : .34} />
    </mesh>;
  })}<gridHelper args={[9, 18, theme?.line || "#5c5140", theme?.line || "#27241f"]} /></group>;
}

export default function AhavatTorahSpatialScene2029({ datasets = [], bars = [], letterLabel = "", activeId = "", onSelect, mode = "datasets" }) {
  const stableDatasets = useMemo(() => datasets.slice(0, 13), [datasets]);
  const root = useRef(null);
  const [lost, setLost] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [letterTheme, setLetterTheme] = useState(null);
  const [cameraCommand, setCameraCommand] = useState(null);
  const [ready, setReady] = useState(false);
  const moveCamera = action => setCameraCommand(previous => ({ action, id: (previous?.id || 0) + 1 }));
  useEffect(() => {
    if (mode !== "letter") return;
    const update = () => {
      const style = getComputedStyle(root.current);
      setLetterTheme({ background: style.getPropertyValue("--s29-panel").trim(), accent: style.getPropertyValue("--s29-accent").trim(), depth: style.getPropertyValue("--s29-accent-secondary").trim(), line: style.getPropertyValue("--s29-line-strong").trim() });
    };
    const frame = root.current.closest("[data-frame-theme-mode]");
    const observer = new MutationObserver(update);
    if (frame) observer.observe(frame, { attributes: true, attributeFilter: ["data-frame-theme-mode", "data-frame-theme-preset", "style"] });
    update();
    return () => observer.disconnect();
  }, [mode]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches || Boolean(root.current?.closest('[data-frame-reduced-motion="true"]')));
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["data-frame-reduced-motion"] });
    media.addEventListener("change", update); update();
    return () => { media.removeEventListener("change", update); observer.disconnect(); };
  }, []);
  const unavailable = <p role="status">לא ניתן לפתוח את המבנה במכשיר הזה. הטבלה ועמוד המקור זמינים בהמשך.</p>;
  const label = mode === "source-count" ? `ייצוג של מבנה הספר: גובה כל עמודה הוא מניין ${letterLabel} בשורת המקור; הנתונים מופיעים גם בטבלה ובכפתורים` : mode === "letter" || mode === "parasha-count" ? `ייצוג של מבנה הספר: גובה כל עמודה הוא מניין ${mode === "letter" ? "האות " : ""}${letterLabel} בחומש או בפרשה; הנתונים מופיעים גם בטבלה ובכפתורים` : mode === "ds01" ? "חמשת חומשי התורה לפי מניין המופעים המודפס בעמוד 6" : "מצפה תלת־ממדי של שלושה עשר מאגרי אהבת תורה; גובה כל מגדל מייצג את מספר עמודי המקור שלו";
  return <><div ref={root} data-reduced-motion={reducedMotion} className="ahavat29-spatial-canvas">
    <SpatialErrorBoundary onFailure={() => setLost(true)}>{lost ? unavailable : mode === "letter" && !letterTheme ? <p role="status">טוען את תצוגת האות…</p> : <Canvas role="img" aria-label={label} fallback={unavailable} onCreated={mode === "letter" ? () => setReady(true) : undefined} camera={{ position: [7.4, 6.2, 9.6], fov: 44 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <color attach="background" args={[mode === "letter" ? letterTheme.background : "#0d0b09"]} />
      <fog attach="fog" args={[mode === "letter" ? letterTheme.background : "#0d0b09", 10, 19]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 8, 5]} intensity={2.25} color={mode === "letter" ? letterTheme.background : "#f3d68f"} />
      <pointLight position={[-5, 3, -3]} intensity={19} distance={14} color={mode === "letter" ? letterTheme.depth : "#668ec4"} />
      {mode === "letter" || mode === "parasha-count" || mode === "source-count" ? <LetterCountBars bars={bars} activeId={activeId} onSelect={onSelect} theme={mode === "letter" ? letterTheme : null} /> : mode === "ds01" ? <SourceBookTowers activeId={activeId} onSelect={onSelect} /> : <DatasetTowers datasets={stableDatasets} activeId={activeId} onSelect={onSelect} reducedMotion={reducedMotion} />}
      <SceneControls reducedMotion={reducedMotion} command={mode === "letter" ? cameraCommand : undefined} />
      <ContextLossGuard onLost={() => setLost(true)} />
    </Canvas>}</SpatialErrorBoundary>
  </div>{mode === "letter" ? <nav className="ahavat29-letter-camera" aria-label="מבט במודל האות">
    <button type="button" disabled={!ready || lost} onClick={() => moveCamera("front")}>מבט קדמי</button>
    <button type="button" disabled={!ready || lost} onClick={() => moveCamera("oblique")}>מבט אלכסוני</button>
    <button type="button" disabled={!ready || lost} onClick={() => moveCamera("closer")}>התקרב</button>
    <button type="button" disabled={!ready || lost} onClick={() => moveCamera("farther")}>התרחק</button>
    <button type="button" disabled={!ready || lost} onClick={() => moveCamera("reset")}>אפס מבט</button>
  </nav> : null}</>;
}
