import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";
import { buildOccurrenceSync, CORPUS_N } from "../../lib/spatial/torahOccurrenceAdapter.js";
import { F } from "../../theme.js";

// Branch-only mockup. Geometry comes from the already-published ELS record:
// "צופן אשלים מלאכה התשפו" · skip 637.
// We do NOT re-run/search ELS here. We only project the saved occurrence positions
// onto a real-corpus spatial matrix whose row stride is exactly the saved skip.
const SKIP = 637;
const ROW_START = 202;
const ROW_END = 211;
const COL_START = 526;
const COL_END = 546;
const CELL = 0.72;

const PATHS = [
  { id: "ashlim", label: "אשלים", term: "אשלימ", start: 131754, step: SKIP, direction: 1, color: "#f4d35e" },
  { id: "tashpu", label: "התשפ״ו", term: "התשפו", start: 132392, step: SKIP, direction: -1, color: "#60a5fa" },
  { id: "bnei", label: "אל בני ישראל", term: "אלבניישראל", start: 132393, step: 1, direction: 1, color: "#a78bfa" },
  { id: "melacha", label: "מלאכה", term: "מלאכה", start: 133027, step: 1, direction: 1, color: "#fb923c" },
].map((p) => ({
  ...p,
  positions: [...p.term].map((_, i) => p.start + i * p.step * p.direction),
}));

function buildMatrixCells() {
  const memberships = new Map();
  PATHS.forEach((path) => path.positions.forEach((idx, step) => {
    const prev = memberships.get(idx) || [];
    prev.push({ pathId: path.id, step });
    memberships.set(idx, prev);
  }));

  const cells = [];
  for (let row = ROW_START; row <= ROW_END; row++) {
    for (let col = COL_START; col <= COL_END; col++) {
      const corpusIndex = row * SKIP + col;
      if (corpusIndex < 0 || corpusIndex >= CORPUS_N) continue;
      const occurrence = buildOccurrenceSync(corpusIndex);
      if (!occurrence) continue;
      cells.push({
        ...occurrence,
        row,
        col,
        memberships: memberships.get(corpusIndex) || [],
      });
    }
  }
  return cells;
}

function makeLetterTexture(letter) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 84px Arial, sans-serif";
  ctx.fillText(letter || "·", 64, 67);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function useLetterTextures(cells) {
  const textures = useMemo(() => {
    const unique = [...new Set(cells.map((c) => c.baseLetterFamily || "·"))];
    const map = new Map();
    unique.forEach((letter) => map.set(letter, makeLetterTexture(letter)));
    return map;
  }, [cells]);

  useEffect(() => () => {
    textures.forEach((texture) => texture.dispose());
  }, [textures]);

  return textures;
}

function pathById(id) {
  return PATHS.find((p) => p.id === id) || null;
}

function cellPosition(cell, activePath, explode) {
  const centerCol = (COL_START + COL_END) / 2;
  const centerRow = (ROW_START + ROW_END) / 2;
  const x = (cell.col - centerCol) * CELL;
  const y = (centerRow - cell.row) * CELL;
  const curve = -0.045 * x * x;
  const onActive = activePath && cell.memberships.some((m) => m.pathId === activePath);
  const onAnyPath = cell.memberships.length > 0;
  let z = curve;
  if (explode) z += (cell.row - centerRow) * 0.16;
  if (onAnyPath) z += 0.18;
  if (onActive) z += 0.78;
  return [x, y, z];
}

function pathPoints(path, cellMap, activePath, explode) {
  return path.positions
    .map((idx) => cellMap.get(idx))
    .filter(Boolean)
    .map((cell) => {
      const [x, y, z] = cellPosition(cell, activePath, explode);
      return [x, y, z + 0.16];
    });
}

