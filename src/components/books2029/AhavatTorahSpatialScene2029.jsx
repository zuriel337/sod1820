import React, { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AHAVAT_DS01_BOOKS } from "../../data/ahavatTorahDs01Source2029.js";

const STATUS_COLORS = Object.freeze({
  closed: "#d9b65d",
  partial: "#70a9d8",
  open: "#8b82d7",
  unknown: "#a69d91",
});

const REDUCED_MOTION = typeof window !== "undefined"
  && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function towerPosition(index) {
  const column = index % 5;
  const row = Math.floor(index / 5);
  return [(column - 2) * 1.42, 0, (row - 1) * 1.55];
}

function pageHeight(dataset) {
  return .72 + Math.min(dataset.pages.length, 9) * .34;
}

function DatasetTowers({ datasets, activeId, onSelect }) {
  const group = useRef(null);

  useFrame((state) => {
    if (!group.current || REDUCED_MOTION) return;
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

function SceneControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef(null);

  useFrame(() => controlsRef.current?.update());
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlsRef.current = controls;
    controls.enableDamping = !REDUCED_MOTION;
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
  }, [camera, gl]);
  return null;
}

export default function AhavatTorahSpatialScene2029({ datasets = [], activeId = "", onSelect, mode = "datasets" }) {
  const stableDatasets = useMemo(() => datasets.slice(0, 13), [datasets]);
  return <div className="ahavat29-spatial-canvas" role="img" aria-label={mode === "ds01" ? "חמשת חומשי התורה לפי מניין המופעים המודפס בעמוד 6" : "מצפה תלת־ממדי של שלושה עשר מאגרי אהבת תורה; גובה כל מגדל מייצג את מספר עמודי המקור שלו"}>
    <Canvas camera={{ position: [7.4, 6.2, 9.6], fov: 44 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <color attach="background" args={["#0d0b09"]} />
      <fog attach="fog" args={["#0d0b09", 10, 19]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 8, 5]} intensity={2.25} color="#f3d68f" />
      <pointLight position={[-5, 3, -3]} intensity={19} distance={14} color="#668ec4" />
      {mode === "ds01" ? <SourceBookTowers activeId={activeId} onSelect={onSelect} /> : <DatasetTowers datasets={stableDatasets} activeId={activeId} onSelect={onSelect} />}
      <SceneControls />
    </Canvas>
  </div>;
}