function LetterCell({ cell, texture, activePath, explode, onSelect }) {
  const [x, y, z] = cellPosition(cell, activePath, explode);
  const activeMembership = activePath ? cell.memberships.find((m) => m.pathId === activePath) : null;
  const primaryMembership = activeMembership || cell.memberships[0] || null;
  const p = primaryMembership ? pathById(primaryMembership.pathId) : null;
  const isPath = !!p;
  const isActive = !!activeMembership;
  const cellColor = isPath ? p.color : "#1b1825";
  const letterColor = isPath ? p.color : "#9a91aa";

  return (
    <group position={[x, y, z]}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(cell); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "default"; }}
      >
        <boxGeometry args={[0.62, 0.62, isActive ? 0.18 : 0.10]} />
        <meshStandardMaterial
          color={isPath ? "#15111c" : "#0d0b13"}
          emissive={cellColor}
          emissiveIntensity={isActive ? 0.72 : isPath ? 0.20 : 0.025}
          roughness={0.56}
          metalness={0.25}
          transparent
          opacity={isActive ? 0.98 : isPath ? 0.90 : 0.76}
        />
      </mesh>
      <sprite scale={[0.48, 0.48, 1]} position={[0, 0, 0.075]}>
        <spriteMaterial
          map={texture}
          color={letterColor}
          transparent
          opacity={isActive ? 1 : isPath ? 0.96 : 0.68}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}

function MatrixScene({ activePath, explode, autoRotate, onSelect }) {
  const cells = useMemo(() => buildMatrixCells(), []);
  const textures = useLetterTextures(cells);
  const cellMap = useMemo(() => new Map(cells.map((c) => [c.corpusIndex, c])), [cells]);
  const group = useRef();

  useFrame((state) => {
    if (!group.current) return;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.45) * 0.08;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.18) * 0.018;
  });

  return (
    <>
      <color attach="background" args={["#04030a"]} />
      <fog attach="fog" args={["#04030a", 11, 26]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[4, 6, 8]} intensity={18} color="#f4d35e" distance={24} />
      <pointLight position={[-5, -2, 5]} intensity={12} color="#7c3aed" distance={20} />
      <pointLight position={[0, -6, 6]} intensity={8} color="#2563eb" distance={18} />
      <Stars radius={42} depth={22} count={1800} factor={2.5} saturation={0} fade speed={0.35} />
      <Sparkles count={72} scale={[14, 9, 10]} size={1.6} speed={0.18} opacity={0.42} color="#f5df8a" />

      <group ref={group} rotation={[-0.09, -0.22, 0]}>
        <mesh position={[0, 0, -2.4]} rotation={[0, 0, 0]}>
          <planeGeometry args={[18, 11]} />
          <meshBasicMaterial color="#0a0711" transparent opacity={0.26} side={THREE.DoubleSide} />
        </mesh>

        {cells.map((cell) => (
          <LetterCell
            key={cell.corpusIndex}
            cell={cell}
            texture={textures.get(cell.baseLetterFamily || "·")}
            activePath={activePath}
            explode={explode}
            onSelect={onSelect}
          />
        ))}

        {PATHS.map((path) => {
          const points = pathPoints(path, cellMap, activePath, explode);
          if (points.length < 2) return null;
          const muted = activePath && activePath !== path.id;
          return (
            <Line
              key={path.id}
              points={points}
              color={path.color}
              lineWidth={activePath === path.id ? 3.2 : 1.7}
              transparent
              opacity={muted ? 0.18 : activePath === path.id ? 0.95 : 0.48}
            />
          );
        })}
      </group>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.055}
        minDistance={7}
        maxDistance={18}
        minPolarAngle={Math.PI * 0.24}
        maxPolarAngle={Math.PI * 0.76}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

function InfoRow({ k, v }) {
  return <div className="csm-info-row"><span>{k}</span><b>{v}</b></div>;
}

export default function CipherSpatialMockupPage() {
  const [activePath, setActivePath] = useState("ashlim");
  const [explode, setExplode] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selected, setSelected] = useState(null);

  const selectedPathLabels = selected?.memberships
    ?.map((m) => pathById(m.pathId)?.label)
    .filter(Boolean)
    .join(" · ") || "—";

  return (
    <div className="csm" dir="rtl">
      <style>{CSS}</style>
      <header className="csm-head">
        <div>
          <div className="csm-kicker">Spatial Research Mockup · WebGL</div>
          <h1>מסע אמיתי בתוך הצופן</h1>
          <p>מטריצת אותיות אמיתית מהקורפוס הקנוני · צופן 637 · גררו כדי לסובב, צבטו/גלגלו כדי להתקרב.</p>
        </div>
        <div className="csm-badge">מוקאפ בלבד · לא פורסם</div>
      </header>

      <section className="csm-stage-wrap">
        <div className="csm-canvas">
          <Canvas
            camera={{ position: [0, 0.2, 12.2], fov: 48 }}
            dpr={[1, 1.7]}
            gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
            onPointerMissed={() => setSelected(null)}
          >
            <MatrixScene
              activePath={activePath}
              explode={explode}
              autoRotate={autoRotate}
              onSelect={setSelected}
            />
          </Canvas>
          <div className="csm-hint">✦ גררו את המטריצה לכל כיוון</div>
        </div>

        <aside className="csm-panel">
          <div className="csm-panel-title">צופן אשלים מלאכה · התשפ״ו</div>
          <div className="csm-panel-sub">אותו ממצא שמור · תצוגה מרחבית חדשה</div>

          <div className="csm-paths">
            <button className={!activePath ? "on" : ""} onClick={() => setActivePath(null)}>כל הנתיבים</button>
            {PATHS.map((path) => (
              <button
                key={path.id}
                className={activePath === path.id ? "on" : ""}
                onClick={() => setActivePath(path.id)}
                style={{ "--path": path.color }}
              >
                <i />{path.label}
              </button>
            ))}
          </div>

          <div className="csm-controls">
            <button className={explode ? "on" : ""} onClick={() => setExplode((v) => !v)}>◫ פרקו שכבות</button>
            <button className={autoRotate ? "on" : ""} onClick={() => setAutoRotate((v) => !v)}>⟳ סיבוב אוטומטי</button>
          </div>

          <div className="csm-proof">
            <InfoRow k="דילוג מרכזי" v="637" />
            <InfoRow k="קורפוס" v="הקורפוס הקנוני של מנוע ELS" />
            <InfoRow k="אותיות בתצוגה" v={`${(ROW_END - ROW_START + 1) * (COL_END - COL_START + 1)}`} />
            <InfoRow k="נתיבים שמורים" v="4" />
          </div>

          <div className="csm-selected">
            <div className="csm-selected-title">{selected ? `אות שנבחרה: ${selected.baseLetterFamily}` : "לחצו על אות במטריצה"}</div>
            {selected ? (
              <>
                <InfoRow k="corpusIndex" v={selected.corpusIndex.toLocaleString("en-US")} />
                <InfoRow k="מיקום מטריצה" v={`שורה ${selected.row} · עמודה ${selected.col}`} />
                <InfoRow k="נתיב" v={selectedPathLabels} />
                <InfoRow k="מקור" v={selected.locator?.ref || "מיקום קורפוס זמין"} />
              </>
            ) : <p>לחיצה על אות שומרת את אותה זהות occurrence ומציגה את המיקום שלה — בלי להפוך x/y/z לאמת קנונית.</p>}
          </div>
        </aside>
      </section>

      <footer className="csm-foot">
        <strong>מה זה מוכיח?</strong>
        <span>אותו צופן יכול להפוך למרחב שאפשר לסובב, לפרק לשכבות, לבחור בו אות ולהבליט ציר — בלי להקים מנוע צופן שני.</span>
      </footer>
    </div>
  );
}

const CSS = `
  .csm{min-height:100vh;background:radial-gradient(circle at 50% 0%,#171023 0,#08060d 34%,#030207 100%);color:#eee6d4;padding:22px 18px 42px;font-family:${F.body};}
  .csm-head{max-width:1180px;margin:0 auto 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;}
  .csm-kicker{font-family:${F.ui};font-size:10px;font-weight:900;letter-spacing:.16em;color:#c4a44e;text-transform:uppercase;}
  .csm h1{font-family:${F.display};font-size:clamp(28px,5vw,52px);line-height:1.04;margin:5px 0 0;color:#f5df88;text-shadow:0 0 30px rgba(212,175,55,.12);}
  .csm-head p{max-width:760px;margin:9px 0 0;color:#aaa0b3;line-height:1.75;font-size:13px;}
  .csm-badge{font-family:${F.ui};font-size:10px;color:#c6b7df;border:1px solid rgba(142,109,196,.34);background:rgba(72,43,108,.16);border-radius:999px;padding:7px 10px;white-space:nowrap;}
  .csm-stage-wrap{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:14px;align-items:stretch;}
  .csm-canvas{position:relative;min-height:690px;border:1px solid rgba(212,175,55,.24);border-radius:26px;overflow:hidden;background:#04030a;box-shadow:0 28px 90px rgba(0,0,0,.44),inset 0 0 70px rgba(119,78,165,.06);touch-action:none;}
  .csm-canvas canvas{display:block;width:100%!important;height:100%!important;}
  .csm-hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);z-index:2;font-family:${F.ui};font-size:10.5px;color:#c9b878;background:rgba(5,4,9,.72);border:1px solid rgba(212,175,55,.22);backdrop-filter:blur(8px);border-radius:999px;padding:7px 11px;pointer-events:none;white-space:nowrap;}
  .csm-panel{border:1px solid rgba(212,175,55,.22);border-radius:24px;padding:18px;background:linear-gradient(180deg,rgba(18,13,25,.96),rgba(7,5,11,.97));box-shadow:inset 0 0 60px rgba(93,58,139,.05);}
  .csm-panel-title{font-family:${F.display};font-size:22px;font-weight:900;color:#f0da88;line-height:1.15;}
  .csm-panel-sub{font-family:${F.ui};font-size:10.5px;color:#887f91;margin-top:5px;}
  .csm-paths{display:grid;gap:7px;margin-top:16px;}
  .csm-paths button,.csm-controls button{appearance:none;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);color:#bdb5c5;border-radius:12px;padding:10px 11px;text-align:start;cursor:pointer;font-family:${F.ui};font-size:12px;font-weight:800;transition:.18s;}
  .csm-paths button{display:flex;align-items:center;gap:8px;}
  .csm-paths button i{width:8px;height:8px;border-radius:50%;background:var(--path,#82778e);box-shadow:0 0 11px var(--path,#82778e);}
  .csm-paths button:hover,.csm-controls button:hover{border-color:rgba(212,175,55,.36);transform:translateY(-1px);}
  .csm-paths button.on{border-color:var(--path,#d4af37);color:#f4ead5;background:rgba(212,175,55,.07);}
  .csm-paths button:first-child.on{border-color:#d4af37;}
  .csm-controls{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px;}
  .csm-controls button{text-align:center;font-size:10.5px;padding:9px 7px;}
  .csm-controls button.on{color:#f5df88;border-color:rgba(212,175,55,.36);background:rgba(212,175,55,.07);}
  .csm-proof,.csm-selected{margin-top:14px;padding:12px;border-radius:15px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);}
  .csm-info-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-family:${F.ui};font-size:10.5px;}
  .csm-info-row:last-child{border-bottom:0}.csm-info-row span{color:#82798b}.csm-info-row b{color:#d8ceb8;text-align:end;max-width:60%;font-weight:800;}
  .csm-selected-title{font-family:${F.ui};font-size:12.5px;font-weight:900;color:#efd780;margin-bottom:5px;}
  .csm-selected p{font-size:10.5px;line-height:1.65;color:#8f8797;margin:4px 0 0;}
  .csm-foot{max-width:1180px;margin:14px auto 0;padding:13px 16px;border:1px solid rgba(212,175,55,.16);border-radius:16px;background:rgba(212,175,55,.04);display:flex;gap:10px;align-items:baseline;}
  .csm-foot strong{font-family:${F.ui};font-size:12px;color:#f0d87f;white-space:nowrap}.csm-foot span{font-size:11.5px;color:#948b9d;line-height:1.6;}
  @media(max-width:850px){
    .csm{padding:14px 10px 30px}.csm-head{display:block;margin-bottom:12px}.csm-badge{display:inline-block;margin-top:10px}.csm-stage-wrap{grid-template-columns:1fr}.csm-canvas{min-height:62vh;border-radius:20px}.csm-panel{border-radius:20px}.csm-controls{grid-template-columns:1fr 1fr}.csm-foot{align-items:flex-start;flex-direction:column;gap:4px}
  }
  @media(max-width:480px){.csm-canvas{min-height:58vh}.csm h1{font-size:31px}.csm-panel{padding:14px}.csm-hint{bottom:9px;font-size:9.5px}.csm-paths{grid-template-columns:1fr 1fr}.csm-paths button:first-child{grid-column:1/-1}}
  @media(prefers-reduced-motion:reduce){.csm-paths button,.csm-controls button{transition:none}}
`;